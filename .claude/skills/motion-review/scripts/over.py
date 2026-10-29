"""Anteprima veloce senza render: sovrappone le istantanee trasparenti di HyperFrames ai fotogrammi del montato.

    npx hyperframes snapshot <hf> --at 0.3,1.4 --no-end -o <dir>
    python over.py <dir> --base <edit>/base.mp4 [-o <dir>/over.jpg]

Legge i file `frame-NN-at-<t>s.png` (o `at-<t>s.png`), prende da base.mp4 il fotogramma allo stesso tempo, compone e
salva un foglio con le zone coperte da Instagram segnate. La camera di compose.py (punch, inset…) qui non c'è.
"""
import argparse
import re
import subprocess
from pathlib import Path

from PIL import Image, ImageDraw


def base_frame(video: str, t: float) -> Image.Image:
    raw = subprocess.run(["ffmpeg", "-v", "error", "-ss", f"{t:.3f}", "-i", video, "-frames:v", "1", "-vf", "scale=1080:1920",
                          "-f", "rawvideo", "-pix_fmt", "rgb24", "-"], check=True, stdout=subprocess.PIPE).stdout
    if not raw:
        return Image.new("RGB", (1080, 1920), (20, 20, 20))
    return Image.frombytes("RGB", (1080, 1920), raw)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("dir")
    ap.add_argument("--base", required=True)
    ap.add_argument("-o", "--out")
    ap.add_argument("--cols", type=int, default=5)
    a = ap.parse_args()
    shots = []
    for p in sorted(Path(a.dir).glob("*.png")):
        m = re.search(r"at-([\d.]+)s\.png$", p.name)
        if m:
            shots.append((float(m.group(1)), p))
    shots.sort()
    tiles = []
    for t, p in shots:
        im = base_frame(a.base, t).convert("RGBA")
        im.alpha_composite(Image.open(p).convert("RGBA").resize((1080, 1920)))
        zones = Image.new("RGBA", im.size, (0, 0, 0, 0))
        dz = ImageDraw.Draw(zones)
        for box in ((0, 0, 1080, 280), (0, 1560, 1080, 1920), (900, 960, 1080, 1560)):
            dz.rectangle(box, fill=(255, 40, 60, 60))
        im.alpha_composite(zones)
        d = ImageDraw.Draw(im)
        d.rectangle((0, 0, 1080, 60), fill=(0, 0, 0, 255))
        d.text((14, 12), f"{t:.2f}s", fill=(212, 255, 58), font_size=34)
        tiles.append(im.convert("RGB").resize((360, 640)))
    cols = min(a.cols, len(tiles)) or 1
    rows = (len(tiles) + cols - 1) // cols
    sheet = Image.new("RGB", (360 * cols, 640 * rows), (30, 30, 30))
    for i, th in enumerate(tiles):
        sheet.paste(th, ((i % cols) * 360, (i // cols) * 640))
    out = a.out or str(Path(a.dir) / "over.jpg")
    sheet.save(out, quality=85)
    print(out)


if __name__ == "__main__":
    main()
