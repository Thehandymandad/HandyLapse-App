"""Musica di sottofondo originale per i reel. Di default la genera ElevenLabs Music (strumentale, su descrizione);
con --local la compone e sintetizza qui (gratis, niente licenze, niente download).

    python music.py -o editor/assets/music/<nome>.wav --duration 30.2 --end 28.7 [--prompt "..."]   # ElevenLabs
    python music.py -o editor/assets/music/tech-pulse.wav --duration 30.2 [--bpm 120] [--end 28.7] --local

ElevenLabs: stessa chiave degli effetti (ELEVENLABS_API_KEY, in questo cloud la aggiunge il proxy; serve il permesso
"Music" sulla chiave) e consuma crediti. Il brano dura --duration; da --end (fine del parlato) sfuma in 1,5 s.
Il prompt di default è quello della casa (elettronica tech allegra, 120 BPM); per un reel con un altro tono si cambia.

Versione locale:
Stile "tech pulse": elettronica allegra e pulita per reel di tecnologia/AI. Giro di accordi la–fa–do–sol (vi–IV–I–V),
pad di seghe leggermente stonate con pompa a tempo di cassa, arpeggio pluck a sedicesimi con eco, basso sub, cassa in
quattro, clap su 2 e 4, charleston in levare. Prima battuta solo pad e arpeggio (filtro che si apre), poi entra la
ritmica; da --end (fine del parlato) tutto si ferma sull'ultimo accordo che sfuma.
Il volume sotto la voce e l'abbassamento quando parli li fa compose.py (--music).
"""
import argparse
import math
from pathlib import Path

import numpy as np
from scipy.signal import butter, sosfilt

SR = 48000
CHORDS = [  # vi–IV–I–V in do maggiore (la minore), voicing medio + basso
    ([57, 60, 64, 69], 45),  # Am
    ([57, 60, 65, 69], 41),  # F
    ([55, 60, 64, 67], 48),  # C
    ([55, 59, 62, 67], 43),  # G
]


def hz(m: float) -> float:
    return 440.0 * 2 ** ((m - 69) / 12)


def saw(f: float, n: int, phase: float = 0.0) -> np.ndarray:
    t = np.arange(n) / SR
    x = (t * f + phase) % 1.0
    return 2 * x - 1


def lp(x: np.ndarray, fc: float, order: int = 2) -> np.ndarray:
    return sosfilt(butter(order, min(fc, SR * 0.45), "low", fs=SR, output="sos"), x)


def hp(x: np.ndarray, fc: float, order: int = 2) -> np.ndarray:
    return sosfilt(butter(order, fc, "high", fs=SR, output="sos"), x)


def bp(x: np.ndarray, lo: float, hi: float) -> np.ndarray:
    return sosfilt(butter(2, [lo, hi], "band", fs=SR, output="sos"), x)


def add(buf: np.ndarray, x: np.ndarray, at: int) -> None:
    if at >= len(buf):
        return
    n = min(len(x), len(buf) - at)
    buf[at:at + n] += x[:n]


HOUSE_PROMPT = (
    "Upbeat modern electronic tech background music for a short social media video about AI and automation, "
    "120 BPM, clean punchy kick, bright plucky synth arpeggio, warm pads, light claps, positive and energetic, "
    "steady groove from start to finish, instrumental, no vocals"
)


