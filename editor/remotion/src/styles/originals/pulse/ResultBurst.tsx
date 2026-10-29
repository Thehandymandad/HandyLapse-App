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
 * props.plane: prima del colpo l'aeroplanino di carta TORNA indietro in curva (con la scia) e "consegna" la pillola:
 * per "me l'ha rimandato… così" dopo un `send`.
 */
const bez = (t: number, a: number, b: number, c: number, d: number) => (1 - t) ** 3 * a + 3 * (1 - t) ** 2 * t * b + 3 * (1 - t) * t * t * c + t ** 3 * d;
export const ResultBurst: React.FC<{ g: GraphicEvent }> = ({ g }) => {
  const f = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const burstAt = typeof g.props?.burstAt === "number" ? g.props.burstAt : 6;
  const sides = (Array.isArray(g.props?.sides) ? (g.props!.sides as number[]) : [0.07, 0.93]).slice(0, 2);
  const label = ((g.props?.label as string) ?? "PRONTO").toUpperCase();
  // props.rise: [da, a] in frazioni dell'altezza, dove salgono cuori e fiamme (default lungo tutto il margine)
  const rise = (Array.isArray(g.props?.rise) ? (g.props!.rise as number[]) : [0.8, 0.18]).slice(0, 2);
  const out = interpolate(f, [g.frames - 7, g.frames], [0, 1], clamp);
  const plane = g.props?.plane === true;
  const popAt = plane ? burstAt - 2 : 0;
  const pop = f < popAt ? 0 : spring({ frame: f - popAt, fps, config: { damping: 9, stiffness: 260, mass: 0.7 } });
  const hit = spring({ frame: f - burstAt, fps, config: { damping: 8, stiffness: 320 } });
  const ring = interpolate(f - burstAt, [0, 14], [0, 1], clamp);
  const cy = (g.y ?? 0.22) * height;
  // ritorno dell'aeroplanino: da fuori in alto a destra, in curva, fino al centro della pillola
  const fly = plane ? interpolate(f, [0, Math.max(1, burstAt - 2)], [0, 1], { ...clamp, easing: (x) => 1 - (1 - x) ** 2.4 }) : 1;
  // arco pulito: entra in alto a destra, scende verso sinistra e rientra al centro sulla pillola
  const X = [width * 1.12, width * 0.55, width * 0.08, width / 2];
  const Y = [height * 0.06, height * 0.0, height * 0.36, cy];
  const pt = (t: number) => [bez(t, X[0], X[1], X[2], X[3]), bez(t, Y[0], Y[1], Y[2], Y[3])];
  const [px, py] = pt(fly);
  const [qx, qy] = pt(Math.min(1, fly + 0.02));
  const angle = (Math.atan2(qy - py, qx - px) * 180) / Math.PI;
  const planeGone = interpolate(f, [burstAt - 3, burstAt + 1], [1, 0], clamp);
  const trail = Array.from({ length: 50 }, (_, i) => pt((i / 49) * fly));
  return (
    <AbsoluteFill style={{ opacity: 1 - out }}>
      {plane && planeGone > 0 && (
        <>
          <svg width={width} height={height} style={{ position: "absolute", inset: 0, opacity: planeGone }}>
            <path d={trail.map(([x, y], i) => `${i ? "L" : "M"}${x.toFixed(1)} ${y.toFixed(1)}`).join(" ")} fill="none" stroke={P.accent} strokeWidth={8} strokeDasharray="18 16" strokeLinecap="round" />
          </svg>
          <div style={{ position: "absolute", left: px - 80, top: py - 80, transform: `rotate(${angle + 45}deg) scale(${planeGone * (1 + Math.sin(fly * Math.PI) * 0.3)})`, filter: "drop-shadow(0 18px 26px rgba(0,0,0,0.35))" }}>
            <svg width={160} height={160} viewBox="0 0 24 24">
              <path d="M2.5 11.2L21.5 3l-6.8 18.5-3.4-7.6z" fill={P.theme === "light" ? "#FFFFFF" : P.white} stroke={P.theme === "light" ? "rgba(17,18,22,0.25)" : "none"} strokeWidth={0.6} strokeLinejoin="round" />
              <path d="M11.3 13.9L21.5 3l-10.2 10.9-1 5.6z" fill="#C9CDD4" />
            </svg>
          </div>
        </>
      )}
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
          opacity: f < popAt ? 0 : Math.min(1, pop * 2),
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
        const start = (plane ? burstAt : 0) + 4 + i * 3;
        const age = f - start;
        if (age < 0) return null;
        const t = age / 40;
        if (t > 1) return null;
        const side = sides[i % 2];
        const x = width * side + Math.sin(age / 5 + i) * 18;
        const y = height * (rise[0] - t * (rise[0] - rise[1]));
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
