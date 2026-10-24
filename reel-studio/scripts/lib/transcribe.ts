import fs from "node:fs";
import path from "node:path";
import { downloadWhisperModel, installWhisperCpp, toCaptions, transcribe, type WhisperModel } from "@remotion/install-whisper-cpp";
import { log, ROOT } from "./sh";
import type { Range, Word } from "../../src/types";

const WHISPER_DIR = path.join(ROOT, "whisper.cpp");
const WHISPER_VERSION = process.env.WHISPER_CPP_VERSION ?? "1.5.5";

/** Trascrizione locale parola per parola con whisper.cpp (installato al primo uso). Niente servizi esterni. */
export async function transcribeWords(wav16k: string, opts: { model: WhisperModel; language: string }): Promise<Word[]> {
  log(`whisper.cpp ${WHISPER_VERSION} (modello ${opts.model})…`);
  await installWhisperCpp({ to: WHISPER_DIR, version: WHISPER_VERSION, printOutput: false });
  // un download interrotto lascia un file vuoto che whisper non sa leggere
  const modelFile = path.join(WHISPER_DIR, `ggml-${opts.model}.bin`);
  if (fs.existsSync(modelFile) && fs.statSync(modelFile).size < 1_000_000) fs.rmSync(modelFile);
  try {
    await downloadWhisperModel({ model: opts.model, folder: WHISPER_DIR, printOutput: false });
  } catch (e) {
    if (fs.existsSync(modelFile) && fs.statSync(modelFile).size < 1_000_000) fs.rmSync(modelFile);
    throw new Error(`Download del modello whisper "${opts.model}" non riuscito (${e instanceof Error ? e.message : e}). Puoi metterlo a mano in ${modelFile}`);
  }
  const out = await transcribe({
    inputPath: wav16k,
    whisperPath: WHISPER_DIR,
    whisperCppVersion: WHISPER_VERSION,
    model: opts.model,
    tokenLevelTimestamps: true,
    splitOnWord: true,
    language: (opts.language || null) as never,
    printOutput: false,
  });
  const { captions } = toCaptions({ whisperCppOutput: out });
  return captions
    .map((c) => ({ text: c.text.trim(), start: c.startMs / 1000, end: c.endMs / 1000 }))
    .filter((w) => w.text && !/^\[.*\]$/.test(w.text));
}

/** Testo scritto a mano distribuito sul parlato rilevato (fallback senza whisper). */
export function distributeText(text: string, speech: Range[]): Word[] {
  const tokens = text.split(/\s+/).filter(Boolean);
  if (!tokens.length || !speech.length) return [];
  const total = speech.reduce((n, r) => n + (r.end - r.start), 0);
  const weights = tokens.map((t) => t.replace(/[^a-z0-9à-öø-ÿ]/gi, "").length + 2);
  const wsum = weights.reduce((a, b) => a + b, 0);
  const at = (x: number) => {
    let rest = x;
    for (const r of speech) {
      if (rest <= r.end - r.start) return r.start + rest;
      rest -= r.end - r.start;
    }
    return speech[speech.length - 1].end;
  };
  let acc = 0;
  return tokens.map((t, i) => {
    const a = (acc / wsum) * total;
    acc += weights[i];
    return { text: t, start: +at(a + 0.001).toFixed(3), end: +at((acc / wsum) * total).toFixed(3) };
  });
}

export function readTextFile(p: string) {
  return fs.readFileSync(p, "utf8");
}
