import fs from "node:fs";
import { ffmpeg, run } from "./sh";
import type { Range } from "../../src/types";

/** Legge un WAV PCM 16 bit mono e restituisce l'inviluppo in dB a finestre da 10 ms. */
export function envelopeDb(wavPath: string, hop = 0.01): { db: Float32Array; hop: number } {
  const buf = fs.readFileSync(wavPath);
  let off = 12;
  let rate = 16000;
  let dataOff = 44;
  let dataLen = buf.length - 44;
  while (off < buf.length - 8) {
    const id = buf.toString("ascii", off, off + 4);
    const len = buf.readUInt32LE(off + 4);
    if (id === "fmt ") rate = buf.readUInt32LE(off + 12);
    if (id === "data") {
      dataOff = off + 8;
      dataLen = Math.min(len, buf.length - dataOff);
      break;
    }
    off += 8 + len;
  }
  const n = Math.floor(dataLen / 2);
  const win = Math.round(rate * hop);
  const frames = Math.ceil(n / win);
  const db = new Float32Array(frames);
  for (let f = 0; f < frames; f++) {
    let sum = 0;
    const a = f * win;
    const b = Math.min(n, a + win);
    for (let i = a; i < b; i++) {
      const s = buf.readInt16LE(dataOff + i * 2) / 32768;
      sum += s * s;
    }
    db[f] = 20 * Math.log10(Math.sqrt(sum / Math.max(1, b - a)) + 1e-9);
  }
  return { db, hop };
}

const pct = (v: Float32Array, p: number) => {
  const s = Float32Array.from(v).sort();
  return s[Math.min(s.length - 1, Math.floor(p * (s.length - 1)))];
};

/** Soglia automatica: un terzo tra rumore di fondo (10° percentile) e voce (90° percentile). */
export function autoThreshold(db: Float32Array) {
  if (!db.length) return -40;
  const noise = pct(db, 0.1);
  const speech = pct(db, 0.9);
  return Math.round(Math.max(noise + 6, noise + (speech - noise) * 0.3));
}

/** Silenzi con ffmpeg silencedetect → parti parlate (con margini). */
export async function detectSpeech(
  wavPath: string,
  duration: number,
  opts: { thresholdDb: number; minSilence: number; paddingBefore: number; paddingAfter: number },
): Promise<{ speech: Range[]; silences: Range[] }> {
  const { stderr } = await run(
    "ffmpeg",
    ["-hide_banner", "-nostats", "-i", wavPath, "-af", `silencedetect=noise=${opts.thresholdDb}dB:d=${opts.minSilence}`, "-f", "null", "-"],
    { quiet: true },
  );
  const silences: Range[] = [];
  let start: number | null = null;
  for (const line of stderr.split("\n")) {
    const s = line.match(/silence_start: (-?[\d.]+)/);
    const e = line.match(/silence_end: ([\d.]+)/);
    if (s) start = Math.max(0, Number(s[1]));
    if (e && start !== null) {
      silences.push({ start, end: Number(e[1]) });
      start = null;
    }
  }
  if (start !== null) silences.push({ start, end: duration });

  const speech: Range[] = [];
  let cursor = 0;
  for (const s of silences) {
    if (s.start > cursor) speech.push({ start: cursor, end: s.start });
    cursor = s.end;
  }
  if (cursor < duration) speech.push({ start: cursor, end: duration });

  const padded: Range[] = [];
  for (const r of speech.filter((r) => r.end - r.start >= 0.12)) {
    const a = Math.max(0, r.start - opts.paddingBefore);
    const b = Math.min(duration, r.end + opts.paddingAfter);
    const last = padded[padded.length - 1];
    if (last && a <= last.end) last.end = Math.max(last.end, b);
    else padded.push({ start: +a.toFixed(3), end: +b.toFixed(3) });
  }
  return { speech: padded, silences };
}

export async function extractWav16k(input: string, out: string) {
  await ffmpeg(["-i", input, "-vn", "-ac", "1", "-ar", "16000", "-c:a", "pcm_s16le", out]);
}
