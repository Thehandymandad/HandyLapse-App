import React from "react";
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import type { GraphicEvent } from "../../../lib/timeline";
import { ANTON, clamp, INTER, P, fg } from "./shared";

/**
 * "Tre strumenti: uno trascrive, uno taglia, uno anima… il segreto è come li fai lavorare insieme":
 * tre tessere coperte ("?") che si girano una alla volta (props.reveal: frame relativi) senza dire quali strumenti sono,
 * poi un lucchetto "SEGRETO" (props.secretAt) e la scia accento che le collega (props.connectAt).
 */
const TILE = 250;
const GAP = 320;

const ICONS: Record<string, React.ReactNode> = {
  wave: (
    <g stroke={P.ink} strokeWidth={2.4} strokeLinecap="round">
      {[5, 8, 11, 14, 17, 20].map((x, i) => {
        const h = [4, 10, 16, 8, 13, 5][i];
        return <line key={i} x1={x - 0.5} y1={12 - h / 2} x2={x - 0.5} y2={12 + h / 2} />;
      })}
    </g>
  ),
  cut: (
    <g fill="none" stroke={P.ink} strokeWidth={2.2} strokeLinecap="round">
      <circle cx={6} cy={17} r={3} />
      <circle cx={18} cy={17} r={3} />
      <path d="M8.2 15L19 3M15.8 15L5 3" />
    </g>
  ),
  spark: (
    <g fill={P.ink}>
      <path d="M10 2l2 6.5L18.5 10.5 12 12.5 10 19l-2-6.5L1.5 10.5 8 8.5z" />
      <path d="M18.5 13l1 3 3 1-3 1-1 3-1-3-3-1 3-1z" />
    </g>
  ),
};

export const ToolTrio: React.FC<{ g: GraphicEvent }> = ({ g }) => {
  const f = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const reveal = (Array.isArray(g.props?.reveal) ? (g.props!.reveal as number[]) : [10, 20, 30]).slice(0, 3);
  const labels = (Array.isArray(g.props?.labels) ? (g.props!.labels as string[]) : ["TRASCRIVE", "TAGLIA", "ANIMA"]).slice(0, 3);
  const icons = ["wave", "cut", "spark"];
  const secretAt = typeof g.props?.secretAt === "number" ? g.props.secretAt : null;
  const connectAt = typeof g.props?.connectAt === "number" ? g.props.connectAt : null;
  const cy = (g.y ?? 0.78) * height;
  const out = interpolate(f, [g.frames - 7, g.frames], [0, 1], clamp);
  const link = connectAt === null ? 0 : interpolate(f, [connectAt, connectAt + 10], [0, 1], { ...clamp, easing: (x) => 1 - (1 - x) ** 3 });
  const xs = [-GAP, 0, GAP].map((d) => width / 2 + d);
  const secret = secretAt === null ? 0 : spring({ frame: f - secretAt, fps, config: { damping: 9, stiffness: 240 } });
  const unlocked = connectAt !== null && f >= connectAt;
  return (
    <AbsoluteFill style={{ opacity: 1 - out, transform: `scale(${1 + out * 0.1})` }}>
      {/* collegamento: scia accento con impulsi che corrono tra le tessere */}
      <svg width={width} height={height} style={{ position: "absolute", inset: 0 }}>
        {link > 0 && (
          <>
            <line x1={xs[0]} y1={cy} x2={xs[0] + (xs[2] - xs[0]) * link} y2={cy} stroke={P.accent} strokeWidth={14} strokeLinecap="round" style={{ filter: `drop-shadow(0 0 18px ${P.accent})` }} />
            {[0, 1, 2].map((k) => {
              const p = ((f - (connectAt ?? 0)) / 14 + k / 3) % 1;
              return <circle key={k} cx={xs[0] + (xs[2] - xs[0]) * p * link} cy={cy} r={16} fill={P.fg} opacity={link} />;
            })}
          </>
        )}
      </svg>
      {xs.map((x, i) => {
        const appear = spring({ frame: f - i * 3, fps, config: { damping: 12, stiffness: 220 } });
        const flip = spring({ frame: f - reveal[i], fps, config: { damping: 13, stiffness: 160 } });
        const showFront = flip > 0.5;
        const rot = 180 * (1 - flip);
        const glow = unlocked ? 1 : 0;
        return (
          <div
            key={i}
            style={{
              position: "absolute",
              left: x - TILE / 2,
              top: cy - TILE / 2 + (1 - appear) * 160,
              width: TILE,
              height: TILE,
              opacity: Math.min(1, appear * 1.5),
              transform: `perspective(900px) rotateY(${rot}deg) scale(${(0.6 + 0.4 * appear) * (unlocked ? 1 + 0.05 * Math.sin((f - (connectAt ?? 0)) / 3) : 1)})`,
            }}
          >
            <div
              style={{
                width: "100%",
                height: "100%",
                borderRadius: 44,
                background: showFront ? P.accent : P.glass,
                border: `3px solid ${showFront ? P.accent : fg(0.18)}`,
                boxShadow: `${P.theme === "light" ? "0 24px 50px rgba(40,30,20,0.18)" : "0 30px 70px rgba(0,0,0,0.55)"}${glow ? `, 0 0 70px ${P.accent}` : ""}`,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                gap: 10,
                transform: showFront ? undefined : "scaleX(-1)",
                backdropFilter: "blur(16px)",
              }}
            >
              {showFront ? (
                <>
                  <svg width={120} height={120} viewBox="0 0 24 24">
                    {ICONS[icons[i]]}
                  </svg>
                  <div style={{ fontFamily: INTER, fontWeight: 900, fontSize: 30, letterSpacing: 2, color: P.ink }}>{labels[i]}</div>
                </>
              ) : (
                <div style={{ fontFamily: ANTON, fontSize: 150, color: fg(0.35), lineHeight: 1 }}>?</div>
              )}
            </div>
          </div>
        );
      })}
      {secretAt !== null && f >= secretAt && (
        <div
          style={{
            position: "absolute",
            left: "50%",
            top: cy - TILE / 2 - 70,
            transform: `translate(-50%, -50%) scale(${secret}) rotate(-4deg)`,
            display: "flex",
            alignItems: "center",
            gap: 14,
            background: unlocked ? P.accent : P.ink,
            color: unlocked ? P.ink : P.accent,
            border: `3px solid ${P.accent}`,
            fontFamily: INTER,
            fontWeight: 900,
            fontSize: 34,
            letterSpacing: 4,
            padding: "12px 26px",
            borderRadius: 999,
            boxShadow: "0 20px 50px rgba(0,0,0,0.5)",
          }}
        >
          <svg width={40} height={40} viewBox="0 0 24 24">
            <rect x={4} y={10.5} width={16} height={11} rx={2.5} fill={unlocked ? P.ink : P.accent} />
            <path d={unlocked ? "M8 10.5V7a4 4 0 0 1 7.6-1.7" : "M8 10.5V7a4 4 0 0 1 8 0v3.5"} fill="none" stroke={unlocked ? P.ink : P.accent} strokeWidth={2.4} strokeLinecap="round" />
          </svg>
          {(g.props?.secretLabel as string) ?? "IL SEGRETO"}
        </div>
      )}
    </AbsoluteFill>
  );
};
