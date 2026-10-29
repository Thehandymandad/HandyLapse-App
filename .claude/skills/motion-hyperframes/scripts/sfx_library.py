"""Libreria di effetti sonori dell'editor (editor/assets/sfx/): un file per evento, con il prompt che l'ha generato.

    python sfx_library.py list
    python sfx_library.py missing <edit_dir>                     # effetti del motion-plan che non sono in libreria
    python sfx_library.py generate <nome> "<prompt in inglese>" [--duration 1.2] [--influence 0.6]
    python sfx_library.py rebuild                                # ricrea le varianti dal catalogo (i WAV non sono nel repo)
    python sfx_library.py synth <nome> --kind charge --duration 4.8 [--f0 260 --f1 780]   # barra che si carica
    python sfx_library.py variant <nome> --from <file o nome bundled di media-use> [--pitch 1.2] [--trim-start 0]
                                  [--trim 0.6] [--reverse] [--layer <altro file/nome>] [--layer-gain -6] [--seq 0,0.13,0.26]

`variant` crea un effetto nuovo da uno esistente (gratis, offline): intonazione/velocità, taglio, inversione, strato
con un secondo suono, o una sequenza dello stesso suono ripetuto agli istanti dati (es. una pila di tonfi).
I suoni gratuiti di base: i 21 inclusi in media-use (~/.claude/skills/media-use/audio/assets/sfx/) e Openverse
(`npx hyperframes media-use resolve --type sfx --intent "<suono concreto>" --project editor`, con
NODE_USE_ENV_PROXY=1 e NODE_EXTRA_CA_CERTS=/root/.ccr/ca-bundle.crt; serve api.openverse.org nella rete dell'ambiente).

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


BUNDLED = Path.home() / ".claude/skills/media-use/audio/assets/sfx"


def resolve_src(ref: str) -> Path:
    p = Path(ref)
    if p.exists():
        return p
    for base in (LIB, BUNDLED):
        for ext in ("", ".wav", ".mp3", ".ogg", ".flac"):
            q = base / f"{ref}{ext}"
            if q.exists() and q.is_file():
                return q
    man = BUNDLED / "manifest.json"
    if man.exists():
        m = json.loads(man.read_text())
        if ref in m:
            return BUNDLED / m[ref]["file"]
    sys.exit(f"suono non trovato: {ref}")


def variant(name, src, pitch, trim_start, trim, reverse, layer, layer_gain, seq) -> None:
    LIB.mkdir(parents=True, exist_ok=True)
    base = resolve_src(src)
    chain = [f"aformat=sample_rates=48000:channel_layouts=stereo", f"asetrate={48000 * pitch:.0f}", "aresample=48000"]
    if trim_start or trim:
        chain.append(f"atrim=start={trim_start}" + (f":duration={trim}" if trim else ""))
        chain.append("asetpts=PTS-STARTPTS")
    if reverse:
        chain.append("areverse")
    inputs = ["-i", str(base)]
    graph = f"[0:a]{','.join(chain)}[a]"
    last = "a"
    if seq:
        times = [float(x) for x in seq.split(",")]
        graph += f";[a]asplit={len(times)}" + "".join(f"[r{i}]" for i in range(len(times)))
        graph += "".join(f";[r{i}]adelay={int(t * 1000)}|{int(t * 1000)}[d{i}]" for i, t in enumerate(times))
        graph += ";" + "".join(f"[d{i}]" for i in range(len(times))) + f"amix=inputs={len(times)}:normalize=0[s]"
        last = "s"
    if layer:
        inputs += ["-i", str(resolve_src(layer))]
        graph += f";[1:a]aformat=sample_rates=48000:channel_layouts=stereo,volume={layer_gain}dB[l];[{last}][l]amix=inputs=2:normalize=0:duration=longest[m]"
        last = "m"
    graph += f";[{last}]areverse,afade=t=in:d=0.04,areverse[out]"  # dissolvenza finale di 40 ms
    out = LIB / f"{name}.wav"
    subprocess.run(["ffmpeg", "-y", "-v", "error", *inputs, "-filter_complex", graph, "-map", "[out]", "-ar", "48000", str(out)], check=True)
    cat = load()
    cat[name] = {"file": out.name, "from": base.name, "pitch": pitch, "trim_start": trim_start, "trim": trim, "reverse": reverse, "layer": layer, "layer_gain": layer_gain, "seq": seq}
    save(cat)
    print(out)


def synth(name: str, kind: str, duration: float, f0: float, f1: float) -> None:
    """Suoni sintetizzati in locale (gratis, senza licenze). kind "charge": il suono di una barra che si carica, un tono
    morbido che sale da f0 a f1 Hz per `duration` secondi (glissando esponenziale + ottava, leggero luccichio, piccolo
    riverbero), cresce un po' di volume e si chiude pulito sul 100%."""
    if kind != "charge":
        sys.exit(f"tipo di sintesi sconosciuto: {kind}")
    T, r = duration, f1 / f0
    ph = f"2*PI*{f0}*{T}/log({r})*(pow({r},t/{T})-1)"
    expr = f"0.32*(sin({ph})+0.28*sin(2*({ph}))+0.08*sin(3*({ph})))*(0.55+0.45*t/{T})*(1+0.12*sin(2*PI*13*t))"
    # dissolvenze sul tono, PRIMA del riverbero: la coda si spegne da sola, niente clic alla fine
    graph = (f"aevalsrc='{expr}|{expr}':s=48000:d={T},afade=t=in:d=0.25,afade=t=out:st={T - 0.14:.3f}:d=0.14,"
             f"lowpass=f=5200,apad=pad_dur=0.25,aecho=0.8:0.5:60|110:0.22|0.12")
    out = LIB / f"{name}.wav"
    subprocess.run(["ffmpeg", "-y", "-v", "error", "-f", "lavfi", "-i", graph, "-ar", "48000", str(out)], check=True)
    cat = load()
    cat[name] = {"file": out.name, "synth": kind, "duration": duration, "f0": f0, "f1": f1}
    save(cat)
    print(out)


