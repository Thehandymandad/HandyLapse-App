import React from "react";
import { AbsoluteFill, Img, OffthreadVideo, Sequence, staticFile } from "remotion";
import type { CameraState } from "../lib/camera";
import type { Timeline } from "../lib/timeline";
import type { EditProject, ReelStyle } from "../types";

/** Contenitore "camera": prospettiva + trasformazioni 2D/3D + color grading. Tutti i livelli del video lo usano, così restano allineati. */
export const CameraFrame: React.FC<{ cam: CameraState; style: ReelStyle; extraFilter?: string; opacity?: number; children: React.ReactNode }> = ({
  cam,
  style,
  extraFilter,
  opacity,
  children,
}) => {
  const g = style.grade;
  const filter = [
    `brightness(${g.brightness})`,
    `contrast(${g.contrast})`,
    `saturate(${g.saturation * (1 + cam.glitch * 0.6)})`,
    g.warmth > 0 ? `sepia(${(g.warmth * 0.35).toFixed(3)})` : "",
    g.warmth < 0 ? `hue-rotate(${(g.warmth * 12).toFixed(1)}deg)` : "",
    cam.glitch > 0 ? `hue-rotate(${(cam.glitch * 40).toFixed(1)}deg)` : "",
    cam.blur > 0.3 ? `blur(${cam.blur.toFixed(1)}px)` : "",
    extraFilter ?? "",
  ].join(" ");
  return (
    <AbsoluteFill style={{ perspective: style.camera.perspective, overflow: "hidden", opacity }}>
      <AbsoluteFill
        style={{
          transform: `translate(${cam.x}px, ${cam.y}px) rotateX(${cam.rotateX}deg) rotateY(${cam.rotateY}deg) rotateZ(${cam.rotateZ}deg) scale(${cam.scale})`,
          transformOrigin: `${cam.originX * 100}% ${cam.originY * 100}%`,
          filter,
        }}
      >
        {children}
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

/** Video tagliato: un <OffthreadVideo> per segmento. Con `transparent` legge il WebM con alpha della persona. */
export const Segments: React.FC<{ tl: Timeline; project: EditProject; src: string; transparent?: boolean; muted?: boolean }> = ({
  tl,
  project,
  src,
  transparent,
  muted,
}) => (
  <>
    {tl.segments.map((s, i) => (
      <Sequence key={i} from={s.from} durationInFrames={s.frames} premountFor={15} name={`${transparent ? "Persona" : "Clip"} ${i + 1}`}>
        <OffthreadVideo
          src={staticFile(src)}
          trimBefore={s.srcFrom}
          transparent={transparent}
          muted={muted}
          // micro dissolvenza audio sul primo/ultimo frame per evitare click sui tagli
          volume={muted ? 0 : (f) => (f === 0 || f === s.frames - 1 ? 0.45 : 1)}
          style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: `${(project.framingX ?? 0.5) * 100}% 50%` }}
        />
      </Sequence>
    ))}
  </>
);

/** Inquadratura vuota (sfondo senza persona), allineata come il video. */
export const Plate: React.FC<{ project: EditProject }> = ({ project }) =>
  project.source.plate ? (
    <Img
      src={staticFile(project.source.plate)}
      style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: `${(project.framingX ?? 0.5) * 100}% 50%` }}
    />
  ) : null;
