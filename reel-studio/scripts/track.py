"""
Tracciamento di un punto (es. il palmo della mano) nel video, in locale.

python3 scripts/track.py <video> --at 5.7 --x 0.70 --y 0.50 --from 5.2 --to 6.2 [--patch 0.12]

Parte dal punto (x, y) normalizzato al secondo --at e lo segue in avanti e all'indietro fino a --from/--to,
con correlazione normalizzata (NCC) su un ritaglio attorno al punto, aggiornando lentamente il modello
(la mano ruota e si apre). Stampa JSON: [{ "t": secondi, "x": 0..1, "y": 0..1, "score": 0..1 }, ...]
"""
import argparse
import json
import subprocess

import numpy as np
from numpy.lib.stride_tricks import sliding_window_view

W = 360


def frames(video, start, end, h):
    raw = subprocess.check_output(
        ["ffmpeg", "-v", "error", "-ss", f"{start:.3f}", "-t", f"{end - start:.3f}", "-i", video, "-vf", f"fps=30,scale={W}:{h}", "-f", "rawvideo", "-pix_fmt", "gray", "-"]
    )
    return np.frombuffer(raw, np.uint8).reshape(-1, h, W).astype(np.float32)


def track(seq, x0, y0, ps, search):
    """seq: fotogrammi in ordine di tracciamento; restituisce posizioni in pixel."""
    half = ps // 2
    tpl = seq[0][y0 - half : y0 + half, x0 - half : x0 + half].copy()
    out = [(x0, y0, 1.0)]
    x, y = x0, y0
    for f in seq[1:]:
        x1, y1 = max(half, x - search), max(half, y - search)
        x2, y2 = min(f.shape[1] - half, x + search), min(f.shape[0] - half, y + search)
        region = f[y1 - half : y2 + half, x1 - half : x2 + half]
        win = sliding_window_view(region, (ps, ps))
        t = (tpl - tpl.mean()) / (tpl.std() + 1e-6)
        m = win.mean(axis=(-1, -2), keepdims=True)
        s = win.std(axis=(-1, -2), keepdims=True) + 1e-6
        ncc = (((win - m) / s) * t).mean(axis=(-1, -2))
        iy, ix = np.unravel_index(np.argmax(ncc), ncc.shape)
        x, y = x1 + ix, y1 + iy
        score = float(ncc[iy, ix])
        patch = f[y - half : y + half, x - half : x + half]
        if patch.shape == tpl.shape and score > 0.5:
            tpl = tpl * 0.8 + patch * 0.2  # il modello si adatta piano (la mano cambia forma)
        out.append((x, y, score))
    return out


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("video")
    ap.add_argument("--at", type=float, required=True)
    ap.add_argument("--x", type=float, required=True)
    ap.add_argument("--y", type=float, required=True)
    ap.add_argument("--from", dest="t0", type=float, required=True)
    ap.add_argument("--to", dest="t1", type=float, required=True)
    ap.add_argument("--patch", type=float, default=0.12, help="lato del ritaglio, frazione della larghezza")
    a = ap.parse_args()

    probe = json.loads(subprocess.check_output(["ffprobe", "-v", "error", "-select_streams", "v:0", "-show_entries", "stream=width,height", "-of", "json", a.video]))["streams"][0]
    h = int(round(probe["height"] * W / probe["width"] / 2) * 2)
    seq = frames(a.video, a.t0, a.t1, h)
    k0 = int(round((a.at - a.t0) * 30))
    ps = int(a.patch * W) // 2 * 2
    x0, y0 = int(a.x * W), int(a.y * h)
    fwd = track(seq[k0:], x0, y0, ps, 18)
    bwd = track(seq[: k0 + 1][::-1], x0, y0, ps, 18)[::-1]
    pts = bwd[:-1] + fwd
    print(json.dumps([{"t": round(a.t0 + i / 30, 3), "x": round(px / W, 4), "y": round(py / h, 4), "score": round(s, 3)} for i, (px, py, s) in enumerate(pts)]))


if __name__ == "__main__":
    main()