def rebuild() -> None:
    """Le varianti derivano da suoni Pixabay (licenza: uso nei video sì, ridistribuzione come libreria no): nel repo
    c'è solo catalog.json con le ricette, i WAV si rigenerano qui."""
    for name, v in load().items():
        if "synth" in v and not (LIB / v["file"]).exists():
            synth(name, v["synth"], v["duration"], v["f0"], v["f1"])
        if "from" in v and not (LIB / v["file"]).exists():
            variant(name, Path(v["from"]).stem, v.get("pitch", 1.0), v.get("trim_start", 0.0), v.get("trim", 0.0),
                    v.get("reverse", False), v.get("layer"), v.get("layer_gain", -6.0), v.get("seq"))


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
    sub.add_parser("rebuild")
    m = sub.add_parser("missing")
    m.add_argument("edit_dir")
    g = sub.add_parser("generate")
    g.add_argument("name")
    g.add_argument("prompt")
    g.add_argument("--duration", type=float, default=1.0)
    g.add_argument("--influence", type=float, default=0.6)
    v = sub.add_parser("variant")
    v.add_argument("name")
    v.add_argument("--from", dest="src", required=True)
    v.add_argument("--pitch", type=float, default=1.0)
    v.add_argument("--trim-start", type=float, default=0.0)
    v.add_argument("--trim", type=float, default=0.0)
    v.add_argument("--reverse", action="store_true")
    v.add_argument("--layer")
    v.add_argument("--layer-gain", type=float, default=-6.0)
    v.add_argument("--seq")
    y = sub.add_parser("synth")
    y.add_argument("name")
    y.add_argument("--kind", default="charge")
    y.add_argument("--duration", type=float, default=2.0)
    y.add_argument("--f0", type=float, default=260.0)
    y.add_argument("--f1", type=float, default=780.0)
    a = ap.parse_args()
    if a.cmd == "list":
        for k, v in load().items():
            print(f"{k:28s} {v.get('prompt') or ('sintesi ' + v['synth'] if 'synth' in v else 'da ' + str(v.get('from')))}")
    elif a.cmd == "rebuild":
        rebuild()
    elif a.cmd == "variant":
        variant(a.name, a.src, a.pitch, a.trim_start, a.trim, a.reverse, a.layer, a.layer_gain, a.seq)
    elif a.cmd == "synth":
        synth(a.name, a.kind, a.duration, a.f0, a.f1)
    elif a.cmd == "missing":
        missing(a.edit_dir)
    else:
        generate(a.name, a.prompt, a.duration, a.influence)


if __name__ == "__main__":
    sys.exit(main())
