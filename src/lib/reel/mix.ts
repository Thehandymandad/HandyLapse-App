import { outToSrc } from "./timeline";
import type { ReelStyle, Timeline } from "./types";

export const MIX_RATE = 48000;

/** Effetti sonori sintetizzati: niente file esterni. */
function synthWhoosh(rate: number): Float32Array {
  const len = Math.floor(rate * 0.42);
  const out = new Float32Array(len);
  let lp = 0;
  let seed = 1;
  for (let i = 0; i < len; i++) {
    const p = i / len;
    seed = (seed * 16807) % 2147483647;
    const noise = (seed / 2147483647) * 2 - 1;
    // filtro passa-basso che si apre e si richiude
    const cutoff = 0.02 + 0.35 * Math.sin(Math.PI * p);
    lp += cutoff * (noise - lp);
    const env = Math.pow(Math.sin(Math.PI * Math.min(1, p * 1.15)), 2);
    out[i] = lp * env * 1.6;
  }
  return out;
}

function synthPop(rate: number): Float32Array {
  const len = Math.floor(rate * 0.12);
  const out = new Float32Array(len);
  let phase = 0;
  for (let i = 0; i < len; i++) {
    const p = i / len;
    const freq = 950 - 650 * p;
    phase += (2 * Math.PI * freq) / rate;
    out[i] = Math.sin(phase) * Math.exp(-p * 7) * 0.7;
  }
  return out;
}

const sfxCache = new Map<string, AudioBuffer>();
function sfxBuffer(type: "whoosh" | "pop", rate: number) {
  const key = `${type}-${rate}`;
  let b = sfxCache.get(key);
  if (!b) {
    const data = type === "whoosh" ? synthWhoosh(rate) : synthPop(rate);
    b = new AudioBuffer({ length: data.length, sampleRate: rate, numberOfChannels: 1 });
    b.getChannelData(0).set(data);
    sfxCache.set(key, b);
  }
  return b;
}

type MixInput = {
  tl: Timeline;
  style: ReelStyle;
  voice: AudioBuffer | null;
  music: AudioBuffer | null;
  /** true se nel sorgente al tempo dato si sta parlando (per il ducking della musica). */
  isSpeaking?: (srcTime: number) => boolean;
};

/** Mixa voce tagliata + effetti + musica nell'audio finale (usato sia in anteprima sia in export). */
export async function mixAudio({ tl, style, voice, music, isSpeaking }: MixInput): Promise<AudioBuffer> {
  const length = Math.max(1, Math.ceil(tl.duration * MIX_RATE));
  const ctx = new OfflineAudioContext(2, length, MIX_RATE);
  const fade = 0.008;

  if (voice) {
    tl.segments.forEach((s, i) => {
      const len = s.end - s.start;
      if (len <= 0) return;
      const src = ctx.createBufferSource();
      src.buffer = voice;
      const g = ctx.createGain();
      const at = tl.offsets[i];
      // micro dissolvenze per evitare "click" sui tagli
      g.gain.setValueAtTime(0, at);
      g.gain.linearRampToValueAtTime(1, at + Math.min(fade, len / 2));
      g.gain.setValueAtTime(1, Math.max(at + fade, at + len - fade));
      g.gain.linearRampToValueAtTime(0, at + len);
      src.connect(g).connect(ctx.destination);
      src.start(at, s.start, len);
    });
  }

  if (style.sfx.enabled && style.sfx.volume > 0) {
    for (const e of tl.sfx) {
      const src = ctx.createBufferSource();
      src.buffer = sfxBuffer(e.type, MIX_RATE);
      const g = ctx.createGain();
      g.gain.value = style.sfx.volume * (e.type === "whoosh" ? 0.55 : 0.8);
      src.connect(g).connect(ctx.destination);
      src.start(Math.max(0, e.time - (e.type === "whoosh" ? 0.18 : 0)));
    }
  }

  if (music && style.music.volume > 0) {
    const src = ctx.createBufferSource();
    src.buffer = music;
    src.loop = true;
    const g = ctx.createGain();
    const vol = style.music.volume;
    const end = tl.duration;
    const fadeStart = Math.max(0, end - 1.2);
    let cur = vol;
    g.gain.setValueAtTime(vol, 0);
    if (style.music.ducking && isSpeaking) {
      for (let t = 0.1; t < fadeStart; t += 0.1) {
        cur = isSpeaking(outToSrc(tl, t).src) ? vol * 0.4 : vol;
        g.gain.linearRampToValueAtTime(cur, t);
      }
    }
    g.gain.setValueAtTime(cur, fadeStart);
    g.gain.linearRampToValueAtTime(0, end);
    src.connect(g).connect(ctx.destination);
    src.start(0);
  }

  return ctx.startRendering();
}

export function sliceAudioBuffer(buf: AudioBuffer, from: number, to: number): AudioBuffer {
  const a = Math.floor(from * buf.sampleRate);
  const b = Math.min(buf.length, Math.floor(to * buf.sampleRate));
  const out = new AudioBuffer({ length: Math.max(1, b - a), sampleRate: buf.sampleRate, numberOfChannels: buf.numberOfChannels });
  for (let c = 0; c < buf.numberOfChannels; c++) out.copyToChannel(buf.getChannelData(c).subarray(a, b), c);
  return out;
}
