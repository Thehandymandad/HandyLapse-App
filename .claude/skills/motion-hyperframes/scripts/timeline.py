"""Parole sulla timeline di USCITA (dopo i tagli dell'EDL di video-use).

    python timeline.py <edit_dir>            → <edit_dir>/words_out.json  e riepilogo dei segmenti

Legge <edit_dir>/edl.json e le trascrizioni Scribe in <edit_dir>/transcripts/<source>.json (formato di video-use).
Formula (Hard Rule 5 di video-use): t_uscita = parola.start − range.start + offset_del_range, con gli offset presi
dalle durate REALI dei segmenti renderizzati (edit/clips_graded), non dall'EDL.
Tiene solo le parole il cui centro cade dentro un range dell'EDL.
"""
import json
import subprocess
import sys
from pathlib import Path


def load_words(transcript: dict) -> list[dict]:
    words = transcript.get("words") or []
    out = []
    for w in words:
        if w.get("type", "word") != "word":
            continue
        text = (w.get("text") or "").strip()
        if text:
            out.append({"text": text, "start": float(w["start"]), "end": float(w["end"])})
    return out


def segment_durations(edit: Path, n: int) -> list[float] | None:
    """Durate reali dei segmenti renderizzati da video-use (clips_graded/seg_NN_*.mp4): ogni segmento è arrotondato
    al fotogramma, e su molti tagli lo scarto rispetto all'EDL si accumula (decimi di secondo)."""
    segs = sorted((edit / "clips_graded").glob("seg_*.mp4"))
    if len(segs) != n:
        return None
    out = []
    for s in segs:
        r = subprocess.run(["ffprobe", "-v", "error", "-select_streams", "v:0", "-show_entries", "stream=duration", "-of", "csv=p=0", str(s)], capture_output=True, text=True)
        out.append(float(r.stdout.strip()))
    return out


def main(edit_dir: str) -> None:
    edit = Path(edit_dir)
    edl = json.loads((edit / "edl.json").read_text())
    real = segment_durations(edit, len(edl["ranges"]))
    if real is None:
        print("attenzione: segmenti renderizzati non trovati, uso le durate dell'EDL (renderizza prima base.mp4)")
    cache: dict[str, list[dict]] = {}
    words_out, segments = [], []
    offset = 0.0
    for k, r in enumerate(edl["ranges"]):
        src = r["source"]
        if src not in cache:
            tr = edit / "transcripts" / f"{src}.json"
            cache[src] = load_words(json.loads(tr.read_text())) if tr.exists() else []
        start, end = float(r["start"]), float(r["end"])
        length = real[k] if real else end - start
        segments.append({"source": src, "start": start, "end": end, "out_start": round(offset, 3), "out_end": round(offset + length, 3), "beat": r.get("beat")})
        for w in cache[src]:
            mid = (w["start"] + w["end"]) / 2
            if start <= mid < end:
                words_out.append({
                    "text": w["text"],
                    "start": round(max(0.0, w["start"] - start) + offset, 3),
                    "end": round(min(end, w["end"]) - start + offset, 3),
                    "source": src,
                })
        offset += length
    (edit / "words_out.json").write_text(json.dumps({"duration": round(offset, 3), "segments": segments, "words": words_out}, ensure_ascii=False, indent=1))
    print(f"durata di uscita {offset:.2f}s, {len(segments)} segmenti, {len(words_out)} parole → {edit / 'words_out.json'}")
    for s in segments:
        print(f"  [{s['out_start']:6.2f}–{s['out_end']:6.2f}] {s['source']} {s['start']:.2f}–{s['end']:.2f} {s['beat'] or ''}")


if __name__ == "__main__":
    if len(sys.argv) != 2:
        sys.exit(__doc__)
    main(sys.argv[1])
