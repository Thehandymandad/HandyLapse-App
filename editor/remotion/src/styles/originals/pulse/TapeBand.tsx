import React from "react";
import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import type { GraphicEvent } from "../../../lib/timeline";
import { ANTON, clamp, easeOut, P } from "./shared";

/**
 * Due nastri incrociati che scorrono in direzioni opposte con la parola detta (es. "EDITING"):
 * uno lime pieno, uno nero con la scritta solo contornata. Entrano tagliando lo schermo, escono tirati via di lato.
 */
export const TapeBand: React.FC<{ g: GraphicEvent }> = ({ g }) => {
  const f = useCurrentFrame();
  const word = (g.text ?? "EDITING").toUpperCase();
  const y = (g.y ?? 0.77) * 100;
  const tape = (dir: 1 | -1, rot: number, solid: boolean, delay: number) => {
    const inP = easeOut(interpolate(f - delay, [0, 8], [0, 1], clamp));
    const outP = interpolate(f, [g.frames - 8, g.frames], [0, 1], clamp);
    const shift = (1 - inP) * 1400 * dir + outP * outP * 1600 * -dir;
    const scroll = ((f * 9 * dir) % 600) - 600;
    const items = Array.from({ length: 12 }, (_, i) => (
      <span key={i} style={{ display: "inline-flex", alignItems: "center", gap: 40, paddingRight: 40 }}>
        <span
          style={{
            color: solid ? P.ink : "transparent",
            WebkitTextStroke: solid ? undefined : `3px ${P.lime}`,
          }}
        >
          {word}
        </span>
        <svg width={44} height={44} viewBox="0 0 24 24">
          <path d="M12 1l2.8 8.2L23 12l-8.2 2.8L12 23l-2.8-8.2L1 12l8.2-2.8z" fill={solid ? P.ink : P.lime} />
        </svg>
      </span>
    ));
    return (
      <div
        style={{
          position: "absolute",
          left: -300,
          right: -300,
          top: `${y}%`,
          height: 150,
          marginTop: -75,
          transform: `rotate(${rot}deg) translateX(${shift}px)`,
          background: solid ? P.lime : P.ink,
          boxShadow: solid ? `0 20px 50px rgba(0,0,0,0.45), 0 0 60px ${P.limeDim}` : "0 20px 50px rgba(0,0,0,0.6)",
          overflow: "hidden",
          display: "flex",
          alignItems: "center",
          borderTop: solid ? undefined : `3px solid ${P.lime}`,
          borderBottom: solid ? undefined : `3px solid ${P.lime}`,
        }}
      >
        <div style={{ whiteSpace: "nowrap", transform: `translateX(${scroll}px)`, fontFamily: ANTON, fontSize: 104, lineHeight: 1, letterSpacing: 2 }}>{items}</div>
      </div>
    );
  };
  return (
    <AbsoluteFill>
      {tape(-1, 5, false, 2)}
      {tape(1, -6, true, 0)}
    </AbsoluteFill>
  );
};
