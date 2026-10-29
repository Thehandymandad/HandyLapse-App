import React from "react";
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import type { GraphicEvent } from "../../../lib/timeline";
import { clamp, INTER, P } from "./shared";

/**
 * Mirino da videocamera sui primi secondi ("avete appena finito di registrare"): angoli che si chiudono sull'inquadratura,
 * ● REC che lampeggia, timecode che scorre, quadrato di messa a fuoco che "aggancia" il viso.
 * Alla fine scatta: lampo bianco e gli angoli volano fuori.
 */
const Corner: React.FC<{ x: number; y: number; sx: number; sy: number; arm: number; color: string }> = ({ x, y, sx, sy, arm, color }) => (
  <div
    style={{
      position: "absolute",
      left: x - (sx < 0 ? arm : 0),
      top: y - (sy < 0 ? arm : 0),
      width: arm,
      height: arm,
      borderTop: sy > 0 ? `8px solid ${color}` : undefined,
      borderBottom: sy < 0 ? `8px solid ${color}` : undefined,
      borderLeft: sx > 0 ? `8px solid ${color}` : undefined,
      borderRight: sx < 0 ? `8px solid ${color}` : undefined,
      borderRadius: 6,
      filter: "drop-shadow(0 4px 10px rgba(0,0,0,0.5))",
    }}
  />
);

export const RecHud: React.FC<{ g: GraphicEvent }> = ({ g }) => {
  const f = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const shutterAt = typeof g.props?.shutterAt === "number" ? g.props.shutterAt : g.frames - 12;
  const open = spring({ frame: f, fps, config: { damping: 14, stiffness: 170 } });
  const close = easeIn(interpolate(f, [shutterAt, shutterAt + 9], [0, 1], clamp));
  const flash = interpolate(f, [shutterAt, shutterAt + 1, shutterAt + 7], [0, 0.85, 0], clamp);
  // riquadro del mirino (sopra e sotto lascia spazio all'interfaccia di Instagram)
  const pad = 70 + (1 - open) * 70 - close * 160;
  const top = 190 + (1 - open) * 60 - close * 220;
  const bottom = height - 330 - (1 - open) * 60 + close * 260;
  const left = pad;
  const right = width - pad;
  const arm = 110;
  const color = `rgba(255,255,255,${1 - close})`;
  const blink = Math.floor(f / 12) % 2 === 0;
  const tc = (() => {
    const fr = f % fps;
    const s = Math.floor(f / fps);
    return `00:00:${String(s).padStart(2, "0")}:${String(fr).padStart(2, "0")}`;
  })();
  // messa a fuoco sul viso
  const fx = (typeof g.props?.focusX === "number" ? g.props.focusX : 0.5) * width;
  const fy = (typeof g.props?.focusY === "number" ? g.props.focusY : 0.42) * height;
  const lock = spring({ frame: f - 3, fps, config: { damping: 11, stiffness: 260 } });
  const fsize = 440 * (1.5 - 0.5 * lock);
  const fOpacity = interpolate(f, [0, 3, 34, 44], [0, 1, 1, 0], clamp);
  const fColor = f > 8 && f < 26 && Math.floor(f / 4) % 2 === 0 ? P.accent : "rgba(255,255,255,0.9)";
  const ui = 1 - close;
  return (
    <AbsoluteFill style={{ fontFamily: INTER, color: P.white }}>
      <Corner x={left} y={top} sx={1} sy={1} arm={arm} color={color} />
      <Corner x={right} y={top} sx={-1} sy={1} arm={arm} color={color} />
      <Corner x={left} y={bottom} sx={1} sy={-1} arm={arm} color={color} />
      <Corner x={right} y={bottom} sx={-1} sy={-1} arm={arm} color={color} />
      <div style={{ position: "absolute", left: left + 44, top: top + 40, display: "flex", alignItems: "center", gap: 16, opacity: ui * open, fontWeight: 900, fontSize: 44, letterSpacing: 2, textShadow: "0 3px 12px rgba(0,0,0,0.6)" }}>
        <div style={{ width: 30, height: 30, borderRadius: 15, background: P.red, opacity: blink ? 1 : 0.25, boxShadow: blink ? `0 0 24px ${P.red}` : undefined }} />
        REC
      </div>
      <div style={{ position: "absolute", right: width - right + 44, top: top + 44, display: "flex", alignItems: "center", gap: 14, opacity: ui * open, fontWeight: 800, fontSize: 34, textShadow: "0 3px 12px rgba(0,0,0,0.6)" }}>
        4K · 30
        <div style={{ width: 62, height: 30, border: "4px solid white", borderRadius: 7, padding: 3, boxSizing: "border-box", position: "relative" }}>
          <div style={{ width: "72%", height: "100%", background: P.accent, borderRadius: 2 }} />
        </div>
      </div>
      <div style={{ position: "absolute", left: 0, right: 0, top: bottom - 96, textAlign: "center", opacity: ui * open, fontWeight: 800, fontSize: 40, letterSpacing: 4, fontVariantNumeric: "tabular-nums", textShadow: "0 3px 12px rgba(0,0,0,0.6)" }}>
        {tc}
      </div>
      {fOpacity > 0 && (
        <div
          style={{
            position: "absolute",
            left: fx - fsize / 2,
            top: fy - fsize / 2,
            width: fsize,
            height: fsize,
            opacity: fOpacity,
            border: `4px solid ${fColor}`,
            borderRadius: 18,
            boxShadow: fColor === P.accent ? `0 0 30px ${P.accentDim}` : undefined,
          }}
        />
      )}
      {flash > 0.01 && <AbsoluteFill style={{ background: "#fff", opacity: flash }} />}
    </AbsoluteFill>
  );
};

const easeIn = (t: number) => t * t * t;
