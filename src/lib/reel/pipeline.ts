import { encodeWavRange, splitForTranscription } from "./audio";
import { localPlan, normalizePlan } from "./planner";
import { sampleReference } from "./reference";
import type { EditPlan, Range, ReelStyle, Word } from "./types";

async function postJson<T>(url: string, body: unknown): Promise<T> {
  const res = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  const data = (await res.json().catch(() => ({}))) as T & { error?: string };
  if (!res.ok) throw new Error(data.error || `Errore ${res.status}`);
  return data;
}

/** Trascrive tutto l'audio a blocchi (tagliati nelle pause), 3 richieste in parallelo. */
export async function transcribeAll(
  voice: AudioBuffer,
  speech: Range[],
  language: string,
  onProgress: (p: number) => void,
): Promise<Word[]> {
  const chunks = splitForTranscription(speech, voice.duration);
  const results: Word[][] = new Array(chunks.length);
  let done = 0;
  let next = 0;
  const worker = async () => {
    while (next < chunks.length) {
      const i = next++;
      const c = chunks[i];
      const wav = await encodeWavRange(voice, c);
      const duration = c.end - c.start;
      let lastErr: unknown;
      for (let attempt = 0; attempt < 2; attempt++) {
        try {
          const res = await fetch(`/api/reel/transcribe?duration=${duration.toFixed(2)}&lang=${encodeURIComponent(language)}`, {
            method: "POST",
            headers: { "Content-Type": "audio/wav" },
            body: wav,
          });
          const data = (await res.json().catch(() => ({}))) as { words?: Word[]; error?: string };
          if (!res.ok) throw new Error(data.error || `Errore ${res.status}`);
          results[i] = (data.words ?? []).map((w) => ({ text: w.text, start: w.start + c.start, end: w.end + c.start }));
          lastErr = null;
          break;
        } catch (e) {
          lastErr = e;
        }
      }
      if (lastErr) throw lastErr;
      done++;
      onProgress(done / chunks.length);
    }
  };
  await Promise.all(Array.from({ length: Math.min(3, chunks.length) }, worker));
  return results.flat();
}

/** Piano di montaggio AI; se l'AI non risponde usa quello locale. I filler trovati localmente vengono sempre aggiunti. */
export async function requestPlan(words: Word[], style: ReelStyle, duration: number): Promise<{ plan: EditPlan; warning?: string }> {
  const local = localPlan(words, style);
  if (!words.length) return { plan: local };
  try {
    const { plan: raw } = await postJson<{ plan: unknown }>("/api/reel/plan", {
      words,
      duration,
      zoomEvery: style.zoom.every,
      graphicsEvery: style.motion.density,
      hookTitle: style.motion.hookTitle,
    });
    const plan = normalizePlan(raw, words.length);
    if (!plan) throw new Error("Piano AI non valido");
    const covered = new Set<number>();
    plan.removals.forEach((r) => {
      for (let i = r.startWord; i <= r.endWord; i++) covered.add(i);
    });
    plan.removals.push(...local.removals.filter((r) => !covered.has(r.startWord)));
    if (!plan.hook && style.motion.hookTitle) plan.hook = local.hook;
    return { plan };
  } catch (e) {
    return { plan: local, warning: `Piano AI non disponibile (${e instanceof Error ? e.message : "errore"}): uso il montaggio automatico locale.` };
  }
}

/** Testo incollato a mano: distribuisce le parole sul parlato rilevato, in proporzione alla lunghezza. */
export function distributeText(text: string, speech: Range[], duration: number): Word[] {
  const tokens = text.split(/\s+/).filter(Boolean);
  const ranges = speech.length ? speech : [{ start: 0, end: duration }];
  const total = ranges.reduce((n, r) => n + (r.end - r.start), 0);
  const weights = tokens.map((t) => t.replace(/[^a-z0-9à-öø-ÿ]/gi, "").length + 2);
  const wsum = weights.reduce((a, b) => a + b, 0) || 1;
  const words: Word[] = [];
  let acc = 0;
  // posizione "compressa" (solo parlato) → tempo reale
  const at = (x: number) => {
    let rest = x;
    for (const r of ranges) {
      const len = r.end - r.start;
      if (rest <= len) return r.start + rest;
      rest -= len;
    }
    return ranges[ranges.length - 1].end;
  };
  tokens.forEach((t, i) => {
    const a = (acc / wsum) * total;
    acc += weights[i];
    const b = (acc / wsum) * total;
    words.push({ text: t, start: at(a + 0.001), end: at(b) });
  });
  return words;
}

export async function analyzeReference(
  file: File,
  onProgress: (p: number, label: string) => void,
): Promise<{ style: unknown; notes: string; stats: { cutsPerMinute: number } }> {
  onProgress(0, "Estraggo i fotogrammi della reference…");
  const sample = await sampleReference(file, (p) => onProgress(p * 0.5, "Analizzo ritmo e fotogrammi…"));
  onProgress(0.55, "L'AI sta studiando lo stile…");
  const result = await postJson<{ style: unknown; notes: string }>("/api/reel/analyze-style", sample);
  onProgress(1, "Fatto");
  return { ...result, stats: sample.stats };
}
