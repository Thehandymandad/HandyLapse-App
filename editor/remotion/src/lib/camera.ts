import { easeOutCubic, seeded, zoomAt, type Timeline } from "./timeline";
import type { ReelStyle } from "../types";

/** Stato della "camera" virtuale sul video: trasformazioni 2D/3D + effetti di transizione. */
export type CameraState = {
  scale: number;
  /** Spostamento in px (canvas 1080x1920). */
  x: number;
  y: number;
  /** Rotazioni in gradi (X/Y sono 3D, con prospettiva). */
  rotateX: number;
  rotateY: number;
  rotateZ: number;
  /** Sfocatura in px (motion blur delle transizioni). */
  blur: number;
  /** 0..1 lampo bianco. */
  flash: number;
  /** 0..1 intensità glitch (jitter, scanline, colori). */
  glitch: number;
  /** Punto di fuoco delle trasformazioni (0..1). */
  originX: number;
  originY: number;
  /**
   * Riquadro: il video intero si rimpicciolisce attorno al centro (1 = pieno schermo), con angoli arrotondati
   * e inclinazione 3D — per effetti "dentro uno smartphone". Applicato dopo la reinquadratura del progetto.
   */
  inset?: number;
  insetRadius?: number;
  insetRotateX?: number;
  insetRotateY?: number;
};

export type CameraContext = {
  frame: number;
  fps: number;
  tl: Timeline;
  style: ReelStyle;
  /** Inquadratura corrente: indice, frame dall'inizio dell'inquadratura e sua durata. */
  shot: { index: number; frame: number; frames: number };
  /** Frame dall'ultimo jump cut (Infinity se nessuno). */
  sinceCut: number;
};

export function shotAt(tl: Timeline, frame: number) {
  let index = 0;
  for (let i = 0; i < tl.segments.length; i++) if (tl.segments[i].from <= frame) index = i;
  const s = tl.segments[index] ?? { from: 0, frames: tl.durationInFrames };
  return { index, frame: Math.min(frame - s.from, s.frames), frames: s.frames };
}

export function cameraContext(frame: number, tl: Timeline, style: ReelStyle): CameraContext {
  let last = -Infinity;
  for (const c of tl.cuts) if (c <= frame) last = c;
  return { frame, fps: tl.fps, tl, style, shot: shotAt(tl, frame), sinceCut: frame - last };
}

/**
 * Camera di base, guidata dallo stile: zoom (alternanza + eventi), push-in per inquadratura,
 * oscillazione a mano, inclinazione 3D sugli zoom, shake e transizioni sui tagli.
 * Uno style pack può partire da qui e modificarla (StylePack.camera).
 */
export function defaultCamera(ctx: CameraContext): CameraState {
  const { frame, tl, style, shot, sinceCut } = ctx;
  const cam = style.camera;
  const st: CameraState = {
    scale: zoomAt(frame, tl, style),
    x: 0,
    y: 0,
    rotateX: 0,
    rotateY: 0,
    rotateZ: 0,
    blur: 0,
    flash: 0,
    glitch: 0,
    originX: style.zoom.focusX,
    originY: style.zoom.focusY,
  };

  if (cam.pushPerShot !== 1 && shot.frames > 0) st.scale *= 1 + (cam.pushPerShot - 1) * (shot.frame / shot.frames);

  if (cam.drift > 0) {
    st.x += Math.sin(frame / 23) * cam.drift + Math.sin(frame / 9.7) * cam.drift * 0.3;
    st.y += Math.cos(frame / 29) * cam.drift * 0.8 + Math.sin(frame / 11.3) * cam.drift * 0.25;
    st.rotateZ += Math.sin(frame / 37) * cam.drift * 0.02;
  }

  if (cam.tilt3d > 0) {
    tl.zooms.forEach((z, i) => {
      if (frame < z.from || frame > z.to) return;
      const p = (frame - z.from) / Math.max(1, z.to - z.from);
      const amt = Math.sin(Math.PI * Math.min(1, p * 1.2));
      st.rotateY += cam.tilt3d * amt * (i % 2 ? -1 : 1);
      st.rotateX += cam.tilt3d * 0.5 * amt;
    });
  }

  if (style.zoom.shake) {
    const p = tl.zooms.find((e) => e.kind === "punch" && frame >= e.from && frame < e.from + 8);
    if (p) {
      const k = 1 - (frame - p.from) / 8;
      st.x += Math.sin(frame * 3.1) * 14 * k;
      st.y += Math.cos(frame * 2.3) * 10 * k;
      st.scale *= 1.03;
    }
  }

  // Transizioni sui jump cut
  const n = Math.max(1, cam.transitionFrames);
  if (sinceCut >= 0 && sinceCut < n) {
    const left = 1 - easeOutCubic(sinceCut / n);
    const dir = seeded(frame - sinceCut) > 0.5 ? 1 : -1;
    switch (cam.transition) {
      case "flash":
        st.flash = Math.max(st.flash, left * 0.6);
        break;
      case "whip":
        st.x += left * 420 * dir;
        st.blur += left * 24;
        st.scale *= 1 + left * 0.08;
        break;
      case "zoom-blur":
        st.scale *= 1 + left * 0.28;
        st.blur += left * 14;
        break;
      case "shake":
        st.x += (seeded(frame) - 0.5) * 60 * left;
        st.y += (seeded(frame + 7) - 0.5) * 60 * left;
        st.rotateZ += (seeded(frame + 3) - 0.5) * 4 * left;
        break;
      case "glitch":
        st.glitch = Math.max(st.glitch, left);
        st.x += (seeded(frame * 3) - 0.5) * 80 * left;
        break;
      case "rotate-3d":
        st.rotateY += left * 35 * dir;
        st.scale *= 1 + left * 0.12;
        break;
    }
  }
  if (style.motion.flashOnCut && sinceCut >= 0 && sinceCut < 4) st.flash = Math.max(st.flash, 0.5 * (1 - sinceCut / 4));
  return st;
}
