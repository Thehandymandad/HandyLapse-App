import React from "react";
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import type { GraphicEvent } from "../../../lib/timeline";
import { ANTON, clamp, INTER, P } from "./shared";

/**
 * "censored": "...non vuole che tu veda questo video". Una card bianca a forma di player ("Questo video") già in
 * scena dal primo fotogramma; a `stampAt` un timbro rosso CENSURATO ci sbatte sopra (scala 2.6 → 1, poi assestamento)
 * e la card trema; a `barAt` una barra nera di censura copre il titolo.
 * props: title (titolo del video nel player), stamp (testo del timbro), stampAt, barAt.
 */
export const Censored: React.FC<{ g: GraphicEvent }> = ({ g }) => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const p = g.props ?? {};
  const stampAt = typeof p.stampAt === "number" ? p.stampAt : 20;
  const barAt = typeof p.barAt === "number" ? p.barAt : stampAt + 12;
  const title = typeof p.title === "string" ? p.title : "Giochi Switch su iPhone";
  const stamp = typeof p.stamp === "string" ? p.stamp : "CENSURATO";
  // la card c'è già al fotogramma 0 (copertina del reel): entra con una spinta minima
  const enter = spring({ frame: f + 6, fps, config: { damping: 14, stiffness: 200 } });
  const out = interpolate(f, [g.frames - 6, g.frames], [0, 1], clamp);
  const sa = f - stampAt;
  const slam = interpolate(sa, [0, 5], [0, 1], { ...clamp, easing: (x) => x * x });
  const settle = spring({ frame: sa - 5, fps, config: { damping: 9, stiffness: 400 } });
  const sscale = sa < 5 ? 2.6 - 1.6 * slam : 1 + 0.06 * (1 - settle);
  // la card trema quando il timbro atterra
  const hit = sa >= 4 && sa < 16 ? Math.sin(sa * 2.7) * (16 - sa) * 1.1 : 0;
  const bar = interpolate(f, [barAt, barAt + 7], [0, 1], { ...clamp, easing: (x) => 1 - Math.pow(1 - x, 3) });
  const prog = interpolate(f, [0, g.frames], [0.18, 0.42], clamp);
  return (
    <AbsoluteFill style={{ opacity: 1 - out }}>
      <div
        style={{
          position: "absolute",
          left: "50%",
          top: `${(g.y ?? 0.265) * 100}%`,
          width: 860,
          transform: `translate(-50%, -50%) translate(${hit.toFixed(1)}px, ${(hit * 0.4).toFixed(1)}px) scale(${(0.92 + 0.08 * enter).toFixed(3)}) rotate(${(-1.5 + hit * 0.05).toFixed(2)}deg)`,
          background: "#FFFFFF",
          borderRadius: 40,
          padding: 22,
          boxShadow: P.cardShadow,
        }}
      >
        {/* player */}
        <div style={{ position: "relative", height: 300, borderRadius: 26, overflow: "hidden", background: "linear-gradient(135deg, #2B2F3A 0%, #15171C 60%, #0B0C10 100%)" }}>
          <div style={{ position: "absolute", inset: 0, background: `radial-gradient(60% 80% at 70% 30%, ${P.accent}55, transparent 70%)` }} />
          <div style={{ position: "absolute", left: "50%", top: "50%", width: 120, height: 120, borderRadius: 60, background: "rgba(255,255,255,0.92)", transform: "translate(-50%,-50%)", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 12px 30px rgba(0,0,0,0.4)" }}>
            <svg width={54} height={54} viewBox="0 0 24 24">
              <path d="M8 5.5v13l11-6.5z" fill="#0A0B0E" />
            </svg>
          </div>
          <div style={{ position: "absolute", left: 22, right: 22, bottom: 20, height: 8, borderRadius: 4, background: "rgba(255,255,255,0.25)" }}>
            <div style={{ width: `${(prog * 100).toFixed(1)}%`, height: "100%", borderRadius: 4, background: P.accent }} />
          </div>
          <div style={{ position: "absolute", left: 22, top: 18, display: "flex", alignItems: "center", gap: 10, fontFamily: INTER, fontWeight: 800, fontSize: 26, color: "#FFFFFF" }}>
            <span style={{ width: 14, height: 14, borderRadius: 7, background: "#FF2E4D" }} />
            Questo video
          </div>
        </div>
        {/* titolo, poi coperto dalla barra nera */}
        <div style={{ position: "relative", marginTop: 18, padding: "0 8px", fontFamily: INTER, fontWeight: 900, fontSize: 52, letterSpacing: "-0.03em", color: "#111216" }}>
          {title}
          <div style={{ position: "absolute", left: 0, top: 2, height: 62, width: `${(bar * 100).toFixed(1)}%`, background: "#0A0B0E", borderRadius: 8 }} />
        </div>
        {/* timbro */}
        {sa >= 0 && (
          <div
            style={{
              position: "absolute",
              left: "50%",
              top: "44%",
              transform: `translate(-50%, -50%) rotate(-9deg) scale(${sscale.toFixed(3)})`,
              opacity: Math.min(1, slam * 2),
              border: `12px solid ${P.red}`,
              borderRadius: 26,
              padding: "6px 40px 16px",
              background: "rgba(255,255,255,0.9)",
              fontFamily: ANTON,
              fontSize: 128,
              lineHeight: 1,
              letterSpacing: "0.02em",
              color: P.red,
              whiteSpace: "nowrap",
              boxShadow: "0 18px 40px rgba(255,46,77,0.25)",
            }}
          >
            {stamp}
          </div>
        )}
      </div>
    </AbsoluteFill>
  );
};
