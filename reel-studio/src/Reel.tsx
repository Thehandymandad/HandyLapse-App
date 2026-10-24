import React, { useMemo } from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { Captions } from "./components/Captions";
import { GraphicsLayer } from "./components/Graphics";
import { AudioLayer, CameraFx, ProgressBar, Streak, Vignette } from "./components/Overlays";
import { CameraFrame, Plate, Segments } from "./components/VideoLayer";
import { cameraContext, defaultCamera } from "./lib/camera";
import { useFonts } from "./lib/fonts";
import { buildTimeline } from "./lib/timeline";
import { personFxAt } from "./lib/vanish";
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
  const styled = pack.camera ? pack.camera(ctx, base) : base;
  // reinquadratura di base del progetto (sopra a tutti i movimenti di camera)
  const fr = project.framing;
  const cam = fr
    ? {
        ...styled,
        scale: styled.scale * fr.scale,
        y: styled.y + (fr.offsetY ?? 0),
        originX: fr.originX ?? styled.originX,
        originY: fr.originY ?? styled.originY,
      }
    : styled;
  const CaptionsC = pack.Captions ?? Captions;

  // persona ritagliata: serve per grafiche dietro di lei e per farla sparire
  const matte = project.source.matte;
  const fx = matte ? personFxAt(frame, tl) : null;
  const behindActive = tl.graphics.some((g) => g.behind && frame >= g.from && frame < g.from + g.frames);
  const showPerson = !!matte && (behindActive || !!fx);

  return (
    <AbsoluteFill style={{ backgroundColor: "#000" }}>
      {pack.Underlay && <pack.Underlay tl={tl} style={style} />}
      {project.source.file && (
        <CameraFrame cam={cam} style={style}>
          <Segments tl={tl} project={project} src={project.source.file} />
        </CameraFrame>
      )}
      {fx && (
        // sfondo senza persona: inquadratura vuota se c'è, altrimenti il video molto sfocato
        <CameraFrame cam={cam} style={style} extraFilter={project.source.plate ? undefined : "blur(45px) brightness(0.85)"}>
          {project.source.plate ? <Plate project={project} /> : <Segments tl={tl} project={project} src={project.source.file} muted />}
        </CameraFrame>
      )}
      <GraphicsLayer tl={tl} style={style} pack={pack} layer="behind" />
      {showPerson && matte && (
        <CameraFrame cam={fx ? { ...cam, x: cam.x + fx.jitter } : cam} style={style} opacity={fx?.opacity} extraFilter={fx && fx.blur > 0.3 ? `blur(${fx.blur}px)` : undefined}>
          <Segments tl={tl} project={project} src={matte} transparent muted />
        </CameraFrame>
      )}
      <Vignette amount={style.grade.vignette} />
      <CameraFx cam={cam} />
      {fx && fx.streak > 0.01 && <Streak amount={fx.streak} />}
      <GraphicsLayer tl={tl} style={style} pack={pack} />
      <CaptionsC tl={tl} style={style} />
      {pack.Overlay && <pack.Overlay tl={tl} style={style} />}
      <ProgressBar tl={tl} style={style} />
      <AudioLayer tl={tl} project={project} style={style} />
    </AbsoluteFill>
  );
};
