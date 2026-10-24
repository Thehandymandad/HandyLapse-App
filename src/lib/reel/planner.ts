import type { EditPlan, MotionKind, PlannedGraphic, PlannedZoom, ReelStyle, SuggestedRemoval, Word } from "./types";

const FILLER_RE = /^(e+h+m*|e+m+|u+h*m+|u+h+|a+h+|m+h*m+|h+m+|ehm+|uhm+|ah+|eh+|uh+|um+|hmm+|mm+)$/i;

const STOPWORDS = new Set(
  "il lo la i gli le un uno una di a da in con su per tra fra e o ma che chi non si mi ti ci vi ne è sono era hai ho ha abbiamo questo questa quello quella come quando dove perché poi anche molto più tutto tutti cosa fare fatto essere stato the a an of to in on for and or but is are was be this that with it you i we they".split(
    " ",
  ),
);

const EMOJI_MAP: [RegExp, string][] = [
  [/soldi|euro|guadagn|money|cash|€|\$|prezzo|costo|risparm/i, "💰"],
  [/idea|trucco|segreto|consiglio|tip|hack/i, "💡"],
  [/tempo|minut|ore|veloce|subito|time|fast/i, "⏱️"],
  [/casa|home|stanza|cucina|bagno/i, "🏠"],
  [/fuoco|fire|incredibil|pazzesc|top|wow/i, "🔥"],
  [/attrezz|trapano|martell|vite|tool|fai.?da.?te|diy|ripar/i, "🛠️"],
  [/attenzion|errore|sbagli|mai|pericol|warning|stop/i, "⚠️"],
  [/amor|cuore|love|bell/i, "❤️"],
  [/figli|bambin|papà|famiglia|kids|dad/i, "👨‍👧"],
  [/success|vincer|risultat|win|obiettiv/i, "🏆"],
  [/facile|semplic|easy/i, "✅"],
  [/pensa|cervello|mente|brain|think/i, "🧠"],
];

export function guessEmoji(text: string): string | undefined {
  return EMOJI_MAP.find(([re]) => re.test(text))?.[1];
}

const clean = (w: string) => w.toLowerCase().replace(/[^a-z0-9à-öø-ÿ€$%]/g, "");

let idCounter = 0;
export const uid = (p: string) => `${p}${Date.now().toString(36)}${(idCounter++).toString(36)}`;

/** Piano di montaggio euristico, usato senza AI o come base. */
export function localPlan(words: Word[], style: ReelStyle): EditPlan {
  const removals: SuggestedRemoval[] = [];
  words.forEach((w, i) => {
    if (FILLER_RE.test(clean(w.text))) removals.push({ id: uid("r"), startWord: i, endWord: i, reason: "filler", enabled: true });
  });
  const removedIdx = new Set(removals.map((r) => r.startWord));

  // Hook: prima frase, max 6 parole
  const hookWords: string[] = [];
  for (let i = 0; i < words.length && hookWords.length < 6; i++) {
    if (removedIdx.has(i)) continue;
    hookWords.push(words[i].text.replace(/[.,!?;:]+$/, ""));
    if (/[.!?]$/.test(words[i].text)) break;
  }

  const sentenceStart = (i: number) => i === 0 || /[.!?]$/.test(words[i - 1]?.text ?? "");
  const score = (i: number) => {
    const c = clean(words[i].text);
    if (!c || STOPWORDS.has(c) || removedIdx.has(i)) return 0;
    let s = Math.min(1, c.length / 10);
    if (/\d/.test(c)) s += 1;
    if (guessEmoji(c)) s += 0.6;
    if (/!$/.test(words[i].text)) s += 0.4;
    return s;
  };

  const emphasis: EditPlan["emphasis"] = [];
  const graphics: PlannedGraphic[] = [];
  const zooms: PlannedZoom[] = [];
  let lastEmph = -Infinity;
  let lastGraphic = style.motion.hookDuration;
  let lastZoom = -Infinity;

  words.forEach((w, i) => {
    const s = score(i);
    if (s >= 0.8 && w.start - lastEmph > 2.2) {
      emphasis.push({ wordIndex: i, emoji: guessEmoji(w.text) });
      lastEmph = w.start;
    }
    if (s >= 1 && w.start - lastGraphic > style.motion.density) {
      const isNum = /\d/.test(w.text);
      const emoji = guessEmoji(w.text);
      const next = words[i + 1] && !STOPWORDS.has(clean(words[i + 1].text)) ? ` ${words[i + 1].text}` : "";
      const kind: MotionKind = isNum ? "stat" : emoji && i % 2 ? "emoji" : "keyword";
      graphics.push({
        id: uid("g"),
        kind,
        startWord: i,
        endWord: Math.min(words.length - 1, i + 3),
        text: (w.text + (isNum ? next : "")).replace(/[.,!?;:]+$/, "").toUpperCase(),
        emoji,
      });
      lastGraphic = w.start;
    }
    if ((sentenceStart(i) || s >= 1) && !removedIdx.has(i) && w.start - lastZoom > style.zoom.every) {
      zooms.push({ id: uid("z"), wordIndex: i, kind: zooms.length % 2 ? "smooth" : "punch", strength: Math.min(1, s) });
      lastZoom = w.start;
    }
  });

  return { hook: hookWords.join(" ").toUpperCase(), emphasis, zooms, graphics, removals, source: "local" };
}

