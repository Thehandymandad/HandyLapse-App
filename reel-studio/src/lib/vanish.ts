import { easeOutCubic, type Timeline } from "./timeline";

/** Effetto "sparisci/ricompari" della persona (grafica di tipo "vanish", serve source.matte). */
export type PersonFx = { opacity: number; blur: number; jitter: number; streak: number };

export function personFxAt(frame: number, tl: Timeline): PersonFx | null {
  const g = tl.graphics.find((x) => x.type === "vanish" && frame >= x.from && frame < x.from + x.frames);
  if (!g) return null;
  const f = frame - g.from;
  const ghost = typeof g.props?.ghost === "number" ? g.props.ghost : 0.15;
  const outF = Math.min(14, g.frames / 3);
  const inF = Math.min(9, g.frames / 4);
  if (f < outF) {
    const p = easeOutCubic(f / outF);
    return { opacity: 1 - (1 - ghost) * p, blur: p * 5, jitter: Math.sin(f * 2.7) * 38 * (1 - p * 0.5), streak: 0 };
  }
  if (f >= g.frames - inF) {
    const q = (f - (g.frames - inF)) / inF;
    return { opacity: ghost + (1 - ghost) * easeOutCubic(q), blur: (1 - q) * 4, jitter: 0, streak: Math.sin(Math.PI * q) };
  }
  return { opacity: ghost, blur: 1.5, jitter: 0, streak: 0 };
}
