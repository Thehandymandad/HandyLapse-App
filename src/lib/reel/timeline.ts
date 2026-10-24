import type {
  CaptionGroup,
  CaptionWord,
  EditPlan,
  GraphicEvent,
  Range,
  ReelStyle,
  SuggestedRemoval,
  Timeline,
  Word,
  ZoomEvent,
} from "./types";

const MIN_SEGMENT = 0.08;

export function subtractRanges(keep: Range[], remove: Range[]): Range[] {
  let out = keep.map((r) => ({ ...r }));
  for (const rm of remove) {
    const next: Range[] = [];
    for (const r of out) {
      if (rm.end <= r.start || rm.start >= r.end) {
        next.push(r);
        continue;
      }
      if (rm.start > r.start) next.push({ start: r.start, end: rm.start });
      if (rm.end < r.end) next.push({ start: rm.end, end: r.end });
    }
    out = next;
  }
  return out.filter((r) => r.end - r.start >= MIN_SEGMENT);
}

export function isRemovalActive(r: SuggestedRemoval, style: ReelStyle) {
  if (!r.enabled) return false;
  if (r.reason === "filler") return style.cuts.removeFillers;
  if (r.reason === "retake" || r.reason === "off-topic") return style.cuts.removeRetakes;
  return true;
}

/** Indici delle parole tagliate dal video (filler, ripetizioni, tagli manuali). */
export function removedWordSet(plan: EditPlan, style: ReelStyle, wordCount: number): Set<number> {
  const set = new Set<number>();
  for (const r of plan.removals) {
    if (!isRemovalActive(r, style)) continue;
    for (let i = Math.max(0, r.startWord); i <= Math.min(wordCount - 1, r.endWord); i++) set.add(i);
  }
  return set;
}

/** Converte un tempo del sorgente nel tempo di output. Se cade in un taglio va all'inizio del segmento successivo. */
export function srcToOut(segments: Range[], offsets: number[], t: number): number {
  for (let i = 0; i < segments.length; i++) {
    const s = segments[i];
    if (t < s.start) return offsets[i];
    if (t <= s.end) return offsets[i] + (t - s.start);
  }
  if (!segments.length) return 0;
  const last = segments.length - 1;
  return offsets[last] + (segments[last].end - segments[last].start);
}

/** Converte un tempo di output nel tempo del sorgente. */
export function outToSrc(tl: Pick<Timeline, "segments" | "offsets">, t: number): { src: number; index: number } {
  const { segments, offsets } = tl;
  if (!segments.length) return { src: 0, index: -1 };
  let i = segments.length - 1;
  for (let k = 0; k < segments.length; k++) {
    if (t < offsets[k] + (segments[k].end - segments[k].start)) {
      i = k;
      break;
    }
  }
  const s = segments[i];
  return { src: Math.min(s.end, s.start + Math.max(0, t - offsets[i])), index: i };
}

export function segmentIndexAt(tl: Pick<Timeline, "segments" | "offsets">, t: number) {
  return outToSrc(tl, t).index;
}

type BuildInput = {
  duration: number;
  /** Parlato con margini, dal rilevamento silenzi. Se null si tiene tutto il video. */
  speech: Range[] | null;
  words: Word[];
  plan: EditPlan;
  style: ReelStyle;
  /** Spostamento manuale dei sottotitoli (sync). */
  captionOffset: number;
  /** Rifila inizio/fine del sorgente. */
  trim: Range;
};

