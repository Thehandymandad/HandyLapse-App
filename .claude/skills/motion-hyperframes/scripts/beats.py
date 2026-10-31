"""Beat audio per agganciare i colpi del movimento (README di movimento, sezione 1): pause del parlato e transienti.

    python beats.py <edit_dir> [--music editor/assets/music/x.wav]

Scrive <edit_dir>/beats.json:
- `pauses`: fine di ogni frase (pausa ≥ 0,15 s nel montato tra due parole di words_out.json) → buoni punti per uscite e cambi scena
- `accents`: parole pronunciate più forti della media (picco di volume della voce in base.mp4) → punch e atterraggi
- `music`: transienti della musica (flusso spettrale), se c'è un brano → colpi a tempo
Tutti i tempi in secondi della timeline di uscita. motion-director li mette nella colonna "beat del movimento".
"""
import argparse
import json
import subprocess
from pathlib import Path

import numpy as np

SR = 16000


def load_audio(path: Path) -> np.ndarray:
    raw = subprocess.run(["ffmpeg", "-v", "error", "-i", str(path), "-vn", "-ac", "1", "-ar", str(SR), "-f", "f32le", "-"],
                         capture_output=True, check=True).stdout
    return np.frombuffer(raw, np.float32)


def onsets(x: np.ndarray, hop: int = 256, win: int = 1024, min_gap: float = 0.18) -> list[float]:
    """Transienti con il flusso spettrale: picchi sopra la media mobile, almeno `min_gap` s l'uno dall'altro."""
    if len(x) < win:
        return []
    frames = np.lib.stride_tricks.sliding_window_view(x, win)[::hop] * np.hanning(win)
    mag = np.abs(np.fft.rfft(frames, axis=1))
    flux = np.maximum(0, np.diff(np.log1p(mag), axis=0)).sum(1)
    k = max(1, int(0.5 * SR / hop))
    thr = np.convolve(flux, np.ones(k) / k, mode="same") * 1.5 + 1e-6
    out, last = [], -1.0
    for i in range(1, len(flux) - 1):
        if flux[i] > thr[i] and flux[i] >= flux[i - 1] and flux[i] >= flux[i + 1]:
            t = (i + 1) * hop / SR
            if t - last >= min_gap:
                out.append(round(t, 3))
                last = t
    return out


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("edit")
    ap.add_argument("--music", help="brano di sottofondo (default: quello del piano, se c'è)")
    a = ap.parse_args()
    edit = Path(a.edit)
    wo = json.loads((edit / "words_out.json").read_text())
    words = wo["words"]

    pauses = [round(w["end"], 3) for w, nxt in zip(words, words[1:]) if nxt["start"] - w["end"] >= 0.15]

    voice = load_audio(edit / "base.mp4")
    loud = []
    for w in words:
        seg = voice[int(w["start"] * SR): int(w["end"] * SR)]
        loud.append(float(np.sqrt(np.mean(seg ** 2))) if len(seg) else 0.0)
    ref = np.median([v for v in loud if v > 0] or [1.0])
    accents = [{"t": round(w["start"], 3), "word": w["text"], "db": round(20 * np.log10(v / ref), 1)}
               for w, v in zip(words, loud) if v > ref * 1.6]

    music_path = a.music
    if not music_path:
        plan = edit / "motion-plan.json"
        if plan.exists():
            music_path = (json.loads(plan.read_text()).get("music") or {}).get("file")
    music = []
    if music_path:
        p = Path(music_path)
        if not p.is_absolute():
            p = Path(__file__).resolve().parents[4] / p
        if p.exists():
            music = onsets(load_audio(p))

    out = {"pauses": pauses, "accents": accents, "music": music}
    (edit / "beats.json").write_text(json.dumps(out, ensure_ascii=False, indent=1) + "\n")
    print(f"{edit / 'beats.json'}: {len(pauses)} pause, {len(accents)} accenti, {len(music)} colpi di musica")


if __name__ == "__main__":
    main()
