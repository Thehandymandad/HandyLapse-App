"""Composizione finale: video + voce trattata + effetti sonori + master.

    python compose.py --edit <edit_dir> --base <base.mp4> --video <edit_dir>/remotion.mp4
                      [--sfx-dir editor/assets/sfx] [--gap 7] [--lufs -14] [-o <edit_dir>/final.mp4] [--preview]
    python compose.py --edit <edit_dir> --base <base.mp4> --overlay <grafiche.webm> [--overlay <altro.webm>]

- base.mp4: il montato di video-use (render.py con --no-subtitles): tagli, fade di 30 ms, grade. Da qui viene la voce.
- --video: il render di Remotion (muto, già con camera, grafiche, sottotitoli e fermo finale): si usa così com'è,
  la `camera` del piano e `hold` non si applicano di nuovo (la durata è quella del video).
- in alternativa --overlay: video con alfa (WebM VP9) sopra il montato, nell'ordine dal basso verso l'alto
  (i sottotitoli per ULTIMI), con la camera del piano fatta da ffmpeg.
- camera: `camera` di <edit_dir>/motion-plan.json → punch, push, shake, whip, inset, desat (vedi motion-library/camera.md).
- suono: la voce passa per EQ (+corpo, −fango, +presenza) e compressione; ogni effetto di `scenes[].sfx` / `sfx`
  ({"t": s, "name": "..."} o {"t": s, "file": "..."}) viene normalizzato allo stesso livello (picco di loudness su
  400 ms, quello che si sente) `--gap` dB sotto la loudness integrata della voce,
  anticipato del suo attacco così il transiente cade sul fotogramma; poi master a `--lufs` LUFS (true peak −1 dBTP).
- `hold` nel piano (o --hold): l'ultimo fotogramma resta fermo quei secondi, così la CTA finale si legge.
- salva gli stem in <edit_dir>/stems/ (voice.wav, sfx.wav) per motion-review.
"""
from __future__ import annotations

import argparse
import json
import math
import re
import subprocess
import sys
import tempfile
from pathlib import Path

import numpy as np

W, H, FPS = 1080, 1920, 30
VOICE_CHAIN = (
    "highpass=f=80,"
    "equalizer=f=140:t=q:w=1.1:g=2,"      # corpo
    "equalizer=f=320:t=q:w=1.2:g=-2.5,"   # fango
    "equalizer=f=3200:t=q:w=1.3:g=2.5,"   # presenza
    "equalizer=f=9000:t=q:w=1.5:g=1.5,"   # aria
    "acompressor=threshold=-21dB:ratio=3:attack=6:release=90:makeup=2"
)


def run(cmd: list[str], capture: bool = False) -> str:
    r = subprocess.run(cmd, check=True, stdout=subprocess.PIPE if capture else None, stderr=subprocess.PIPE, text=True)
    return (r.stdout or "") + (r.stderr or "")


