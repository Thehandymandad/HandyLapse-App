import React from "react";
import { AbsoluteFill, Audio, interpolate, Sequence, staticFile, useCurrentFrame } from "remotion";
import type { CameraState } from "../lib/camera";
import type { Timeline } from "../lib/timeline";
import type { EditProject, ReelStyle } from "../types";

export const Vignette: React.FC<{ amount: number }> = ({ amount }) =>
  amount > 0 ? (
    <AbsoluteFill style={{ background: `radial-gradient(ellipse at center, rgba(0,0,0,0) 45%, rgba(0,0,0,${(amount * 0.85).toFixed(3)}) 100%)` }} />
  ) : null;

/** Effetti della camera sopra il video: lampo bianco e glitch (scanline + bande colorate). */
export const CameraFx: React.FC<{ cam: CameraState }> = ({ cam }) => {
  const frame = useCurrentFrame();
  return (
    <>
      {cam.flash > 0.01 && <AbsoluteFill style={{ background: "#fff", opacity: cam.flash }} />}
      {cam.glitch > 0.01 && (
        <AbsoluteFill style={{ opacity: cam.glitch, mixBlendMode: "screen" }}>
          <AbsoluteFill style={{ background: "repeating-linear-gradient(0deg, rgba(255,255,255,0.08) 0 2px, transparent 2px 6px)" }} />
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              style={{
                position: "absolute",
                left: 0,
                right: 0,
                top: `${((frame * 37 + i * 311) % 100).toFixed(0)}%`,
                height: 30 + i * 25,
                background: i === 1 ? "rgba(0,255,255,0.35)" : "rgba(255,0,90,0.35)",
                transform: `translateX(${(i - 1) * 40}px)`,
              }}
            />
          ))}
        </AbsoluteFill>
      )}
    </>
  );
};

export const ProgressBar: React.FC<{ tl: Timeline; style: ReelStyle }> = ({ tl, style }) => {
  const frame = useCurrentFrame();
  if (style.motion.progressBar === "none") return null;
  const top = style.motion.progressBar === "top";
  return (
    <AbsoluteFill>
      <div style={{ position: "absolute", left: 0, right: 0, height: 14, [top ? "top" : "bottom"]: 0, background: "rgba(255,255,255,0.25)" }}>
        <div style={{ height: "100%", width: `${(frame / tl.durationInFrames) * 100}%`, background: style.motion.accentColor }} />
      </div>
    </AbsoluteFill>
  );
};

/** Effetti sonori (generati con ffmpeg in public/sfx) e musica di sottofondo. */
export const AudioLayer: React.FC<{ tl: Timeline; project: EditProject; style: ReelStyle }> = ({ tl, project, style }) => (
  <>
    {tl.sfx.map((s, i) => (
      <Sequence key={i} from={s.from} durationInFrames={Math.round(tl.fps * 1.5)} name={`sfx ${s.name}`}>
        <Audio src={staticFile(`sfx/${s.name}.wav`)} volume={style.audio.sfxVolume} />
      </Sequence>
    ))}
    {project.music?.file && (
      <Audio
        src={staticFile(project.music.file)}
        loop
        volume={(f) =>
          (project.music?.volume ?? style.audio.musicVolume) *
          interpolate(f, [0, 10, tl.durationInFrames - 30, tl.durationInFrames], [0, 1, 1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" })
        }
      />
    )}
  </>
);
