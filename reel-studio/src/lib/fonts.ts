import { useEffect, useState } from "react";
import { continueRender, delayRender } from "remotion";

/** Font disponibili e pesi caricati. Quando si copia una reference si sceglie il più simile. */
export const FONTS: Record<string, { weights: number[]; note: string }> = {
  Montserrat: { weights: [500, 700, 800, 900], note: "sans geometrico, classico Hormozi" },
  Poppins: { weights: [500, 700, 800, 900], note: "sans rotondo moderno" },
  Inter: { weights: [500, 700, 800, 900], note: "sans pulito, minimal" },
  Anton: { weights: [400], note: "condensato altissimo e pesante" },
  "Bebas Neue": { weights: [400], note: "condensato tutto maiuscolo" },
  Oswald: { weights: [500, 700], note: "condensato" },
  "Barlow Condensed": { weights: [700, 900], note: "condensato moderno" },
  "Archivo Black": { weights: [400], note: "grotesk molto pesante" },
  Rubik: { weights: [700, 900], note: "sans morbido" },
  Kanit: { weights: [700, 900], note: "sans tecnico/gaming" },
  Bangers: { weights: [400], note: "fumetto" },
  "Luckiest Guy": { weights: [400], note: "cartoon pesante (simile a Komika Axis, MrBeast)" },
  "Lilita One": { weights: [400], note: "display rotondo pesante" },
  "Titan One": { weights: [400], note: "display bubble" },
  "Permanent Marker": { weights: [400], note: "pennarello" },
  "Playfair Display": { weights: [700, 900], note: "serif elegante" },
};

export function fontWeightFor(family: string, weight: number) {
  const f = FONTS[family];
  if (!f) return weight;
  return f.weights.reduce((a, b) => (Math.abs(b - weight) < Math.abs(a - weight) ? b : a));
}

export function fontStack(family: string) {
  return `"${FONTS[family] ? family : "Montserrat"}", "Arial Black", sans-serif`;
}

/** Blocca il render finché i font usati non sono pronti. */
export function useFonts(families: { family: string; weight: number }[]) {
  const key = families.map((f) => `${f.family}:${f.weight}`).join("|");
  const [handle] = useState(() => delayRender(`fonts ${key}`));
  useEffect(() => {
    Promise.all(families.map((f) => document.fonts.load(`${fontWeightFor(f.family, f.weight)} 64px "${f.family}"`)))
      .catch(() => undefined)
      .then(() => continueRender(handle));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, handle]);
}
