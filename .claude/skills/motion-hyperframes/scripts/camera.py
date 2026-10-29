"""Camera sul footage + grafiche: il montato di video-use si muove come in Remotion, poi sopra va il livello trasparente
di HyperFrames.

    python camera.py --edit <edit_dir> [--base base.mp4] [--overlay graphics.webm] [-o video.mp4] [--frames 0-150]
    python camera.py --edit <edit_dir> --stills 0.3,5.2 [--snap-dir <istantanee di hyperframes snapshot>]

Legge <edit_dir>/camera.json (da `editor/remotion/scripts/camera-track.ts`: la camera di ogni fotogramma calcolata con
lo stesso codice di Remotion) e la applica come fa il browser:
- trasformazione CSS translate · rotateX · rotateY · rotateZ · scale attorno all'origine, con prospettiva → omografia
  (cv2.warpPerspective, sub-pixel: niente scalini come con scale/crop di ffmpeg);
- riquadro-telefono: secondo livello di prospettiva, angoli arrotondati;
- filtri del footage (luminosità, contrasto, saturazione, seppia, sfocatura), vignetta, lampo;
- dove il footage non copre: nel riquadro-telefono il fondo dello style pack (pulse: inchiostro, bagliore lime e
  pavimento a griglia); nei whip e nelle oscillazioni la scia del video stesso (bordi allungati e sfocati), mai il nero;
- fermo finale: dopo l'ultimo fotogramma del montato resta quello.
Scrive il video MUTO (<edit_dir>/video.mp4); il suono lo mette compose.py --video.
"""
from __future__ import annotations

import argparse
import json
import math
import os
import subprocess
import sys
from collections import deque
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

import cv2
import numpy as np

W, H = 1080, 1920
INK = np.array([0x0A, 0x0B, 0x0E], np.float32)
LIME = np.array([0xD4, 0xFF, 0x3A], np.float32)


# ---------- trasformazioni CSS ----------

def rot_x(a):
    c, s = math.cos(a), math.sin(a)
    return np.array([[1, 0, 0, 0], [0, c, -s, 0], [0, s, c, 0], [0, 0, 0, 1]], float)


def rot_y(a):
    c, s = math.cos(a), math.sin(a)
    return np.array([[c, 0, s, 0], [0, 1, 0, 0], [-s, 0, c, 0], [0, 0, 0, 1]], float)


def rot_z(a):
    c, s = math.cos(a), math.sin(a)
    return np.array([[c, -s, 0, 0], [s, c, 0, 0], [0, 0, 1, 0], [0, 0, 0, 1]], float)


def trans(x, y):
    m = np.eye(4)
    m[0, 3], m[1, 3] = x, y
    return m


def scale(s):
    return np.diag([s, s, 1.0, 1.0])


def project(m: np.ndarray, d: float, pts: np.ndarray) -> np.ndarray:
    """Punti 2D dell'elemento → schermo: matrice CSS 4x4, poi `perspective: d` con origine al centro del contenitore."""
    p = np.c_[pts, np.zeros(len(pts)), np.ones(len(pts))] @ m.T
    k = d / (d - p[:, 2])
    return np.c_[W / 2 + (p[:, 0] - W / 2) * k, H / 2 + (p[:, 1] - H / 2) * k].astype(np.float32)


CORNERS = np.array([[0, 0], [W, 0], [W, H], [0, H]], float)


def inner_h(c: dict, d: float) -> np.ndarray:
    ox, oy = c["ox"] * W, c["oy"] * H
    m = trans(ox, oy) @ trans(c["x"], c["y"]) @ rot_x(math.radians(c["rx"])) @ rot_y(math.radians(c["ry"])) \
        @ rot_z(math.radians(c["rz"])) @ scale(c["s"]) @ trans(-ox, -oy)
    return cv2.getPerspectiveTransform(CORNERS.astype(np.float32), project(m, d, CORNERS))


def outer_h(c: dict) -> np.ndarray:
    m = trans(W / 2, H / 2) @ rot_x(math.radians(c.get("irx") or 0)) @ rot_y(math.radians(c.get("iry") or 0)) \
        @ scale(c.get("inset") or 1) @ trans(-W / 2, -H / 2)
    return cv2.getPerspectiveTransform(CORNERS.astype(np.float32), project(m, 2200, CORNERS))


