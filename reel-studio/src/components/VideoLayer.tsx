import React from "react";
import { AbsoluteFill, OffthreadVideo, Sequence, staticFile } from "remotion";
import type { CameraState } from "../lib/camera";
import type { Timeline } from "../lib/timeline";
import type { EditProject, ReelStyle } from "../types";

/** Video tagliato: un <OffthreadVideo> per segmento, dentro una "camera" 3D (prospettiva + trasformazioni). */
export const VideoLayer: React.FC<{ tl: Timeline; project: EditProject; style: ReelStyle; cam: CameraState }> = ({ tl, project, style, cam }) => {
  if (!project.source.file) return null;
  const g = style.grade;
  const filter = [
    `brightness(${g.brightness})`,
    `contrast(${g.contrast})`,
    `saturate(${g.saturation * (1 + cam.glitch * 0.6)})`,
    g.warmth > 0 ? `sepia(${(g.warmth * 0.35).toFixed(3)})` : "",
    g.warmth < 0 ? `hue-rotate(${(g.warmth * 12).toFixed(1)}deg)` : "",
    cam.glitch > 0 ? `hue-rotate(${(cam.glitch * 40).toFixed(1)}deg)` : "",
    cam.blur > 0.3 ? `blur(${cam.blur.toFixed(1)}px)` : "",
  ].join(" ");
  const src = staticFile(project.source.file);
  return (
    <AbsoluteFill style={{ perspective: style.camera.perspective, overflow: "hidden" }}>
      <AbsoluteFill
        style={{
          transform: `translate(${cam.x}px, ${cam.y}px) rotateX(${cam.rotateX}deg) rotateY(${cam.rotateY}deg) rotateZ(${cam.rotateZ}deg) scale(${cam.scale})`,
          transformOrigin: `${cam.originX * 100}% ${cam.originY * 100}%`,
          filter,
        }}
      >
        {tl.segments.map((s, i) => (
          <Sequence key={i} from={s.from} durationInFrames={s.frames} premountFor={15} name={`Clip ${i + 1}`}>
            <OffthreadVideo
              src={src}
              trimBefore={s.srcFrom}
              // micro dissolvenza audio sul primo/ultimo frame per evitare click sui tagli
              volume={(f) => (f === 0 || f === s.frames - 1 ? 0.45 : 1)}
              style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: `${(project.framingX ?? 0.5) * 100}% 50%` }}
            />
          </Sequence>
        ))}
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
