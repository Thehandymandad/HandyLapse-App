import React from "react";
import { Clip, isSprite, type Sprite } from "../../../lib/media";
import { A } from "./kit";

/** Cosa va dentro uno schermo: un clip (sprite) o un'immagine con una spinta lenta (Ken Burns). */
export type Media = { clip?: Sprite; src?: string; pos?: string };

/**
 * Il contenuto di uno schermo w×h al frame `f`. `hold`: il clip avanza solo ogni `hold` frame (scatti, per mostrare
 * un frame rate più basso). `kb`: forza della spinta sulle immagini.
 */
export const MediaView: React.FC<{ m: Media; f: number; w: number; h: number; hold?: number; kb?: number }> = ({ m, f, w, h, hold = 1, kb = 1 }) => {
  if (m.clip && isSprite(m.clip)) return <Clip sprite={m.clip} f={Math.floor(f / hold) * hold} w={w} h={h} loop />;
  if (m.src)
    return (
      <div style={{ width: w, height: h, overflow: "hidden" }}>
        <div
          style={{
            width: w,
            height: h,
            backgroundImage: `url(${m.src})`,
            backgroundSize: "cover",
            backgroundPosition: m.pos ?? "center",
            transform: `scale(${(1.06 + f * 0.0016 * kb).toFixed(4)})`,
          }}
        />
      </div>
    );
  return <div style={{ width: w, height: h, background: "#111" }} />;
};

/**
 * iPhone in titanio (cornice sottile, isola dinamica), in orizzontale (`landscape`) o verticale. `w` = larghezza
 * dello schermo; il resto si ricava dalle proporzioni (19.5:9).
 */
export const IPhone: React.FC<{ w: number; landscape?: boolean; children: React.ReactNode; shadow?: boolean }> = ({ w, landscape = true, children, shadow = true }) => {
  const long = landscape ? w : w * (19.5 / 9);
  const short = landscape ? w * (9 / 19.5) : w;
  const sw = landscape ? long : short;
  const sh = landscape ? short : long;
  const bezel = Math.max(6, short * 0.035);
  const r = short * 0.17;
  return (
    <div
      style={{
        position: "relative",
        width: sw + bezel * 2,
        height: sh + bezel * 2,
        borderRadius: r + bezel,
        padding: bezel,
        background: "linear-gradient(135deg, #D9D9DE 0%, #8E8E93 22%, #F2F2F5 48%, #7C7C82 74%, #C9C9CE 100%)",
        boxShadow: shadow ? `${A.shadow}, 0 0 0 1px rgba(0,0,0,0.25)` : undefined,
      }}
    >
      <div style={{ position: "relative", width: sw, height: sh, borderRadius: r, overflow: "hidden", background: "#000", boxShadow: "inset 0 0 0 2px #000" }}>
        {children}
        {/* isola dinamica */}
        <div
          style={{
            position: "absolute",
            background: "#000",
            borderRadius: 999,
            ...(landscape
              ? { left: short * 0.045, top: "50%", width: short * 0.085, height: short * 0.28, transform: "translateY(-50%)" }
              : { top: short * 0.045, left: "50%", height: short * 0.085, width: short * 0.28, transform: "translateX(-50%)" }),
          }}
        />
        {/* riflesso del vetro */}
        <div style={{ position: "absolute", inset: 0, background: "linear-gradient(115deg, rgba(255,255,255,0.16) 0%, rgba(255,255,255,0) 38%)", pointerEvents: "none" }} />
      </div>
    </div>
  );
};