# ---------- filtri (come i filtri CSS sull'elemento video) ----------

def grade_matrix(g: dict, glitch: float) -> np.ndarray | None:
    b, c = g.get("brightness", 1), g.get("contrast", 1)
    s = g.get("saturation", 1) * (1 + glitch * 0.6)
    warm = g.get("warmth", 0)
    m = np.eye(3) * b
    off = np.zeros(3)
    m, off = c * m, c * off + 127.5 * (1 - c)
    sat = np.array([[0.213 + 0.787 * s, 0.715 - 0.715 * s, 0.072 - 0.072 * s],
                    [0.213 - 0.213 * s, 0.715 + 0.285 * s, 0.072 - 0.072 * s],
                    [0.213 - 0.213 * s, 0.715 - 0.715 * s, 0.072 + 0.928 * s]])
    m, off = sat @ m, sat @ off
    if warm > 0:
        a = 1 - warm * 0.35
        sep = np.array([[0.393 + 0.607 * a, 0.769 - 0.769 * a, 0.189 - 0.189 * a],
                        [0.349 - 0.349 * a, 0.686 + 0.314 * a, 0.168 - 0.168 * a],
                        [0.272 - 0.272 * a, 0.534 - 0.534 * a, 0.131 + 0.869 * a]])
        m, off = sep @ m, sep @ off
    if np.allclose(m, np.eye(3)) and np.allclose(off, 0):
        return None
    return np.c_[m, off].astype(np.float32)


def vignette_mask(amount: float) -> np.ndarray | None:
    if amount <= 0:
        return None
    yy, xx = np.mgrid[0:H, 0:W].astype(np.float32) + 0.5
    d = np.sqrt(((xx - W / 2) / (W / 2 * math.sqrt(2))) ** 2 + ((yy - H / 2) / (H / 2 * math.sqrt(2))) ** 2)
    m = (1 - amount * 0.85 * np.clip((d - 0.45) / 0.55, 0, 1)).astype(np.float32)
    return cv2.merge([m, m, m])


def rounded_mask(r: float) -> np.ndarray:
    m = np.zeros((H, W), np.uint8)
    r = int(round(min(r, W / 2)))
    if r <= 0:
        m[:] = 255
        return m
    cv2.rectangle(m, (r, 0), (W - r, H), 255, -1)
    cv2.rectangle(m, (0, r), (W, H - r), 255, -1)
    for cx, cy in ((r, r), (W - r, r), (r, H - r), (W - r, H - r)):
        cv2.circle(m, (cx, cy), r, 255, -1, lineType=cv2.LINE_AA)
    return m


# ---------- fondo dello style pack "pulse" (PulseBackdrop) ----------

