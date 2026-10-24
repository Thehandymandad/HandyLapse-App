import type { EditProject, Graphic, IconName, Range, ReelStyle, SfxName } from "../types";

/** Segmento tenuto: frame del sorgente [srcFrom, srcFrom+frames) → frame di output [from, from+frames). */
export type Segment = { srcFrom: number; from: number; frames: number };
export type CaptionWord = { text: string; from: number; to: number; keyword: boolean };
export type CaptionGroup = { from: number; to: number; words: CaptionWord[]; seed: number };
export type ZoomEvent = { from: number; to: number; scale: number; kind: "punch" | "smooth" };
export type GraphicEvent = Graphic & { from: number; frames: number; key: string };
export type Timeline = {
  fps: number;
  durationInFrames: number;
  segments: Segment[];
  /** Frame di output dove c'è un jump cut. */
  cuts: number[];
  captions: CaptionGroup[];
  zooms: ZoomEvent[];
  graphics: GraphicEvent[];
  hook: { from: number; frames: number; text: string; icon?: IconName } | null;
  cta: { from: number; frames: number; text: string; icon?: IconName } | null;
  sfx: { from: number; name: SfxName }[];
};

export function subtractRanges(keep: Range[], remove: Range[]): Range[] {
  let out = keep.map((r) => ({ ...r }));
  for (const rm of remove) {
    const next: Range[] = [];
    for (const r of out) {
      if (rm.end <= r.start || rm.start >= r.end) next.push(r);
      else {
        if (rm.start > r.start) next.push({ start: r.start, end: rm.start });
        if (rm.end < r.end) next.push({ start: rm.end, end: r.end });
      }
    }
    out = next;
  }
  return out;
}

const DEFAULT_SFX: Record<string, SfxName> = { keyword: "pop", stat: "ding", list: "pop", icon: "pop", object3d: "whoosh", arrow: "click", cta: "ding" };

