"""Libreria di effetti sonori dell'editor (editor/assets/sfx/): un file per evento, con il prompt che l'ha generato.

    python sfx_library.py list
    python sfx_library.py missing <edit_dir>                     # effetti del motion-plan che non sono in libreria
    python sfx_library.py generate <nome> "<prompt in inglese>" [--duration 1.2] [--influence 0.6]

`generate` usa ElevenLabs Sound Effects (stessa chiave di Scribe: ELEVENLABS_API_KEY nell'ambiente; in questo cloud
la chiave la aggiunge il proxy di rete). Ogni chiamata consuma crediti ElevenLabs: genera solo ciò che manca.
I nomi descrivono l'evento ("ciak-chiusura-legno", "timbro-gomma-2"), così ogni evento visivo ha un suono suo.
"""
import argparse
import json
import os
import subprocess
import sys
import urllib.request
from pathlib import Path

LIB = Path(__file__).resolve().parents[4] / "editor/assets/sfx"
CATALOG = LIB / "catalog.json"


def load() -> dict:
    return json.loads(CATALOG.read_text()) if CATALOG.exists() else {}


def save(cat: dict) -> None:
    CATALOG.write_text(json.dumps(dict(sorted(cat.items())), ensure_ascii=False, indent=1) + "\n")


def generate(name: str, prompt: str, duration: float, influence: float) -> None:
    LIB.mkdir(parents=True, exist_ok=True)
    body = json.dumps({"text": prompt, "duration_seconds": duration, "prompt_influence": influence}).encode()
    headers = {"Content-Type": "application/json", "Accept": "audio/mpeg"}
    if os.environ.get("ELEVENLABS_API_KEY"):
        headers["xi-api-key"] = os.environ["ELEVENLABS_API_KEY"]
    req = urllib.request.Request("https://api.elevenlabs.io/v1/sound-generation", data=body, headers=headers, method="POST")
    with urllib.request.urlopen(req, timeout=120) as r:
        mp3 = r.read()
    tmp = LIB / f".{name}.mp3"
    tmp.write_bytes(mp3)
    out = LIB / f"{name}.wav"
    # 48 kHz stereo, silenzio iniziale tolto (il colpo deve stare all'inizio del file)
    subprocess.run(["ffmpeg", "-y", "-v", "error", "-i", str(tmp), "-af", "silenceremove=start_periods=1:start_threshold=-50dB",
                    "-ar", "48000", "-ac", "2", str(out)], check=True)
    tmp.unlink()
    cat = load()
    cat[name] = {"file": out.name, "prompt": prompt, "duration": duration}
    save(cat)
    print(f"{out} ({len(mp3) // 1024} KB)")


def missing(edit_dir: str) -> None:
    plan = json.loads((Path(edit_dir) / "motion-plan.json").read_text())
    names = {e["name"] for e in plan.get("sfx", []) if "name" in e}
    for sc in plan.get("scenes", []):
        names |= {e["name"] for e in sc.get("sfx", []) if "name" in e}
    have = {p.stem for p in LIB.glob("*") if p.suffix in (".wav", ".mp3", ".ogg", ".flac")}
    miss = sorted(names - have)
    print(f"{len(names)} effetti nel piano, {len(miss)} da generare")
    for n in miss:
        print("  ", n)


def main() -> None:
    ap = argparse.ArgumentParser()
    sub = ap.add_subparsers(dest="cmd", required=True)
    sub.add_parser("list")
    m = sub.add_parser("missing")
    m.add_argument("edit_dir")
    g = sub.add_parser("generate")
    g.add_argument("name")
    g.add_argument("prompt")
    g.add_argument("--duration", type=float, default=1.0)
    g.add_argument("--influence", type=float, default=0.6)
    a = ap.parse_args()
    if a.cmd == "list":
        for k, v in load().items():
            print(f"{k:32s} {v['duration']:.1f}s  {v['prompt']}")
    elif a.cmd == "missing":
        missing(a.edit_dir)
    else:
        generate(a.name, a.prompt, a.duration, a.influence)


if __name__ == "__main__":
    sys.exit(main())
