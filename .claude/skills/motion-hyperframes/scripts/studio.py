"""Chi parla su fondo da studio (bianco di default), più piccolo e più in basso: lascia libera la parte alta per le
grafiche e permette il testo DIETRO la persona.

    python studio.py --edit <edit_dir> [--scale 0.85] [--color "#FFFFFF"] [--edge "#E8E9E5"]

- scontorno RVM come background.py (stabile, niente aloni); la persona viene scalata con il bordo basso ancorato al
  fondo dell'inquadratura (il busto resta attaccato al bordo) e i bordi laterali/alti del girato originale sfumano
- fondo: gradiente radiale dal bianco al grigio caldo dei bordi, più un'ombra morbida dietro la persona
- scrive <edit_dir>/base.mp4 (l'originale in base_wall.mp4) e <edit_dir>/matte.mp4 (alfa già riposizionato), usato
  da behind.py per mettere il testo dietro la persona
"""
import argparse
import shutil
import subprocess
import sys
from pathlib import Path

import cv2
import numpy as np
import onnxruntime as ort

sys.path.insert(0, str(Path(__file__).parent))
from background import FPS, H, MODEL, W, reader, writer  # noqa: E402


def hex_rgb(h: str) -> np.ndarray:
    h = h.lstrip("#")
    return np.array([int(h[i:i + 2], 16) for i in (0, 2, 4)], np.float32)


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--edit", required=True)
    ap.add_argument("--scale", type=float, default=0.85)
    ap.add_argument("--color", default="#FFFFFF")
    ap.add_argument("--edge", default="#E8E9E5")
    ap.add_argument("--ratio", type=float, default=0.25)
    a = ap.parse_args()
    edit = Path(a.edit)
    src = edit / "base_wall.mp4"
    if not src.exists():
        shutil.copy2(edit / "base.mp4", src)

    yy, xx = np.mgrid[0:H, 0:W].astype(np.float32)
    d = np.sqrt(((xx - W / 2) / (W * 0.75)) ** 2 + ((yy - H * 0.42) / (H * 0.62)) ** 2)
    t = np.clip(d, 0, 1)[..., None] ** 1.6
    bg = hex_rgb(a.color) * (1 - t) + hex_rgb(a.edge) * t

    s = a.scale
    nw, nh = int(round(W * s)), int(round(H * s))
    ox, oy = (W - nw) // 2, H - nh
    # sfuma i bordi sinistro/destro/alto del girato originale (le braccia tagliate non finiscono di netto)
    edge = np.ones((nh, nw), np.float32)
    fe = 70
    ramp = np.linspace(0, 1, fe, dtype=np.float32)
    edge[:, :fe] *= ramp[None, :]
    edge[:, -fe:] *= ramp[::-1][None, :]
    edge[:fe, :] *= ramp[:, None]

    sess = ort.InferenceSession(str(MODEL), providers=["CPUExecutionProvider"])
    rec = [np.zeros((1, 1, 1, 1), np.float32)] * 4
    ratio = np.array([a.ratio], np.float32)
    tmp = edit / "base_studio_video.mp4"
    out_v = writer(tmp)
    out_m = writer(edit / "matte.mp4", gray=True)
    for n, frame in enumerate(reader(src)):
        x = frame.astype(np.float32).transpose(2, 0, 1)[None] / 255.0
        fgr, pha, *rec = sess.run(None, {"src": x, "r1i": rec[0], "r2i": rec[1], "r3i": rec[2], "r4i": rec[3], "downsample_ratio": ratio})
        fg = cv2.resize(fgr[0].transpose(1, 2, 0) * 255.0, (nw, nh), interpolation=cv2.INTER_AREA)
        al = cv2.resize(pha[0, 0], (nw, nh), interpolation=cv2.INTER_AREA) * edge
        A = np.zeros((H, W), np.float32)
        F = np.zeros((H, W, 3), np.float32)
        A[oy:, ox:ox + nw] = al
        F[oy:, ox:ox + nw] = fg
        # ombra morbida dietro la persona (spostata in basso a destra)
        sh = cv2.GaussianBlur(A, (0, 0), 38)
        sh2 = np.zeros_like(sh)
        sh2[26:, 18:] = sh[:-26, :-18]  # spostata in basso a destra, senza rientrare dal bordo opposto
        sh = sh2 * 0.16
        base = bg * (1 - sh[..., None])
        a3 = A[..., None]
        comp = F * a3 + base * (1 - a3)
        out_v.stdin.write(np.clip(comp + 0.5, 0, 255).astype(np.uint8).tobytes())
        out_m.stdin.write(np.clip(A * 255 + 0.5, 0, 255).astype(np.uint8).tobytes())
        if n % 100 == 0:
            print(f"\r  studio {n}", end="", file=sys.stderr, flush=True)
    out_v.stdin.close()
    out_m.stdin.close()
    out_v.wait()
    out_m.wait()
    subprocess.run(["ffmpeg", "-y", "-v", "error", "-i", str(tmp), "-i", str(src), "-map", "0:v", "-map", "1:a", "-c:v", "copy",
                    "-c:a", "copy", "-shortest", "-movflags", "+faststart", str(edit / "base.mp4")], check=True)
    shutil.copy2(edit / "base.mp4", edit / "base_studio.mp4")
    tmp.unlink()
    print(f"\nFatto: {edit / 'base.mp4'} (studio, scala {s}); scontorno in {edit / 'matte.mp4'}")


if __name__ == "__main__":
    main()
