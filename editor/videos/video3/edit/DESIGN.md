# Design — video3

Stile della casa **Pulse** senza modifiche (palette `P` in `editor/remotion/src/styles/originals/pulse/shared.tsx`):
lime `#D4FF3A`, ink `#0A0B0E`, rosso `#FF2E4D` solo per i timbri «0 tagli / 0 app», vetro scuro `rgba(12,13,17,0.80)`;
Anton per sottotitoli e titoli, Inter 800–900 per la UI.

- Grade: quello di video-use (`neutral_punch`); in Remotion solo contrasto/saturazione 1,04 e vignetta 0,4
  (`styleOverrides.grade`), per non gradare due volte.
- Viso tra y 560 e 1075 → sottotitoli centrati a y≈1123, grafiche tra y≈1190 e 1560.
- Posizioni (centro y / scala): pila 0,80; Claude 0,72 / 0,85; timbri 0,728 / 0,9; tessere 0,745 / 0,82;
  guida 0,72 / 0,72; DM 0,716 / 0,85 → dentro le zone sicure e lontano dai pulsanti a destra (x ≤ 900).
- Parole chiave (etichetta lime): difficile, dopo, Claude, toccato, così, tre, segreto, gratuita, guida.
