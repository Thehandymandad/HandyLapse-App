"""Materiale per la revisione di un video composto: fotogrammi chiave con le zone sicure di Instagram + misure audio.

    python review.py --edit <edit_dir> [--video <edit_dir>/final.mp4] [--every 0]

Scrive in <edit_dir>/review/:
  frames/t_XX.XX.png     fotogrammi a piena risoluzione (inizio/payoff/fine di ogni scena, confini dei tagli,
                         primi e ultimi 2 s; con --every N anche uno ogni N secondi)
  sheet_NN.jpg           fogli di contatto con le zone coperte da Instagram in rosso (sopra y=280, sotto y=1560,
                         a destra di x=900 nella metà bassa) e il tempo su ogni fotogramma
  audio.json             loudness integrata e true peak del master, livello di ogni effetto rispetto alla voce
e prepara <edit_dir>/MOTION-REVIEW.md con la checklist da compilare GUARDANDO i fogli.
"""
import argparse
import json
import re
import subprocess
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw

W, H = 1080, 1920
SAFE_TOP, SAFE_BOTTOM, SAFE_RIGHT = 280, 1560, 900


def sh(cmd):
    return subprocess.run(cmd, check=True, capture_output=True, text=True)


def duration(p: Path) -> float:
    return float(sh(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", str(p)]).stdout.strip())


def key_times(edit: Path, dur: float, every: float) -> dict[float, str]:
    t: dict[float, str] = {}

    def add(x, why):
        x = round(min(max(0.0, x), dur - 0.2), 2)  # troppo vicino alla fine ffmpeg non trova il fotogramma
        t[x] = (t.get(x, "") + " · " + why).strip(" ·")

    plan_p = edit / "motion-plan.json"
    if plan_p.exists():
        plan = json.loads(plan_p.read_text())
        for sc in plan.get("scenes", []):
            add(float(sc["start"]) + 0.15, f"{sc['id']} entrata")
            if sc.get("payoff"):
                add(float(sc["payoff"]["t"]) + 0.1, f"{sc['id']} colpo «{sc['payoff'].get('word', '')}»")
            add(float(sc["end"]) - 0.1, f"{sc['id']} fine")
    wo = edit / "words_out.json"
    if wo.exists():
        for s in json.loads(wo.read_text()).get("segments", [])[1:]:
            add(s["out_start"] - 0.05, "prima del taglio")
            add(s["out_start"] + 0.05, "dopo il taglio")
    for x in (0.0, 1.0, 2.0, dur - 2, dur - 1, dur - 0.2):
        add(x, "inizio" if x < 3 else "fine")
    if every > 0:
        for x in np.arange(0, dur, every):
            add(float(x), "campione")
    return dict(sorted(t.items()))


def guides(img: Image.Image, label: str) -> Image.Image:
    im = img.convert("RGBA")
    ov = Image.new("RGBA", im.size, (0, 0, 0, 0))
    d = ImageDraw.Draw(ov)
    red = (255, 40, 60, 70)
    d.rectangle((0, 0, W, SAFE_TOP), fill=red)
    d.rectangle((0, SAFE_BOTTOM, W, H), fill=red)
    d.rectangle((SAFE_RIGHT, H // 2, W, SAFE_BOTTOM), fill=red)
    im = Image.alpha_composite(im, ov).convert("RGB")
    d = ImageDraw.Draw(im)
    d.rectangle((0, 0, W, 64), fill=(0, 0, 0))
    d.text((16, 14), label, fill=(212, 255, 58), font_size=34)
    return im


def audio_report(edit: Path, video: Path) -> dict:
    out = sh(["ffmpeg", "-hide_banner", "-nostats", "-i", str(video), "-af", "ebur128=peak=true", "-f", "null", "-"]).stderr
    integ = float(re.findall(r"I:\s+(-?[\d.]+) LUFS", out)[-1])
    tp = float(re.findall(r"Peak:\s+(-?[\d.]+) dBFS", out)[-1])
    rep = {"integrated_lufs": integ, "true_peak_dbtp": tp, "sfx": []}
    stems = edit / "stems"
    plan_p = edit / "motion-plan.json"
    if not (stems / "voice.wav").exists() or not plan_p.exists():
        return rep

    # stessa misura di compose.py: loudness percepita (LUFS, pesatura K), non RMS piatto
    def lufs_integrated(p):
        out = sh(["ffmpeg", "-hide_banner", "-nostats", "-i", str(p), "-af", "ebur128", "-f", "null", "-"]).stderr
        return float(re.findall(r"I:\s+(-?[\d.]+) LUFS", out)[-1])

    def lufs_peak(p, t0, t1):
        out = sh(["ffmpeg", "-hide_banner", "-nostats", "-ss", f"{t0:.3f}", "-t", f"{max(0.45, t1 - t0):.3f}", "-i", str(p),
                  "-af", "apad=pad_dur=0.5,ebur128", "-f", "null", "-"]).stderr
        vals = [float(v) for v in re.findall(r"M:\s*(-?[\d.]+)", out) if float(v) > -70]
        return max(vals) if vals else -90.0

    v_lufs = lufs_integrated(stems / "voice.wav")
    plan = json.loads(plan_p.read_text())
    events = list(plan.get("sfx", []))
    for sc in plan.get("scenes", []):
        events += sc.get("sfx", [])
    ev = sorted(events, key=lambda e: float(e["t"]))
    for k, e in enumerate(ev):
        # finestra: dall'evento fino al successivo (max 2 s); livello = la finestra di 400 ms più forte (i riser crescono)
        t0 = max(0.0, float(e["t"]) - 0.05)
        t1 = min(float(e["t"]) + 2.0, float(ev[k + 1]["t"]) - 0.02) if k + 1 < len(ev) else float(e["t"]) + 2.0
        s_lufs = lufs_peak(stems / "sfx.wav", t0, t1)
        rep["sfx"].append({"t": e["t"], "name": e.get("name") or e.get("file"), "rel_db": round(s_lufs - v_lufs, 1)})
    rep["voice_lufs"] = round(v_lufs, 1)
    return rep


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--edit", required=True)
    ap.add_argument("--video")
    ap.add_argument("--every", type=float, default=0)
    a = ap.parse_args()
    edit = Path(a.edit)
    video = Path(a.video or edit / "final.mp4")
    rdir = edit / "review"
    fdir = rdir / "frames"
    fdir.mkdir(parents=True, exist_ok=True)
    dur = duration(video)
    times = key_times(edit, dur, a.every)

    thumbs = []
    for t, why in times.items():
        p = fdir / f"t_{t:06.2f}.png"
        sh(["ffmpeg", "-y", "-v", "error", "-ss", f"{t:.3f}", "-i", str(video), "-frames:v", "1", str(p)])
        if not p.exists():
            print(f"fotogramma a {t:.2f}s non estratto, salto")
            continue
        thumbs.append(guides(Image.open(p).resize((W, H)), f"{t:.2f}s  {why}").resize((360, 640)))
    sheets = []
    for k in range(0, len(thumbs), 8):
        sheet = Image.new("RGB", (360 * 4, 640 * 2), (30, 30, 30))
        for i, th in enumerate(thumbs[k: k + 8]):
            sheet.paste(th, ((i % 4) * 360, (i // 4) * 640))
        sp = rdir / f"sheet_{k // 8 + 1:02d}.jpg"
        sheet.save(sp, quality=85)
        sheets.append(sp.name)

    rep = audio_report(edit, video)
    (rdir / "audio.json").write_text(json.dumps(rep, ensure_ascii=False, indent=1))
    bad = [s for s in rep.get("sfx", []) if not (-11 <= s["rel_db"] <= -3)]

    md = edit / "MOTION-REVIEW.md"
    if not md.exists():
        md.write_text(
            "# Motion review\n\n"
            f"Video: `{video.name}` — {dur:.2f} s. Fogli: " + ", ".join(f"`review/{s}`" for s in sheets) + "\n\n"
            f"## Audio\n\nMaster {rep['integrated_lufs']} LUFS (obiettivo −14), true peak {rep['true_peak_dbtp']} dBFS (≤ −1).\n"
            + (f"Effetti fuori livello (obiettivo ~−7 dB dalla voce): " + ", ".join(f"{s['name']} @ {s['t']}s ({s['rel_db']} dB)" for s in bad) + "\n" if bad else "Effetti tutti nell'intervallo attorno a −7 dB dalla voce.\n")
            + "\n## Difetti (tempo esatto → cosa → correzione)\n\n| Tempo | Difetto | Correzione | Stato |\n| --- | --- | --- | --- |\n\n"
            "## Checklist prima di pubblicare\n\n"
            "- [ ] Nessuna pausa o ripresa sbagliata rimasta\n"
            "- [ ] Nulla nelle zone coperte da Instagram\n"
            "- [ ] Nessuna sovrapposizione testo/oggetto, nulla sul viso\n"
            "- [ ] Sottotitoli corretti (nomi propri!)\n"
            "- [ ] Ogni effetto si sente, ma la voce domina\n"
            "- [ ] Il primo secondo ferma lo scroll\n"
        )
    print(f"{len(times)} fotogrammi, {len(sheets)} fogli in {rdir}; master {rep['integrated_lufs']} LUFS, TP {rep['true_peak_dbtp']}")
    if bad:
        print("Effetti fuori livello:", ", ".join(f"{s['name']}@{s['t']}s {s['rel_db']}dB" for s in bad))


if __name__ == "__main__":
    main()
