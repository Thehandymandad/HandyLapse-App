import React from "react";
import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import type { GraphicEvent } from "../../../lib/timeline";
import { breathe } from "../../../motion/bouncy";
import { clamp, INTER, P, rgba } from "../pulse/shared";

/**
 * "scene": scena grafica a schermo intero (il parlato sparisce): fondo quasi nero con una vignetta verde d'accento al
 * centro che respira, parola gigante sfocata come texture (props.word) e un filo di grana. Le grafiche che stanno
 * sopra (ktext, card…) si mettono nello stesso intervallo, dopo questa nel piano. Taglio netto in entrata e in uscita
 * (come nella referenza), con un lampo di 2 fotogrammi.
 */
export const Scene: React.FC<{ g: GraphicEvent }> = ({ g }) => {
  const f = useCurrentFrame();
  const pr = g.props ?? {};
  const word = typeof pr.word === "string" ? pr.word : null;
  const glowY = typeof pr.glowY === "number" ? pr.glowY : 0.45;
  const flash = interpolate(f, [0, 2], [0.5, 0], clamp);
  const b = breathe(f, 0.06, 90);
  return (
    <AbsoluteFill style={{ background: "#050805" }}>
      <AbsoluteFill
        style={{
          background: `radial-gradient(ellipse ${(62 * b).toFixed(1)}% ${(38 * b).toFixed(1)}% at 50% ${glowY * 100}%, ${rgba(P.accent, 0.16)} 0%, ${rgba(P.accent, 0.05)} 45%, rgba(0,0,0,0) 75%)`,
        }}
      />
      {word && (
        <div
          style={{
            position: "absolute",
            left: "50%",
            top: `${glowY * 100}%`,
            transform: `translate(-50%, -50%) translateX(${(Math.sin(f / 45) * 40).toFixed(1)}px)`,
            fontFamily: INTER,
            fontWeight: 900,
            fontSize: 420,
            letterSpacing: "-0.06em",
            color: rgba(P.accent, 0.08),
            filter: "blur(14px)",
            whiteSpace: "nowrap",
          }}
        >
          {word}
        </div>
      )}
      <AbsoluteFill style={{ background: "radial-gradient(ellipse 80% 70% at 50% 50%, rgba(0,0,0,0) 55%, rgba(0,0,0,0.55) 100%)" }} />
      {flash > 0 && <AbsoluteFill style={{ background: `rgba(255,255,255,${flash})` }} />}
    </AbsoluteFill>
  );
};
