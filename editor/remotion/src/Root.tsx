import React from "react";
import { Composition, type CalculateMetadataFunction } from "remotion";
import { Gallery } from "./Gallery";
import { buildTimeline } from "./lib/timeline";
import { Reel } from "./Reel";
import { resolveStyle } from "./styles";
import type { EditProject, ReelProps } from "./types";

const PLACEHOLDER: EditProject = {
  version: 1,
  name: "vuoto",
  source: { file: "", width: 1080, height: 1920, fps: 30, duration: 3 },
  styleId: "pulse",
  keep: [],
  cuts: [],
  words: [],
  emphasis: [],
  hook: null,
  zooms: [],
  graphics: [],
};

const calculateMetadata: CalculateMetadataFunction<ReelProps> = ({ props }) => {
  const tl = buildTimeline(props.project, props.style);
  return { durationInFrames: tl.durationInFrames, fps: props.project.source.fps };
};

export const RemotionRoot: React.FC = () => (
  <>
    {/* Il progetto arriva da scripts/render.ts (edit/reel.json) come inputProps */}
    <Composition
      id="Reel"
      component={Reel}
      width={1080}
      height={1920}
      fps={30}
      durationInFrames={90}
      defaultProps={{ project: PLACEHOLDER, style: resolveStyle("pulse") }}
      calculateMetadata={calculateMetadata}
    />
    {/* Catalogo di icone e oggetti 3D */}
    <Composition id="Gallery" component={Gallery} width={1080} height={1920} fps={30} durationInFrames={120} />
  </>
);
