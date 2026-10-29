import React from "react";
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import type { GraphicEvent } from "../../../lib/timeline";
import { ANTON, clamp, P } from "./shared";

/**
 * "Zero tagli a mano, zero app aperte": timbri rossi che sbattono uno sotto l'altro, ognuno sulla sua parola
 * (props.items: [{ at, text }], at = frame relativo). La camera trema a ogni colpo (vedi zeroImpacts).
 */
type Item = { at: number; text: string };
export const zeroItems = (g: GraphicEvent): Item[] => (Array.isArray(g.props?.items) ? (g.props!.items as Item[]) : [{ at: 0, text: g.text ?? "ZERO" }]);
export const zeroImpacts = (g: GraphicEvent) => zeroItems(g).map((it) => it.at + 4);

export const ZeroStamps: React.FC<{ g: GraphicEvent }> = ({ g }) => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const items = zeroItems(g);
  const out = interpolate(f, [g.frames - 6, g.frames], [0, 1], clamp);
  const heat = interpolate(f, [items[0].at, items[0].at + 4], [0, 1], clamp) * (1 - out);
  return (
    <AbsoluteFill>
      <AbsoluteFill style={{ background: `radial-gradient(ellipse at 50% 75%, rgba(255,46,77,${0.3 * heat}) 0%, rgba(255,46,77,0) 60%)` }} />
      <div style={{ position: "absolute", left: 0, right: 0, top: `${(g.y ?? 0.775) * 100}%`, transform: "translateY(-50%)", display: "flex", flexDirection: "column", alignItems: "center", gap: 26 }}>
        {items.map((it, i) => {
          const age = f - it.at;
          if (age < 0) return <div key={i} style={{ height: 150 }} />;
          const slam = interpolate(age, [0, 4], [0, 1], { ...clamp, easing: (x) => x * x });
          const settle = spring({ frame: age - 4, fps, config: { damping: 9, stiffness: 420 } });
          const scale = age < 4 ? 2.5 - 1.5 * slam : 1 + 0.07 * (1 - settle);
          return (
            <div
              key={i}
              style={{
                height: 150,
                display: "flex",
                alignItems: "center",
                gap: 22,
                padding: "0 40px",
                border: `11px solid ${P.red}`,
                borderRadius: 24,
                background: "rgba(10,11,14,0.55)",
                color: P.red,
                fontFamily: ANTON,
                fontSize: 104,
                lineHeight: 1,
                transform: `rotate(${i % 2 ? 4 : -5}deg) scale(${scale * (1 + out * 0.25)})`,
                opacity: Math.min(1, slam * 2) * (1 - out),
                filter: out > 0 ? `blur(${out * 10}px)` : undefined,
                boxShadow: "0 24px 60px rgba(0,0,0,0.45)",
                whiteSpace: "nowrap",
              }}
            >
              <svg width={96} height={96} viewBox="0 0 24 24">
                <circle cx={12} cy={12} r={10} fill="none" stroke={P.red} strokeWidth={2.8} />
                <path d="M8 8l8 8M16 8l-8 8" stroke={P.red} strokeWidth={3} strokeLinecap="round" />
              </svg>
              {it.text.toUpperCase()}
            </div>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};
