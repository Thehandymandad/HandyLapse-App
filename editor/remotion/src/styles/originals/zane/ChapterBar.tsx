import React from "react";
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import type { GraphicEvent } from "../../../lib/timeline";
import { bounce, BOUNCE_SNAP, EXIT_FRAMES, exitPull, LAND, squash } from "../../../motion/bouncy";
import { clamp, INTER, MONO, P, rgba } from "../pulse/shared";

/**
 * "chapter": barra del capitolo fissa in alto ("02  Motion graphics  ▬▬▬▬▬"): dice sempre dove si è nel video.
 * props: n (numero del capitolo), title, total (capitoli in tutto, default 5). Le tacche fino al capitolo corrente
 * sono accese, quella corrente si riempie mentre entra. Va messa per tutta la durata del capitolo.
 */
export const ChapterBar: React.FC<{ g: GraphicEvent }> = ({ g }) => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const pr = g.props ?? {};
  const n = typeof pr.n === "number" ? pr.n : 1;
  const total = typeof pr.total === "number" ? pr.total : 5;
  const title = typeof pr.title === "string" ? pr.title : g.text ?? "";
  const s = bounce(f, fps, BOUNCE_SNAP);
  const q = squash(f, LAND, true);
  const pull = exitPull(f, g.frames - EXIT_FRAMES);
  const fill = interpolate(f, [6, 22], [0, 1], clamp);
  return (
    <AbsoluteFill>
      <div
        style={{
          position: "absolute",
          left: "50%",
          top: `${(g.y ?? 0.145) * 100}%`,
          transform: `translate(-50%, -50%) translateY(${((1 - s) * -120 + pull * -400).toFixed(1)}px) scale(${q.sx.toFixed(3)}, ${q.sy.toFixed(3)})`,
          opacity: Math.min(1, f / 3) * interpolate(f, [g.frames - 3, g.frames], [1, 0], clamp),
          display: "flex",
          alignItems: "center",
          gap: 22,
          padding: "16px 26px",
          borderRadius: 999,
          background: P.glass,
          boxShadow: P.cardShadow,
          border: `1.5px solid ${rgba(P.accent, 0.2)}`,
          whiteSpace: "nowrap",
        }}
      >
        <span style={{ fontFamily: MONO, fontWeight: 700, fontSize: 30, color: P.accent, textShadow: `0 0 12px ${rgba(P.accent, 0.7)}` }}>{String(n).padStart(2, "0")}</span>
        <span style={{ fontFamily: INTER, fontWeight: 700, fontSize: 34, color: "#FFFFFF", letterSpacing: "-0.01em" }}>{title}</span>
        <span style={{ display: "flex", gap: 7, marginLeft: 8 }}>
          {Array.from({ length: total }, (_, i) => {
            const k = i + 1 < n ? 1 : i + 1 === n ? fill : 0;
            return (
              <span key={i} style={{ position: "relative", width: 34, height: 7, borderRadius: 4, background: "rgba(255,255,255,0.14)", overflow: "hidden" }}>
                <span style={{ position: "absolute", inset: 0, width: `${k * 100}%`, background: P.accent, boxShadow: `0 0 10px ${rgba(P.accent, 0.8)}` }} />
              </span>
            );
          })}
        </span>
      </div>
    </AbsoluteFill>
  );
};
