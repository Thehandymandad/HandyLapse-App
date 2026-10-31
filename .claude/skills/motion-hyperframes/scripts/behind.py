"""Testo e grafiche DIETRO chi parla (con lo scontorno di studio.py o background.py).

    python behind.py prep <edit_dir>    → <edit_dir>/behind/reel.json (solo le grafiche con "behind": true, senza sottotitoli)
    (poi: hf-project + hyperframes render di <edit_dir>/behind → <edit_dir>/behind.webm)
    python behind.py merge <edit_dir>   → base.mp4 = fondo + grafiche dietro (bucate dove c'è la persona) + persona

merge parte sempre da base_studio.mp4 (o base_wall.mp4 se manca) e usa matte.mp4 come maschera della persona.
"""
import json
import shutil
import subprocess
import sys
from pathlib import Path


def prep(edit: Path) -> None:
    reel = json.loads((edit / "reel.json").read_text())
    b = edit / "behind"
    b.mkdir(exist_ok=True)
    gr = [dict(g, behind=False) for g in reel.get("graphics", []) if g.get("behind")]
    out = dict(reel, graphics=gr, words=[], emphasis=[], hook=None, cta=None, zooms=[])
    (b / "reel.json").write_text(json.dumps(out, ensure_ascii=False, indent=1))
    src = edit / reel["source"]["file"] if isinstance(reel.get("source"), dict) and reel["source"].get("file") else edit / "base.mp4"
    link = b / Path(src).name
    if not link.exists():
        link.symlink_to(Path(src).resolve())
    print(f"{b / 'reel.json'}: {len(gr)} grafiche dietro la persona")


def merge(edit: Path) -> None:
    base = edit / "base_studio.mp4"
    if not base.exists():
        base = edit / "base_wall.mp4"
    tmp = edit / "base_behind_tmp.mp4"
    fc = ("[1:v]format=rgba,split[b][bb];[bb]alphaextract[ba];[2:v]format=gray,negate[mi];"
          "[ba][mi]blend=all_mode=multiply[am];[b][am]alphamerge[bm];[0:v][bm]overlay=eof_action=pass:format=auto[v]")
    subprocess.run(["ffmpeg", "-y", "-v", "error", "-i", str(base), "-c:v", "libvpx-vp9", "-i", str(edit / "behind.webm"), "-i", str(edit / "matte.mp4"),
                    "-filter_complex", fc, "-map", "[v]", "-map", "0:a", "-c:v", "libx264", "-preset", "medium", "-crf", "15",
                    "-pix_fmt", "yuv420p", "-c:a", "copy", "-movflags", "+faststart", str(tmp)], check=True)
    tmp.replace(edit / "base.mp4")
    print(f"Fatto: {edit / 'base.mp4'} con le grafiche dietro la persona")


if __name__ == "__main__":
    cmd, e = sys.argv[1], Path(sys.argv[2])
    {"prep": prep, "merge": merge}[cmd](e)
