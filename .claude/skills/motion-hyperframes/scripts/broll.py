"""B-roll a schermo intero (metodo Zane): per un tratto il girato lascia il posto a una clip inerente a ciò che si dice
(generata con Higgsfield/Kling o ripresa), mentre la voce continua.

    python broll.py <edit_dir>

Legge `broll` dal piano (<edit_dir>/motion-plan.json): [{"file": "broll/b2.mp4", "start": 3.15, "end": 4.15,
"from": 0.2}] (secondi della timeline di uscita; `from` = da dove partire dentro la clip, default 0). La clip riempie il
9:16 (ritagliata al centro) e va sopra il video di base.mp4 solo in quell'intervallo; l'audio resta quello di base.
L'originale resta in base_nobroll.mp4 e si riparte sempre da lì (si può rilanciare dopo aver cambiato il piano).
Da eseguire dopo background.py / speed.py e prima di camera-track e camera.py.
"""
import argparse
import json
import shutil
import subprocess
from pathlib import Path

W, H, FPS = 1080, 1920, 30


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("edit")
    a = ap.parse_args()
    edit = Path(a.edit)
    plan = json.loads((edit / "motion-plan.json").read_text())
    items = plan.get("broll") or []
    src = edit / "base_nobroll.mp4"
    if not src.exists():
        shutil.copy2(edit / "base.mp4", src)
    if not items:
        shutil.copy2(src, edit / "base.mp4")
        print("nessun B-roll nel piano: base.mp4 = base_nobroll.mp4")
        return
    inputs = ["-i", str(src)]
    chains = [f"[0:v]fps={FPS},scale={W}:{H},setsar=1[v0]"]
    last = "v0"
    for i, b in enumerate(items, start=1):
        f = Path(b["file"])
        if not f.is_absolute():
            f = edit / f
        start, end, off = float(b["start"]), float(b["end"]), float(b.get("from", 0))
        inputs += ["-i", str(f)]
        chains.append(
            f"[{i}:v]trim=start={off:.3f}:duration={end - start + 0.1:.3f},setpts=PTS-STARTPTS+{start:.3f}/TB,fps={FPS},"
            f"scale={W}:{H}:force_original_aspect_ratio=increase,crop={W}:{H},setsar=1[b{i}]"
        )
        chains.append(f"[{last}][b{i}]overlay=enable='between(t,{start:.3f},{end:.3f})':eof_action=pass[v{i}]")
        last = f"v{i}"
    out = edit / "base_broll_tmp.mp4"
    subprocess.run(
        ["ffmpeg", "-y", "-v", "error", *inputs, "-filter_complex", ";".join(chains), "-map", f"[{last}]", "-map", "0:a",
         "-c:v", "libx264", "-preset", "medium", "-crf", "16", "-pix_fmt", "yuv420p", "-c:a", "copy", "-movflags", "+faststart", str(out)],
        check=True,
    )
    out.replace(edit / "base.mp4")
    print(f"base.mp4: {len(items)} B-roll a schermo intero ({', '.join(f'{b['start']}–{b['end']}' for b in items)})")


if __name__ == "__main__":
    main()
