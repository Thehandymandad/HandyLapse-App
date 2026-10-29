import { defineStyle } from "./base";

export const hormozi = defineStyle("hormozi", "Bold Hormozi", "Maiuscolo pesante, parola attiva gialla, punch zoom sui jump cut", {});

export const cartoon = defineStyle("cartoon", "Cartoon Pop", "Font cartoon, colori saturi, rimbalzi, flash e zoom aggressivi", {
  captions: { fontFamily: "Luckiest Guy", fontWeight: 400, fontSize: 104, highlightColor: "#3DFF6E", keywordColor: "#FF3B3B", strokeWidth: 14, maxWordsPerCaption: 2, animation: "bounce", tilt: 4, positionY: 0.62 },
  zoom: { intensity: 1.3, shake: true, every: 2.8 },
  motion: { fontFamily: "Luckiest Guy", accentColor: "#FF3B3B", secondaryColor: "#FFFFFF", textColor: "#FFFFFF", flashOnCut: true, density: 4 },
  grade: { contrast: 1.15, saturation: 1.3, vignette: 0.2 },
});

export const minimal = defineStyle("minimal", "Minimal Clean", "Testo pulito, dissolvenze, zoom lenti, niente effetti", {
  captions: {
    fontFamily: "Inter", fontWeight: 800, fontSize: 62, uppercase: false, highlightMode: "none", strokeWidth: 0,
    shadow: "0 4px 24px rgba(0,0,0,0.6)", maxWordsPerCaption: 6, maxCharsPerLine: 24, animation: "fade", positionY: 0.76,
  },
  zoom: { intensity: 1.08, alternateOnCuts: false, every: 7 },
  motion: { fontFamily: "Inter", accentColor: "#FFFFFF", secondaryColor: "#111111", textColor: "#111111", density: 12, iconStyle: "line" },
  grade: { contrast: 1.04, saturation: 0.95, warmth: 0, vignette: 0.1 },
  audio: { sfx: false },
});

export const podcast = defineStyle("podcast", "Podcast Box", "Parola attiva in un box colorato, entrata dal basso", {
  captions: {
    fontFamily: "Poppins", fontWeight: 800, fontSize: 72, uppercase: false, highlightMode: "box", highlightColor: "#7C3AED",
    keywordColor: "#FACC15", strokeWidth: 0, maxWordsPerCaption: 4, maxCharsPerLine: 18, animation: "slide-up", positionY: 0.72,
  },
  zoom: { intensity: 1.12, every: 5 },
  motion: { fontFamily: "Poppins", accentColor: "#7C3AED", secondaryColor: "#FFFFFF", textColor: "#FFFFFF", progressBar: "bottom" },
});

export const handylapse = defineStyle("handylapse", "HandyLapse Giallo", "Brand giallo neon, Archivo Black, barra di avanzamento", {
  captions: { fontFamily: "Archivo Black", fontWeight: 400, fontSize: 84, highlightMode: "box", highlightColor: "#FFD200", keywordColor: "#FFD200", strokeWidth: 8 },
  motion: { fontFamily: "Archivo Black", accentColor: "#FFD200", secondaryColor: "#111111", textColor: "#111111", progressBar: "top" },
});
