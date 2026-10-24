import type { ReelStyle } from "./types";

/** Stile base: ogni preset e ogni stile generato dalla reference viene fuso sopra questo. */
export const BASE_STYLE: ReelStyle = {
  id: "base",
  name: "Base",
  description: "",
  captions: {
    enabled: true,
    fontFamily: "Montserrat",
    fontWeight: 900,
    fontSize: 88,
    uppercase: true,
    letterSpacing: 0,
    color: "#FFFFFF",
    highlightColor: "#FFD200",
    highlightMode: "color",
    keywordColor: "#3DFF6E",
    strokeColor: "#000000",
    strokeWidth: 10,
    shadowColor: "rgba(0,0,0,0.55)",
    shadowBlur: 18,
    shadowOffsetY: 6,
    background: "none",
    backgroundColor: "rgba(0,0,0,0.6)",
    positionY: 0.68,
    maxWordsPerCaption: 3,
    maxCharsPerLine: 16,
    animation: "pop",
    emojis: true,
    tilt: 0,
  },
  cuts: {
    silenceThresholdDb: null,
    minSilence: 0.35,
    paddingBefore: 0.08,
    paddingAfter: 0.12,
    removeFillers: true,
    removeRetakes: true,
  },
  zoom: {
    enabled: true,
    mode: "mixed",
    intensity: 1.22,
    every: 4,
    alternateOnCuts: true,
    alternateScale: 1.1,
    focusX: 0.5,
    focusY: 0.38,
    shake: false,
  },
  motion: {
    accentColor: "#FFD200",
    secondaryColor: "#111111",
    textColor: "#111111",
    fontFamily: "Montserrat",
    hookTitle: true,
    hookDuration: 2.6,
    keywordPops: true,
    emojiPops: true,
    progressBar: false,
    progressBarPosition: "top",
    flashOnCut: false,
    density: 6,
  },
  grade: { brightness: 1.02, contrast: 1.08, saturation: 1.1, warmth: 0.05, vignette: 0.25 },
  sfx: { enabled: true, volume: 0.5, whooshOnZoom: true, popOnGraphics: true },
  music: { volume: 0.15, ducking: true },
};

const ENUMS: Record<string, readonly string[]> = {
  "captions.highlightMode": ["color", "box", "scale", "underline", "none"],
  "captions.background": ["none", "box", "pill"],
  "captions.animation": ["pop", "bounce", "fade", "slide-up", "typewriter", "none"],
  "zoom.mode": ["punch", "smooth", "mixed"],
  "motion.progressBarPosition": ["top", "bottom"],
};

const RANGES: Record<string, [number, number]> = {
  "captions.fontWeight": [100, 900],
  "captions.fontSize": [28, 180],
  "captions.letterSpacing": [-10, 30],
  "captions.strokeWidth": [0, 30],
  "captions.shadowBlur": [0, 60],
  "captions.shadowOffsetY": [-20, 30],
  "captions.positionY": [0.1, 0.92],
  "captions.maxWordsPerCaption": [1, 10],
  "captions.maxCharsPerLine": [6, 40],
  "captions.tilt": [0, 15],
  "cuts.silenceThresholdDb": [-80, -10],
  "cuts.minSilence": [0.1, 3],
  "cuts.paddingBefore": [0, 0.5],
  "cuts.paddingAfter": [0, 0.6],
  "zoom.intensity": [1, 1.8],
  "zoom.every": [1, 30],
  "zoom.alternateScale": [1, 1.5],
  "zoom.focusX": [0, 1],
  "zoom.focusY": [0, 1],
  "motion.hookDuration": [0.8, 6],
  "motion.density": [2, 30],
  "grade.brightness": [0.6, 1.5],
  "grade.contrast": [0.6, 1.6],
  "grade.saturation": [0, 2],
  "grade.warmth": [-1, 1],
  "grade.vignette": [0, 1],
  "sfx.volume": [0, 1],
  "music.volume": [0, 1],
};

