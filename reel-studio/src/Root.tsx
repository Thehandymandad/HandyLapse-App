import React from "react";
import { Composition, type CalculateMetadataFunction } from "remotion";
import { Gallery } from "./Gallery";
import { buildTimeline } from "./lib/timeline";
import { PROJECTS } from "./projects.generated";
import { Reel } from "./Reel";
import { resolveStyle } from "./styles";
import type { EditProject, ReelProps } from "./types";

const PLACEHOLDER: EditProject = {
  version: 1,
  name: "vuoto",
  source: { file: "", width: 1080, height: 1920, fps: 30, duration: 3 },
  styleId: "hormozi",
  keep: [],
  cuts: [],
  words: [],
  emphasis: [],
  hook: { text: "Esegui npm run make -- video.mp4", duration: 3 },
  zooms: [],
  graphics: [],
};

const calculateMetadata: CalculateMetadataFunction<ReelProps> = ({ props }) => {
  const tl = buildTimeline(props.project, props.style);
  return { durationInFrames: tl.durationInFrames, fps: props.project.source.fps };
};

const propsFor = (p: EditProject): ReelProps => ({ project: p, style: resolveStyle(p.styleId, p.styleOverrides) });

export const RemotionRoot: React.FC = () => (
  <>
    {/* Usata dallo script di render con --props */}
    <Composition id="Reel" component={Reel} width={1080} height={1920} fps={30} durationInFrames={90} defaultProps={propsFor(PROJECTS[0] ?? PLACEHOLDER)} calculateMetadata={calculateMetadata} />
    {/* Un'anteprima per ogni progetto in projects/ (Remotion Studio) */}
    {PROJECTS.map((p) => (
      <Composition key={p.name} id={`reel-${p.name}`} component={Reel} width={1080} height={1920} fps={p.source.fps} durationInFrames={90} defaultProps={propsFor(p)} calculateMetadata={calculateMetadata} />
    ))}
    {/* Catalogo di icone e oggetti 3D */}
    <Composition id="Gallery" component={Gallery} width={1080} height={1920} fps={30} durationInFrames={120} />
  </>
);
