/**
 * Girato e immagini dentro le grafiche. hf-project.ts trasforma ogni `clip: [da, a]` delle props in un foglio di
 * fotogrammi (sprite) e lo precarica (window.__hfImages): qui lo si disegna su un canvas, il fotogramma giusto per il
 * frame corrente, in modo sincrono (così lo screenshot di HyperFrames lo vede sempre).
 */
import React, { useLayoutEffect, useRef } from "react";

export type Sprite = { src: string; cols: number; rows: number; fw: number; fh: number; n: number };

export const isSprite = (v: unknown): v is Sprite => !!v && typeof v === "object" && typeof (v as Sprite).src === "string" && typeof (v as Sprite).n === "number";

const cache: Record<string, HTMLImageElement> = {};

/** Immagine precaricata da hf-project (o caricata qui, per l'anteprima Remotion). */
export function getImage(src: string): HTMLImageElement | null {
  if (!src || typeof window === "undefined") return null;
  const pre = (window as unknown as { __hfImages?: Record<string, HTMLImageElement> }).__hfImages?.[src];
  if (pre) return pre;
  if (!cache[src]) {
    const im = new Image();
    im.src = src;
    cache[src] = im;
  }
  return cache[src];
}

/**
 * Un pezzo di girato disegnato in un riquadro w×h (riempito, come object-fit: cover).
 * `f`: fotogramma relativo all'inizio del clip (oltre la fine resta sull'ultimo, o ricomincia con `loop`).
 * `gray`: bianco e nero; `blur`: sfocatura in px (per il fondo); `zoom`: ingrandimento lento (Ken Burns).
 */
export const Clip: React.FC<{ sprite: Sprite; f: number; w: number; h: number; gray?: boolean; blur?: number; zoom?: number; loop?: boolean; style?: React.CSSProperties }> = ({
  sprite,
  f,
  w,
  h,
  gray,
  blur = 0,
  zoom = 1,
  loop,
  style,
}) => {
  const ref = useRef<HTMLCanvasElement>(null);
  // il canvas lavora a risoluzione ridotta quando è sfocato (stesso aspetto, molto meno lavoro)
  const k = blur > 4 ? 0.25 : 1;
  const cw = Math.max(2, Math.round(w * k));
  const ch = Math.max(2, Math.round(h * k));
  useLayoutEffect(() => {
    const cv = ref.current;
    const ctx = cv?.getContext("2d");
    const img = getImage(sprite.src);
    if (!cv || !ctx) return;
    ctx.clearRect(0, 0, cw, ch);
    if (!img || !img.complete || !img.naturalWidth) return;
    const i = loop ? ((Math.floor(f) % sprite.n) + sprite.n) % sprite.n : Math.min(sprite.n - 1, Math.max(0, Math.floor(f)));
    const sx = (i % sprite.cols) * sprite.fw;
    const sy = Math.floor(i / sprite.cols) * sprite.fh;
    // cover: ritaglia il fotogramma sorgente con le proporzioni del riquadro
    const ra = cw / ch;
    const sa = sprite.fw / sprite.fh;
    let cwSrc = sprite.fw;
    let chSrc = sprite.fh;
    if (ra > sa) chSrc = sprite.fw / ra;
    else cwSrc = sprite.fh * ra;
    cwSrc /= zoom;
    chSrc /= zoom;
    const ox = sx + (sprite.fw - cwSrc) / 2;
    const oy = sy + (sprite.fh - chSrc) / 2;
    ctx.filter = [gray ? "grayscale(1) contrast(1.15)" : "", blur ? `blur(${(blur * k).toFixed(1)}px)` : ""].join(" ").trim() || "none";
    ctx.drawImage(img, ox, oy, cwSrc, chSrc, 0, 0, cw, ch);
    ctx.filter = "none";
  });
  return <canvas ref={ref} width={cw} height={ch} style={{ width: w, height: h, display: "block", ...style }} />;
};