export function buildTimeline({ duration, speech, words, plan, style, captionOffset, trim }: BuildInput): Timeline {
  const base = (speech ?? [{ start: 0, end: duration }]).map((r) => ({
    start: Math.max(r.start, trim.start),
    end: Math.min(r.end, trim.end),
  }));
  const removed = removedWordSet(plan, style, words.length);
  const removeRanges: Range[] = [];
  for (const r of plan.removals) {
    if (!isRemovalActive(r, style)) continue;
    const a = words[r.startWord];
    const b = words[Math.min(words.length - 1, r.endWord)];
    if (a && b) removeRanges.push({ start: a.start, end: b.end });
  }
  const segments = subtractRanges(
    base.filter((r) => r.end - r.start >= MIN_SEGMENT),
    removeRanges,
  );
  const offsets: number[] = [];
  let total = 0;
  for (const s of segments) {
    offsets.push(total);
    total += s.end - s.start;
  }

  const toOut = (t: number) => srcToOut(segments, offsets, t);
  const wordOut = words.map((w) => ({ start: toOut(w.start + captionOffset), end: toOut(w.end + captionOffset) }));

  const emphasis = new Map(plan.emphasis.map((e) => [e.wordIndex, e.emoji]));

  // Sottotitoli
  const captions: CaptionGroup[] = [];
  if (style.captions.enabled) {
    const visible: { w: CaptionWord; index: number; raw: string }[] = [];
    let prevStart = 0;
    words.forEach((w, i) => {
      if (removed.has(i) || !w.text.trim()) return;
      let { start, end } = wordOut[i];
      start = Math.max(start, prevStart);
      end = Math.max(end, start + 0.08);
      prevStart = start;
      const text = style.captions.uppercase ? w.text.toLocaleUpperCase("it-IT") : w.text;
      visible.push({ w: { text: text.trim(), start, end, keyword: emphasis.has(i) }, index: i, raw: w.text });
    });

    let group: typeof visible = [];
    const flush = () => {
      if (!group.length) return;
      const emoji = style.captions.emojis ? group.map((g) => emphasis.get(g.index)).find(Boolean) : undefined;
      captions.push({
        start: group[0].w.start,
        end: group[group.length - 1].w.end,
        words: group.map((g) => g.w),
        emoji,
        seed: captions.length,
      });
      group = [];
    };
    for (const v of visible) {
      const prev = group[group.length - 1];
      const chars = group.reduce((n, g) => n + g.w.text.length + 1, 0) + v.w.text.length;
      if (
        prev &&
        (group.length >= style.captions.maxWordsPerCaption ||
          chars > style.captions.maxCharsPerLine * 2 ||
          /[.!?…]$/.test(prev.raw) ||
          (/[,;:]$/.test(prev.raw) && group.length >= 2) ||
          v.w.start - prev.w.end > 0.6)
      ) {
        flush();
      }
      group.push(v);
    }
    flush();
    // Evita lo sfarfallio: allunga ogni gruppo fino al successivo se la pausa è breve
    for (let i = 0; i < captions.length - 1; i++) {
      const gap = captions[i + 1].start - captions[i].end;
      if (gap > 0 && gap < 0.35) captions[i].end = captions[i + 1].start;
    }
  }

  // Zoom
  const zooms: ZoomEvent[] = [];
  if (style.zoom.enabled) {
    const sorted = [...plan.zooms].filter((z) => words[z.wordIndex] && !removed.has(z.wordIndex));
    sorted.sort((a, b) => wordOut[a.wordIndex].start - wordOut[b.wordIndex].start);
    for (const z of sorted) {
      const kind = style.zoom.mode === "mixed" ? z.kind : style.zoom.mode;
      const start = wordOut[z.wordIndex].start;
      const len = kind === "punch" ? 1.4 + z.strength * 0.8 : 2.6;
      const last = zooms[zooms.length - 1];
      if (last && start < last.end + 0.3) continue;
      const scale = 1 + (style.zoom.intensity - 1) * (0.6 + 0.4 * z.strength);
      zooms.push({ start, end: Math.min(total, start + len), scale, kind });
    }
  }

  // Grafiche
  const graphics: GraphicEvent[] = [];
  const hookEnd = Math.min(total, style.motion.hookDuration);
  if (style.motion.hookTitle && plan.hook.trim()) {
    // parte "prima" dello zero così il primo frame (quello che si vede nel feed) ha già il titolo
    graphics.push({ id: "hook", start: -0.45, end: hookEnd, kind: "hook", text: plan.hook.trim() });
  }
  const candidates = plan.graphics
    .filter((g) => words[g.startWord] && !removed.has(g.startWord))
    .filter((g) => (g.kind === "emoji" ? style.motion.emojiPops : style.motion.keywordPops))
    .map((g) => {
      const start = wordOut[g.startWord].start;
      const endWord = Math.min(words.length - 1, Math.max(g.startWord, g.endWord));
      const end = Math.min(total, Math.max(start + 1.1, Math.min(start + 3, wordOut[endWord].end + 0.4)));
      return { id: g.id, start, end, kind: g.kind, text: g.text, emoji: g.emoji } as GraphicEvent;
    })
    .sort((a, b) => a.start - b.start);
  let lastEnd = style.motion.hookTitle ? hookEnd : 0;
  for (const g of candidates) {
    if (g.start < lastEnd + 0.2) continue;
    graphics.push(g);
    lastEnd = g.end;
  }

  const cuts: number[] = [];
  for (let i = 1; i < segments.length; i++) {
    if (segments[i].start - segments[i - 1].end > 0.05) cuts.push(offsets[i]);
  }

  const sfx: Timeline["sfx"] = [];
  if (style.sfx.enabled) {
    if (style.sfx.whooshOnZoom) zooms.filter((z) => z.kind === "punch").forEach((z) => sfx.push({ time: z.start, type: "whoosh" }));
    if (style.sfx.popOnGraphics) graphics.forEach((g) => sfx.push({ time: g.start, type: g.kind === "hook" ? "whoosh" : "pop" }));
    sfx.sort((a, b) => a.time - b.time);
  }

  return { duration: total, segments, offsets, captions, zooms, graphics, cuts, sfx };
}
