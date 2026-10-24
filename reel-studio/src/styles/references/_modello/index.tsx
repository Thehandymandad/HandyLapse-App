/**
 * MODELLO di style pack (non registrato). Per una nuova reference: copia la cartella in ../<nome-stile>/,
 * rifai ogni parte guardando i fotogrammi della reference e aggiungi in ../index.ts:
 *   export { pack as nomeStile } from "./<nome-stile>";
 *
 * Tutto ciò che non serve si può togliere: lo stile di base resta valido da solo.
 */
import React from "react";
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { cardText, Positioned, useInOut } from "../../../components/Graphics";
import { fontStack, fontWeightFor } from "../../../lib/fonts";
import type { Timeline } from "../../../lib/timeline";
import type { ReelStyle } from "../../../types";
import { defineStyle } from "../../base";
import { definePack } from "../../pack";

// 1) Parametri misurati sulla reference (font, colori, dimensioni, ritmo, camera…)
const style = defineStyle("modello", "Modello", "Esempio: sottotitoli a scorrimento, camera 3D, sticker", {
  captions: { fontFamily: "Poppins", fontWeight: 900, fontSize: 92, highlightColor: "#00E5FF", positionY: 0.7, maxWordsPerCaption: 3 },
  camera: { perspective: 1200, pushPerShot: 1.04, drift: 3, tilt3d: 4, transition: "whip", transitionFrames: 6 },
  motion: { fontFamily: "Poppins", accentColor: "#00E5FF", secondaryColor: "#0B0B0F", textColor: "#0B0B0F" },
});

// 2) Sottotitoli personalizzati: ogni parola entra dal basso con un leggero ritardo
const Captions: React.FC<{ tl: Timeline; style: ReelStyle }> = ({ tl, style }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const g = tl.captions.find((c) => frame >= c.from && frame < c.to);
  if (!g) return null;
  const c = style.captions;
  return (
    <AbsoluteFill>
      <div style={{ position: "absolute", top: `${c.positionY * 100}%`, left: 60, right: 60, transform: "translateY(-50%)", display: "flex", flexWrap: "wrap", justifyContent: "center", gap: 22 }}>
        {g.words.map((w, i) => {
          const p = spring({ frame: frame - g.from - i * 2, fps, config: { damping: 14, stiffness: 220 } });
          const active = frame >= w.from && frame < w.to;
          return (
            <span
              key={i}
              style={{
                fontFamily: fontStack(c.fontFamily),
                fontWeight: fontWeightFor(c.fontFamily, c.fontWeight),
                fontSize: c.fontSize,
                color: active ? c.highlightColor : c.color,
                transform: `translateY(${interpolate(p, [0, 1], [60, 0])}px)`,
                opacity: p,
                textShadow: "0 6px 20px rgba(0,0,0,0.6)",
                textTransform: c.uppercase ? "uppercase" : "none",
              }}
            >
              {w.text}
            </span>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};

// 3) Grafica nuova: "sticker" (in edit.json: { "type": "sticker", "at": 3.2, "duration": 2, "text": "WOW" })
const Sticker: React.FC<{ g: import("../../../lib/timeline").GraphicEvent; style: ReelStyle }> = ({ g, style }) => {
  const { enter, exit, frame } = useInOut(g.frames, 8, 240);
  return (
    <Positioned x={g.x ?? 0.72} y={g.y ?? 0.3}>
      <div
        style={{
          ...cardText(style, 70),
          background: style.motion.accentColor,
          padding: "18px 34px",
          borderRadius: 18,
          border: "6px solid #fff",
          transform: `rotate(${-8 + Math.sin(frame / 5) * 3}deg) scale(${enter * exit})`,
          boxShadow: "0 14px 34px rgba(0,0,0,0.4)",
        }}
      >
        {g.text}
      </div>
    </Positioned>
  );
};

export const pack = definePack({
  style,
  // 4) Camera: parte dalla camera di base e aggiunge un'orbita 3D durante il titolo iniziale
  camera: (ctx, base) => {
    const hook = ctx.tl.hook;
    if (hook && ctx.frame < hook.frames) {
      const p = ctx.frame / hook.frames;
      return { ...base, rotateY: base.rotateY + interpolate(p, [0, 1], [-10, 0]), scale: base.scale * interpolate(p, [0, 1], [1.15, 1]) };
    }
    return base;
  },
  Captions,
  graphics: { sticker: Sticker },
});
