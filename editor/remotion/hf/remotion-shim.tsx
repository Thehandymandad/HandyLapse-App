/**
 * Al posto del pacchetto "remotion" quando i componenti girano dentro HyperFrames (vedi scripts/build-hf.ts).
 * Il tempo non lo decide React: arriva da HyperFrames (hf-seek) come fotogramma e scende nei <Sequence> come in Remotion,
 * così ogni componente disegna esattamente lo stesso fotogramma che disegnerebbe Remotion.
 */
import React, { createContext, useContext } from "react";
// interpolate vero di Remotion (funzione pura, senza React)
import { interpolate as remotionInterpolate } from "../node_modules/remotion/dist/esm/no-react.mjs";

export type VideoConfig = { fps: number; width: number; height: number; durationInFrames: number; id: string };

export const FrameContext = createContext(0);
export const ConfigContext = createContext<VideoConfig>({ fps: 30, width: 1080, height: 1920, durationInFrames: 1, id: "hf" });

export const useCurrentFrame = () => useContext(FrameContext);
export const useVideoConfig = () => useContext(ConfigContext);

export const interpolate = remotionInterpolate as (
  input: number,
  inputRange: readonly number[],
  outputRange: readonly number[],
  options?: { easing?: (t: number) => number; extrapolateLeft?: string; extrapolateRight?: string },
) => number;

type SpringConfig = { damping?: number; mass?: number; stiffness?: number; overshootClamping?: boolean };

/**
 * spring() di Remotion: Remotion integra l'oscillatore smorzato a passi di un fotogramma con la soluzione esatta,
 * quindi il risultato coincide con la forma chiusa calcolata al tempo frame/fps (0 prima del fotogramma 0).
 */
export function spring({ frame, fps, config = {}, from = 0, to = 1 }: { frame: number; fps: number; config?: SpringConfig; from?: number; to?: number }) {
  const c = config.damping ?? 10;
  const m = config.mass ?? 1;
  const k = config.stiffness ?? 100;
  const t = Math.max(0, frame) / fps;
  const zeta = c / (2 * Math.sqrt(k * m));
  const w0 = Math.sqrt(k / m);
  let x: number; // distanza residua dal valore finale (parte da 1)
  if (zeta < 1) {
    const w1 = w0 * Math.sqrt(1 - zeta * zeta);
    x = Math.exp(-zeta * w0 * t) * (Math.sin(w1 * t) * ((zeta * w0) / w1) + Math.cos(w1 * t));
  } else {
    x = Math.exp(-w0 * t) * (1 + w0 * t);
  }
  let p = 1 - x;
  if (config.overshootClamping) p = Math.min(1, Math.max(0, p));
  return from + (to - from) * p;
}

export const random = (seed: string | number) => {
  const s = typeof seed === "number" ? seed : [...seed].reduce((a, ch) => a * 31 + ch.charCodeAt(0), 7);
  const x = Math.sin(s * 12.9898 + 78.233) * 43758.5453;
  return x - Math.floor(x);
};

const FILL: React.CSSProperties = {
  position: "absolute",
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  width: "100%",
  height: "100%",
  display: "flex",
  flexDirection: "column",
};

export const AbsoluteFill = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(({ style, ...rest }, ref) => (
  <div ref={ref} style={{ ...FILL, ...style }} {...rest} />
));

export const Sequence: React.FC<{ from?: number; durationInFrames?: number; children?: React.ReactNode; name?: string; premountFor?: number; layout?: "none" | "absolute-fill" }> = ({
  from = 0,
  durationInFrames = Infinity,
  children,
  layout,
}) => {
  const frame = useCurrentFrame();
  const local = frame - from;
  if (local < 0 || local >= durationInFrames) return null;
  const inner = <FrameContext.Provider value={local}>{children}</FrameContext.Provider>;
  return layout === "none" ? inner : <AbsoluteFill>{inner}</AbsoluteFill>;
};

export const Freeze: React.FC<{ frame: number; children?: React.ReactNode }> = ({ frame, children }) => (
  <FrameContext.Provider value={frame}>{children}</FrameContext.Provider>
);

/** I file di public/ stanno in assets/ del progetto HyperFrames. */
export const staticFile = (p: string) => `assets/${p.replace(/^\/+/, "")}`;

export const Img: React.FC<React.ImgHTMLAttributes<HTMLImageElement>> = (props) => <img {...props} />;

/** Il footage non passa da HyperFrames (lo fa camera.py): niente video qui. */
export const OffthreadVideo: React.FC<Record<string, unknown>> = () => null;
export const Video = OffthreadVideo;
export const Audio: React.FC<Record<string, unknown>> = () => null;

// HyperFrames aspetta font e immagini con window.__hf.buildReady: qui non serve bloccare nulla
export const delayRender = (_label?: string) => 0;
export const continueRender = (_handle: number) => undefined;

export const Easing = {
  linear: (t: number) => t,
  ease: (t: number) => t,
  cubic: (t: number) => t * t * t,
  quad: (t: number) => t * t,
  in: (e: (t: number) => number) => e,
  out: (e: (t: number) => number) => (t: number) => 1 - e(1 - t),
  inOut: (e: (t: number) => number) => (t: number) => (t < 0.5 ? e(t * 2) / 2 : 1 - e((1 - t) * 2) / 2),
};