export function buildTimeline(project: EditProject, style: ReelStyle): Timeline {
  const fps = project.source.fps;
  const trim = project.trim ?? { start: 0, end: project.source.duration };
  const keep = (project.keep.length ? project.keep : [{ start: 0, end: project.source.duration }])
    .map((r) => ({ start: Math.max(r.start, trim.start), end: Math.min(r.end, trim.end) }))
    .filter((r) => r.end > r.start);
  const ranges = subtractRanges(keep, project.cuts);

  // Quantizza ai frame e unisci quello che si tocca
  const segs: { a: number; b: number }[] = [];
  for (const r of ranges) {
    const a = Math.round(r.start * fps);
    const b = Math.round(r.end * fps);
    if (b - a < 3) continue;
    const last = segs[segs.length - 1];
    if (last && a <= last.b) last.b = Math.max(last.b, b);
    else segs.push({ a, b });
  }
  const segments: Segment[] = [];
  let total = 0;
  for (const s of segs) {
    segments.push({ srcFrom: s.a, from: total, frames: s.b - s.a });
    total += s.b - s.a;
  }
  const durationInFrames = Math.max(1, total);

  /** Tempo sorgente (s) → frame di output. Se cade in un taglio va all'inizio del segmento successivo. */
  const toOut = (t: number) => {
    const f = t * fps;
    for (const s of segments) {
      if (f < s.srcFrom) return s.from;
      if (f < s.srcFrom + s.frames) return s.from + Math.round(f - s.srcFrom);
    }
    return durationInFrames;
  };
  const inCut = (t: number) => project.cuts.some((c) => t >= c.start && t < c.end) || t < trim.start || t >= trim.end;

  const cuts: number[] = [];
  for (let i = 1; i < segments.length; i++) {
    if (segments[i].srcFrom - (segments[i - 1].srcFrom + segments[i - 1].frames) > 1) cuts.push(segments[i].from);
  }

  // ---- sottotitoli ----
  const offset = project.captionOffset ?? 0;
  const emphasis = new Set(project.emphasis);
  const captions: CaptionGroup[] = [];
  if (style.captions.enabled) {
    type V = { w: CaptionWord; raw: string };
    const visible: V[] = [];
    let prev = 0;
    project.words.forEach((w, i) => {
      const mid = (w.start + w.end) / 2;
      if (inCut(mid) || !w.text.trim()) return;
      const from = Math.max(prev, toOut(w.start + offset));
      const to = Math.max(from + 2, toOut(w.end + offset));
      prev = from;
      const text = style.captions.uppercase ? w.text.toLocaleUpperCase("it-IT") : w.text;
      visible.push({ w: { text: text.trim(), from, to, keyword: emphasis.has(i) }, raw: w.text });
    });
    let group: V[] = [];
    const flush = () => {
      if (!group.length) return;
      captions.push({ from: group[0].w.from, to: group[group.length - 1].w.to, words: group.map((g) => g.w), seed: captions.length });
      group = [];
    };
    for (const v of visible) {
      const p = group[group.length - 1];
      const chars = group.reduce((n, g) => n + g.w.text.length + 1, 0) + v.w.text.length;
      if (
        p &&
        (group.length >= style.captions.maxWordsPerCaption ||
          chars > style.captions.maxCharsPerLine * 2 ||
          /[.!?…]$/.test(p.raw) ||
          (/[,;:]$/.test(p.raw) && group.length >= 2) ||
          v.w.from - p.w.to > fps * 0.6)
      )
        flush();
      group.push(v);
    }
    flush();
    for (let i = 0; i < captions.length - 1; i++) {
      const gap = captions[i + 1].from - captions[i].to;
      if (gap > 0 && gap < fps * 0.35) captions[i].to = captions[i + 1].from;
    }
  }

  // ---- zoom ----
  const zooms: ZoomEvent[] = [];
  if (style.zoom.enabled) {
    for (const z of [...project.zooms].sort((a, b) => a.at - b.at)) {
      if (inCut(z.at)) continue;
      const from = toOut(z.at);
      const len = z.duration ?? (z.kind === "punch" ? 1.4 + z.strength * 0.8 : 2.6);
      const last = zooms[zooms.length - 1];
      if (last && from < last.to + fps * 0.3) continue;
      zooms.push({
        from,
        to: Math.min(durationInFrames, from + Math.round(len * fps)),
        scale: 1 + (style.zoom.intensity - 1) * (0.6 + 0.4 * z.strength),
        kind: z.kind,
      });
    }
  }

  // ---- hook, grafiche, cta ----
  const hook = project.hook?.text.trim()
    ? { from: 0, frames: Math.round(project.hook.duration * fps), text: project.hook.text.trim(), icon: project.hook.icon }
    : null;
  const graphics: GraphicEvent[] = project.graphics
    .filter((g) => !inCut(g.at))
    .map((g, i) => ({ ...g, from: toOut(g.at), frames: Math.max(fps * 0.6, Math.round(g.duration * fps)), key: `g${i}` }))
    .filter((g) => !hook || g.type === "arrow" || g.from >= hook.frames)
    .sort((a, b) => a.from - b.from);
  const ctaFrames = Math.round(2.6 * fps);
  const cta = project.cta?.text ? { from: Math.max(0, durationInFrames - ctaFrames), frames: ctaFrames, text: project.cta.text, icon: project.cta.icon } : null;

  // ---- effetti sonori ----
  const sfx: Timeline["sfx"] = [];
  if (style.audio.sfx) {
    if (hook) sfx.push({ from: 0, name: "whoosh" });
    zooms.filter((z) => z.kind === "punch").forEach((z) => sfx.push({ from: Math.max(0, z.from - 4), name: "whoosh" }));
    graphics.forEach((g) => {
      const name = g.sfx ?? DEFAULT_SFX[g.type];
      if (name && name !== "none") sfx.push({ from: g.from, name });
    });
    if (cta) sfx.push({ from: cta.from, name: "ding" });
    sfx.sort((a, b) => a.from - b.from);
  }

  return { fps, durationInFrames, segments, cuts, captions, zooms, graphics, hook, cta, sfx };
}

/** Scala dello zoom al frame dato (alternanza sui tagli × eventi di zoom). */
export function zoomAt(frame: number, tl: Timeline, style: ReelStyle) {
  if (!style.zoom.enabled) return 1;
  let z = 1;
  if (style.zoom.alternateOnCuts) {
    let k = 0;
    for (const c of tl.cuts) if (c <= frame) k++;
    if (k % 2 === 1) z *= style.zoom.alternateScale;
  }
  for (const e of tl.zooms) {
    if (frame < e.from || frame > e.to) continue;
    let amt: number;
    if (e.kind === "punch") {
      amt = easeOutCubic(Math.min((frame - e.from) / 3, (e.to - frame) / 6));
    } else {
      const back = 14;
      amt = frame < e.to - back ? easeInOutSine((frame - e.from) / Math.max(1, e.to - back - e.from)) : easeInOutSine((e.to - frame) / back);
    }
    z *= 1 + (e.scale - 1) * amt;
  }
  return z;
}

const clamp01 = (x: number) => Math.min(1, Math.max(0, x));
export const easeOutCubic = (x: number) => 1 - Math.pow(1 - clamp01(x), 3);
export const easeInOutSine = (x: number) => -(Math.cos(Math.PI * clamp01(x)) - 1) / 2;
export const seeded = (seed: number) => {
  const x = Math.sin(seed * 12.9898 + 78.233) * 43758.5453;
  return x - Math.floor(x);
};