def probe_duration(path: Path) -> float:
    out = run(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", str(path)], capture=True)
    return float(out.strip().splitlines()[0])


def loudness(path: Path) -> float:
    """Loudness integrata (LUFS); per file brevissimi ripiega sul volume medio (dBFS ≈ LUFS)."""
    out = run(["ffmpeg", "-hide_banner", "-nostats", "-i", str(path), "-af", "ebur128", "-f", "null", "-"], capture=True)
    m = re.findall(r"I:\s+(-?[\d.]+) LUFS", out)
    val = float(m[-1]) if m else -70.0
    if val <= -60:
        out = run(["ffmpeg", "-hide_banner", "-nostats", "-i", str(path), "-af", "volumedetect", "-f", "null", "-"], capture=True)
        m = re.search(r"mean_volume: (-?[\d.]+) dB", out)
        val = float(m.group(1)) if m else -30.0
    return val


def peak_loudness(path: Path) -> float:
    """Loudness momentanea massima (finestra 400 ms): per un effetto breve è quella che si sente, la media inganna."""
    out = run(["ffmpeg", "-hide_banner", "-nostats", "-i", str(path), "-af", "apad=pad_dur=0.5,ebur128", "-f", "null", "-"], capture=True)
    vals = [float(v) for v in re.findall(r"M:\s*(-?[\d.]+)", out)]
    vals = [v for v in vals if v > -70]
    return max(vals) if vals else loudness(path)


def attack_seconds(path: Path) -> float:
    """Tempo del primo campione sopra (picco − 30 dB): il file parte così in anticipo e il colpo cade sul frame."""
    raw = subprocess.run(["ffmpeg", "-v", "error", "-i", str(path), "-ac", "1", "-ar", "48000", "-f", "f32le", "-"], check=True, stdout=subprocess.PIPE).stdout
    x = np.abs(np.frombuffer(raw, np.float32))
    if not len(x) or x.max() <= 0:
        return 0.0
    idx = np.argmax(x >= x.max() * 10 ** (-30 / 20))
    return min(0.4, idx / 48000)


# ---------- camera: espressioni ffmpeg ----------

def ease_out(u: str) -> str:
    return f"(1-pow(1-({u}),3))"


def smooth(u: str) -> str:
    return f"(({u})*({u})*(3-2*({u})))"


def window(t0: float, t1: float, expr: str) -> str:
    return f"if(between(t,{t0:.3f},{t1:.3f}),{expr},0)"


def camera_exprs(ops: list[dict]) -> dict[str, str]:
    zoom, sx, sy, sat, inset = ["0"], ["0"], ["0"], ["0"], ["0"]
    blur: list[tuple[float, float]] = []
    for op in ops:
        k = op.get("type")
        if k == "punch":
            t, a = float(op["t"]), float(op.get("scale", 1.1)) - 1
            i, hold, o = float(op.get("in", 0.12)), float(op.get("hold", 0.6)), float(op.get("out", 0.35))
            zoom.append(window(t - i, t, f"{a}*{ease_out(f'(t-{t - i:.3f})/{i}')}"))
            zoom.append(window(t + 1e-3, t + hold, f"{a}"))
            zoom.append(window(t + hold + 1e-3, t + hold + o, f"{a}*(1-{smooth(f'(t-{t + hold:.3f})/{o}')})"))
        elif k == "push":
            a, b = float(op["start"]), float(op["end"])
            f0, f1 = float(op.get("from", 1.0)) - 1, float(op.get("to", 1.06)) - 1
            zoom.append(window(a, b, f"{f0}+({f1 - f0})*{smooth(f'(t-{a:.3f})/{b - a:.3f}')}"))
        elif k == "shake":
            t, d, amp = float(op["t"]), float(op.get("dur", 0.25)), float(op.get("amp", 16))
            env = f"exp(-4*(t-{t:.3f})/{d})"
            sx.append(window(t, t + d, f"{amp}*sin(2*PI*11*(t-{t:.3f}))*{env}"))
            sy.append(window(t, t + d, f"{amp * 0.7}*cos(2*PI*8*(t-{t:.3f}))*{env}"))
            zoom.append(window(t, t + d, f"0.04*{env}"))
        elif k == "whip":
            t, d, dr = float(op["t"]), float(op.get("dur", 0.18)), float(op.get("dir", 1))
            u = f"((t-{t - d / 2:.3f})/{d})"
            sx.append(window(t - d / 2, t + d / 2, f"{dr * 120}*sin(PI*{u})*(1-2*{u})"))
            zoom.append(window(t - d / 2, t + d / 2, f"0.1*sin(PI*{u})"))
            blur.append((t - d / 2, t + d / 2))
        elif k == "desat":
            a, b, amt = float(op["start"]), float(op["end"]), float(op.get("amount", 1))
            f = 0.1
            sat.append(window(a, a + f, f"{amt}*(t-{a:.3f})/{f}"))
            sat.append(window(a + f + 1e-3, b - f, f"{amt}"))
            sat.append(window(b - f + 1e-3, b, f"{amt}*({b:.3f}-t)/{f}"))
        elif k == "inset":
            a, b, sc = float(op["start"]), float(op["end"]), 1 - float(op.get("scale", 0.72))
            f = float(op.get("ease", 0.45))
            inset.append(window(a, a + f, f"{sc}*{smooth(f'(t-{a:.3f})/{f}')}"))
            inset.append(window(a + f + 1e-3, b - f, f"{sc}"))
            inset.append(window(b - f + 1e-3, b, f"{sc}*(1-{smooth(f'(t-{b - f:.3f})/{f}')})"))
        else:
            sys.exit(f"tipo di camera sconosciuto: {k}")
    return {
        "zoom": "1+" + "+".join(zoom),
        "sx": "+".join(sx),
        "sy": "+".join(sy),
        "sat": "1-(" + "+".join(sat) + ")",
        "inset": "1-(" + "+".join(inset) + ")",
        "blur": blur,
        "has_inset": len(inset) > 1,
        "has_sat": len(sat) > 1,
    }


def video_graph(cam: dict, n_overlays: int, cx: float, cy: float, dur: float, hold: float = 0.0) -> str:
    z = cam["zoom"]
    pad = f"tpad=stop_mode=clone:stop_duration={hold:.3f}," if hold > 0 else ""
    g = [
        f"[0:v]setpts=PTS-STARTPTS,fps={FPS},{pad}scale=w='2*trunc({W}*({z})/2)':h='2*trunc({H}*({z})/2)':eval=frame,"
        f"crop={W}:{H}:x='clip((iw-{W})*{cx}+({cam['sx']}),0,iw-{W})':y='clip((ih-{H})*{cy}+({cam['sy']}),0,ih-{H})'"
    ]
    for a, b in cam["blur"]:
        g[-1] += f",avgblur=sizeX=28:sizeY=1:enable='between(t,{a:.3f},{b:.3f})'"
    if cam["has_sat"]:
        g[-1] += f",hue=s='{cam['sat']}'"
    g[-1] += "[cam]"
    last = "cam"
    if cam["has_inset"]:
        s = cam["inset"]
        # il fondo nasce dallo stesso flusso (stessi tempi): un fondo `color` partirebbe prima e darebbe un fotogramma vuoto
        g.append("[cam]split[camA][camB]")
        g.append(f"[camA]scale=w='2*trunc({W}*({s})/2)':h='2*trunc({H}*({s})/2)':eval=frame[small]")
        g.append("[camB]drawbox=x=0:y=0:w=iw:h=ih:color=0x0B0B0C:t=fill[bg]")
        g.append("[bg][small]overlay=x='(W-w)/2':y='(H-h)/2':eval=frame[ins]")
        last = "ins"
    for i in range(n_overlays):
        g.append(f"[{last}][{i + 1}:v]overlay=0:0:eof_action=pass:format=auto[o{i}]")
        last = f"o{i}"
    g.append(f"[{last}]format=yuv420p[vout]")
    return ";\n".join(g)


# ---------- suono ----------

def sfx_events(plan: dict) -> list[dict]:
    ev = list(plan.get("sfx", []))
    for sc in plan.get("scenes", []):
        ev += sc.get("sfx", [])
    return sorted(ev, key=lambda e: float(e["t"]))


def resolve_sfx(e: dict, sfx_dir: Path) -> Path | None:
    if e.get("file"):
        p = Path(e["file"])
        return p if p.exists() else None
    for ext in (".wav", ".mp3", ".ogg", ".flac"):
        p = sfx_dir / f"{e['name']}{ext}"
        if p.exists():
            return p
    return None


def build_audio(base: Path, plan: dict, sfx_dir: Path, gap: float, lufs: float, dur: float, stems: Path, voice_fx: bool) -> Path:
    stems.mkdir(parents=True, exist_ok=True)
    voice = stems / "voice.wav"
    chain = (VOICE_CHAIN if voice_fx else "anull") + f",apad,atrim=0:{dur:.3f}"  # dur comprende il fermo finale
    run(["ffmpeg", "-y", "-v", "error", "-i", str(base), "-vn", "-af", chain, "-ar", "48000", "-ac", "2", str(voice)])
    lv = loudness(voice)

    events = sfx_events(plan)
    missing = [e.get("name") or e.get("file") for e in events if resolve_sfx(e, sfx_dir) is None]
    if missing:
        sys.exit("Effetti sonori mancanti in " + str(sfx_dir) + ":\n  " + "\n  ".join(sorted(set(map(str, missing)))))

    sfx = stems / "sfx.wav"
    if events:
        cache: dict[Path, tuple[float, float]] = {}
        inputs, chains = [], []
        for i, e in enumerate(events):
            p = resolve_sfx(e, sfx_dir)
            if p not in cache:
                cache[p] = (peak_loudness(p), attack_seconds(p))
            ls, att = cache[p]
            gain = (lv - gap) - ls + float(e.get("gain", 0))
            start_ms = max(0, int(round((float(e["t"]) - att) * 1000)))
            inputs += ["-i", str(p)]
            chains.append(f"[{i}:a]aformat=sample_rates=48000:channel_layouts=stereo,volume={gain:.2f}dB,adelay={start_ms}|{start_ms}[s{i}]")
        mix = "".join(f"[s{i}]" for i in range(len(events)))
        graph = ";".join(chains) + f";{mix}amix=inputs={len(events)}:normalize=0:duration=longest,apad,atrim=0:{dur:.3f}[sfx]"
        with tempfile.NamedTemporaryFile("w", suffix=".txt", delete=False) as fh:
            fh.write(graph)
        run(["ffmpeg", "-y", "-v", "error", *inputs, "-filter_complex_script", fh.name, "-map", "[sfx]", "-ar", "48000", str(sfx)])
    else:
        run(["ffmpeg", "-y", "-v", "error", "-f", "lavfi", "-i", f"anullsrc=r=48000:cl=stereo:d={dur:.3f}", str(sfx)])

    # master: voce + effetti, loudnorm in due passate
    pre = stems / "mix.wav"
    run(["ffmpeg", "-y", "-v", "error", "-i", str(voice), "-i", str(sfx), "-filter_complex", "[0:a][1:a]amix=inputs=2:normalize=0:duration=first[m]", "-map", "[m]", str(pre)])
    out = run(["ffmpeg", "-hide_banner", "-nostats", "-i", str(pre), "-af", f"loudnorm=I={lufs}:TP=-1.5:LRA=11:print_format=json", "-f", "null", "-"], capture=True)
    meas = json.loads(out[out.rindex("{"): out.rindex("}") + 1])
    master = stems / "master.wav"
    ln = (
        f"loudnorm=I={lufs}:TP=-1.5:LRA=11:measured_I={meas['input_i']}:measured_TP={meas['input_tp']}:"
        f"measured_LRA={meas['input_lra']}:measured_thresh={meas['input_thresh']}:offset={meas['target_offset']}:linear=true"
    )
    # limitatore dopo il loudnorm: il true peak deve restare sotto −1 dBTP
    run(["ffmpeg", "-y", "-v", "error", "-i", str(pre), "-af", ln + ",alimiter=limit=0.79:attack=1:release=50:level=false", "-ar", "48000", str(master)])
    print(f"voce {lv:.1f} LUFS, {len(events)} effetti a {lv - gap:.1f} LUFS ({gap} dB sotto), master {lufs} LUFS")
    return master


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--edit", required=True)
    ap.add_argument("--base", required=True)
    ap.add_argument("--video", help="render di Remotion (muto, completo): niente camera né fermo da ffmpeg")
    ap.add_argument("--overlay", action="append", default=[])
    ap.add_argument("--sfx-dir", default=str(Path(__file__).resolve().parents[4] / "editor/assets/sfx"))
    ap.add_argument("--gap", type=float, default=7.0)
    ap.add_argument("--lufs", type=float, default=-14.0)
    ap.add_argument("--no-voice-fx", action="store_true")
    ap.add_argument("--hold", type=float, help="secondi di fermo sull'ultimo fotogramma (default: `hold` del piano)")
    ap.add_argument("--preview", action="store_true", help="720p veloce")
    ap.add_argument("-o", "--out")
    a = ap.parse_args()

    edit = Path(a.edit)
    base = Path(a.base)
    plan_path = edit / "motion-plan.json"
    plan = json.loads(plan_path.read_text()) if plan_path.exists() else {}
    hold = a.hold if a.hold is not None else float(plan.get("hold", 0))
    dur = probe_duration(Path(a.video)) if a.video else probe_duration(base) + hold
    face = plan.get("face", {})
    cam = None if a.video else camera_exprs(plan.get("camera", []))  # con --video la camera l'ha già fatta Remotion

    master = build_audio(base, plan, Path(a.sfx_dir), a.gap, a.lufs, dur, edit / "stems", not a.no_voice_fx)

    out = Path(a.out or edit / ("preview.mp4" if a.preview else "final.mp4"))
    if a.video:
        graph = f"[0:v]setpts=PTS-STARTPTS,fps={FPS},format=yuv420p[vout]"
    else:
        graph = video_graph(cam, len(a.overlay), face.get("x", 0.5), face.get("y", 0.42), dur, hold)
    if a.preview:
        graph = graph.replace("format=yuv420p[vout]", "scale=720:1280,format=yuv420p[vout]")
    with tempfile.NamedTemporaryFile("w", suffix=".txt", delete=False) as fh:
        fh.write(graph)
    inputs = ["-i", str(a.video or base)]
    for ov in [] if a.video else a.overlay:
        inputs += ["-c:v", "libvpx-vp9", "-i", ov] if ov.endswith(".webm") else ["-i", ov]
    inputs += ["-i", str(master)]
    audio_idx = 1 if a.video else len(a.overlay) + 1
    run([
        "ffmpeg", "-y", "-v", "error", *inputs, "-filter_complex_script", fh.name,
        "-map", "[vout]", "-map", f"{audio_idx}:a", "-t", f"{dur:.3f}",
        "-c:v", "libx264", "-preset", "veryfast" if a.preview else "medium", "-crf", "23" if a.preview else "18",
        "-r", str(FPS), "-c:a", "aac", "-b:a", "256k", "-movflags", "+faststart", str(out),
    ])
    print(f"Fatto: {out} ({dur:.2f}s)")


if __name__ == "__main__":
    main()
