"""Cambia lo sfondo dietro chi parla: scontorno video stabile (RobustVideoMatting) + nuovo sfondo da un'immagine.

    python background.py --edit <edit_dir> --image sfondo.png [--blur 3] [--match 0.35] [--ratio 0.25]

- legge <edit_dir>/base.mp4 (il montato di video-use) e lo riscrive con il nuovo sfondo; l'originale resta in
  base_wall.mp4 (e si riparte sempre da lì, quindi si può rilanciare con un'altra immagine)
- scontorno: modello RVM (editor/assets/models/rvm_mobilenetv3_fp32.onnx, onnxruntime), ricorrente: tiene memoria dei
  fotogrammi precedenti, quindi niente sfarfallio; usa il colore del primo piano già "ripulito" dallo sfondo vecchio
  (niente aloni bianchi sui capelli)
- sfondo: l'immagine riempie il 9:16, un filo di sfocatura (profondità) e `--match` lo avvicina a luminosità e colore
  medi del girato, più un leggero "light wrap" sui bordi così la persona sta nella stanza
- salva anche <edit_dir>/matte.mp4 (alfa in scala di grigi) per controllare lo scontorno
Da eseguire PRIMA di speed.py e del resto della catena.
"""
import argparse
import shutil
import subprocess
import sys
from pathlib import Path

import cv2
import numpy as np
import onnxruntime as ort

W, H, FPS = 1080, 1920, 30
MODEL = Path(__file__).resolve().parents[4] / "editor/assets/models/rvm_mobilenetv3_fp32.onnx"


def reader(path: Path):
    p = subprocess.Popen(["ffmpeg", "-v", "error", "-i", str(path), "-vf", f"fps={FPS}:start_time=0,scale={W}:{H}",
                          "-f", "rawvideo", "-pix_fmt", "rgb24", "-"], stdout=subprocess.PIPE)
    n = W * H * 3
    while True:
        buf = p.stdout.read(n)
        if len(buf) < n:
            break
        yield np.frombuffer(buf, np.uint8).reshape(H, W, 3)
    p.wait()


def writer(path: Path, gray: bool = False):
    return subprocess.Popen(["ffmpeg", "-y", "-v", "error", "-f", "rawvideo", "-pix_fmt", "gray" if gray else "rgb24",
                             "-s", f"{W}x{H}", "-r", str(FPS), "-i", "-", "-c:v", "libx264", "-preset", "medium",
                             "-crf", "14" if not gray else "18", "-pix_fmt", "yuv420p", str(path)], stdin=subprocess.PIPE)


def cover(img: np.ndarray) -> np.ndarray:
    h, w = img.shape[:2]
    s = max(W / w, H / h)
    r = cv2.resize(img, (int(round(w * s)), int(round(h * s))), interpolation=cv2.INTER_AREA if s < 1 else cv2.INTER_CUBIC)
    y, x = (r.shape[0] - H) // 2, (r.shape[1] - W) // 2
    return r[y:y + H, x:x + W]


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--edit", required=True)
    ap.add_argument("--image", required=True)
    ap.add_argument("--blur", type=float, default=3.0, help="sfocatura dello sfondo in px (profondità di campo)")
    ap.add_argument("--match", type=float, default=0.35, help="0–1: quanto avvicinare lo sfondo alla luce del girato")
    ap.add_argument("--ratio", type=float, default=0.25, help="downsample_ratio di RVM (0.25 per 1080p)")
    a = ap.parse_args()
    edit = Path(a.edit)
    src = edit / "base_wall.mp4"
    if not src.exists():
        shutil.copy2(edit / "base.mp4", src)

    bg = cv2.cvtColor(cv2.imread(a.image, cv2.IMREAD_COLOR), cv2.COLOR_BGR2RGB)
    bg = cover(bg).astype(np.float32)
    if a.blur > 0:
        bg = cv2.GaussianBlur(bg, (0, 0), a.blur)

    sess = ort.InferenceSession(str(MODEL), providers=["CPUExecutionProvider"])
    rec = [np.zeros((1, 1, 1, 1), np.float32)] * 4
    ratio = np.array([a.ratio], np.float32)
    tmp = edit / "base_bg_video.mp4"
    out_v = writer(tmp)
    out_m = writer(edit / "matte.mp4", gray=True)
    stats = None
    for n, frame in enumerate(reader(src)):
        x = frame.astype(np.float32).transpose(2, 0, 1)[None] / 255.0
        fgr, pha, *rec = sess.run(None, {"src": x, "r1i": rec[0], "r2i": rec[1], "r3i": rec[2], "r4i": rec[3], "downsample_ratio": ratio})
        fg = fgr[0].transpose(1, 2, 0) * 255.0
        al = pha[0, 0]
        if stats is None and a.match > 0:
            # luce e colore del girato (dove c'è sfondo vecchio no: solo la persona) → lo sfondo nuovo si avvicina
            m = al > 0.6
            ref_mean = frame[m].mean(0) if m.any() else frame.reshape(-1, 3).mean(0)
            gain = (ref_mean / max(1.0, ref_mean.mean())) / (bg.reshape(-1, 3).mean(0) / max(1.0, bg.mean()))
            bg = np.clip(bg * (1 + (gain - 1) * a.match * 0.5), 0, 255)
            stats = True
        a3 = al[..., None]
        # light wrap: un po' dello sfondo sfocato entra nei bordi della persona
        wrap = np.clip((1 - cv2.GaussianBlur(al, (0, 0), 10)) * al, 0, 1)[..., None] * 0.35
        blurred_bg = cv2.GaussianBlur(bg, (0, 0), 14)
        comp = fg * a3 + bg * (1 - a3)
        comp = comp * (1 - wrap) + blurred_bg * wrap
        out_v.stdin.write(np.clip(comp + 0.5, 0, 255).astype(np.uint8).tobytes())
        out_m.stdin.write(np.clip(al * 255 + 0.5, 0, 255).astype(np.uint8).tobytes())
        if n % 100 == 0:
            print(f"\r  sfondo {n}", end="", file=sys.stderr, flush=True)
    out_v.stdin.close()
    out_m.stdin.close()
    out_v.wait()
    out_m.wait()
    # audio dal montato originale
    subprocess.run(["ffmpeg", "-y", "-v", "error", "-i", str(tmp), "-i", str(src), "-map", "0:v", "-map", "1:a", "-c:v", "copy",
                    "-c:a", "copy", "-shortest", "-movflags", "+faststart", str(edit / "base.mp4")], check=True)
    tmp.unlink()
    print(f"\nFatto: {edit / 'base.mp4'} con lo sfondo {Path(a.image).name}; scontorno in {edit / 'matte.mp4'}")


if __name__ == "__main__":
    main()
