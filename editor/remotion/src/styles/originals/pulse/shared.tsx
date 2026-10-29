import React from "react";
import { interpolate, spring } from "remotion";
import { fontStack } from "../../../lib/fonts";

/**
 * Palette "Pulse": un solo colore d'accento elettrico su nero vetro, rosso per gli errori.
 * L'accento di default è l'arancione del logo di Claude reso elettrico (stessa tinta, 15°, saturazione piena);
 * si cambia con `motion.accentColor` dello stile (`styleOverrides` nel progetto) → `setAccent` prima del render.
 */
export const P = {
  accent: "#FF6633",
  accentDim: "rgba(255,102,51,0.35)",
  ink: "#0A0B0E",
  red: "#FF2E4D",
  white: "#FFFFFF",
  grey: "#8A8F98",
  glass: "rgba(12,13,17,0.80)",
  line: "rgba(255,255,255,0.12)",
  claude: "#D97757",
};

/** "#RRGGBB" + alfa → "rgba(r,g,b,a)". */
export function rgba(hex: string, a: number) {
  const n = parseInt(hex.replace("#", ""), 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${+a.toFixed(3)})`;
}

/** Stessa tinta, più scura (0..1 verso il nero): seconda striscia delle barre, ombre colorate. */
export function darken(hex: string, t: number) {
  const n = parseInt(hex.replace("#", ""), 16);
  const c = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => Math.round(v * (1 - t)));
  return `#${c.map((v) => v.toString(16).padStart(2, "0")).join("")}`;
}

export function setAccent(hex: string | undefined) {
  if (!hex || !/^#[0-9a-f]{6}$/i.test(hex)) return;
  P.accent = hex;
  P.accentDim = rgba(hex, 0.35);
}

export const ANTON = fontStack("Anton");
export const INTER = fontStack("Inter");

export const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;
export const easeOut = (t: number) => 1 - Math.pow(1 - Math.min(1, Math.max(0, t)), 3);
export const easeInOut = (t: number) => {
  const x = Math.min(1, Math.max(0, t));
  return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;
};

/** Entrata "a ribalta" 3D + uscita sfocata: comune a tutte le card. */
export function flipIn(f: number, frames: number, fps: number, outF = 7) {
  const e = spring({ frame: f, fps, config: { damping: 13, stiffness: 190, mass: 0.8 } });
  const o = interpolate(f, [frames - outF, frames], [0, 1], clamp);
  return {
    opacity: Math.min(1, e * 1.6) * (1 - o),
    transform: `perspective(1400px) translateY(${(1 - e) * 120 - o * 30}px) rotateX(${(1 - e) * 48}deg) scale(${(0.72 + 0.28 * e) * (1 + o * 0.08)})`,
    filter: o > 0.01 || e < 0.6 ? `blur(${(o * 14 + Math.max(0, 0.6 - e) * 18).toFixed(1)}px)` : undefined,
    enter: e,
    exit: o,
  };
}

/** Card vetro scuro con bordo luminoso. */
export const Glass: React.FC<{ width: number; children: React.ReactNode; style?: React.CSSProperties; glow?: number }> = ({ width, children, style, glow = 0 }) => (
  <div
    style={{
      width,
      borderRadius: 40,
      background: P.glass,
      border: `2px solid ${glow > 0 ? rgba(P.accent, 0.25 + glow * 0.75) : P.line}`,
      boxShadow: `0 40px 90px rgba(0,0,0,0.55), inset 0 1px 0 rgba(255,255,255,0.12)${glow > 0 ? `, 0 0 ${60 * glow}px ${rgba(P.accent, 0.55 * glow)}` : ""}`,
      backdropFilter: "blur(22px) saturate(1.4)",
      padding: 34,
      boxSizing: "border-box",
      color: P.white,
      fontFamily: INTER,
      ...style,
    }}
  >
    {children}
  </div>
);

/** Centro (x, y) in frazioni del canvas. */
export const At: React.FC<{ x?: number; y: number; children: React.ReactNode; style?: React.CSSProperties }> = ({ x = 0.5, y, children, style }) => (
  <div style={{ position: "absolute", left: `${x * 100}%`, top: `${y * 100}%`, transform: "translate(-50%, -50%)", ...style }}>{children}</div>
);

/** Spunta che si disegna. */
export const Check: React.FC<{ size: number; p: number; color?: string; stroke?: number }> = ({ size, p, color = P.ink, stroke = 3.2 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24">
    <path d="M5 12.5l4.5 4.5L19 7" fill="none" stroke={color} strokeWidth={stroke} strokeLinecap="round" strokeLinejoin="round" pathLength={1} strokeDasharray={1} strokeDashoffset={1 - Math.min(1, Math.max(0, p))} />
  </svg>
);

/**
 * Stato del "telefono": il video si rimpicciolisce in uno smartphone che ondeggia in 3D.
 * Usato sia dalla camera (riquadro del video) sia dalla cornice disegnata sopra, così coincidono.
 */
export function phoneState(f: number, frames: number, fps: number) {
  const e = spring({ frame: f, fps, config: { damping: 15, stiffness: 120, mass: 0.9 } });
  const o = easeInOut(interpolate(f, [frames - 10, frames], [0, 1], clamp));
  const k = e * (1 - o);
  return {
    k,
    inset: 1 - 0.29 * k,
    radius: 78 * k,
    rotateY: k * (Math.sin(f / 16) * 9 - 4),
    rotateX: k * (5 + Math.sin(f / 23) * 3),
  };
}

export const clamp01 = (x: number) => Math.min(1, Math.max(0, x));
