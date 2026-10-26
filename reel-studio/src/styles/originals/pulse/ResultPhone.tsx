import React from "react";
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { useFonts } from "../../../lib/fonts";
import { seeded, type Timeline } from "../../../lib/timeline";
import type { GraphicEvent } from "../../../lib/timeline";
import { ANTON, clamp, INTER, P, phoneState } from "./shared";

/**
 * "Questo che vedete è il risultato": il video si rimpicciolisce dentro uno smartphone che ondeggia in 3D
 * (il riquadro lo fa la camera del pack con phoneState, qui si disegna la cornice allineata),
 * da dietro salgono cuori e fiamme e attorno spuntano le statistiche che contano (props.stats, a props.statsAt).
 */
const BEZEL = 26;

const Heart: React.FC<{ size: number; color: string }> = ({ size, color }) => (
  <svg width={size} height={size} viewBox="0 0 24 24">
    <path d="M12 21s-8.5-5.3-8.5-11.2A4.8 4.8 0 0 1 12 6.6a4.8 4.8 0 0 1 8.5 3.2C20.5 15.7 12 21 12 21z" fill={color} />
  </svg>
);
const Flame: React.FC<{ size: number }> = ({ size }) => (
  <svg width={size} height={size} viewBox="0 0 24 24">
    <path d="M12 2c1.2 4.5 6 6.2 6 11.5A6 6 0 0 1 6 13.5c0-3 1.8-4.2 2.4-6 1.2 1.8 1.8 2.4 3 2.4 0-3-.6-5.4.6-7.9z" fill="#FF8A1F" />
    <path d="M12 12c.5 2 3 2.8 3 5a3 3 0 0 1-6 0c0-1.4.8-2 1.1-2.8.6.8.9 1.1 1.5 1.1 0-1.3-.2-2.3.4-3.3z" fill="#FFE14D" />
  </svg>
);

type Stat = { icon: "play" | "heart" | "share"; value: number; label?: string };
const fmt = (n: number) => (n >= 1000 ? `${(n / 1000).toFixed(n >= 100000 ? 0 : 1).replace(".", ",")}K` : String(Math.round(n)));

const StatIcon: React.FC<{ icon: Stat["icon"] }> = ({ icon }) => (
  <svg width={46} height={46} viewBox="0 0 24 24">
    {icon === "play" && <path d="M7 4.5v15l12.5-7.5z" fill={P.ink} />}
    {icon === "heart" && <path d="M12 20s-7.5-4.7-7.5-10a4.3 4.3 0 0 1 7.5-2.8A4.3 4.3 0 0 1 19.5 10c0 5.3-7.5 10-7.5 10z" fill={P.ink} />}
    {icon === "share" && <path d="M3 11.5L21 4l-6.5 17-3-7.5z" fill={P.ink} />}
  </svg>
);

