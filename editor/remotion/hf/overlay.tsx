/**
 * Livello grafiche + sottotitoli di un reel, disegnato da HyperFrames.
 * Legge il progetto (reel.json risolto: { project, style }) da <script id="reel-data">, e a ogni hf-seek
 * disegna il fotogramma richiesto con gli STESSI componenti React dello style pack usati da Remotion.
 * Il footage, la camera e il fondo li fa camera.py; qui il fondo è trasparente.
 */
import React from "react";
import { createRoot } from "react-dom/client";
import { flushSync } from "react-dom";
import { Captions } from "../src/components/Captions";
import { GraphicsLayer } from "../src/components/Graphics";
import { buildTimeline } from "../src/lib/timeline";
import { getPack } from "../src/styles";
import type { ReelProps } from "../src/types";
import { AbsoluteFill, ConfigContext, FrameContext } from "./remotion-shim";

const data = JSON.parse(document.getElementById("reel-data")!.textContent!) as ReelProps;
const { project, style } = data;
const tl = buildTimeline(project, style);
const pack = getPack(style.id);
const CaptionsC = pack.Captions ?? Captions;
const config = { fps: tl.fps, width: 1080, height: 1920, durationInFrames: tl.durationInFrames, id: "reel" };

const Overlay: React.FC = () => (
  <AbsoluteFill>
    <GraphicsLayer tl={tl} style={style} pack={pack} />
    <CaptionsC tl={tl} style={style} />
    {pack.Overlay && <pack.Overlay tl={tl} style={style} />}
  </AbsoluteFill>
);

const root = createRoot(document.getElementById("reel-overlay")!);
const draw = (time: number) => {
  const frame = Math.min(tl.durationInFrames - 1, Math.max(0, Math.round(time * tl.fps)));
  flushSync(() =>
    root.render(
      <ConfigContext.Provider value={config}>
        <FrameContext.Provider value={frame}>
          <Overlay />
        </FrameContext.Provider>
      </ConfigContext.Provider>,
    ),
  );
};

window.addEventListener("hf-seek", (e) => draw((e as CustomEvent<{ time: number }>).detail.time));
draw(0);
(window as unknown as { __reel: unknown }).__reel = { durationInFrames: tl.durationInFrames, fps: tl.fps, draw };
