"""
Ritaglio della persona (matte), in locale, col modello di segmentazione MediaPipe eseguito da LiteRT (solo CPU).

python3 scripts/matte.py <video> <matte_out.mp4> [--model models/selfie_multiclass.tflite]

Legge i fotogrammi con ffmpeg a 256x256, calcola la probabilità "persona" (tutto ciò che non è sfondo:
capelli, pelle, vestiti), la ammorbidisce nel tempo, e scrive un video in scala di grigi (bianco = persona)
con durata e risoluzione del sorgente. scripts/matte.ts lo combina col video in un WebM con canale alpha,
usato da Remotion per mettere grafiche DIETRO la persona o farla sparire.
Requisiti: pip install ai-edge-litert numpy ; modelli in models/ (npm run matte li scarica).
"""
import argparse
import json
import subprocess
import sys

import numpy as np
from ai_edge_litert.interpreter import Interpreter

N = 256


def probe(path):
    out = subprocess.check_output(
        ["ffprobe", "-v", "error", "-select_streams", "v:0", "-show_entries", "stream=width,height,r_frame_rate", "-of", "json", path]
    )
    s = json.loads(out)["streams"][0]
    n, d = s["r_frame_rate"].split("/")
    return s["width"], s["height"], float(n) / float(d)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("video")
    ap.add_argument("out")
    ap.add_argument("--model", default="models/selfie_multiclass.tflite")
    ap.add_argument("--plate-out", help="ricostruisce lo sfondo senza persona (mediana dei punti non coperti) e lo salva qui")
    ap.add_argument("--plate-window", help="usa solo i fotogrammi tra a-b secondi (stessa inquadratura dell'effetto)")
    a = ap.parse_args()

    w, h, fps = probe(a.video)
    total = int(float(subprocess.check_output(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", a.video])) * fps)
    win = [float(x) for x in a.plate_window.split("-")] if a.plate_window else [0, total / fps]
    every = max(1, int((win[1] - win[0]) * fps) // 80)
    samples = []
    it = Interpreter(model_path=a.model, num_threads=4)
    it.allocate_tensors()
    inp = it.get_input_details()[0]["index"]
    out = it.get_output_details()[0]["index"]

    dec = subprocess.Popen(
        ["ffmpeg", "-v", "error", "-i", a.video, "-vf", f"scale={N}:{N}:flags=area", "-f", "rawvideo", "-pix_fmt", "rgb24", "-"],
        stdout=subprocess.PIPE,
    )
    enc = subprocess.Popen(
        [
            "ffmpeg", "-v", "error", "-y", "-f", "rawvideo", "-pix_fmt", "gray", "-s", f"{N}x{N}", "-r", str(fps), "-i", "-",
            "-vf", f"scale={w}:{h}:flags=bicubic,gblur=sigma=2", "-c:v", "libx264", "-pix_fmt", "yuv420p", "-crf", "14", a.out,
        ],
        stdin=subprocess.PIPE,
    )

    size = N * N * 3
    prev = None
    i = 0
    while True:
        buf = dec.stdout.read(size)
        if len(buf) < size:
            break
        x = np.frombuffer(buf, np.uint8).reshape(1, N, N, 3).astype(np.float32) / 127.5 - 1.0
        it.set_tensor(inp, x)
        it.invoke()
        y = it.get_tensor(out)[0]
        # multiclasse (logit): softmax, canale 0 = sfondo; modello semplice: unico canale = probabilità persona
        if y.shape[-1] > 1:
            e = np.exp(y - y.max(-1, keepdims=True))
            person = 1.0 - e[..., 0] / e.sum(-1)
        else:
            person = y[..., 0]
        prev = person if prev is None else prev * 0.3 + person * 0.7
        alpha = np.clip((prev - 0.3) / 0.4, 0, 1)
        enc.stdin.write((alpha * 255).astype(np.uint8).tobytes())
        if a.plate_out and i % every == 0 and win[0] <= i / fps <= win[1]:
            samples.append(i)
        i += 1
        if i % 90 == 0:
            print(f"  matte {i} frame", file=sys.stderr)

    enc.stdin.close()
    enc.wait()
    dec.wait()
    print(f"{i} frame → {a.out}", file=sys.stderr)
    if a.plate_out:
        build_plate(a.video, a.out, samples, fps, w, h, a.plate_out)


def build_plate(video, matte, samples, fps, w, h, out):
    """Sfondo pulito: per ogni pixel, mediana dei fotogrammi in cui la persona NON lo copre; i buchi si riempiono dai bordi."""
    pw, ph = 270, int(round(h * 270 / w))

    def grab(path, t, fmt, ch):
        raw = subprocess.check_output(
            ["ffmpeg", "-v", "error", "-ss", f"{t:.3f}", "-i", path, "-frames:v", "1", "-vf", f"scale={pw}:{ph}", "-f", "rawvideo", "-pix_fmt", fmt, "-"]
        )
        return np.frombuffer(raw, np.uint8).reshape(ph, pw, ch).astype(np.float32)

    frames, alphas = [], []
    for k in samples:
        t = k / fps
        frames.append(grab(video, t, "rgb24", 3))
        alphas.append(grab(matte, t, "gray", 1)[..., 0] / 255.0)
    F = np.stack(frames)
    A = np.stack(alphas)
    # allarga la persona di qualche pixel: i bordi del ritaglio non sono perfetti
    from numpy.lib.stride_tricks import sliding_window_view
    pad = np.pad(A, ((0, 0), (6, 6), (6, 6)), mode="edge")
    A = sliding_window_view(pad, (13, 13), axis=(1, 2)).max(axis=(-1, -2))
    visible = A < 0.1
    Fm = np.where(visible[..., None], F, np.nan)
    plate = np.nanmedian(Fm, axis=0)
    known = visible.any(axis=0)
    # riempimento dei buchi: sfocature successive solo sui pixel sconosciuti (push-pull semplice)
    filled = np.where(known[..., None], plate, 0.0)
    weight = known.astype(np.float32)
    for r in [2, 4, 8, 16, 32, 64]:
        k = np.ones(2 * r + 1, np.float32)
        def blur(x):
            x = np.apply_along_axis(lambda m: np.convolve(m, k, mode="same"), 0, x)
            return np.apply_along_axis(lambda m: np.convolve(m, k, mode="same"), 1, x)
        num = np.stack([blur(filled[..., c] * weight) for c in range(3)], -1)
        den = blur(weight)[..., None]
        guess = num / np.maximum(den, 1e-6)
        hole = weight < 0.5
        filled = np.where(hole[..., None] & (den > 1e-3), guess, filled)
        weight = np.where(hole & (den[..., 0] > 1e-3), 1.0, weight)
    # ammorbidisce solo le zone ricostruite (niente blocchi)
    k = np.ones(9, np.float32) / 9
    soft = filled.copy()
    for _ in range(3):
        soft = np.apply_along_axis(lambda m: np.convolve(m, k, mode="same"), 0, soft)
        soft = np.apply_along_axis(lambda m: np.convolve(m, k, mode="same"), 1, soft)
    filled = np.where(known[..., None], filled, soft)
    img = np.clip(np.nan_to_num(filled), 0, 255).astype(np.uint8)
    subprocess.run(
        ["ffmpeg", "-v", "error", "-y", "-f", "rawvideo", "-pix_fmt", "rgb24", "-s", f"{pw}x{ph}", "-i", "-", "-vf", f"scale={w}:{h}:flags=bicubic", "-q:v", "2", out],
        input=img.tobytes(),
        check=True,
    )
    print(f"sfondo ricostruito ({known.mean() * 100:.0f}% visto almeno una volta) → {out}", file=sys.stderr)


if __name__ == "__main__":
    main()
