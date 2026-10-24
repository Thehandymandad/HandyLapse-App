import React, { useMemo } from "react";
import { AbsoluteFill } from "remotion";
import { Captions } from "./components/Captions";
import { GraphicsLayer } from "./components/Graphics";
import { AudioLayer, CutFlash, ProgressBar, Vignette } from "./components/Overlays";
import { VideoLayer } from "./components/VideoLayer";
import { useFonts } from "./lib/fonts";
import { buildTimeline } from "./lib/timeline";
import type { ReelProps } from "./types";

export const Reel: React.FC<ReelProps> = ({ project, style }) => {
  const tl = useMemo(() => buildTimeline(project, style), [project, style]);
  useFonts([
    { family: style.captions.fontFamily, weight: style.captions.fontWeight },
    { family: style.motion.fontFamily, weight: 900 },
  ]);
  return (
    <AbsoluteFill style={{ backgroundColor: "#000" }}>
      <VideoLayer tl={tl} project={project} style={style} />
      <Vignette amount={style.grade.vignette} />
      {style.motion.flashOnCut && <CutFlash tl={tl} />}
      <GraphicsLayer tl={tl} style={style} />
      <Captions tl={tl} style={style} />
      <ProgressBar tl={tl} style={style} />
      <AudioLayer tl={tl} project={project} style={style} />
    </AbsoluteFill>
  );
};
