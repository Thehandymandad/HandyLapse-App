import type { DeepPartial, ReelStyle } from "../types";

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
    lineHeight: 1.12,
    color: "#FFFFFF",
    highlightColor: "#FFD200",
    highlightMode: "color",
    keywordColor: "#3DFF6E",
    strokeColor: "#000000",
    strokeWidth: 10,
    shadow: "0 6px 18px rgba(0,0,0,0.55)",
    background: "none",
    backgroundColor: "rgba(0,0,0,0.6)",
    positionY: 0.68,
    maxWordsPerCaption: 3,
    maxCharsPerLine: 16,
    animation: "pop",
    tilt: 0,
  },
  cuts: { silenceDb: null, minSilence: 0.35, paddingBefore: 0.08, paddingAfter: 0.12 },
  zoom: { enabled: true, intensity: 1.22, alternateOnCuts: true, alternateScale: 1.1, focusX: 0.5, focusY: 0.38, shake: false, every: 4 },
  motion: {
    fontFamily: "Montserrat",
    accentColor: "#FFD200",
    secondaryColor: "#111111",
    textColor: "#111111",
    radius: 28,
    progressBar: "none",
    flashOnCut: false,
    density: 6,
    iconStyle: "solid",
  },
  grade: { brightness: 1.02, contrast: 1.08, saturation: 1.1, warmth: 0.05, vignette: 0.25 },
  audio: { sfx: true, sfxVolume: 0.5, musicVolume: 0.12, targetLufs: -14 },
};

function isObj(v: unknown): v is Record<string, unknown> {
  return !!v && typeof v === "object" && !Array.isArray(v);
}

/** Fonde override parziali sopra uno stile, tenendo solo chiavi esistenti e tipi compatibili. */
export function mergeStyle<T>(base: T, over: DeepPartial<T> | undefined | null): T {
  if (!isObj(over)) return base;
  const out: Record<string, unknown> = { ...(base as Record<string, unknown>) };
  for (const [k, v] of Object.entries(over)) {
    if (!(k in out) || v === undefined) continue;
    const b = out[k];
    if (isObj(b)) out[k] = mergeStyle(b, v as DeepPartial<typeof b>);
    else if (b === null || v === null || typeof b === typeof v) out[k] = v;
  }
  return out as T;
}

export function defineStyle(id: string, name: string, description: string, over: DeepPartial<ReelStyle>): ReelStyle {
  return { ...mergeStyle(BASE_STYLE, over), id, name, description };
}
