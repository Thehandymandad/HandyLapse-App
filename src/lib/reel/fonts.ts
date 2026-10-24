/** Font Google disponibili per sottotitoli e grafiche. L'analisi della reference sceglie da questa lista. */
export const REEL_FONTS: { family: string; weights: number[]; note: string }[] = [
  { family: "Montserrat", weights: [500, 700, 800, 900], note: "sans geometrico, classico stile Hormozi" },
  { family: "Poppins", weights: [500, 700, 800, 900], note: "sans rotondo moderno" },
  { family: "Inter", weights: [500, 700, 800, 900], note: "sans pulito, minimal" },
  { family: "Anton", weights: [400], note: "condensato altissimo e pesante" },
  { family: "Bebas Neue", weights: [400], note: "condensato tutto maiuscolo" },
  { family: "Oswald", weights: [500, 700], note: "condensato" },
  { family: "Barlow Condensed", weights: [600, 800, 900], note: "condensato moderno" },
  { family: "Archivo Black", weights: [400], note: "grotesk molto pesante" },
  { family: "Rubik", weights: [500, 700, 900], note: "sans morbido" },
  { family: "Kanit", weights: [500, 700, 900], note: "sans tecnico, stile gaming" },
  { family: "Space Grotesk", weights: [500, 700], note: "grotesk tech" },
  { family: "Bangers", weights: [400], note: "fumetto" },
  { family: "Luckiest Guy", weights: [400], note: "cartoon pesante, stile MrBeast/Komika" },
  { family: "Lilita One", weights: [400], note: "display rotondo pesante" },
  { family: "Titan One", weights: [400], note: "display bubble" },
  { family: "Permanent Marker", weights: [400], note: "pennarello scritto a mano" },
  { family: "Playfair Display", weights: [500, 700, 900], note: "serif elegante" },
  { family: "DM Serif Display", weights: [400], note: "serif editoriale" },
];

const loaded = new Map<string, Promise<void>>();

function closestWeight(family: string, weight: number) {
  const f = REEL_FONTS.find((x) => x.family === family);
  if (!f) return weight;
  return f.weights.reduce((a, b) => (Math.abs(b - weight) < Math.abs(a - weight) ? b : a));
}

export function resolveFont(family: string, weight: number) {
  const known = REEL_FONTS.some((f) => f.family === family);
  return { family: known ? family : "Montserrat", weight: closestWeight(known ? family : "Montserrat", weight) };
}

/** Carica un font Google nel documento e aspetta che sia pronto per il canvas. */
export function loadFont(family: string): Promise<void> {
  if (typeof document === "undefined") return Promise.resolve();
  const font = REEL_FONTS.find((f) => f.family === family);
  if (!font) return Promise.resolve();
  const cached = loaded.get(family);
  if (cached) return cached;

  const spec = font.weights.length > 1 || font.weights[0] !== 400 ? `:wght@${font.weights.join(";")}` : "";
  const href = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(family).replace(/%20/g, "+")}${spec}&display=block`;
  const link = document.createElement("link");
  link.rel = "stylesheet";
  link.href = href;
  document.head.appendChild(link);

  const p = new Promise<void>((resolve) => {
    link.onload = () => {
      Promise.all(font.weights.map((w) => document.fonts.load(`${w} 64px "${family}"`)))
        .catch(() => undefined)
        .then(() => resolve());
    };
    link.onerror = () => resolve();
    setTimeout(resolve, 6000);
  });
  loaded.set(family, p);
  return p;
}
