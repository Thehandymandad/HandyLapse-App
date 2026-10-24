import type { Range } from "./types";

/** Decodifica la traccia audio del video. Restituisce null se il video non ha audio. */
export async function decodeAudio(file: Blob): Promise<AudioBuffer | null> {
  const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
  const ctx = new AC();
  try {
    const data = await file.arrayBuffer();
    return await ctx.decodeAudioData(data);
  } catch {
    return decodeAudioWithMediabunny(file);
  } finally {
    ctx.close().catch(() => undefined);
  }
}

async function decodeAudioWithMediabunny(file: Blob): Promise<AudioBuffer | null> {
  try {
    const { Input, ALL_FORMATS, BlobSource, AudioBufferSink } = await import("mediabunny");
    const input = new Input({ source: new BlobSource(file), formats: ALL_FORMATS });
    const track = await input.getPrimaryAudioTrack();
    if (!track) return null;
    const parts: AudioBuffer[] = [];
    for await (const { buffer } of new AudioBufferSink(track).buffers()) parts.push(buffer);
    if (!parts.length) return null;
    const sampleRate = parts[0].sampleRate;
    const channels = parts[0].numberOfChannels;
    const length = parts.reduce((n, b) => n + b.length, 0);
    const out = new AudioBuffer({ length, sampleRate, numberOfChannels: channels });
    for (let c = 0; c < channels; c++) {
      const dst = out.getChannelData(c);
      let at = 0;
      for (const b of parts) {
        dst.set(b.getChannelData(Math.min(c, b.numberOfChannels - 1)), at);
        at += b.length;
      }
    }
    return out;
  } catch {
    return null;
  }
}

export const ENVELOPE_HOP = 0.01;

/** Inviluppo di volume in dB con finestre da 10 ms (mono). */
export function computeEnvelope(buffer: AudioBuffer): Float32Array {
  const hop = Math.max(1, Math.round(buffer.sampleRate * ENVELOPE_HOP));
  const frames = Math.ceil(buffer.length / hop);
  const out = new Float32Array(frames);
  const channels = Array.from({ length: buffer.numberOfChannels }, (_, c) => buffer.getChannelData(c));
  for (let f = 0; f < frames; f++) {
    let sum = 0;
    const from = f * hop;
    const to = Math.min(buffer.length, from + hop);
    for (let i = from; i < to; i++) {
      let s = 0;
      for (const ch of channels) s += ch[i];
      s /= channels.length;
      sum += s * s;
    }
    const rms = Math.sqrt(sum / Math.max(1, to - from));
    out[f] = 20 * Math.log10(rms + 1e-9);
  }
  return out;
}

function percentile(values: Float32Array, p: number) {
  const sorted = Float32Array.from(values).sort();
  return sorted[Math.min(sorted.length - 1, Math.max(0, Math.floor(p * (sorted.length - 1))))];
}

/** Soglia automatica: un terzo della distanza tra rumore di fondo e livello del parlato. */
export function autoThreshold(env: Float32Array): number {
  if (!env.length) return -40;
  const noise = percentile(env, 0.1);
  const speech = percentile(env, 0.9);
  return Math.max(noise + 6, noise + (speech - noise) * 0.3);
}

/** Intervalli in cui si parla (senza margini). */
export function detectSpeech(env: Float32Array, thresholdDb: number, minSilence: number, minSpeech = 0.1): Range[] {
  const ranges: Range[] = [];
  let start = -1;
  for (let i = 0; i <= env.length; i++) {
    const loud = i < env.length && env[i] > thresholdDb;
    if (loud && start < 0) start = i;
    if (!loud && start >= 0) {
      ranges.push({ start: start * ENVELOPE_HOP, end: i * ENVELOPE_HOP });
      start = -1;
    }
  }
  // Le pause brevi fanno parte del parlato
  const merged: Range[] = [];
  for (const r of ranges) {
    const last = merged[merged.length - 1];
    if (last && r.start - last.end < minSilence) last.end = r.end;
    else merged.push({ ...r });
  }
  return merged.filter((r) => r.end - r.start >= minSpeech);
}