class PulseBackdrop:
    """Inchiostro + bagliore lime che pulsa + pavimento a griglia in prospettiva che scorre (come in ResultPhone.tsx)."""

    PERIOD = 20  # la griglia scorre di 6 px a fotogramma su un passo di 120 px: si ripete ogni 20 fotogrammi

    def __init__(self):
        yy, xx = np.mgrid[0:H, 0:W].astype(np.float64) + 0.5
        cx, cy = W / 2, 0.42 * H
        rad = math.hypot(max(cx, W - cx), max(cy, H - cy))  # circle farthest-corner
        self.glow = (np.clip(1 - np.hypot(xx - cx, yy - cy) / (0.55 * rad), 0, 1)[..., None] * (LIME - INK)).astype(np.float32)
        # pavimento: piano largo 3240 da y=58%, rotateX(72°) attorno al bordo alto, perspective 700 al centro
        top, a, d = 0.58 * H, math.radians(72), 700.0
        c, s = math.cos(a), math.sin(a)
        self.y0 = y0 = int(math.floor(top))
        Y = yy[y0:, :1]
        dy = d * ((Y - H / 2) - (top - H / 2)) / (d * c + (Y - H / 2) * s)
        ok = (Y >= top) & (dy >= 0)
        dy = np.where(ok, dy, 0)
        k = d / (d - dy * s)
        u = (xx[y0:] - W / 2) / k + W / 2 + 1080
        dyb = np.broadcast_to(dy, u.shape)
        wv = np.broadcast_to(np.abs(np.gradient(dy[:, 0]))[:, None] + 1e-3, u.shape)
        cu = self._cov(u, np.broadcast_to(1 / k, u.shape) + 1e-3)
        mask = np.where(np.broadcast_to(ok, u.shape) & (u >= 0) & (u <= 3240), np.clip(1 - dyb / 1440, 0, 1), 0)
        self.grid = [(0.35 * (1 - (1 - self._cov(dyb - off, wv)) * (1 - cu)) * mask).astype(np.float32)[..., None]
                     for off in range(0, 120, 6)]

    @staticmethod
    def _cov(v, w, period=120.0, line=3.0):
        def F(x):
            return np.floor(x / period) * line + np.minimum(np.mod(x, period), line)
        return np.clip((F(v + w / 2) - F(v - w / 2)) / w, 0, 1)

    def frame(self, f: int) -> np.ndarray:
        pulse = 0.5 + 0.5 * math.sin(f / 9)
        out = INK + self.glow * np.float32(0.16 + 0.1 * pulse)
        floor = out[self.y0:]
        floor += (LIME - floor) * self.grid[f % self.PERIOD]
        return out


def covers_frame(h: np.ndarray) -> bool:
    """Il footage trasformato copre tutto il fotogramma? (gli angoli dello schermo, riportati indietro, cadono nel video)"""
    inv = np.linalg.inv(h)
    p = np.c_[CORNERS, np.ones(4)] @ inv.T
    if np.any(p[:, 2] <= 0):
        return False
    q = p[:, :2] / p[:, 2:]
    return bool(np.all((q[:, 0] >= 0) & (q[:, 0] <= W) & (q[:, 1] >= 0) & (q[:, 1] <= H)))


def render_frame(cam: dict, n: int, src: np.ndarray, ov: np.ndarray | None, vign, backdrop, round_cache: dict) -> np.ndarray:
    """Un fotogramma (uint8 RGB): footage con la camera di `cam["frames"][n]`, fondo, vignetta, desaturazione, lampo, grafiche."""
    d = cam["perspective"]
    c = cam["frames"][n]
    img = src
    gm = grade_matrix(cam["grade"], c.get("glitch") or 0)
    if gm is not None:
        img = cv2.transform(img, gm)
    if (c.get("blur") or 0) > 0.3:
        img = cv2.GaussianBlur(img, (0, 0), c["blur"])
    hin = inner_h(c, d)
    inset = c.get("inset") or 1
    tilted = (c.get("irx") or 0) != 0 or (c.get("iry") or 0) != 0
    warp = dict(flags=cv2.INTER_LINEAR, borderMode=cv2.BORDER_CONSTANT, borderValue=0)
    if inset < 0.999 or tilted:
        # riquadro: prima la camera dentro il telefono (tagliata al rettangolo, angoli arrotondati), poi il telefono
        inner = cv2.warpPerspective(np.dstack([img, np.full((H, W), 255, np.uint8)]), hin, (W, H), **warp)
        rk = int(round((c.get("ir") or 0) / max(0.01, inset)))
        if rk not in round_cache:
            round_cache[rk] = rounded_mask(rk)
        inner[..., 3] = cv2.multiply(inner[..., 3], round_cache[rk], scale=1 / 255)
        warped = cv2.warpPerspective(inner, outer_h(c), (W, H), **warp)
    elif covers_frame(hin):
        warped = cv2.warpPerspective(img, hin, (W, H), flags=cv2.INTER_LINEAR, borderMode=cv2.BORDER_REPLICATE)
    else:
        # whip, oscillazione: il video non copre tutto. Niente fondo nero: i bordi del video si allungano e si sfocano
        # in orizzontale, come la scia di una panoramica a frusta
        warped = cv2.warpPerspective(img, hin, (W, H), flags=cv2.INTER_LINEAR, borderMode=cv2.BORDER_REPLICATE)
        cover = cv2.warpPerspective(np.full((H, W), 255, np.uint8), hin, (W, H), flags=cv2.INTER_LINEAR,
                                    borderMode=cv2.BORDER_CONSTANT, borderValue=0)
        if cover.min() < 250:
            m = cv2.GaussianBlur(cover, (0, 0), 6).astype(np.float32) * np.float32(1 / 255)
            smear = cv2.blur(warped, (91, 1)).astype(np.float32)
            m3 = cv2.merge([m, m, m])
            warped = np.clip(warped.astype(np.float32) * m3 + smear * (1 - m3) + 0.5, 0, 255).astype(np.uint8)
    if warped.shape[2] == 4:
        bg = backdrop.frame(n) if backdrop else np.zeros((H, W, 3), np.float32)
        al = warped[..., 3].astype(np.float32) * np.float32(1 / 255)
        al3 = cv2.merge([al, al, al])
        frame = cv2.add(cv2.multiply(warped[..., :3].astype(np.float32), al3), cv2.multiply(bg, 1 - al3))
    else:
        frame = warped.astype(np.float32)
    if vign is not None:
        frame = cv2.multiply(frame, vign)
    k = c.get("gray") or 0
    if k > 0.001:
        # backdrop-filter: grayscale(k) contrast(1 + 0.25k) brightness(1 - 0.18k) del timbro "nope"
        lum = frame @ np.array([0.2126, 0.7152, 0.0722], np.float32)
        frame = frame * (1 - k) + lum[..., None] * k
        frame = ((frame - 127.5) * (1 + 0.25 * k) + 127.5) * (1 - 0.18 * k)
    if (c.get("flash") or 0) > 0.01:
        frame += (255 - frame) * c["flash"]
    out = np.clip(frame + 0.5, 0, 255).astype(np.uint8)
    if ov is not None:
        x, y, w, h = cv2.boundingRect(ov[..., 3])
        if w and h:
            o = ov[y:y + h, x:x + w]
            oa = o[..., 3:4].astype(np.float32) * np.float32(1 / 255)
            region = out[y:y + h, x:x + w].astype(np.float32)
            out[y:y + h, x:x + w] = np.clip(o[..., :3] * oa + region * (1 - oa) + 0.5, 0, 255).astype(np.uint8)
    return out