/** Valida il piano restituito dall'AI e lo ancora alle parole esistenti. */
export function normalizePlan(raw: unknown, wordCount: number): EditPlan | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  const idx = (v: unknown) => (typeof v === "number" && Number.isInteger(v) && v >= 0 && v < wordCount ? v : null);
  const arr = (v: unknown) => (Array.isArray(v) ? (v as Record<string, unknown>[]) : []);
  const str = (v: unknown, max = 60) => (typeof v === "string" ? v.slice(0, max) : "");

  const emphasis = arr(r.emphasis)
    .map((e) => ({ wordIndex: idx(e.wordIndex), emoji: str(e.emoji, 8) || undefined }))
    .filter((e): e is { wordIndex: number; emoji: string | undefined } => e.wordIndex !== null);

  const zooms: PlannedZoom[] = arr(r.zooms)
    .map((z) => ({
      id: uid("z"),
      wordIndex: idx(z.wordIndex) ?? -1,
      kind: (z.kind === "smooth" ? "smooth" : "punch") as PlannedZoom["kind"],
      strength: typeof z.strength === "number" ? Math.min(1, Math.max(0, z.strength)) : 0.6,
    }))
    .filter((z) => z.wordIndex >= 0);

  const kinds: MotionKind[] = ["keyword", "emoji", "stat", "list"];
  const graphics: PlannedGraphic[] = arr(r.graphics)
    .map((g) => {
      const start = idx(g.startWord) ?? -1;
      return {
        id: uid("g"),
        kind: (kinds.includes(g.kind as MotionKind) ? g.kind : "keyword") as MotionKind,
        startWord: start,
        endWord: Math.max(start, idx(g.endWord) ?? start),
        text: str(g.text, 40),
        emoji: str(g.emoji, 8) || undefined,
      };
    })
    .filter((g) => g.startWord >= 0 && (g.text || g.emoji));

  const reasons = ["filler", "retake", "off-topic"] as const;
  const removals: SuggestedRemoval[] = arr(r.removals)
    .map((x) => {
      const start = idx(x.startWord) ?? -1;
      return {
        id: uid("r"),
        startWord: start,
        endWord: Math.max(start, idx(x.endWord) ?? start),
        reason: (reasons as readonly string[]).includes(x.reason as string) ? (x.reason as SuggestedRemoval["reason"]) : "filler",
        enabled: true,
      };
    })
    .filter((x) => x.startWord >= 0 && x.endWord - x.startWord < 80);

  return { hook: str(r.hook, 60), emphasis, zooms, graphics, removals, source: "ai" };
}
