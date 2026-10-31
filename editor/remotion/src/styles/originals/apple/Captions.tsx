import React from "react";
import { AbsoluteFill, spring, useCurrentFrame, useVideoConfig } from "remotion";
import type { Timeline } from "../../../lib/timeline";
import type { ReelStyle } from "../../../types";
import { A, SANS } from "./kit";

/**
 * Sottotitoli apple: parola per parola, ognuna sale e si mette a fuoco (sfocatura che si scioglie). Bianchi con ombra
 * sul girato, quasi neri sulle scene bianche ("stage"); la parola chiave in blu su una pillola di vetro bianco, così si
 * legge su qualsiasi fondo. Nascosti con props.hideCaptions.
 */
export const AppleCaptions: React.FC<{ tl: Timeline; style: ReelStyle }> = ({ tl, style }) => {
  const frame = useCurrentFrame();
  const { fps, width } = useVideoConfig();
  const g = tl.captions.find((c) => frame >= c.from && frame < c.to);
  if (!g) return null;
  const active = tl.graphics.filter((x) => frame >= x.from && frame < x.from + x.frames);
  if (active.some((x) => x.props?.hideCaptions)) return null;
  const onStage = active.some((x) => x.type === "stage");
  const capY = active.reduce<number | null>((y, x) => (typeof x.props?.captionY === "number" ? (x.props.captionY as number) : y), null);
  const c = style.captions;
  const size = c.fontSize;
  return (
    <AbsoluteFill>
      <div
        style={{
          position: "absolute",
          left: width * 0.08,
          right: width * 0.08,
          top: `${(capY ?? c.positionY) * 100}%`,
          transform: "translateY(-50%)",
          display: "flex",
          flexWrap: "wrap",
          justifyContent: "center",
          alignItems: "center",
          columnGap: size * 0.22,
          rowGap: size * 0.1,
          lineHeight: 1.05,
        }}
      >
        {g.words.map((w, i) => {
          const text = w.text.replace(/^["«“„]+/, "").replace(/[.,!?;:"»”]+$/, "");
          const age = frame - w.from;
          if (age < 0) return <span key={i} style={{ visibility: "hidden", fontFamily: SANS, fontWeight: 800, fontSize: size }}>{text}</span>;
          const s = spring({ frame: age, fps, config: { damping: 20, stiffness: 260, mass: 0.7 } });
          const t = Math.min(1, s);
          const common: React.CSSProperties = {
            display: "inline-block",
            opacity: Math.min(1, age / 3),
            transform: `translateY(${((1 - t) * size * 0.4).toFixed(1)}px) scale(${(0.92 + 0.08 * t).toFixed(3)})`,
            filter: t < 0.97 ? `blur(${((1 - t) * 10).toFixed(1)}px)` : undefined,
          };
          if (w.keyword)
            return (
              <span key={i} style={{ ...common, padding: `${size * 0.04}px ${size * 0.2}px ${size * 0.08}px`, borderRadius: size * 0.28, background: "rgba(255,255,255,0.94)", boxShadow: "0 10px 30px rgba(20,30,60,0.22)" }}>
                <span style={{ fontFamily: SANS, fontWeight: 900, fontSize: size, letterSpacing: "-0.04em", color: A.blue }}>{text}</span>
              </span>
            );
          return (
            <span
              key={i}
              style={{
                ...common,
                whiteSpace: "pre",
                fontFamily: SANS,
                fontWeight: 800,
                fontSize: size,
                letterSpacing: "-0.035em",
                color: onStage ? A.ink : "#FFFFFF",
                textShadow: onStage ? undefined : "0 4px 18px rgba(0,0,0,0.55), 0 1px 3px rgba(0,0,0,0.4)",
              }}
            >
              {text}
            </span>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};
