import type { Cut, EditProject, Graphic, IconName, Object3DName, ReelStyle, Word, Zoom } from "../../src/types";

/**
 * Piano di montaggio automatico (euristico). È il punto di partenza: Claude Code poi lo rifinisce
 * leggendo la trascrizione (hook migliore, grafiche più pertinenti, tagli delle frasi rifatte…).
 */
const FILLER = /^(e+h+m*|e+m+|u+h*m+|u+h+|a+h+|m+h*m+|h+m+|ehm+|uhm+|ah+|eh+|uh+|um+|hmm+|mm+)$/i;
const STOP = new Set(
  "il lo la i gli le un uno una di a da in con su per tra fra e o ma che chi non si mi ti ci vi ne è sono era hai ho ha abbiamo questo questa quello quella come quando dove perché poi anche molto più tutto tutti cosa fare fatto essere stato del della dei delle al alla nel nella the a an of to in on for and or but is are was be this that with it you i we they".split(" "),
);

const ICON_RULES: [RegExp, IconName, Object3DName?][] = [
  [/soldi|euro|€|guadagn|risparm|prezzo|costo|money|cash|\$/i, "euro", "coin"],
  [/idea|trucco|segreto|consiglio|tip|hack/i, "bulb"],
  [/tempo|minut|ore|veloce|subito|secondi/i, "clock"],
  [/casa|stanza|cucina|bagno|parete|muro/i, "house", "house"],
  [/fuoco|incredibil|pazzesc|top|wow|fortissim/i, "fire"],
  [/chiave|ripar|aggiust|sistem/i, "wrench"],
  [/martell|chiod/i, "hammer"],
  [/trapan|forar|foro|tassell/i, "drill"],
  [/vite|viti|avvit/i, "screw"],
  [/attenzion|errore|sbagli|mai|pericol|stop/i, "warning"],
  [/amor|cuore|adoro|love/i, "heart", "heart"],
  [/figli|bambin|papà|famiglia|mamma/i, "family"],
  [/vincer|risultat|obiettiv|migliore|campione/i, "trophy", "star"],
  [/facile|semplic|ok|perfett/i, "check"],
  [/pensa|cervello|mente|ricorda/i, "brain"],
  [/vernic|pittur|colore|dipinge/i, "paint"],
  [/misur|metro|centimetr/i, "ruler"],
  [/acqua|perdita|tubo|rubinett/i, "drop"],
  [/corrente|elettric|presa|cavo/i, "plug", "bolt"],
  [/regalo|gratis|bonus/i, "gift", "gift"],
  [/cresc|aument|di più|boost/i, "chart", "arrow"],
];

const clean = (w: string) => w.toLowerCase().replace(/[^a-z0-9à-öø-ÿ€$%]/g, "");

export function iconFor(text: string): { icon?: IconName; object?: Object3DName } {
  const r = ICON_RULES.find(([re]) => re.test(text));
  return r ? { icon: r[1], object: r[2] } : {};
}

/** Frasi rifatte: se le stesse 3 parole ricompaiono poco dopo, il primo tentativo va tagliato. */
function findRetakes(words: Word[]): Cut[] {
  const cuts: Cut[] = [];
  const n = words.map((w) => clean(w.text));
  for (let i = 0; i < n.length - 3; i++) {
    for (let j = i + 2; j < Math.min(n.length - 2, i + 14); j++) {
      if (n[i] && n[i] === n[j] && n[i + 1] === n[j + 1] && n[i + 2] === n[j + 2] && !STOP.has(n[i] + n[i + 1])) {
        cuts.push({ start: words[i].start - 0.02, end: words[j].start - 0.03, reason: "retake" });
        i = j;
        break;
      }
    }
  }
  return cuts;
}

export function autoPlan(words: Word[], style: ReelStyle, duration: number): Pick<EditProject, "cuts" | "emphasis" | "hook" | "zooms" | "graphics" | "cta"> {
  const cuts: Cut[] = words.filter((w) => FILLER.test(clean(w.text))).map((w) => ({ start: w.start - 0.02, end: w.end + 0.02, reason: "filler" }));
  cuts.push(...findRetakes(words));
  const removed = (w: Word) => cuts.some((c) => (w.start + w.end) / 2 >= c.start && (w.start + w.end) / 2 < c.end);

  const hookWords: string[] = [];
  for (const w of words) {
    if (removed(w)) continue;
    hookWords.push(w.text.replace(/[.,!?;:]+$/, ""));
    if (hookWords.length >= 6 || /[.!?]$/.test(w.text)) break;
  }

  const score = (w: Word) => {
    const c = clean(w.text);
    if (!c || STOP.has(c) || removed(w)) return 0;
    let s = Math.min(1, c.length / 10);
    if (/\d/.test(c)) s += 1;
    if (iconFor(c).icon) s += 0.6;
    if (/!$/.test(w.text)) s += 0.4;
    return s;
  };

  const emphasis: number[] = [];
  const zooms: Zoom[] = [];
  const graphics: Graphic[] = [];
  const hookDuration = 2.6;
  let lastEmph = -9;
  let lastZoom = -9;
  let lastGraphic = hookDuration + 0.5;
  let kind = 0;
  words.forEach((w, i) => {
    const s = score(w);
    const sentenceStart = i === 0 || /[.!?]$/.test(words[i - 1].text);
    if (s >= 0.8 && w.start - lastEmph > 2.2) {
      emphasis.push(i);
      lastEmph = w.start;
    }
    if ((sentenceStart || s >= 1) && !removed(w) && w.start - lastZoom > style.zoom.every) {
      zooms.push({ at: w.start, kind: zooms.length % 2 ? "smooth" : "punch", strength: Math.min(1, Math.max(0.4, s)) });
      lastZoom = w.start;
    }
    if (s >= 1 && w.start - lastGraphic > style.motion.density) {
      const { icon, object } = iconFor(w.text);
      const num = /\d/.test(w.text);
      const next = words[i + 1] && !STOP.has(clean(words[i + 1].text)) ? ` ${words[i + 1].text}` : "";
      const text = (w.text + (num ? next : "")).replace(/[.,!?;:]+$/, "").toUpperCase();
      const cycle = ["keyword", "icon", "object3d", "list"] as const;
      const type = num ? "stat" : object && kind % 3 === 1 ? "object3d" : icon && kind % 2 ? "icon" : cycle[kind % 4] === "list" ? "list" : "keyword";
      graphics.push({ type, at: w.start, duration: 2, text, icon: type === "list" ? "check" : icon, object: object ?? "star" });
      kind++;
      lastGraphic = w.start;
    }
  });

  const hookText = hookWords.join(" ").toUpperCase();
  return {
    cuts,
    emphasis,
    hook: hookText ? { text: hookText, duration: hookDuration, icon: iconFor(hookText).icon } : null,
    zooms,
    graphics,
    cta: duration > 8 ? { text: "SEGUIMI PER ALTRI TRUCCHI", icon: "bell" } : null,
  };
}
