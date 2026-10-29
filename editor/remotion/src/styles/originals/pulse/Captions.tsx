import React from "react";
import { AbsoluteFill, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { seeded, type Timeline } from "../../../lib/timeline";
import type { ReelStyle } from "../../../types";
import { ANTON, INTER, P, rgba, SERIF } from "./shared";

/**
 * Sottotitoli cinetici: blocchi di 2–3 parole in Anton, ogni parola sale dal basso a fuoco nel momento in cui è detta,
 * la parola attiva è accento con un piccolo "colpo" di scala, le parole chiave (emphasis) diventano un'etichetta accento inclinata.
 * Una grafica con props.hideCaptions li nasconde.
 * Tema chiaro (come la referenza): Inter 900 nero in minuscolo, la parola chiave in serif corsivo (Instrument Serif)
 * dentro una pillola del colore d'accento; la parola detta fa solo il colpo di scala.
 */
export const PulseCaptions: React.FC<{ tl: Timeline; style: ReelStyle }> = ({ tl, style }) => {
  const frame = useCurrentFrame();
  const { fps, width } = useVideoConfig();
  const g = tl.captions.find((c) => frame >= c.from && frame < c.to);
  if (!g) return null;
  if (tl.graphics.some((x) => x.props?.hideCaptions && frame >= x.from && frame < x.from + x.frames)) return null;
  const c = style.captions;
  const active = g.words.findIndex((w, i) => frame >= w.from && (i === g.words.length - 1 || frame < g.words[i + 1].from));
  const light = P.theme === "light";
  const tilt = light ? 0 : (seeded(g.seed) - 0.5) * 3;
  return (
    <AbsoluteFill>
      <div
        style={{
          position: "absolute",
          left: width * 0.07,
          right: width * 0.07,
          top: `${c.positionY * 100}%`,
          transform: `translateY(-50%) rotate(${tilt}deg)`,
          display: "flex",
          flexWrap: "wrap",
          justifyContent: "center",
          alignItems: "center",
          columnGap: c.fontSize * 0.26,
          rowGap: c.fontSize * 0.08,
          fontFamily: light ? INTER : ANTON,
          fontWeight: light ? 900 : 400,
          letterSpacing: light ? "-0.04em" : undefined,
          fontSize: c.fontSize,
          lineHeight: 1.05,
          textTransform: light ? "none" : "uppercase",
        }}
      >
        {g.words.map((w, i) => {
          const age = frame - w.from;
          if (age < 0) return <span key={i} style={{ visibility: "hidden" }}>{w.text}</span>;
          const s = spring({ frame: age, fps, config: { damping: 13, stiffness: 320, mass: 0.5 } });
          const isActive = i === active;
          const kick = isActive ? 1 + 0.14 * Math.max(0, 1 - age / 5) : 1;
          const blur = Math.max(0, 1 - age / 4) * 9;
          const boxed = w.keyword;
          return (
            <span
              key={i}
              style={{
                display: "inline-block",
                transform: `translateY(${(1 - s) * 46}px) scale(${(0.8 + 0.2 * s) * kick}) rotate(${boxed ? -3 : 0}deg)`,
                opacity: Math.min(1, 0.25 + age / 2),
                filter: blur > 0.3 ? `blur(${blur.toFixed(1)}px)` : undefined,
                color: boxed ? P.ink : light ? P.fg : isActive ? P.accent : P.white,
                background: boxed ? P.accent : undefined,
                padding: boxed ? (light ? `${c.fontSize * 0.04}px ${c.fontSize * 0.2}px ${c.fontSize * 0.08}px` : `0 ${c.fontSize * 0.16}px`) : undefined,
                borderRadius: c.fontSize * (light ? 0.2 : 0.12),
                fontFamily: boxed && light ? SERIF : undefined,
                fontStyle: boxed && light ? "italic" : undefined,
                fontWeight: boxed && light ? 400 : undefined,
                letterSpacing: boxed && light ? "0" : undefined,
                textShadow: boxed || light ? "none" : "0 4px 0 rgba(0,0,0,0.35), 0 10px 28px rgba(0,0,0,0.65)",
                boxShadow: boxed ? (light ? `0 8px 24px ${rgba(P.accent, 0.35)}` : `0 10px 30px rgba(0,0,0,0.45), 0 0 40px ${P.accentDim}`) : undefined,
              }}
            >
              {w.text.replace(/^["«“„]+/, "").replace(/[.,!?;:"»”]+$/, "")}
            </span>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};
