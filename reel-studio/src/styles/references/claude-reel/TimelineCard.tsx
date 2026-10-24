import React from "react";
import { interpolate, useCurrentFrame } from "remotion";
import type { GraphicEvent } from "../../../lib/timeline";
import { C } from "./palette";
import { cardInOut, POPPINS } from "./shared";

/**
 * Card "Timeline · reel_finale": finto editor video tenuto tra le mani.
 * Dentro si anima: la testina scorre, una clip viene tagliata e le successive scorrono a sinistra,
 * il cursore trascina il titolo giallo sulla traccia V2. Misure reference: 720x328 px, centro y≈64,6%.
 */
const W = 720;
const H = 328;
const LABEL = 54;
const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;
const ease = (t: number) => 1 - Math.pow(1 - t, 3);

const Waveform: React.FC<{ width: number; seed: number }> = ({ width, seed }) => {
  const bars = Math.floor(width / 7);
  return (
    <div style={{ position: "absolute", inset: "6px 8px", display: "flex", alignItems: "center", gap: 3 }}>
      {Array.from({ length: bars }, (_, i) => {
        const v = Math.abs(Math.sin(i * 1.7 + seed) * Math.cos(i * 0.37 + seed * 2));
        return <div key={i} style={{ width: 2.5, height: `${20 + v * 75}%`, background: "rgba(255,255,255,0.85)", borderRadius: 2 }} />;
      })}
    </div>
  );
};

const Clip: React.FC<{ x: number; w: number; color: string; label?: string; dark?: boolean; children?: React.ReactNode }> = ({ x, w, color, label, dark, children }) => (
  <div
    style={{
      position: "absolute",
      left: x,
      top: 0,
      width: w,
      height: "100%",
      background: color,
      borderRadius: 7,
      boxShadow: "inset 0 0 0 1.5px rgba(255,255,255,0.25)",
      overflow: "hidden",
      fontFamily: POPPINS,
      fontWeight: 700,
      fontSize: 16,
      color: dark ? "#2a1d00" : "#fff",
      padding: "4px 8px",
    }}
  >
    {label}
    {children}
  </div>
);

