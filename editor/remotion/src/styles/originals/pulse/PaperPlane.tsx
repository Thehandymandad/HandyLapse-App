import React from "react";
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import type { GraphicEvent } from "../../../lib/timeline";
import { clamp, INTER, P } from "./shared";

/**
 * "...gliel'ho mandato": un aeroplanino di carta attraversa lo schermo in curva lasciando una scia lime tratteggiata,
 * sotto compare "INVIATO". props.flyFrames = durata del volo, props.label.
 */
const bez = (t: number, a: number, b: number, c: number, d: number) => (1 - t) ** 3 * a + 3 * (1 - t) ** 2 * t * b + 3 * (1 - t) * t * t * c + t ** 3 * d;

export const PaperPlane: React.FC<{ g: GraphicEvent }> = ({ g }) => {
  const f = useCurrentFrame();
  const { fps, width: W, height: H } = useVideoConfig();
  const fly = typeof g.props?.flyFrames === "number" ? g.props.flyFrames : 26;
  const t = interpolate(f, [0, fly], [0, 1], { ...clamp, easing: (x) => (x < 0.5 ? 2 * x * x : 1 - (-2 * x + 2) ** 2 / 2) });
  // curva da in basso a sinistra, con un giro, fino a fuori in alto a destra
  const X = [0.05 * W, 0.75 * W, 0.15 * W, 1.25 * W];
  const Y = [0.92 * H, 0.95 * H, 0.45 * H, 0.12 * H];
  const pt = (s: number) => [bez(s, X[0], X[1], X[2], X[3]), bez(s, Y[0], Y[1], Y[2], Y[3])];
  const [x, y] = pt(t);
  const [x2, y2] = pt(Math.min(1, t + 0.01));
  const angle = (Math.atan2(y2 - y, x2 - x) * 180) / Math.PI;
  const trail = Array.from({ length: 60 }, (_, i) => pt((i / 59) * t));
  const d = trail.map(([a, b], i) => `${i ? "L" : "M"}${a.toFixed(1)} ${b.toFixed(1)}`).join(" ");
  const fade = interpolate(f, [g.frames - 8, g.frames], [1, 0], clamp);
  const chip = spring({ frame: f - 6, fps, config: { damping: 10, stiffness: 260 } });
  return (
    <AbsoluteFill style={{ opacity: fade }}>
      <svg width={W} height={H} style={{ position: "absolute", inset: 0 }}>
        <path d={d} fill="none" stroke={P.lime} strokeWidth={9} strokeDasharray="22 18" strokeLinecap="round" opacity={0.9} style={{ filter: `drop-shadow(0 0 10px ${P.lime})` }} />
      </svg>
      {t < 1 && (
        <div style={{ position: "absolute", left: x - 90, top: y - 90, transform: `rotate(${angle + 45}deg) scale(${1 + Math.sin(t * Math.PI) * 0.35})`, filter: "drop-shadow(0 20px 30px rgba(0,0,0,0.5))" }}>
          <svg width={180} height={180} viewBox="0 0 24 24">
            <path d="M2.5 11.2L21.5 3l-6.8 18.5-3.4-7.6z" fill={P.white} />
            <path d="M11.3 13.9L21.5 3l-10.2 10.9-1 5.6z" fill="#C9CDD4" />
          </svg>
        </div>
      )}
      <div
        style={{
          position: "absolute",
          left: "50%",
          top: `${(g.y ?? 0.79) * 100}%`,
          transform: `translate(-50%, -50%) scale(${chip}) rotate(-3deg)`,
          display: "flex",
          alignItems: "center",
          gap: 16,
          background: P.lime,
          color: P.ink,
          fontFamily: INTER,
          fontWeight: 900,
          fontSize: 50,
          letterSpacing: 3,
          padding: "16px 36px",
          borderRadius: 999,
          boxShadow: "0 24px 60px rgba(0,0,0,0.5)",
        }}
      >
        <svg width={48} height={48} viewBox="0 0 24 24">
          <path d="M5 12.5l4.5 4.5L19 7" fill="none" stroke={P.ink} strokeWidth={3.4} strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        {((g.props?.label as string) ?? "INVIATO").toUpperCase()}
      </div>
    </AbsoluteFill>
  );
};
