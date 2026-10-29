import React from "react";
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import type { GraphicEvent } from "../../../lib/timeline";
import { At, clamp, fg, INTER, P, rgba } from "./shared";

/**
 * Domande che arrivano una dopo l'altra (gancio "quante volte al giorno qualcuno chiede…"): fumetti di chat che
 * entrano a molla alternati a sinistra e a destra, i più vecchi salgono, si rimpiccioliscono e sbiadiscono.
 * props.items: [{ at, text, name }] (at = frame relativo); props.counter: etichetta che si aggiorna (es. "× 3").
 */
type Item = { at: number; text: string; name?: string };

export const ChatBubbles: React.FC<{ g: GraphicEvent }> = ({ g }) => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const items = (Array.isArray(g.props?.items) ? (g.props!.items as Item[]) : []).slice(0, 5);
  const out = interpolate(f, [g.frames - 7, g.frames], [0, 1], clamp);
  const shown = items.filter((it) => f >= it.at);
  const n = shown.length;
  const STEP = 132;
  return (
    <AbsoluteFill style={{ opacity: 1 - out }}>
      <At y={g.y ?? 0.27}>
        <div style={{ position: "relative", width: 900, height: 420 }}>
          {items.map((it, i) => {
            if (f < it.at) return null;
            const e = spring({ frame: f - it.at, fps, config: { damping: 12, stiffness: 230, mass: 0.8 } });
            // posizione nella pila: l'ultimo arrivato in basso, gli altri salgono di un passo a molla
            let rise = 0;
            for (let k = i + 1; k < items.length; k++) {
              if (f >= items[k].at) rise += spring({ frame: f - items[k].at, fps, config: { damping: 14, stiffness: 200 } });
            }
            const age = n - 1 - shown.indexOf(it);
            const left = i % 2 === 0;
            const scale = (0.55 + 0.45 * e) * (1 - 0.07 * rise);
            const op = Math.min(1, e * 2) * Math.max(0.25, 1 - 0.28 * rise);
            return (
              <div
                key={i}
                style={{
                  position: "absolute",
                  [left ? "left" : "right"]: 40 + (age % 2) * 10,
                  bottom: 30 + rise * STEP + (1 - e) * -60,
                  transform: `scale(${scale}) rotate(${left ? -2 : 2}deg)`,
                  transformOrigin: left ? "0% 100%" : "100% 100%",
                  opacity: op,
                  filter: e < 0.5 ? `blur(${((0.5 - e) * 14).toFixed(1)}px)` : undefined,
                  display: "flex",
                  alignItems: "flex-end",
                  gap: 14,
                  flexDirection: left ? "row" : "row-reverse",
                }}
              >
                <div style={{ width: 70, height: 70, borderRadius: 35, background: i % 3 === 1 ? P.accent : fg(0.85), color: i % 3 === 1 ? P.ink : P.theme === "light" ? "#fff" : P.ink, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: INTER, fontWeight: 900, fontSize: 30, flexShrink: 0 }}>
                  {(it.name ?? "?").slice(0, 1).toUpperCase()}
                </div>
                <div
                  style={{
                    background: P.glass,
                    border: `2px solid ${P.line}`,
                    boxShadow: P.cardShadow,
                    borderRadius: left ? "30px 30px 30px 8px" : "30px 30px 8px 30px",
                    padding: "18px 28px 20px",
                    fontFamily: INTER,
                    color: P.fg,
                    maxWidth: 660,
                  }}
                >
                  {it.name && <div style={{ fontWeight: 800, fontSize: 24, color: P.accent, marginBottom: 4 }}>{it.name}</div>}
                  <div style={{ fontWeight: 800, fontSize: 40, letterSpacing: "-0.02em", lineHeight: 1.15 }}>{it.text}</div>
                </div>
              </div>
            );
          })}
          {typeof g.props?.counter === "string" && n > 1 && (
            <div style={{ position: "absolute", left: "50%", top: -64, marginLeft: -70, padding: "10px 26px", borderRadius: 999, background: P.accent, color: P.ink, fontFamily: INTER, fontWeight: 900, fontSize: 40, boxShadow: `0 10px 30px ${rgba(P.accent, 0.4)}`, transform: `scale(${1 + 0.15 * Math.max(0, 1 - (f - shown[n - 1].at) / 6)})` }}>
              {(g.props!.counter as string).replace("{n}", String(n))}
            </div>
          )}
        </div>
      </At>
    </AbsoluteFill>
  );
};
