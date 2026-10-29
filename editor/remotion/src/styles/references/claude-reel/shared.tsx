import React from "react";
import { interpolate } from "remotion";
import { fontStack } from "../../../lib/fonts";
import { C } from "./palette";
import { logoSvgPath } from "./logo";

const LOGO_PATH = logoSvgPath();

export const ClaudeLogo: React.FC<{ size: number; color?: string; rotate?: number }> = ({ size, color = C.logo, rotate = 0 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" style={{ transform: `rotate(${rotate}deg)`, flexShrink: 0 }}>
    <path d={LOGO_PATH} fill={color} />
  </svg>
);

/** Testo con markup: [c]corallo[/c] [y]giallo[/y] [b]grassetto nero su giallo[/b]. */
export const Rich: React.FC<{ text: string }> = ({ text }) => {
  const parts = text.split(/(\[[cyb]\].*?\[\/[cyb]\])/g).filter(Boolean);
  return (
    <>
      {parts.map((p, i) => {
        const m = p.match(/^\[([cyb])\](.*)\[\/\1\]$/);
        if (!m) return <span key={i}>{p}</span>;
        if (m[1] === "c") return <span key={i} style={{ color: C.coral }}>{m[2]}</span>;
        if (m[1] === "y") return <span key={i} style={{ color: C.yellow }}>{m[2]}</span>;
        return (
          <span key={i} style={{ background: C.yellow, color: "#141414", padding: "0 10px", borderRadius: 6 }}>
            {m[2]}
          </span>
        );
      })}
    </>
  );
};

export const POPPINS = fontStack("Poppins");
export const MONTSERRAT = fontStack("Montserrat");

/**
 * Entrata/uscita delle card della reference: entrano "a fuoco" da sfocate e leggermente piccole,
 * escono sfocandosi, schiarendosi e ingrandendosi un po'.
 */
export function cardInOut(f: number, frames: number, inF = 8, outF = 8) {
  const i = interpolate(f, [0, inF], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: (t) => 1 - Math.pow(1 - t, 3) });
  // outF = 0: nessuna uscita (la card resta nitida fino al taglio, es. quando si trasforma nella successiva)
  const o = outF > 0 ? interpolate(f, [frames - outF, frames], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }) : 0;
  return {
    opacity: i * (1 - o),
    scale: interpolate(i, [0, 1], [0.86, 1]) * interpolate(o, [0, 1], [1, 1.06]),
    blur: (1 - i) * 14 + o * 16,
    out: o,
  };
}
