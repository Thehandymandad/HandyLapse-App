import React from "react";
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { fontStack, fontWeightFor } from "../lib/fonts";
import { seeded, type CaptionGroup, type Timeline } from "../lib/timeline";
import type { ReelStyle } from "../types";

const luminance = (hex: string) => {
  const m = hex.match(/^#([0-9a-f]{6})/i);
  if (!m) return 0.5;
  const n = parseInt(m[1], 16);
  return (0.299 * ((n >> 16) & 255) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255)) / 255;
};

/** Parola con contorno: il contorno sta su un livello dietro, così non "mangia" il riempimento. */
const StrokedText: React.FC<{ text: string; fill: string; stroke: string; strokeWidth: number; shadow: string }> = ({ text, fill, stroke, strokeWidth, shadow }) => (
  <span style={{ position: "relative", display: "inline-block" }}>
    {strokeWidth > 0 && (
      <span aria-hidden style={{ position: "absolute", inset: 0, color: stroke, WebkitTextStroke: `${strokeWidth * 2}px ${stroke}`, textShadow: shadow }}>
        {text}
      </span>
    )}
    <span style={{ position: "relative", color: fill, textShadow: strokeWidth > 0 ? undefined : shadow }}>{text}</span>
  </span>
);

const Group: React.FC<{ g: CaptionGroup; style: ReelStyle }> = ({ g, style }) => {
  const frame = useCurrentFrame();
  const { fps, width } = useVideoConfig();
  const c = style.captions;
  const age = frame - g.from;

  let scale = 1;
  let opacity = 1;
  let y = 0;
  switch (c.animation) {
    case "pop":
      scale = interpolate(spring({ frame: age, fps, config: { damping: 11, stiffness: 260, mass: 0.6 } }), [0, 1], [0.7, 1]);
      opacity = interpolate(age, [0, 2], [0, 1], { extrapolateRight: "clamp" });
      break;
    case "bounce":
      scale = interpolate(spring({ frame: age, fps, config: { damping: 6, stiffness: 220, mass: 0.7 } }), [0, 1], [0.4, 1]);
      opacity = interpolate(age, [0, 2], [0, 1], { extrapolateRight: "clamp" });
      break;
    case "fade":
      opacity = interpolate(age, [0, 6], [0, 1], { extrapolateRight: "clamp" });
      break;
    case "slide-up":
      y = interpolate(spring({ frame: age, fps, config: { damping: 14, stiffness: 180 } }), [0, 1], [70, 0]);
      opacity = interpolate(age, [0, 5], [0, 1], { extrapolateRight: "clamp" });
      break;
  }
  const tilt = c.tilt ? (seeded(g.seed) - 0.5) * 2 * c.tilt : 0;
  const active = g.words.findIndex((w, i) => frame >= w.from && (i === g.words.length - 1 || frame < g.words[i + 1].from));
  const weight = fontWeightFor(c.fontFamily, c.fontWeight);

  return (
    <div
      style={{
        position: "absolute",
        left: width * 0.08,
        right: width * 0.08,
        top: `${c.positionY * 100}%`,
        transform: `translateY(-50%) translateY(${y}px) rotate(${tilt}deg) scale(${scale})`,
        opacity,
        display: "flex",
        justifyContent: "center",
      }}
    >
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          justifyContent: "center",
          alignItems: "center",
          columnGap: c.fontSize * (c.highlightMode === "scale" ? 0.4 : 0.3),
          rowGap: c.fontSize * (c.lineHeight - 1),
          maxWidth: `${c.maxCharsPerLine * 0.62}em`,
          fontFamily: fontStack(c.fontFamily),
          fontWeight: weight,
          fontSize: c.fontSize,
          lineHeight: c.lineHeight,
          letterSpacing: c.letterSpacing,
          textAlign: "center",
          padding: c.background === "none" ? 0 : `${c.fontSize * 0.18}px ${c.fontSize * 0.35}px`,
          background: c.background === "none" ? undefined : c.backgroundColor,
          borderRadius: c.background === "pill" ? 999 : c.fontSize * 0.22,
        }}
      >
        {g.words.map((w, i) => {
          if (c.animation === "typewriter" && frame < w.from) return null;
          const isActive = i === active && c.highlightMode !== "none";
          let fill = c.color;
          if (c.highlightMode !== "none" && w.keyword) fill = c.keywordColor;
          if (isActive && c.highlightMode !== "box") fill = c.highlightColor;
          const wordAge = frame - w.from;
          let ws = 1;
          if (isActive && (c.highlightMode === "scale" || c.animation === "pop" || c.animation === "bounce")) {
            ws = (c.highlightMode === "scale" ? 1.1 : 1) + 0.06 * Math.max(0, 1 - wordAge / 4);
          }
          const boxed = isActive && c.highlightMode === "box";
          return (
            <span
              key={i}
              style={{
                display: "inline-block",
                transform: `scale(${ws})`,
                padding: boxed ? `0 ${c.fontSize * 0.14}px` : undefined,
                margin: boxed ? `0 ${-c.fontSize * 0.14}px` : undefined,
                background: boxed ? c.highlightColor : undefined,
                borderRadius: c.fontSize * 0.18,
                borderBottom: isActive && c.highlightMode === "underline" ? `${c.fontSize * 0.1}px solid ${c.highlightColor}` : undefined,
              }}
            >
              <StrokedText
                text={w.text}
                fill={boxed ? (c.strokeWidth > 0 ? c.color : luminance(c.highlightColor) > 0.6 ? "#111111" : "#FFFFFF") : fill}
                stroke={c.strokeColor}
                strokeWidth={boxed ? 0 : c.strokeWidth}
                shadow={boxed ? "none" : c.shadow}
              />
            </span>
          );
        })}
      </div>
    </div>
  );
};

export const Captions: React.FC<{ tl: Timeline; style: ReelStyle }> = ({ tl, style }) => {
  const frame = useCurrentFrame();
  const g = tl.captions.find((c) => frame >= c.from && frame < c.to);
  if (!g) return null;
  return (
    <AbsoluteFill>
      <Group key={g.seed} g={g} style={style} />
    </AbsoluteFill>
  );
};