const COLOR_RE = /^(#[0-9a-f]{3,8}|rgba?\([\d\s.,%]+\)|hsla?\([\d\s.,%deg]+\))$/i;

function mergeInto(base: Record<string, unknown>, input: unknown, path: string): Record<string, unknown> {
  const out: Record<string, unknown> = { ...base };
  if (!input || typeof input !== "object") return out;
  const src = input as Record<string, unknown>;
  for (const key of Object.keys(base)) {
    const p = path ? `${path}.${key}` : key;
    const b = base[key];
    const v = src[key];
    if (v === undefined) continue;
    if (b && typeof b === "object") {
      out[key] = mergeInto(b as Record<string, unknown>, v, p);
    } else if (p === "cuts.silenceThresholdDb") {
      out[key] = v === null ? null : typeof v === "number" && isFinite(v) ? clamp(v, RANGES[p]) : b;
    } else if (typeof b === "number" && typeof v === "number" && isFinite(v)) {
      out[key] = RANGES[p] ? clamp(v, RANGES[p]) : v;
    } else if (typeof b === "boolean" && typeof v === "boolean") {
      out[key] = v;
    } else if (typeof b === "string" && typeof v === "string") {
      if (ENUMS[p]) out[key] = ENUMS[p].includes(v) ? v : b;
      else if (/color$/i.test(key)) out[key] = COLOR_RE.test(v.trim()) ? v.trim() : b;
      else out[key] = v.slice(0, 200);
    }
  }
  return out;
}

function clamp(v: number, r?: [number, number]) {
  return r ? Math.min(r[1], Math.max(r[0], v)) : v;
}

/** Fonde un oggetto qualsiasi (preset, JSON dall'AI, import utente) sopra BASE_STYLE validando ogni campo. */
export function normalizeStyle(input: unknown, base: ReelStyle = BASE_STYLE): ReelStyle {
  const merged = mergeInto(base as unknown as Record<string, unknown>, input, "") as unknown as ReelStyle;
  if (merged.captions.maxWordsPerCaption) merged.captions.maxWordsPerCaption = Math.round(merged.captions.maxWordsPerCaption);
  return merged;
}

type DeepPartial<T> = { [K in keyof T]?: T[K] extends object ? Partial<T[K]> : T[K] };

function preset(id: string, name: string, description: string, over: DeepPartial<ReelStyle>): ReelStyle {
  return normalizeStyle({ ...over, id, name, description });
}

export const PRESETS: ReelStyle[] = [
  preset("hormozi", "Bold Hormozi", "Maiuscolo pesante, parola attiva gialla, punch zoom sui jump cut", {}),
  preset("mrbeast", "Cartoon Pop", "Font cartoon, colori saturi, rimbalzi, flash e zoom aggressivi", {
    captions: {
      fontFamily: "Luckiest Guy",
      fontWeight: 400,
      fontSize: 104,
      highlightColor: "#3DFF6E",
      keywordColor: "#FF3B3B",
      strokeWidth: 14,
      maxWordsPerCaption: 2,
      animation: "bounce",
      tilt: 4,
      positionY: 0.62,
    },
    zoom: { intensity: 1.3, every: 2.8, mode: "punch", shake: true },
    motion: { accentColor: "#FF3B3B", secondaryColor: "#FFFFFF", textColor: "#FFFFFF", fontFamily: "Luckiest Guy", flashOnCut: true, density: 4 },
    grade: { contrast: 1.15, saturation: 1.3, vignette: 0.2 },
  }),
  preset("minimal", "Minimal Clean", "Testo pulito in minuscolo, dissolvenze, zoom lenti, niente effetti", {
    captions: {
      fontFamily: "Inter",
      fontWeight: 800,
      fontSize: 62,
      uppercase: false,
      highlightMode: "none",
      strokeWidth: 0,
      shadowBlur: 24,
      shadowColor: "rgba(0,0,0,0.6)",
      maxWordsPerCaption: 6,
      maxCharsPerLine: 24,
      animation: "fade",
      emojis: false,
      positionY: 0.76,
    },
    zoom: { mode: "smooth", intensity: 1.08, every: 7, alternateOnCuts: false },
    motion: { accentColor: "#FFFFFF", secondaryColor: "#111111", textColor: "#111111", fontFamily: "Inter", keywordPops: false, emojiPops: false, density: 12 },
    grade: { contrast: 1.04, saturation: 0.95, warmth: 0, vignette: 0.1 },
    sfx: { enabled: false },
  }),
  preset("podcast", "Podcast Box", "Parola attiva dentro un box colorato, entrata dal basso", {
    captions: {
      fontFamily: "Poppins",
      fontWeight: 800,
      fontSize: 72,
      uppercase: false,
      highlightMode: "box",
      highlightColor: "#7C3AED",
      keywordColor: "#FACC15",
      strokeWidth: 0,
      maxWordsPerCaption: 4,
      maxCharsPerLine: 18,
      animation: "slide-up",
      positionY: 0.72,
    },
    zoom: { mode: "smooth", intensity: 1.12, every: 5 },
    motion: { accentColor: "#7C3AED", secondaryColor: "#FFFFFF", textColor: "#FFFFFF", fontFamily: "Poppins", progressBar: true, progressBarPosition: "bottom" },
  }),
  preset("handylapse", "HandyLapse Giallo", "Brand giallo neon, Archivo Black, barra di avanzamento", {
    captions: { fontFamily: "Archivo Black", fontWeight: 400, fontSize: 84, highlightMode: "box", highlightColor: "#FFD200", keywordColor: "#FFD200", strokeWidth: 8 },
    motion: { accentColor: "#FFD200", secondaryColor: "#111111", textColor: "#111111", fontFamily: "Archivo Black", progressBar: true },
  }),
  // ⬇️ Qui verrà aggiunto il preset copiato dalla reference che mi manderai.
];

const STORAGE_KEY = "handylapse.reel.styles";

export function loadCustomStyles(): ReelStyle[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const list = raw ? (JSON.parse(raw) as unknown[]) : [];
    return Array.isArray(list) ? list.map((s) => normalizeStyle(s)) : [];
  } catch {
    return [];
  }
}

export function saveCustomStyles(styles: ReelStyle[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(styles));
  } catch {
    /* storage non disponibile: gli stili restano solo in memoria */
  }
}
