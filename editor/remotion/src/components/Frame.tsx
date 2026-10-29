import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import type { FrameLayout } from "../types";

/** Rettangolo arrotondato come path SVG (senso orario), allargato di `grow` px. */
function roundedRect(fr: FrameLayout, grow = 0) {
  const x = fr.x - grow;
  const y = fr.y - grow;
  const w = fr.w + 2 * grow;
  const h = fr.h + 2 * grow;
  const r = Math.min(fr.radius + grow, w / 2, h / 2);
  return `M${x + r} ${y} H${x + w - r} A${r} ${r} 0 0 1 ${x + w} ${y + r} V${y + h - r} A${r} ${r} 0 0 1 ${x + w - r} ${y + h} H${x + r} A${r} ${r} 0 0 1 ${x} ${y + h - r} V${y + r} A${r} ${r} 0 0 1 ${x + r} ${y} Z`;
}

/** Le grafiche dentro questo contenitore si vedono solo FUORI dalla cornice (e fuori dal suo bordo). */
export const OutsideFrame: React.FC<{ frame?: FrameLayout | null; children: React.ReactNode }> = ({ frame, children }) =>
  frame ? (
    <AbsoluteFill style={{ clipPath: `path(evenodd, "M0 0 H1080 V1920 H0 Z ${roundedRect(frame, frame.border / 2)}")` }}>{children}</AbsoluteFill>
  ) : (
    <>{children}</>
  );

/**
 * Bordo della cornice come un tubo al neon nel colore d'accento: bordo netto (niente sfocatura), anima chiara al centro
 * del tubo e alone stretto dello stesso colore dentro e fuori, che respira appena.
 */
export const FrameBorder: React.FC<{ frame?: FrameLayout | null; color: string; glow: string }> = ({ frame, color }) => {
  const f = useCurrentFrame();
  if (!frame) return null;
  const k = 0.92 + 0.08 * Math.sin(f / 18);
  const b = frame.border;
  const box = (grow: number): React.CSSProperties => ({
    position: "absolute",
    left: frame.x - grow,
    top: frame.y - grow,
    width: frame.w + 2 * grow,
    height: frame.h + 2 * grow,
    borderRadius: frame.radius + grow,
  });
  return (
    <AbsoluteFill>
      {/* tubo: colore pieno con alone stretto fuori e dentro */}
      <div
        style={{
          ...box(b / 2),
          border: `${b}px solid ${color}`,
          boxShadow: [
            `0 0 ${(4 * k).toFixed(1)}px ${rgba(color, 0.9)}`,
            `0 0 ${(12 * k).toFixed(1)}px ${rgba(color, 0.55)}`,
            `0 0 ${(26 * k).toFixed(1)}px ${rgba(color, 0.28)}`,
            `inset 0 0 ${(5 * k).toFixed(1)}px ${rgba(color, 0.8)}`,
            `inset 0 0 ${(14 * k).toFixed(1)}px ${rgba(color, 0.3)}`,
          ].join(", "),
        }}
      />
      {/* anima del neon: filo chiaro al centro del tubo */}
      <div style={{ ...box(b / 2 - b * 0.32), border: `${Math.max(1.5, b * 0.36)}px solid ${rgba(lighten(color, 0.55), 0.95)}` }} />
    </AbsoluteFill>
  );
};

/** "#RRGGBB" → stessa tinta schiarita verso il bianco (0..1). */
function lighten(hex: string, t: number) {
  const n = parseInt(hex.replace("#", ""), 16);
  const c = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => Math.round(v + (255 - v) * t));
  return `#${c.map((v) => v.toString(16).padStart(2, "0")).join("")}`;
}

function rgba(hex: string, a: number) {
  const n = parseInt(hex.replace("#", ""), 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
}
