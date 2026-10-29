import React from "react";
import type { IconName } from "../types";

/**
 * Libreria di icone disegnate a mano su griglia 24x24 (solo tracciati, così si animano "disegnandosi").
 * Per aggiungere un'icona: aggiungi il nome a IconName in types.ts e i suoi tracciati qui.
 */
type El = string | { c: [number, number, number] };

export const ICONS: Record<IconName, El[]> = {
  scissors: [{ c: [6, 6, 3] }, { c: [6, 18, 3] }, "M8.6 7.6L20 18", "M8.6 16.4L20 6"],
  captions: ["M4 5h16a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1z", "M7 12h4", "M13 12h4", "M7 15.5h10"],
  zoom: [{ c: [10.5, 10.5, 6.5] }, "M15.5 15.5L21 21", "M10.5 8v5", "M8 10.5h5"],
  money: ["M3 6h18a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1z", { c: [12, 12, 3] }, "M6 12h.01", "M18 12h.01"],
  euro: ["M17.5 7a7 7 0 1 0 0 10", "M4 10h10", "M4 14h10"],
  bulb: ["M9 18h6", "M10 21h4", "M12 3a6 6 0 0 0-3.5 10.9c.6.5 1 1.2 1 2.1v.5h5v-.5c0-.9.4-1.6 1-2.1A6 6 0 0 0 12 3z"],
  clock: [{ c: [12, 12, 9] }, "M12 7v5l3 2"],
  house: ["M3 11l9-7 9 7", "M5 10v10h14V10", "M10 20v-6h4v6"],
  fire: ["M12 3c1 4 5 5.5 5 10a5 5 0 0 1-10 0c0-2.5 1.5-3.5 2-5 1 1.5 1.5 2 2.5 2 0-2.5-.5-4.5.5-7z"],
  wrench: ["M15 3.5a5 5 0 0 0-4.6 6.9L3.8 17a2.1 2.1 0 0 0 3 3l6.6-6.6a5 5 0 0 0 6.9-4.6l-3 3-2.6-.7-.7-2.6z"],
  hammer: ["M12 6l3-3 6 6-3 3z", "M13.5 10.5L4 20"],
  drill: ["M3 7h11v6H3z", "M14 9h4", "M18 10h3", "M6 13l-1 7h4l1-7"],
  warning: ["M12 3L2 20h20z", "M12 9v5", "M12 17h.01"],
  heart: ["M12 20s-8-5-8-11a4.5 4.5 0 0 1 8-2.8A4.5 4.5 0 0 1 20 9c0 6-8 11-8 11z"],
  check: ["M5 12l5 5 9-10"],
  cross: ["M6 6l12 12", "M18 6L6 18"],
  star: ["M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1L3.2 9.5l6.1-.9z"],
  trophy: ["M7 4h10v5a5 5 0 0 1-10 0z", "M7 6H4a3 3 0 0 0 3 4", "M17 6h3a3 3 0 0 1-3 4", "M12 14v4", "M8 21h8", "M9 18h6"],
  brain: [
    "M12 5a3 3 0 0 0-5.6-1.5A3 3 0 0 0 4 8a3 3 0 0 0 0 5 3 3 0 0 0 3 5 3 3 0 0 0 5 1",
    "M12 5a3 3 0 0 1 5.6-1.5A3 3 0 0 1 20 8a3 3 0 0 1 0 5 3 3 0 0 1-3 5 3 3 0 0 1-5 1",
    "M12 5v14",
  ],
  rocket: ["M12 2c3 2 5 6 4 11l-4 3-4-3c-1-5 1-9 4-11z", { c: [12, 9, 2] }, "M8 13l-3 3 1 3 3-2", "M16 13l3 3-1 3-3-2", "M11 19l1 3 1-3"],
  chart: ["M4 4v16h16", "M7 15l4-4 3 3 5-6", "M16 8h3v3"],
  phone: ["M7 2h10a2 2 0 0 1 2 2v16a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2z", "M11 18h2"],
  camera: ["M4 7h3l2-3h6l2 3h3a1 1 0 0 1 1 1v11a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V8a1 1 0 0 1 1-1z", { c: [12, 13, 4] }],
  "thumbs-up": ["M7 10v11H3V10z", "M7 10l4-8a2.5 2.5 0 0 1 3 3l-1 4h6a2 2 0 0 1 2 2.3l-1.4 7A2 2 0 0 1 17.6 21H7"],
  eye: ["M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12z", { c: [12, 12, 3] }],
  gift: ["M3 9h18v4H3z", "M5 13v8h14v-8", "M12 9v12", "M12 9C9 9 7 7.5 8 5.5S12 6 12 9z", "M12 9c3 0 5-1.5 4-3.5S12 6 12 9z"],
  lock: ["M5 11h14v10H5z", "M8 11V7a4 4 0 0 1 8 0v4", "M12 15v2"],
  calendar: ["M4 6h16v15H4z", "M4 10h16", "M8 3v4", "M16 3v4"],
  bell: ["M6 16v-5a6 6 0 0 1 12 0v5l2 2H4z", "M10 21h4"],
  spark: ["M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z", "M19 3v4", "M17 5h4", "M5 17v4", "M3 19h4"],
  "arrow-right": ["M4 12h16", "M14 6l6 6-6 6"],
  lightning: ["M13 2L4 14h7l-1 8 9-12h-7z"],
  ruler: ["M3 17L17 3l4 4L7 21z", "M7 13l2 2", "M10 10l2 2", "M13 7l2 2"],
  paint: ["M4 4h13v5H4z", "M17 6h3v6h-8v3", "M11 15h2v6h-2z"],
  screw: ["M8 3h8v3H8z", "M10 6h4v11l-2 4-2-4z", "M10 9l4 1.5", "M10 12l4 1.5"],
  family: [{ c: [8, 6, 2.5] }, { c: [17, 9, 2] }, "M4 20v-5a4 4 0 0 1 8 0v5", "M14 20v-3a3 3 0 0 1 6 0v3"],
  leaf: ["M5 19C5 10 10 5 20 4c0 10-5 15-14 15z", "M5 19l8-8"],
  drop: ["M12 3s6 7 6 11a6 6 0 0 1-12 0c0-4 6-11 6-11z"],
  plug: ["M9 3v5", "M15 3v5", "M6 8h12v3a6 6 0 0 1-12 0z", "M12 17v4"],
};

export const ICON_NAMES = Object.keys(ICONS) as IconName[];

type Props = {
  name: IconName;
  size: number;
  color: string;
  /** 0..1: quanto del tracciato è disegnato (animazione "draw-on"). */
  progress?: number;
  strokeWidth?: number;
  style?: React.CSSProperties;
};

export const Icon: React.FC<Props> = ({ name, size, color, progress = 1, strokeWidth = 2, style }) => {
  const els = ICONS[name] ?? ICONS.spark;
  const dash = { pathLength: 1, strokeDasharray: 1, strokeDashoffset: 1 - Math.min(1, Math.max(0, progress)) };
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" style={style}>
      {els.map((el, i) =>
        typeof el === "string" ? <path key={i} d={el} {...dash} /> : <circle key={i} cx={el.c[0]} cy={el.c[1]} r={el.c[2]} {...dash} />,
      )}
    </svg>
  );
};