export const TimelineCard: React.FC<{ g: GraphicEvent }> = ({ g }) => {
  const f = useCurrentFrame();
  const { opacity, scale, blur } = cardInOut(f, g.frames, 8, typeof g.props?.exitFrames === "number" ? g.props.exitFrames : 8);
  const p = f / Math.max(1, g.frames);
  const title = String(g.props?.title ?? "Timeline · reel_finale");
  const time = String(g.props?.time ?? "00:00:47");
  const trackW = W - LABEL - 24;

  // V1: tre clip; al 30% compare un taglio nella seconda, al 45-60% il pezzo sparisce e le altre scorrono
  const cut = interpolate(p, [0.28, 0.32], [0, 1], clamp);
  const gone = ease(interpolate(p, [0.45, 0.6], [0, 1], clamp));
  const c1 = { x: 0, w: 168 };
  const c2a = { x: 176, w: 92 };
  const c2b = { x: 176 + 92, w: 60 * (1 - gone) };
  const shift = 60 * gone;
  const c3 = { x: 176 + 152 + 8 - shift, w: 150 };
  // V2: il titolo giallo arriva trascinato dal cursore (dal bordo destro)
  const drag = ease(interpolate(p, [0.08, 0.42], [0, 1], clamp));
  const titleX = interpolate(drag, [0, 1], [trackW - 20, 300]);
  const cursorVisible = p > 0.05 && p < 0.75;
  const cursorX = titleX + 30 + (p > 0.42 ? (p - 0.42) * 200 : 0);
  const playhead = interpolate(p, [0, 1], [0.38, 0.72]) * trackW;

  return (
    <div style={{ position: "absolute", left: 0, right: 0, top: `${(g.y ?? 0.646) * 100}%`, display: "flex", justifyContent: "center", transform: "translateY(-50%)" }}>
      <div
        style={{
          width: W,
          height: H,
          background: C.panel,
          borderRadius: 24,
          boxShadow: "0 30px 60px rgba(0,0,0,0.45), inset 0 0 0 1.5px rgba(255,255,255,0.07)",
          opacity,
          transform: `scale(${scale})`,
          filter: blur > 0.3 ? `blur(${blur}px)` : undefined,
          overflow: "hidden",
          fontFamily: POPPINS,
          color: "#fff",
          position: "relative",
        }}
      >
        {/* intestazione */}
        <div style={{ height: 46, display: "flex", alignItems: "center", padding: "0 18px", fontSize: 17, fontWeight: 600, borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
          <div style={{ display: "flex", gap: 7 }}>
            {[0, 1, 2].map((i) => (
              <div key={i} style={{ width: 9, height: 9, borderRadius: 5, background: "rgba(255,255,255,0.35)" }} />
            ))}
          </div>
          <div style={{ flex: 1, textAlign: "center", opacity: 0.9 }}>{title}</div>
          <div style={{ fontVariantNumeric: "tabular-nums" }}>{time}</div>
        </div>
        {/* righello */}
        <div style={{ position: "absolute", left: LABEL, right: 24, top: 52, height: 16, display: "flex", justifyContent: "space-between" }}>
          {Array.from({ length: 24 }, (_, i) => (
            <div key={i} style={{ width: 1.5, height: i % 4 === 0 ? 14 : 8, background: "rgba(255,255,255,0.25)" }} />
          ))}
        </div>
        {/* tracce */}
        {[
          { label: "V2", top: 84 },
          { label: "V1", top: 160 },
          { label: "A1", top: 236 },
        ].map((t) => (
          <div key={t.label} style={{ position: "absolute", left: 18, top: t.top + 16, fontSize: 16, fontWeight: 700, color: "rgba(255,255,255,0.55)" }}>
            {t.label}
          </div>
        ))}
        <div style={{ position: "absolute", left: LABEL, width: trackW, top: 84, height: 52 }}>
          <Clip x={titleX} w={70} color={C.clipYellow} label="TITOLO" dark />
          <div style={{ position: "absolute", left: titleX + 6, top: 34, width: 64, height: 22, background: C.clipOrange, borderRadius: 5, fontSize: 12, fontWeight: 700, padding: "2px 6px" }}>
            CTA
          </div>
        </div>
        <div style={{ position: "absolute", left: LABEL, width: trackW, top: 160, height: 52 }}>
          <Clip x={c1.x} w={c1.w} color={C.clipBlue}>
            <div style={{ position: "absolute", left: 46, top: 0, bottom: 0, width: 2, background: "rgba(255,255,255,0.6)" }} />
          </Clip>
          <Clip x={c2a.x} w={c2a.w} color={C.clipBlue} />
          {c2b.w > 1 && <Clip x={c2b.x + 4 * cut} w={c2b.w} color={C.clipBlue} />}
          <Clip x={c3.x} w={c3.w} color={C.clipBlue} />
          {cut > 0 && gone < 1 && <div style={{ position: "absolute", left: c2b.x + 1, top: -6, bottom: -6, width: 3, background: "#fff", opacity: cut * (1 - gone) }} />}
        </div>
        <div style={{ position: "absolute", left: LABEL, width: trackW, top: 236, height: 52 }}>
          <Clip x={0} w={trackW - 20} color={C.clipGreen}>
            <Waveform width={trackW - 36} seed={3} />
          </Clip>
        </div>
        {/* testina */}
        <div style={{ position: "absolute", left: LABEL + playhead, top: 50, bottom: 10, width: 3, background: C.playhead }} />
        {/* cursore del mouse */}
        {cursorVisible && (
          <svg width={30} height={36} viewBox="0 0 20 24" style={{ position: "absolute", left: LABEL + cursorX, top: 108, filter: "drop-shadow(0 2px 3px rgba(0,0,0,0.5))" }}>
            <path d="M2 2 L2 19 L6.5 15 L9.5 22 L12.5 20.7 L9.6 14 L16 14 Z" fill="#fff" stroke="#111" strokeWidth={1.3} strokeLinejoin="round" />
          </svg>
        )}
      </div>
    </div>
  );
};
