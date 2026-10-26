import React from "react";
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import type { GraphicEvent } from "../../../lib/timeline";
import { ANTON, At, clamp, INTER, P } from "./shared";

/**
 * "...il risultato non è quello che volete": il video perde colore (backdrop in scala di grigi con velo rosso)
 * e un timbro rosso sbatte sullo schermo. La camera trema (vedi camera del pack). Testo in g.text, sopratitolo in props.kicker.
 */
export const NopeStamp: React.FC<{ g: GraphicEvent }> = ({ g }) => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const k = interpolate(f, [0, 3, g.frames - 5, g.frames], [0, 1, 1, 0], clamp);
  const slam = interpolate(f, [0, 5], [0, 1], { ...clamp, easing: (x) => x * x });
  const settle = spring({ frame: f - 5, fps, config: { damping: 9, stiffness: 400 } });
  const scale = f < 5 ? 2.6 - 1.6 * slam : 1 + 0.06 * (1 - settle);
  const out = interpolate(f, [g.frames - 6, g.frames], [0, 1], clamp);
  return (
    <AbsoluteFill>
      <AbsoluteFill style={{ backdropFilter: `grayscale(${k}) contrast(${1 + 0.25 * k}) brightness(${1 - 0.18 * k})` }} />
      <AbsoluteFill style={{ background: `radial-gradient(ellipse at center, rgba(255,46,77,0) 35%, rgba(255,46,77,${0.32 * k}) 100%)` }} />
      <At y={g.y ?? 0.765}>
        <div
          style={{
            transform: `rotate(-9deg) scale(${scale * (1 + out * 0.3)})`,
            opacity: Math.min(1, slam * 2) * (1 - out),
            filter: out > 0 ? `blur(${out * 12}px)` : undefined,
            border: `12px solid ${P.red}`,
            borderRadius: 26,
            padding: "10px 46px 22px",
            background: "rgba(255,46,77,0.12)",
            boxShadow: `0 0 0 6px rgba(255,255,255,0.12) inset, 0 30px 80px rgba(0,0,0,0.5)`,
            textAlign: "center",
            color: P.red,
          }}
        >
          <div style={{ fontFamily: INTER, fontWeight: 900, fontSize: 38, letterSpacing: 8, marginTop: 10 }}>{(g.props?.kicker as string) ?? "RISULTATO"}</div>
          <div style={{ fontFamily: ANTON, fontSize: 210, lineHeight: 0.95, letterSpacing: 4, display: "flex", alignItems: "center", gap: 24 }}>
            <svg width={150} height={150} viewBox="0 0 24 24">
              <circle cx={12} cy={12} r={10} fill="none" stroke={P.red} strokeWidth={2.6} />
              <path d="M8 8l8 8M16 8l-8 8" stroke={P.red} strokeWidth={2.8} strokeLinecap="round" />
            </svg>
            {(g.text ?? "NOPE").toUpperCase()}
          </div>
        </div>
      </At>
    </AbsoluteFill>
  );
};
