import React from "react";
import { interpolate, spring } from "remotion";
import { fontStack } from "../../../lib/fonts";

/**
 * Kit dello stile "apple": bianco, vetro chiaro, un solo accento blu. Movimenti morbidi da keynote (molle senza
 * rimbalzo, sfocatura che si scioglie entrando), niente bagliori.
 */
export const A = {
  blue: "#1F6BFF",
  ink: "#0B0B0F",
  sub: "#6E6E73",
  bg: "#F5F5F7",
  line: "rgba(11,11,15,0.08)",
  glass: "linear-gradient(160deg, rgba(255,255,255,0.94), rgba(255,255,255,0.80))",
  glassBorder: "1.5px solid rgba(255,255,255,0.95)",
  shadow: "0 30px 70px rgba(20,30,60,0.18), 0 6px 18px rgba(20,30,60,0.10), inset 0 1px 0 rgba(255,255,255,1)",
  shadowSoft: "0 18px 40px rgba(20,30,60,0.14), 0 3px 10px rgba(20,30,60,0.08)",
};

export const SANS = fontStack("Inter");
export const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;

/** Molla morbida senza rimbalzo (entrate, spostamenti). */
export const smooth = (f: number, fps: number, delay = 0) => spring({ frame: f - delay, fps, config: { damping: 22, stiffness: 170, mass: 0.9 } });
/** Molla con un filo di rimbalzo (oggetti che "atterrano"). */
export const pop = (f: number, fps: number, delay = 0) => spring({ frame: f - delay, fps, config: { damping: 15, stiffness: 210, mass: 0.8 } });
/** Uscita negli ultimi `n` frame: 1 → 0. */
export const outro = (f: number, frames: number, n = 7) => interpolate(f, [frames - n, frames], [1, 0], clamp);
export const lin = (f: number, a: number, b: number) => interpolate(f, [a, b], [0, 1], clamp);
export const easeOut = (t: number) => 1 - Math.pow(1 - Math.min(1, Math.max(0, t)), 3);

/** Entrata "keynote": sale, si scioglie la sfocatura, appare. Ritorna stile CSS da spalmare. */
export function blurIn(f: number, fps: number, delay = 0, dist = 40): React.CSSProperties {
  const s = smooth(f, fps, delay);
  const t = Math.min(1, Math.max(0, s));
  return {
    opacity: Math.min(1, (f - delay) / 6),
    transform: `translateY(${((1 - t) * dist).toFixed(1)}px) scale(${(0.96 + 0.04 * t).toFixed(3)})`,
    filter: t < 0.98 ? `blur(${((1 - t) * 14).toFixed(1)}px)` : undefined,
  };
}

/** Testo con *parole* in blu. */
export const Rich: React.FC<{ text: string; accent?: string; style?: React.CSSProperties }> = ({ text, accent = A.blue, style }) => (
  <span style={style}>
    {text.split(/(\*[^*]+\*)/).map((p, i) => (p.startsWith("*") && p.endsWith("*") ? <span key={i} style={{ color: accent }}>{p.slice(1, -1)}</span> : <span key={i}>{p}</span>))}
  </span>
);

/** Riquadro di vetro chiaro. */
export const Glass: React.FC<{ children?: React.ReactNode; radius?: number; pad?: number | string; style?: React.CSSProperties }> = ({ children, radius = 40, pad = 28, style }) => (
  <div style={{ background: A.glass, border: A.glassBorder, borderRadius: radius, padding: pad, boxShadow: A.shadow, ...style }}>{children}</div>
);

/** Icone semplici a tratto (SF Symbols-like), disegnate in SVG. */
export const Glyph: React.FC<{ name: "mac" | "iphone" | "gamepad" | "star" | "repo" | "check" | "hourglass" | "bolt"; size: number; color?: string; stroke?: number }> = ({ name, size, color = A.ink, stroke = 1.8 }) => {
  const p = { fill: "none", stroke: color, strokeWidth: stroke, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
  const body: Record<string, React.ReactNode> = {
    mac: (
      <>
        <rect x="3.5" y="4.5" width="17" height="11.5" rx="1.6" {...p} />
        <path d="M1.8 19.2h20.4M9.5 16.2l-.6 3M14.5 16.2l.6 3" {...p} />
      </>
    ),
    iphone: (
      <>
        <rect x="6.5" y="1.8" width="11" height="20.4" rx="2.6" {...p} />
        <path d="M10.6 4.2h2.8" {...p} />
      </>
    ),
    gamepad: (
      <>
        <path d="M7 8.5h10a4.5 4.5 0 0 1 4.4 5.4l-.7 3.2a2.3 2.3 0 0 1-3.9 1l-2-2.3H9.2l-2 2.3a2.3 2.3 0 0 1-3.9-1l-.7-3.2A4.5 4.5 0 0 1 7 8.5z" {...p} />
        <path d="M7.5 11.6v3M6 13.1h3" {...p} />
        <circle cx="15.6" cy="12.2" r=".9" fill={color} />
        <circle cx="17.6" cy="14.2" r=".9" fill={color} />
      </>
    ),
    star: <path d="M12 2.8l2.8 5.8 6.3.9-4.6 4.4 1.1 6.3L12 17.2l-5.6 3 1.1-6.3-4.6-4.4 6.3-.9z" fill={color} stroke="none" />,
    repo: (
      <>
        <path d="M5 4.5A2 2 0 0 1 7 2.5h12v15H7a2 2 0 0 0-2 2z" {...p} />
        <path d="M5 19.5a2 2 0 0 0 2 2h12v-4" {...p} />
      </>
    ),
    check: <path d="M5 12.5l4.5 4.5L19 7.5" {...p} />,
    hourglass: <path d="M6.5 2.5h11M6.5 21.5h11M7.5 2.5c0 5 9 6.5 9 9.5s-9 4.5-9 9.5M16.5 2.5c0 5-9 6.5-9 9.5s9 4.5 9 9.5" {...p} />,
    bolt: <path d="M13 2.5L4.5 13.5H11l-1 8 8.5-11H12z" {...p} />,
  };
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" style={{ display: "block" }}>
      {body[name]}
    </svg>
  );
};
