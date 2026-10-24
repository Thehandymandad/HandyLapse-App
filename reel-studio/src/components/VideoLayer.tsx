import React from "react";
import { AbsoluteFill, OffthreadVideo, Sequence, staticFile, useCurrentFrame } from "remotion";
import { zoomAt, type Timeline } from "../lib/timeline";
import type { EditProject, ReelStyle } from "../types";

/** Video tagliato: un <OffthreadVideo> per ogni segmento tenuto, con zoom, shake e color grading. */
export const VideoLayer: React.FC<{ tl: Timeline; project: EditProject; style: ReelStyle }> = ({ tl, project, style }) => {
  const frame = useCurrentFrame();
  let z = zoomAt(frame, tl, style);
  let sx = 0;
  let sy = 0;
  if (style.zoom.shake) {
    const p = tl.zooms.find((e) => e.kind === "punch" && frame >= e.from && frame < e.from + 8);
    if (p) {
      const k = 1 - (frame - p.from) / 8;
      sx = Math.sin(frame * 3.1) * 14 * k;
      sy = Math.cos(frame * 2.3) * 10 * k;
      z *= 1.03;
    }
  }
  const g = style.grade;
  const filter = [
    `brightness(${g.brightness})`,
    `contrast(${g.contrast})`,
    `saturate(${g.saturation})`,
    g.warmth > 0 ? `sepia(${(g.warmth * 0.35).toFixed(3)})` : "",
    g.warmth < 0 ? `hue-rotate(${(g.warmth * 12).toFixed(1)}deg)` : "",
  ].join(" ");
  if (!project.source.file) return null;
  const src = staticFile(project.source.file);
  return (
    <AbsoluteFill
      style={{
        transform: `translate(${sx}px, ${sy}px) scale(${z})`,
        transformOrigin: `${style.zoom.focusX * 100}% ${style.zoom.focusY * 100}%`,
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
  );
};
