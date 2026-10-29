"""Scontorna un oggetto generato su fondo bianco (Nano Banana Pro / Google Flow) → PNG trasparente rifilato.

    python cutout.py <input.png|jpg> <output.png> [--threshold 236] [--feather 1.5] [--pad 24]

Il fondo è il bianco collegato ai bordi dell'immagine (flood fill), così le parti bianche DENTRO l'oggetto restano.
Il bordo dell'alfa è morbido in base a quanto il pixel è vicino al bianco, poi l'immagine viene rifilata al contenuto.
Controlla sempre il risultato su fondo scuro e su fondo chiaro (aloni bianchi = soglia troppo bassa).
"""
import argparse

import numpy as np
from PIL import Image, ImageDraw, ImageFilter


def cutout(src: str, dst: str, threshold: int = 236, feather: float = 1.5, pad: int = 24) -> None:
    img = Image.open(src).convert("RGB")
    rgb = np.asarray(img).astype(np.float32)
    whiteness = rgb.min(axis=2)  # vicino a 255 solo se tutti i canali sono alti (bianco, non colori chiari saturi)
    near_white = whiteness >= threshold

    # sfondo = regione quasi bianca collegata ai bordi
    mask = Image.fromarray(np.where(near_white, 255, 0).astype(np.uint8), "L").copy()  # copia: floodfill non scrive su buffer condivisi
    h, w = near_white.shape
    border = [(x, 0) for x in range(0, w, 4)] + [(x, h - 1) for x in range(0, w, 4)] + [(0, y) for y in range(0, h, 4)] + [(w - 1, y) for y in range(0, h, 4)]
    for xy in border:
        if mask.getpixel(xy) == 255:
            ImageDraw.floodfill(mask, xy, 128)
    background = np.asarray(mask) == 128

    # bordo = fascia di pochi pixel dell'oggetto a contatto con lo sfondo (lì i pixel sono mescolati col bianco)
    dil = lambda m, k: np.asarray(Image.fromarray((m * 255).astype(np.uint8)).filter(ImageFilter.MaxFilter(k))) > 0
    edge = dil(background, 5) & ~background
    core = ~background & ~edge

    # colore "vero" vicino al bordo: media dei colori del nucleo dell'oggetto, sbavata verso l'esterno
    radius = max(3.0, feather * 4)
    blur = lambda arr: np.asarray(Image.fromarray(np.clip(arr, 0, 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(radius))).astype(np.float32)
    cov = blur(core * 255.0)[..., None] / 255
    bled = np.dstack([blur(rgb[..., c] * core) for c in range(3)]) / np.maximum(cov, 1e-3)
    bled = np.where(cov > 1e-3, bled, rgb)

    # alfa del bordo: quanto il pixel si è allontanato dal bianco verso il colore dell'oggetto
    a_edge = np.clip(((255 - rgb) / np.maximum(255 - bled, 12)).mean(axis=2), 0, 1)
    alpha = np.where(background, 0.0, np.where(edge, a_edge, 1.0))
    a_img = Image.fromarray((alpha * 255).astype(np.uint8), "L")
    if feather > 0:
        a_img = a_img.filter(ImageFilter.GaussianBlur(feather / 2))
    a = np.asarray(a_img).astype(np.float32) / 255
    fg = np.where((background | edge)[..., None], bled, rgb)  # niente alone chiaro su fondi scuri
    out = np.dstack([np.clip(fg, 0, 255), a * 255]).astype(np.uint8)
    res = Image.fromarray(out, "RGBA")

    bbox = res.getchannel("A").point(lambda v: 255 if v > 8 else 0).getbbox()
    if bbox:
        l, t, r, b = bbox
        res = res.crop((max(0, l - pad), max(0, t - pad), min(w, r + pad), min(h, b + pad)))
    res.save(dst, optimize=True)
    print(f"{dst}: {res.size[0]}x{res.size[1]}")


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("src")
    ap.add_argument("dst")
    ap.add_argument("--threshold", type=int, default=236)
    ap.add_argument("--feather", type=float, default=1.5)
    ap.add_argument("--pad", type=int, default=24)
    a = ap.parse_args()
    cutout(a.src, a.dst, a.threshold, a.feather, a.pad)
