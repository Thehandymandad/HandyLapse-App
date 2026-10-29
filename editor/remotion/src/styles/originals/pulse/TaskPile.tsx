import React from "react";
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import type { GraphicEvent } from "../../../lib/timeline";
import { ANTON, clamp, P } from "./shared";

/**
 * "...è tutto quello che viene dopo": i lavori del montaggio cadono dall'alto uno dopo l'altro e si accumulano
 * in una pila (ogni impatto fa tremare la camera, vedi pileImpacts), l'ultimo è rosso. Alla fine la pila crolla giù.
 * props.items, props.last, props.every (frame tra un pezzo e l'altro), props.center (y = centro della pila, pezzi
 * bilanciati attorno al centro, l'ultimo in cima: per la fascia delle grafiche sopra la cornice).
 */
const SLOTS: [number, number, number][] = [
  // [spostamento x px, riga dal basso, rotazione]
  [-150, 0, -4], [170, 0, 5], [-20, 1, 3], [-230, 1, -7], [200, 1, -3], [60, 2, -5], [-170, 2, 6], [10, 3, 2],
];
// pila centrata (props.center): due file sotto, l'ultimo pezzo (rosso) in cima al centro
const SLOTS_CENTER: [number, number, number][] = [[-175, 0, -4], [160, 0, 5], [-195, 1, 3], [180, 1, -6], [-20, 1, 4], [-10, 2, -3]];
const ROW = 92;
const FALL = 9;

export function pileItems(g: GraphicEvent) {
  const items = (Array.isArray(g.props?.items) ? (g.props!.items as string[]) : null) ?? ["TAGLI", "SOTTOTITOLI", "ZOOM", "GRAFICHE", "AUDIO", "MUSICA", "COLORE"];
  const last = (g.props?.last as string) ?? "ORE PERSE";
  return [...items.slice(0, SLOTS.length - 1), last];
}

/** Frame relativi in cui un pezzo tocca la pila (per il tremolio della camera). */
export function pileImpacts(g: GraphicEvent) {
  const every = typeof g.props?.every === "number" ? g.props.every : 4;
  return pileItems(g).map((_, i) => i * every + FALL);
}

export const TaskPile: React.FC<{ g: GraphicEvent }> = ({ g }) => {
  const f = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const every = typeof g.props?.every === "number" ? g.props.every : 4;
  const items = pileItems(g);
  // props.center: y è il centro della pila (non la base) e i pezzi stanno in equilibrio attorno al centro dello schermo
  const centered = g.props?.center === true;
  const slots = centered
    ? [...SLOTS_CENTER.slice(0, Math.min(items.length - 1, SLOTS_CENTER.length - 1)), SLOTS_CENTER[SLOTS_CENTER.length - 1]]
    : SLOTS;
  const topRow = Math.max(...slots.slice(0, items.length).map((sl) => sl[1]));
  const baseY = (g.y ?? 0.83) * height + (centered ? (topRow * ROW) / 2 : 0);
  const collapse = interpolate(f, [g.frames - 9, g.frames], [0, 1], clamp);
  return (
    <AbsoluteFill>
      {items.map((text, i) => {
        const start = i * every;
        const age = f - start;
        if (age < 0) return null;
        const [dx, row, rot] = slots[Math.min(i, slots.length - 1)];
        const isLast = i === items.length - 1;
        // caduta accelerata, poi rimbalzo all'impatto
        const fall = Math.min(1, age / FALL);
        const yFall = -(1 - fall * fall) * (baseY + 200);
        const bounce = age >= FALL ? spring({ frame: age - FALL, fps, config: { damping: 8, stiffness: 320 } }) : 0;
        const squash = age >= FALL ? 1 - 0.18 * Math.sin(bounce * Math.PI) * Math.exp(-(age - FALL) / 6) : 1;
        const drop = collapse * collapse * (height * 0.7 + row * 80);
        return (
          <div
            key={i}
            style={{
              position: "absolute",
              left: width / 2 + dx,
              top: baseY - row * ROW + yFall + drop,
              transform: `translate(-50%, -50%) rotate(${rot + (1 - fall) * (i % 2 ? 25 : -25) + collapse * (i % 2 ? 40 : -40)}deg) scale(${(isLast ? 1.12 : 1) * squash}, ${(isLast ? 1.12 : 1) / squash})`,
              fontFamily: ANTON,
              fontSize: 70,
              lineHeight: 1,
              letterSpacing: 1,
              padding: "12px 28px 10px",
              borderRadius: 18,
              background: isLast ? P.red : i % 3 === 1 ? P.white : P.accent,
              color: isLast ? P.white : P.ink,
              boxShadow: "0 18px 40px rgba(0,0,0,0.5)",
              whiteSpace: "nowrap",
              zIndex: i,
            }}
          >
            {text}
          </div>
        );
      })}
    </AbsoluteFill>
  );
};