export const ResultPhone: React.FC<{ g: GraphicEvent }> = ({ g }) => {
  const f = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const ph = phoneState(f, g.frames, fps);
  const statsAt = typeof g.props?.statsAt === "number" ? g.props.statsAt : 26;
  const stats = (Array.isArray(g.props?.stats) ? (g.props!.stats as Stat[]) : null) ?? [
    { icon: "play", value: 248000 },
    { icon: "heart", value: 31200 },
    { icon: "share", value: 4812 },
  ];
  const s = ph.inset;
  // posizioni attorno al telefono (frazioni del canvas), leggermente sovrapposte al bordo
  const spots = [
    { x: 0.2, y: 0.25, r: -6 },
    { x: 0.82, y: 0.47, r: 5 },
    { x: 0.21, y: 0.69, r: -4 },
  ];
  return (
    <AbsoluteFill>
      {/* cornice del telefono, con le stesse trasformazioni del riquadro video */}
      <AbsoluteFill style={{ perspective: 2200, opacity: Math.min(1, ph.k * 3) }}>
        <AbsoluteFill style={{ transform: `rotateX(${ph.rotateX}deg) rotateY(${ph.rotateY}deg) scale(${s})` }}>
          <div
            style={{
              position: "absolute",
              inset: -BEZEL / s,
              border: `${BEZEL / s}px solid #111216`,
              borderRadius: (ph.radius + BEZEL) / s,
              boxShadow: `0 0 0 ${3 / s}px #3A3D45, 0 ${60 / s}px ${140 / s}px rgba(0,0,0,0.7), 0 0 ${120 / s}px rgba(212,255,58,${0.25 * ph.k})`,
            }}
          />
          <div style={{ position: "absolute", top: 34 / s, left: "50%", width: 230 / s, height: 64 / s, marginLeft: -115 / s, borderRadius: 40 / s, background: "#000" }} />
          {/* riflesso sul vetro */}
          <div
            style={{
              position: "absolute",
              inset: 0,
              borderRadius: ph.radius / s,
              background: `linear-gradient(${115 + Math.sin(f / 16) * 10}deg, rgba(255,255,255,0) 30%, rgba(255,255,255,0.13) 42%, rgba(255,255,255,0) 52%)`,
            }}
          />
        </AbsoluteFill>
      </AbsoluteFill>
      {/* reazioni che salgono dal lato destro del telefono */}
      {Array.from({ length: 16 }, (_, i) => {
        const start = 8 + i * 4;
        const age = f - start;
        if (age < 0 || age > 50) return null;
        const t = age / 50;
        const x = width * (0.8 + seeded(i * 7) * 0.1) + Math.sin(age / 6 + i) * 30;
        const y = height * (0.8 - t * 0.6);
        const size = 70 + seeded(i * 3) * 50;
        const op = interpolate(t, [0, 0.1, 0.75, 1], [0, 1, 1, 0]) * ph.k;
        const pop = spring({ frame: age, fps, config: { damping: 9, stiffness: 260 } });
        return (
          <div key={i} style={{ position: "absolute", left: x - size / 2, top: y - size / 2, opacity: op, transform: `scale(${pop}) rotate(${(seeded(i) - 0.5) * 40}deg)`, filter: "drop-shadow(0 8px 16px rgba(0,0,0,0.45))" }}>
            {i % 3 === 2 ? <Flame size={size} /> : <Heart size={size} color={i % 3 === 0 ? "#FF2E63" : P.lime} />}
          </div>
        );
      })}
      {/* statistiche */}
      {stats.slice(0, 3).map((st, i) => {
        const age = f - statsAt - i * 5;
        if (age < 0) return null;
        const pop = spring({ frame: age, fps, config: { damping: 10, stiffness: 240 } });
        const count = interpolate(age, [0, 22], [0, st.value], { ...clamp, easing: (x) => 1 - Math.pow(1 - x, 3) });
        const sp = spots[i];
        return (
          <div
            key={i}
            style={{
              position: "absolute",
              left: sp.x * width,
              top: sp.y * height,
              transform: `translate(-50%, -50%) rotate(${sp.r}deg) scale(${pop})`,
              opacity: ph.k,
              display: "flex",
              alignItems: "center",
              gap: 14,
              background: P.lime,
              color: P.ink,
              padding: "14px 30px 14px 20px",
              borderRadius: 999,
              boxShadow: "0 24px 60px rgba(0,0,0,0.55)",
            }}
          >
            <StatIcon icon={st.icon} />
            <span style={{ fontFamily: ANTON, fontSize: 70, lineHeight: 1, fontVariantNumeric: "tabular-nums" }}>{fmt(count)}</span>
            {st.label && <span style={{ fontFamily: INTER, fontWeight: 900, fontSize: 26 }}>{st.label}</span>}
          </div>
        );
      })}
    </AbsoluteFill>
  );
};

/**
 * Sfondo dietro al video (si vede quando il video è nel telefono o si sposta): nero con bagliore lime che pulsa
 * e una griglia in prospettiva che scorre. Carica anche i pesi dei font usati dalle grafiche.
 */
export const PulseBackdrop: React.FC<{ tl: Timeline }> = () => {
  const f = useCurrentFrame();
  useFonts([
    { family: "Inter", weight: 700 },
    { family: "Inter", weight: 800 },
    { family: "Inter", weight: 900 },
    { family: "Anton", weight: 400 },
  ]);
  const pulse = 0.5 + 0.5 * Math.sin(f / 9);
  return (
    <AbsoluteFill style={{ background: P.ink, overflow: "hidden" }}>
      <AbsoluteFill style={{ background: `radial-gradient(circle at 50% 42%, rgba(212,255,58,${0.16 + 0.1 * pulse}) 0%, rgba(212,255,58,0) 55%)` }} />
      <AbsoluteFill style={{ perspective: 700 }}>
        <div
          style={{
            position: "absolute",
            left: -1080,
            right: -1080,
            top: "58%",
            height: 1800,
            transform: "rotateX(72deg)",
            transformOrigin: "50% 0%",
            backgroundImage: `linear-gradient(rgba(212,255,58,0.35) 3px, transparent 3px), linear-gradient(90deg, rgba(212,255,58,0.35) 3px, transparent 3px)`,
            backgroundSize: "120px 120px",
            backgroundPosition: `0 ${(f * 6) % 120}px`,
            maskImage: "linear-gradient(to bottom, black, transparent 80%)",
          }}
        />
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
