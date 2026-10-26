import type { AutoPlan } from "../../pack";
import type { Graphic, Word } from "../../../types";

/**
 * Piano automatico di Pulse (quando monta il cloud, senza Claude Code a rifinire):
 * mirino REC sulla prima frase, nastri sulla parola chiave più forte a metà video, chat DM sulla call to action
 * ("scrivimi/scrivetemi/commenta … PAROLA"). Zoom, enfasi e tagli restano quelli del piano generico.
 */
const CTA = /^(scrivimi|scrivetemi|scrivi|scrivete|commenta|commentate|commentami|mandami|mandatemi)$/i;
const SKIP = new Set("la il lo un una mi ci qui sotto nei nel nella nelle commenti commento parola in a con per me te ti di semplicemente solo".split(" "));
/** Parola senza punteggiatura né articolo eliso ("all'editing" → "editing"). */
const bare = (w: string) => (w.split(/['’]/).pop() ?? w).replace(/[^\p{L}\p{N}]/gu, "");

export function pulsePlan({ words: all, duration, plan }: { words: Word[]; duration: number; plan: AutoPlan }): Partial<AutoPlan> {
  const graphics: Graphic[] = [];
  const fps = 30;
  // solo le parole che restano nel montaggio (le frasi rifatte tagliate dal piano generico non contano)
  const kept = (w: Word) => !plan.cuts.some((c) => (w.start + w.end) / 2 >= c.start && (w.start + w.end) / 2 < c.end);
  const words = all.filter(kept);
  if (!words.length) return { hook: null, cta: null, graphics };

  // 1. mirino REC sulla prima frase (2–4 s)
  const firstEnd = words.find((w, i) => i > 2 && /[.!?]$/.test(w.text))?.end ?? words[Math.min(words.length - 1, 8)].end;
  const recStart = words[0].start;
  const recDur = Math.min(4, Math.max(2, firstEnd - recStart + 0.1));
  graphics.push({ type: "rec", at: recStart, duration: recDur, sfx: "beep", props: { shutterAt: Math.round(recDur * fps) - 12 } });
  graphics.push({ type: "sfx", at: recStart + recDur - 0.4, duration: 0.6, sfx: "shutter" });

  // 2. chat DM sulla call to action
  let ctaFrom = duration;
  // l'ultima: se la frase è stata ripetuta, la versione buona è di solito l'ultima
  let ci = -1;
  words.forEach((w, i) => CTA.test(bare(w.text)) && (ci = i));
  if (ci >= 0) {
    const key = words
      .slice(ci + 1, ci + 6)
      .find((w) => w.start - words[ci].end < 2.5 && bare(w.text).length >= 3 && !SKIP.has(bare(w.text).toLowerCase()));
    if (key) {
      const at = words[ci].start;
      const typeAt = Math.max(4, Math.round((key.start - at) * fps) - 4);
      const sendAt = Math.round((key.end - at) * fps) + 8;
      const dur = Math.max(2.4, Math.min(duration - at + 1, 5));
      graphics.push({
        type: "dm",
        at,
        duration: dur,
        text: bare(key.text).toUpperCase(),
        sfx: "whoosh",
        props: { typeAt, sendAt, replyAt: sendAt + 16, reply: "Ecco tutto quello che ti serve" },
      });
      graphics.push({ type: "sfx", at: at + typeAt / fps, duration: 0.6, sfx: "typing" });
      graphics.push({ type: "sfx", at: at + sendAt / fps, duration: 0.6, sfx: "send" });
      graphics.push({ type: "sfx", at: at + (sendAt + 16) / fps, duration: 0.6, sfx: "pop" });
      ctaFrom = at;
    }
  }

  // 3. nastri sulla parola enfatizzata più lunga tra il mirino e la CTA
  const candidates = plan.emphasis
    .map((i) => all[i])
    .filter((w) => w && kept(w) && w.start > recStart + recDur + 0.5 && w.end + 1.8 < ctaFrom && bare(w.text).length >= 4 && !CTA.test(bare(w.text)));
  const best = candidates.sort((a, b) => bare(b.text).length - bare(a.text).length)[0];
  if (best) graphics.push({ type: "tape", at: best.start, duration: 1.6, text: bare(best.text).toUpperCase(), sfx: "whoosh" });

  return { hook: null, cta: null, graphics };
}
