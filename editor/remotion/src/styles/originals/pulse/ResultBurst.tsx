import React from "react";
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { seeded } from "../../../lib/timeline";
import type { GraphicEvent } from "../../../lib/timeline";
import { Flame, Heart } from "./ResultPhone";
import { clamp, INTER, P, rgba } from "./shared";

/**
 * "…e me l'ha restituito così" con il footage in cornice: la pillola PRONTO (props.label) scatta nella fascia alta con
 * un'onda di luce, e lungo i due margini laterali (props.sides: x in frazioni, default 0.07 e 0.93) salgono cuori e
 * fiamme. Pensata per stare fuori dalla cornice; props.burstAt = il colpo (frame relativo).
 */
export const ResultBurst: React.FC<{ g: GraphicEvent }> = ({ g }) => {
  const f = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const burstAt = typeof g.props?.burstAt === "number" ? g.props.burstAt : 6;
  const sides = (Array.isArray(g.props?.sides) ? (g.props!.sides as number[]) : [0.07, 0.93]).slice(0, 2);
  const label = ((g.props?.label as string) ?? "PRONTO").toUpperCase();
  const out = interpolate(f, [g.frames - 7, g.frames], [0, 1], clamp);
  const pop = spring({ frame: f, fps, config: { damping: 9, stiffness: 260, mass: 0.7 } });
  const hit = spring({ frame: f - burstAt, fps, config: { damping: 8, stiffness: 320 } });
  const ring = interpolate(f - burstAt, [0, 14], [0, 1], clamp);
  const cy = (g.y ?? 0.22) * height;
  return (
    <AbsoluteFill style={{ opacity: 1 - out }}>
      {/* onda di luce dal centro della pillola */}
      {f >= burstAt && ring < 1 && (
        <div
          style={{
            position: "absolute",
            left: width / 2 - 360 * ring,
            top: cy - 140 * ring,
            width: 720 * ring,
            height: 280 * ring,
            borderRadius: "50%",
            border: `${6 * (1 - ring)}px solid ${P.accent}`,
            boxShadow: `0 0 40px ${P.accentDim}`,
            opacity: 1 - ring,
          }}
        />
      )}
      <div
        style={{
          position: "absolute",
          left: "50%",
          top: cy,
          transform: `translate(-50%, -50%) scale(${(0.4 + 0.6 * pop) * (f >= burstAt ? 1 + 0.12 * Math.sin(Math.min(1, hit) * Math.PI) : 1)}) rotate(-2deg)`,
          opacity: Math.min(1, pop * 2),
          display: "flex",
          alignItems: "center",
          gap: 18,
          padding: "18px 44px",
          borderRadius: 999,
          background: P.accent,
          color: P.ink,
          fontFamily: INTER,
          fontWeight: 900,
          fontSize: 64,
          letterSpacing: 4,
          boxShadow: `0 20px 50px rgba(0,0,0,0.5), 0 0 ${50 + 40 * hit}px ${rgba(P.accent, 0.6)}`,
          filter: pop < 0.5 ? `blur(${(0.5 - pop) * 16}px)` : undefined,
        }}
      >
        <svg width={62} height={62} viewBox="0 0 24 24">
          <path d="M5 12.5l4.5 4.5L19 7" fill="none" stroke={P.ink} strokeWidth={3.6} strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        {label}
      </div>
      {/* cuori e fiamme che salgono lungo i margini */}
      {Array.from({ length: 12 }, (_, i) => {
        const start = 4 + i * 3;
        const age = f - start;
        if (age < 0) return null;
        const t = age / 40;
        if (t > 1) return null;
        const side = sides[i % 2];
        const x = width * side + Math.sin(age / 5 + i) * 18;
        const y = height * (0.8 - t * 0.62);
        const size = 56 + seeded(i * 5) * 34;
        const op = interpolate(t, [0, 0.1, 0.75, 1], [0, 1, 1, 0]);
        const sc = spring({ frame: age, fps, config: { damping: 10, stiffness: 240 } });
        return (
          <div key={i} style={{ position: "absolute", left: x - size / 2, top: y - size / 2, opacity: op, transform: `scale(${sc}) rotate(${(seeded(i + 3) - 0.5) * 40}deg)`, filter: "drop-shadow(0 8px 16px rgba(0,0,0,0.45))" }}>
            {i % 3 === 2 ? <Flame size={size} /> : <Heart size={size} color={i % 3 === 0 ? "#FF2E63" : P.accent} />}
          </div>
        );
      })}
    </AbsoluteFill>
  );
};