# ---------- I/O ----------

def reader(path: str, rgba: bool, fps: int):
    args = ["ffmpeg", "-v", "error"]
    if rgba:
        args += ["-c:v", "libvpx-vp9"]
    # tempi assoluti come Remotion e come l'audio: al tempo n/fps si vede l'ultimo fotogramma con pts <= n/fps
    # (start_time=0 riempie l'inizio se il video parte un po' dopo l'audio)
    args += ["-i", path, "-vf", f"fps={fps}:start_time=0,scale={W}:{H}", "-f", "rawvideo", "-pix_fmt", "rgba" if rgba else "rgb24", "-"]
    p = subprocess.Popen(args, stdout=subprocess.PIPE)
    n = W * H * (4 if rgba else 3)
    while True:
        buf = p.stdout.read(n)
        if len(buf) < n:
            break
        yield np.frombuffer(buf, np.uint8).reshape(H, W, 4 if rgba else 3)
    p.wait()


def stills(a, edit: Path, cam: dict, base: str, vign, backdrop) -> None:
    import re
    snaps = {}
    if a.snap_dir:
        for p in Path(a.snap_dir).glob("*at-*s.png"):
            snaps[round(float(re.search(r"at-([\d.]+)s", p.name).group(1)), 3)] = p
    out = edit / "review" / "stills"
    out.mkdir(parents=True, exist_ok=True)
    for t in map(float, a.stills.split(",")):
        n = min(len(cam["frames"]) - 1, round(t * cam["fps"]))
        # -ss dà il primo fotogramma con pts >= ts: un fotogramma indietro (+1 ms) prende quello che si vede al tempo n/fps
        ts = max(0.0, (min(n, cam["videoFrames"] - 1) - 1) / cam["fps"] + 0.001)
        raw = subprocess.run(["ffmpeg", "-v", "error", "-ss", f"{ts:.4f}", "-i", base, "-frames:v", "1", "-vf", f"scale={W}:{H}",
                              "-f", "rawvideo", "-pix_fmt", "rgb24", "-"], check=True, capture_output=True).stdout
        if len(raw) < W * H * 3:
            # oltre l'ultimo fotogramma del montato (fermo finale): l'ultimo che c'è
            raw = subprocess.run(["ffmpeg", "-v", "error", "-sseof", "-0.5", "-i", base, "-vf", f"scale={W}:{H}",
                                  "-f", "rawvideo", "-pix_fmt", "rgb24", "-"], check=True, capture_output=True).stdout
            raw = raw[-W * H * 3:]
        src = np.frombuffer(raw, np.uint8).reshape(H, W, 3)
        snap = snaps.get(round(t, 3))
        ov = cv2.cvtColor(cv2.imread(str(snap), cv2.IMREAD_UNCHANGED), cv2.COLOR_BGRA2RGBA) if snap else None
        frame = render_frame(cam, n, src, ov, vign, backdrop, {})
        p = out / f"t_{t:06.2f}.png"
        cv2.imwrite(str(p), cv2.cvtColor(frame, cv2.COLOR_RGB2BGR))
        print(p)


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--edit", required=True)
    ap.add_argument("--base")
    ap.add_argument("--overlay")
    ap.add_argument("--frames", help="a-b (solo un tratto, per provare)")
    ap.add_argument("--stills", help="tempi in secondi: PNG in <edit_dir>/review/stills/ invece del video")
    ap.add_argument("--snap-dir", help="cartella di `hyperframes snapshot` (frame-NN-at-<t>s.png) da mettere sopra")
    ap.add_argument("-o", "--out")
    a = ap.parse_args()
    edit = Path(a.edit)
    cam = json.loads((edit / "camera.json").read_text())
    fps, frames, d = cam["fps"], cam["frames"], cam["perspective"]
    base = a.base or str(edit / "base.mp4")
    overlay = a.overlay or (str(edit / "graphics.webm") if (edit / "graphics.webm").exists() else None)
    out = a.out or str(edit / "video.mp4")
    f0, f1 = (map(int, a.frames.split("-")) if a.frames else (0, len(frames) - 1))
    f1 = min(f1, len(frames) - 1)

    vign = vignette_mask(cam["grade"].get("vignette", 0))
    backdrop = PulseBackdrop() if cam.get("backdrop") == "pulse" else None
    if a.stills:
        stills(a, edit, cam, base, vign, backdrop)
        return
    enc = subprocess.Popen(["ffmpeg", "-y", "-v", "error", "-f", "rawvideo", "-pix_fmt", "rgb24", "-s", f"{W}x{H}", "-r", str(fps),
                            "-i", "-", "-c:v", "libx264", "-preset", "fast", "-crf", "16", "-pix_fmt", "yuv420p",
                            "-movflags", "+faststart", out], stdin=subprocess.PIPE)
    src_it = reader(base, False, fps)
    ov_it = reader(overlay, True, fps) if overlay else None
    src = last = None
    round_cache: dict[int, np.ndarray] = {}
    # OpenCV e numpy lasciano il GIL: più fotogrammi insieme su thread diversi, scritti in ordine
    pending: deque = deque()
    with ThreadPoolExecutor(max_workers=max(1, (os.cpu_count() or 2) - 1)) as pool:
        for n in range(0, f1 + 1):
            if n < cam["videoFrames"]:
                nxt = next(src_it, None)
                src = nxt if nxt is not None else last
                last = src
            ov = next(ov_it, None) if ov_it else None
            if n < f0:
                continue
            pending.append(pool.submit(render_frame, cam, n, src, ov, vign, backdrop, round_cache))
            while len(pending) > 8 or (pending and pending[0].done()):
                enc.stdin.write(pending.popleft().result().tobytes())
            if n % 100 == 0:
                print(f"\r  camera {n}/{f1}", end="", file=sys.stderr, flush=True)
        while pending:
            enc.stdin.write(pending.popleft().result().tobytes())
    enc.stdin.close()
    enc.wait()
    print(f"\nFatto: {out} ({f1 - f0 + 1} fotogrammi)")


if __name__ == "__main__":
    main()
