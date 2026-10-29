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

/** Bordo della cornice nel colore d'accento, con alone sfocato che respira piano. */
export const FrameBorder: React.FC<{ frame?: FrameLayout | null; color: string; glow: string }> = ({ frame, color, glow }) => {
  const f = useCurrentFrame();
  if (!frame) return null;
  const k = 0.85 + 0.15 * Math.sin(f / 18);
  return (
    <AbsoluteFill>
      <div
        style={{
          position: "absolute",
          left: frame.x - frame.border / 2,
          top: frame.y - frame.border / 2,
          width: frame.w + frame.border,
          height: frame.h + frame.border,
          borderRadius: frame.radius + frame.border / 2,
          border: `${frame.border}px solid ${color}`,
          boxShadow: `0 0 ${Math.round(14 * k)}px ${color}, 0 0 ${Math.round(46 * k)}px ${glow}, 0 0 ${Math.round(90 * k)}px ${glow}, inset 0 0 ${Math.round(26 * k)}px ${glow}`,
          filter: "blur(0.6px)",
        }}
      />
    </AbsoluteFill>
  );
};
