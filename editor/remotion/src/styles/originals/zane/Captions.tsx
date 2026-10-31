import React from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";
import type { Timeline } from "../../../lib/timeline";
import { bounce, LAND, squash, STAGGER } from "../../../motion/bouncy";
import type { ReelStyle } from "../../../types";
import { INTER, P, SERIF } from "../pulse/shared";

/**
 * Sottotitoli zane: parole bianche in sans molto pesante che entrano lettera per lettera con la molla del README
 * (rimbalzo + squash all'atterraggio), la parola chiave (emphasis) in serif corsivo d'accento con bagliore, che entra
 * con una tendina. Niente pillole né box. Nascosti durante le scene a schermo intero ("scene") e con props.hideCaptions.
 */
export const ZaneCaptions: React.FC<{ tl: Timeline; style: ReelStyle }> = ({ tl, style }) => {
  const frame = useCurrentFrame();
  const { fps, width } = useVideoConfig();
  const g = tl.captions.find((c) => frame >= c.from && frame < c.to);
  if (!g) return null;
  if (tl.graphics.some((x) => (x.type === "scene" || x.props?.hideCaptions) && frame >= x.from && frame < x.from + x.frames)) return null;
  const c = style.captions;
  const size = c.fontSize;
  return (
    <AbsoluteFill>
      <div
        style={{
          position: "absolute",
          left: width * 0.08,
          right: width * 0.08,
          top: `${c.positionY * 100}%`,
          transform: "translateY(-50%)",
          display: "flex",
          flexWrap: "wrap",
          justifyContent: "center",
          alignItems: "baseline",
          columnGap: size * 0.24,
          rowGap: size * 0.02,
          lineHeight: 1.02,
        }}
      >
        {g.words.map((w, i) => {
          const text = w.text.replace(/^["«“„]+/, "").replace(/[.,!?;:"»”]+$/, "");
          const age = frame - w.from;
          if (w.keyword) {
            const s = bounce(age, fps);
            const cut = age < 0 ? 100 : Math.max(0, 1 - Math.min(1, s * 1.05)) * 100;
            return (
              <span key={i} style={{ display: "inline-block", clipPath: `inset(-25% ${cut.toFixed(1)}% -25% -5%)`, transform: `translateX(${((1 - Math.min(1, s)) * -size * 0.2).toFixed(1)}px)` }}>
                <span style={{ fontFamily: SERIF, fontStyle: "italic", fontWeight: 400, fontSize: size * 1.12, color: P.accent, textShadow: P.glow !== "none" ? P.glow : undefined }}>{text}</span>
              </span>
            );
          }
          return (
            <span key={i} style={{ display: "inline-block", whiteSpace: "pre", fontFamily: INTER, fontWeight: 900, fontSize: size, letterSpacing: "-0.045em", color: "#FFFFFF", textShadow: "0 4px 18px rgba(0,0,0,0.55)" }}>
              {Array.from(text).map((ch, k) => {
                const a = age - k * Math.max(1, STAGGER.letter - 1);
                if (a < 0) return <span key={k} style={{ visibility: "hidden" }}>{ch}</span>;
                const s = bounce(a, fps);
                const q = squash(a, LAND, true);
                return (
                  <span key={k} style={{ display: "inline-block", transform: `translateY(${((1 - s) * size * 0.35).toFixed(1)}px) scale(${(s * q.sx).toFixed(3)}, ${(s * q.sy).toFixed(3)})`, transformOrigin: "50% 85%", opacity: Math.min(1, a / 2) }}>
                    {ch}
                  </span>
                );
              })}
            </span>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};
