"""Foglio di controllo degli still, prima del render completo.

    python .claude/skills/motion-hyperframes/scripts/camera.py --edit <edit_dir> --stills 0.3,1.4 --snap-dir <snapshot>
    python stills.py <edit_dir>/review/stills [-o <dir>/sheet.jpg]

Legge i `t_XX.XX.png` della cartella e salva fogli 4×2 con le zone coperte da Instagram in rosso
(sopra y=250, sotto y=1720, 55 px per lato, icone a destra di x=930 da y=1250) e il tempo su ogni fotogramma.
"""
import argparse
import sys
from pathlib import Path

from PIL import Image

sys.path.insert(0, str(Path(__file__).parent))
from review import H, W, guides  # noqa: E402


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("dir")
    ap.add_argument("-o", "--out")
    a = ap.parse_args()
    d = Path(a.dir)
    files = sorted(d.glob("t_*.png"))
    if not files:
        sys.exit(f"Nessun t_*.png in {d}")
    thumbs = [guides(Image.open(f).convert("RGB").resize((W, H)), f"{float(f.stem[2:]):.2f}s").resize((360, 640)) for f in files]
    out = Path(a.out) if a.out else d / "sheet.jpg"
    for k in range(0, len(thumbs), 8):
        sheet = Image.new("RGB", (360 * 4, 640 * 2), (30, 30, 30))
        for i, th in enumerate(thumbs[k: k + 8]):
            sheet.paste(th, ((i % 4) * 360, (i // 4) * 640))
        p = out if len(thumbs) <= 8 else out.with_name(f"{out.stem}_{k // 8 + 1:02d}{out.suffix}")
        sheet.save(p, quality=85)
        print(p)


if __name__ == "__main__":
    main()
