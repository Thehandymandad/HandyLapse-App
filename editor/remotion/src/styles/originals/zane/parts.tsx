import React from "react";
import { interpolate } from "remotion";
import { bounce, BOUNCE_SNAP } from "../../../motion/bouncy";
import { INTER, P, rgba } from "../pulse/shared";

/**
 * Pezzi comuni delle grafiche zane: numero a rullo (odometro), cursore che clicca, fondo della scena con il girato
 * sfocato.
 */

/** Valore che va da `from` a `to` tra i frame `at` e `at + dur` (veloce all'inizio, frena alla fine). */
export function rollValue(f: number, from: number, to: number, at: number, dur: number): number {
  const t = interpolate(f, [at, at + dur], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const e = 1 - Math.pow(1 - t, 4);
  return from + (to - from) * e;
}

/**
 * Numero a rullo: ogni cifra è una colonna 0–9 che scorre in verticale (la parte frazionaria della cifra a destra
 * fa girare la colonna, come un contachilometri). Separatori delle migliaia fissi.
 */
export const Odometer: React.FC<{ value: number; digits?: number; size: number; color?: string; prefix?: string; suffix?: string; sep?: string; decimals?: number; glow?: boolean }> = ({
  value,
  digits,
  size,
  color = "#FFFFFF",
  prefix = "",
  suffix = "",
  sep = ".",
  decimals = 0,
  glow,
}) => {
  const scale = Math.pow(10, decimals);
  const v = Math.max(0, value * scale);
  const intDigits = Math.max(1, String(Math.floor(v)).length);
  const n = Math.max(digits ?? 0, intDigits);
  const cols: React.ReactNode[] = [];
  for (let i = n - 1; i >= 0; i--) {
    const place = Math.pow(10, i);
    // posizione continua della cifra: la colonna gira solo quando le cifre a destra passano da 9 a 0
    const below = v % place;
    const d = Math.floor(v / place) % 10;
    const carry = place === 1 ? v - Math.floor(v) : Math.max(0, (below - (place - 1)) / 1);
    const pos = d + Math.min(1, carry);
    cols.push(
      <span key={`d${i}`} style={{ display: "inline-block", height: size * 1.05, overflow: "hidden", verticalAlign: "bottom" }}>
        <span style={{ display: "flex", flexDirection: "column", transform: `translateY(${(-pos * size * 1.05).toFixed(2)}px)` }}>
          {Array.from({ length: 11 }, (_, k) => (
            <span key={k} style={{ height: size * 1.05, lineHeight: `${size * 1.05}px` }}>{k % 10}</span>
          ))}
        </span>
      </span>,
    );
    if (i === decimals && decimals > 0) cols.push(<span key={`p${i}`}>,</span>);
    else if (i > decimals && (i - decimals) % 3 === 0) cols.push(<span key={`s${i}`}>{sep}</span>);
  }
  return (
    <span style={{ fontFamily: INTER, fontWeight: 900, fontSize: size, color, letterSpacing: "-0.03em", fontVariantNumeric: "tabular-nums", display: "inline-flex", alignItems: "flex-end", textShadow: glow ? `0 0 18px ${rgba(P.accent, 0.6)}` : undefined, lineHeight: 1.05 }}>
      {prefix && <span style={{ whiteSpace: "pre" }}>{prefix}</span>}
      {cols}
      {suffix && <span style={{ whiteSpace: "pre", fontSize: "0.55em", marginLeft: "0.15em", marginBottom: "0.12em", opacity: 0.85 }}>{suffix.trim()}</span>}
    </span>
  );
};

/** Cursore del mouse che arriva da (fromX, fromY) al bersaglio e clicca a `clickAt` (pressione + onda). */
export const Cursor: React.FC<{ f: number; fps: number; x: number; y: number; clickAt: number; from?: [number, number] }> = ({ f, fps, x, y, clickAt, from = [260, 340] }) => {
  const arrive = clickAt - 14;
  if (f < arrive - 4) return null;
  const s = bounce(f - (arrive - 4), fps, BOUNCE_SNAP);
  const px = x + from[0] * (1 - Math.min(1, s));
  const py = y + from[1] * (1 - Math.min(1, s));
  const press = f >= clickAt && f < clickAt + 5 ? 0.82 : 1;
  const ring = f >= clickAt ? (f - clickAt) / 14 : -1;
  return (
    <>
      {ring >= 0 && ring < 1 && (
        <div style={{ position: "absolute", left: x - 70 * ring, top: y - 70 * ring, width: 140 * ring, height: 140 * ring, borderRadius: "50%", border: `4px solid ${rgba(P.accent, 1 - ring)}` }} />
      )}
      <svg width={64} height={64} viewBox="0 0 24 24" style={{ position: "absolute", left: px - 10, top: py - 6, transform: `scale(${press})`, transformOrigin: "20% 15%", filter: "drop-shadow(0 6px 10px rgba(0,0,0,0.5))" }}>
        <path d="M5 3l14 8-6 1.5L10 19z" fill="#FFFFFF" stroke="#0A0B0E" strokeWidth={1.3} strokeLinejoin="round" />
      </svg>
    </>
  );
};