export function padRanges(ranges: Range[], before: number, after: number, duration: number): Range[] {
  const out: Range[] = [];
  for (const r of ranges) {
    const s = Math.max(0, r.start - before);
    const e = Math.min(duration, r.end + after);
    const last = out[out.length - 1];
    if (last && s <= last.end) last.end = Math.max(last.end, e);
    else out.push({ start: s, end: e });
  }
  return out;
}

/**
 * Divide l'audio in blocchi da ~maxLen secondi tagliando nelle pause, per trascrizioni più precise
 * e richieste piccole (limite body di Vercel).
 */
export function splitForTranscription(speech: Range[], duration: number, maxLen = 28): Range[] {
  if (!speech.length) return duration > 0 ? chunkEvenly({ start: 0, end: duration }, maxLen) : [];
  const chunks: Range[] = [];
  let chunkStart = Math.max(0, speech[0].start - 0.3);
  for (let i = 0; i < speech.length; i++) {
    const r = speech[i];
    const next = speech[i + 1];
    if (r.end - chunkStart > maxLen) {
      // Blocco di parlato senza pause: taglio forzato
      chunks.push(...chunkEvenly({ start: chunkStart, end: r.end }, maxLen));
      chunkStart = r.end;
    }
    if (!next) {
      chunks.push({ start: chunkStart, end: Math.min(duration, r.end + 0.3) });
      break;
    }
    if (next.end - chunkStart > maxLen) {
      const cut = (r.end + next.start) / 2;
      chunks.push({ start: chunkStart, end: cut });
      chunkStart = cut;
    }
  }
  return chunks.filter((c) => c.end - c.start > 0.2);
}

function chunkEvenly(r: Range, maxLen: number): Range[] {
  const n = Math.max(1, Math.ceil((r.end - r.start) / maxLen));
  const len = (r.end - r.start) / n;
  return Array.from({ length: n }, (_, i) => ({ start: r.start + i * len, end: r.start + (i + 1) * len }));
}

/** Estrae un intervallo come WAV mono 16 kHz (formato ideale per la trascrizione). */
export async function encodeWavRange(buffer: AudioBuffer, range: Range, sampleRate = 16000): Promise<Blob> {
  const duration = Math.max(0.05, range.end - range.start);
  const length = Math.ceil(duration * sampleRate);
  const ctx = new OfflineAudioContext(1, length, sampleRate);
  const src = ctx.createBufferSource();
  src.buffer = buffer;
  src.connect(ctx.destination);
  src.start(0, range.start, duration);
  const rendered = await ctx.startRendering();
  return pcmToWav(rendered.getChannelData(0), sampleRate);
}

export function pcmToWav(samples: Float32Array, sampleRate: number): Blob {
  const bytes = new ArrayBuffer(44 + samples.length * 2);
  const v = new DataView(bytes);
  const str = (o: number, s: string) => s.split("").forEach((c, i) => v.setUint8(o + i, c.charCodeAt(0)));
  str(0, "RIFF");
  v.setUint32(4, 36 + samples.length * 2, true);
  str(8, "WAVE");
  str(12, "fmt ");
  v.setUint32(16, 16, true);
  v.setUint16(20, 1, true);
  v.setUint16(22, 1, true);
  v.setUint32(24, sampleRate, true);
  v.setUint32(28, sampleRate * 2, true);
  v.setUint16(32, 2, true);
  v.setUint16(34, 16, true);
  str(36, "data");
  v.setUint32(40, samples.length * 2, true);
  for (let i = 0; i < samples.length; i++) {
    const s = Math.max(-1, Math.min(1, samples[i]));
    v.setInt16(44 + i * 2, s < 0 ? s * 0x8000 : s * 0x7fff, true);
  }
  return new Blob([bytes], { type: "audio/wav" });
}
