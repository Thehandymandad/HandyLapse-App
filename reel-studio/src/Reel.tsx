import React, { useMemo } from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { Captions } from "./components/Captions";
import { GraphicsLayer } from "./components/Graphics";
import { AudioLayer, CameraFx, ProgressBar, Vignette } from "./components/Overlays";
import { VideoLayer } from "./components/VideoLayer";
import { cameraContext, defaultCamera } from "./lib/camera";
import { useFonts } from "./lib/fonts";
import { buildTimeline } from "./lib/timeline";
import { getPack } from "./styles";
import type { ReelProps } from "./types";

export const Reel: React.FC<ReelProps> = ({ project, style }) => {
  const frame = useCurrentFrame();
  const tl = useMemo(() => buildTimeline(project, style), [project, style]);
  // i componenti dello style pack (camera, sottotitoli, grafiche…) si prendono dall'id dello stile
  const pack = getPack(style.id);
  useFonts([
    { family: style.captions.fontFamily, weight: style.captions.fontWeight },
    { family: style.motion.fontFamily, weight: 900 },
  ]);
  const ctx = cameraContext(frame, tl, style);
  const base = defaultCamera(ctx);
  const cam = pack.camera ? pack.camera(ctx, base) : base;
  const CaptionsC = pack.Captions ?? Captions;
  return (
    <AbsoluteFill style={{ backgroundColor: "#000" }}>
      {pack.Underlay && <pack.Underlay tl={tl} style={style} />}
      <VideoLayer tl={tl} project={project} style={style} cam={cam} />
      <Vignette amount={style.grade.vignette} />
      <CameraFx cam={cam} />
      <GraphicsLayer tl={tl} style={style} pack={pack} />
      <CaptionsC tl={tl} style={style} />
      {pack.Overlay && <pack.Overlay tl={tl} style={style} />}
      <ProgressBar tl={tl} style={style} />
      <AudioLayer tl={tl} project={project} style={style} />
    </AbsoluteFill>
  );
};
