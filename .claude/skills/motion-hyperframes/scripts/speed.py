"""Velocizza (o rallenta) il parlato montato e riallinea tutto: voce più veloce senza cambiare tono.

    python speed.py <edit_dir> --factor 1.1

- base.mp4 → accelerato di `factor` (video setpts, audio atempo: stesso timbro); l'originale resta in base_1x.mp4
- words_out.json e motion-plan.json: tutti i tempi divisi per `factor` (parole, giunte, scene, colpi, effetti, camera,
  props che finiscono in `At`, `reveal`, `items[].at`); gli originali restano in *_1x.json e si riparte sempre da lì,
  quindi si può rilanciare con un altro fattore (1 = torna com'era).
Poi si rifà il resto della catena (plan_to_reel, hf-project, camera-track, render, camera.py, compose.py).
Le animazioni dentro le grafiche non si accelerano: entrano con la loro molla, solo prima.
"""
import argparse
import json
import shutil
import subprocess
from pathlib import Path


def scale_props(props: dict, k: float) -> None:
    """Divide per k i tempi delle props (chiavi in `At`, `at`, `typeFrom`, `reveal`), anche dentro liste di oggetti."""
    for key, v in list(props.items()):
        if key.endswith("At") or key in ("at", "typeFrom", "reveal"):
            if isinstance(v, list) and all(isinstance(x, (int, float)) for x in v):
                props[key] = [round(x / k, 3) for x in v]
            elif isinstance(v, (int, float)):
                props[key] = round(v / k, 3)
        elif isinstance(v, list):
            for it in v:
                if isinstance(it, dict):
                    scale_props(it, k)
        elif isinstance(v, dict):
            scale_props(v, k)


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("edit")
    ap.add_argument("--factor", type=float, required=True)
    a = ap.parse_args()
    edit, k = Path(a.edit), a.factor

    # backup degli originali (una volta sola)
    for name in ("base.mp4", "words_out.json", "motion-plan.json"):
        src = edit / name
        bak = edit / name.replace(".", "_1x.", 1)
        if not bak.exists():
            shutil.copy2(src, bak)

    subprocess.run([
        "ffmpeg", "-y", "-v", "error", "-i", str(edit / "base_1x.mp4"),
        "-filter_complex", f"[0:v]setpts=(PTS-STARTPTS)/{k},fps=30[v];[0:a]asetpts=PTS-STARTPTS,atempo={k}[a]",
        "-map", "[v]", "-map", "[a]", "-c:v", "libx264", "-preset", "medium", "-crf", "16", "-pix_fmt", "yuv420p",
        "-c:a", "aac", "-b:a", "256k", "-ar", "48000", "-movflags", "+faststart", str(edit / "base.mp4"),
    ], check=True)

    wo = json.loads((edit / "words_out_1x.json").read_text())
    wo["duration"] = round(wo["duration"] / k, 3)
    for w in wo["words"]:
        w["start"], w["end"] = round(w["start"] / k, 3), round(w["end"] / k, 3)
    for s in wo.get("segments", []):
        s["out_start"], s["out_end"] = round(s["out_start"] / k, 3), round(s["out_end"] / k, 3)
    wo["speed"] = k
    (edit / "words_out.json").write_text(json.dumps(wo, ensure_ascii=False, indent=1))

    plan = json.loads((edit / "motion-plan_1x.json").read_text())
    hold = float(plan.get("hold", 0))
    if "duration" in plan:
        plan["duration"] = round((plan["duration"] - hold) / k + hold, 3)
    talk = float(json.loads((edit / "words_out_1x.json").read_text())["duration"])

    def scale_t(x: float) -> float:
        # il fermo finale (oltre la fine del parlato) non si accelera: resta lungo uguale
        return round(x / k, 3) if x <= talk else round(talk / k + (x - talk), 3)

    for sc in plan.get("scenes", []):
        sc["start"], sc["end"] = scale_t(sc["start"]), scale_t(sc["end"])
        if sc.get("payoff"):
            sc["payoff"]["t"] = round(sc["payoff"]["t"] / k, 3)
        for e in sc.get("sfx", []):
            e["t"] = round(e["t"] / k, 3)
        if (sc.get("graphic") or {}).get("props"):
            scale_props(sc["graphic"]["props"], k)
    for e in plan.get("sfx", []):
        e["t"] = round(e["t"] / k, 3)
    for c in plan.get("camera", []):
        c["t"] = round(c["t"] / k, 3)
    plan["speed"] = k
    (edit / "motion-plan.json").write_text(json.dumps(plan, ensure_ascii=False, indent=1))
    dur = subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", str(edit / "base.mp4")],
                         capture_output=True, text=True).stdout.strip()
    print(f"velocità {k}x: base.mp4 {dur} s (prima {wo['duration'] * k:.2f} s), piano e parole riallineati")


if __name__ == "__main__":
    main()