def eleven(a) -> None:
    """Brano strumentale da ElevenLabs Music, lungo --duration, sfumato da --end."""
    import json
    import os
    import subprocess
    import urllib.request

    ms = int(max(10.0, a.duration + 1.0) * 1000)
    body = json.dumps({"prompt": a.prompt, "music_length_ms": ms, "model_id": "music_v1", "force_instrumental": True}).encode()
    headers = {"Content-Type": "application/json", "Accept": "audio/mpeg"}
    if os.environ.get("ELEVENLABS_API_KEY"):
        headers["xi-api-key"] = os.environ["ELEVENLABS_API_KEY"]
    req = urllib.request.Request("https://api.elevenlabs.io/v1/music", data=body, headers=headers, method="POST")
    with urllib.request.urlopen(req, timeout=600) as r:
        mp3 = r.read()
    out = Path(a.out)
    out.parent.mkdir(parents=True, exist_ok=True)
    tmp = out.with_suffix(".mp3")
    tmp.write_bytes(mp3)
    end = a.end if a.end else a.duration
    fade = f"afade=t=out:st={max(0.0, end):.3f}:d=1.5," if end < a.duration else f"afade=t=out:st={a.duration - 1.0:.3f}:d=1.0,"
    subprocess.run(["ffmpeg", "-y", "-v", "error", "-i", str(tmp), "-af", f"atrim=0:{a.duration:.3f},{fade}afade=t=in:d=0.03",
                    "-ar", "48000", "-ac", "2", str(out)], check=True)
    tmp.unlink()
    print(f"{out}: {a.duration:.2f} s da ElevenLabs Music, sfuma da {end:.2f} s")


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("-o", "--out", required=True)
    ap.add_argument("--duration", type=float, required=True)
    ap.add_argument("--bpm", type=float, default=120)
    ap.add_argument("--end", type=float, help="secondi: da qui la ritmica si ferma e l'ultimo accordo sfuma")
    ap.add_argument("--seed", type=int, default=3)
    ap.add_argument("--local", action="store_true", help="composta qui invece che da ElevenLabs (gratis)")
    ap.add_argument("--prompt", default=HOUSE_PROMPT, help="descrizione del brano per ElevenLabs")
    a = ap.parse_args()
    if not a.local:
        eleven(a)
        return
    rng = np.random.default_rng(a.seed)
    N = int(a.duration * SR)
    beat = 60 / a.bpm
    bar = 4 * beat
    end = a.end if a.end else a.duration
    n_bars = int(math.ceil(a.duration / bar)) + 1
    t = np.arange(N) / SR

    pad = np.zeros(N)
    arp_l = np.zeros(N)
    bass = np.zeros(N)
    kick = np.zeros(N)
    clap = np.zeros(N)
    hats = np.zeros(N)

    # --- pad: accordi tenuti, 3 seghe stonate per nota, filtro che si apre nella prima battuta
    for b in range(n_bars):
        notes, root = CHORDS[b % 4]
        s0 = int(b * bar * SR)
        if s0 >= N:
            break
        last = b * bar >= end - 1e-6 or (b + 1) * bar > end
        length = int((bar + (2.5 if last else 0.15)) * SR)
        seg = np.zeros(length)
        for m in notes:
            for det in (-0.08, 0.0, 0.08):
                seg += saw(hz(m + det), length, rng.random()) / 9
        env = np.minimum(1, np.arange(length) / (0.25 * SR))
        if last:
            env *= np.exp(-np.maximum(0, np.arange(length) / SR - 0.2) / 0.9)
        else:
            env *= np.clip((length - np.arange(length)) / (0.15 * SR), 0, 1)
        add(pad, seg * env, s0)
        if last:
            break
    open_f = np.interp(t, [0, bar, bar + 0.01, a.duration], [500, 2600, 2600, 2600])
    # filtro variabile a blocchi (cutoff costante per blocco di 20 ms)
    out = np.zeros(N)
    blk = int(0.02 * SR)
    zi_sos = None
    for i in range(0, N, blk):
        fc = float(open_f[min(i, N - 1)])
        sos = butter(2, fc, "low", fs=SR, output="sos")
        from scipy.signal import sosfilt_zi
        if zi_sos is None:
            zi_sos = sosfilt_zi(sos) * 0
        y, zi_sos = sosfilt(sos, pad[i:i + blk], zi=zi_sos)
        out[i:i + blk] = y
    pad = out

    # --- arpeggio pluck a sedicesimi (note dell'accordo + ottava)
    step = beat / 4
    pat = [0, 1, 2, 3, 2, 1, 2, 3]
    for k in range(int(end / step) + 1):
        tt = k * step
        b = int(tt // bar)
        notes, _ = CHORDS[b % 4]
        tones = sorted(notes) + [notes[1] + 12]
        m = tones[pat[k % len(pat)]] + 12
        n = int(0.22 * SR)
        x = (saw(hz(m), n) * 0.6 + np.sign(np.sin(2 * np.pi * hz(m) * np.arange(n) / SR)) * 0.4)
        x = lp(x, 3200) * np.exp(-np.arange(n) / SR / 0.07) * (0.9 if k % 4 == 0 else 0.65)
        add(arp_l, x, int(tt * SR))
    # eco a 3/16 sul canale destro
    d = int(3 * step * SR)
    arp_r = np.zeros(N)
    arp_r[d:] = arp_l[:-d] * 0.55
    arp_l2 = arp_l.copy()
    arp_l2[2 * d:] += arp_l[:-2 * d] * 0.3

    # --- ritmica (dalla seconda battuta fino a end)
    drums_from = bar
    for k in range(int(end / beat) + 1):
        tt = k * beat
        if tt < drums_from or tt >= end:
            continue
        s = int(tt * SR)
        n = int(0.35 * SR)
        tk = np.arange(n) / SR
        f = 45 + 95 * np.exp(-tk / 0.035)
        ph = 2 * np.pi * np.cumsum(f) / SR
        add(kick, np.sin(ph) * np.exp(-tk / 0.16), s)
        # basso: radice dell'accordo in levare (ottavi), sub sinusoidale un po' saturato
        _, root = CHORDS[int(tt // bar) % 4]
        nb = int(0.24 * SR)
        tb = np.arange(nb) / SR
        bx = np.tanh(1.6 * np.sin(2 * np.pi * hz(root) * tb)) * np.exp(-tb / 0.18)
        add(bass, bx, int((tt + beat / 2) * SR))
        if k % 2 == 1:  # clap su 2 e 4
            nc = int(0.18 * SR)
            c = bp(rng.standard_normal(nc), 900, 2600)
            tc = np.arange(nc) / SR
            env = np.exp(-tc / 0.05) + 0.6 * np.exp(-np.maximum(0, tc - 0.012) / 0.05) * (tc > 0.012)
            add(clap, c * env, s)
        nh = int(0.06 * SR)  # charleston in levare
        h = hp(rng.standard_normal(nh), 7000) * np.exp(-np.arange(nh) / SR / 0.018)
        add(hats, h, int((tt + beat / 2) * SR))

    # pompa: tutto tranne cassa e clap respira a tempo di cassa
    phase = (t - drums_from) % beat
    pump = np.where((t >= drums_from) & (t < end), 1 - 0.55 * np.exp(-phase / 0.11), 1.0)

    def norm(x):
        p = np.max(np.abs(x))
        return x / p if p > 0 else x

    L = 0.36 * norm(pad) * pump + 0.22 * norm(arp_l2) * pump + 0.42 * norm(bass) * pump + 0.62 * norm(kick) + 0.22 * norm(clap) + 0.07 * norm(hats)
    R = 0.36 * norm(pad) * pump + 0.22 * norm(arp_r + arp_l * 0.6) * pump + 0.42 * norm(bass) * pump + 0.62 * norm(kick) + 0.22 * norm(clap) + 0.07 * norm(hats)
    st = np.stack([L, R], 1)
    st /= max(1e-9, np.max(np.abs(st))) / 0.89
    fade_in = np.minimum(1, t / 0.04)[:, None]
    st *= fade_in
    out = Path(a.out)
    out.parent.mkdir(parents=True, exist_ok=True)
    import wave
    with wave.open(str(out), "wb") as w:
        w.setnchannels(2)
        w.setsampwidth(2)
        w.setframerate(SR)
        w.writeframes((st * 32767).astype("<i2").tobytes())
    print(f"{out}: {a.duration:.2f} s, {a.bpm:g} BPM, ritmica fino a {end:.2f} s")


if __name__ == "__main__":
    main()
