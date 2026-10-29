import React from "react";
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import type { GraphicEvent } from "../../../lib/timeline";
import { logoSvgPath } from "../../references/claude-reel/logo";
import { ANTON, At, Check, clamp, easeInOut, flipIn, Glass, INTER, P, darken } from "./shared";

const LOGO = logoSvgPath();

/**
 * "...nel frattempo Claude sta editando questo video": card con il logo di Claude che gira, barra di avanzamento
 * che corre a 100% e una lista di lavorazioni che si spuntano. A 100% la card si accende (props.doneAt, frame relativo).
 */
export const ClaudeWorking: React.FC<{ g: GraphicEvent }> = ({ g }) => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const tasks = (Array.isArray(g.props?.tasks) ? (g.props!.tasks as string[]) : null) ?? ["Taglio pause", "Sottotitoli", "Zoom & camera", "Grafiche"];
  // props.checkAt: frame in cui si spunta ogni lavorazione (es. quando viene nominata); senza, avanzamento regolare fino a doneAt
  const checkAt = Array.isArray(g.props?.checkAt) ? (g.props!.checkAt as number[]).slice(0, tasks.length) : null;
  const doneAt = checkAt?.length ? checkAt[checkAt.length - 1] : typeof g.props?.doneAt === "number" ? g.props.doneAt : g.frames - 12;
  const a = flipIn(f, g.frames, fps, 5);
  const p = checkAt?.length
    ? interpolate(f, [4, ...checkAt], [0, ...checkAt.map((_, i) => (i + 1) / checkAt.length)], { ...clamp, easing: easeInOut })
    : easeInOut(interpolate(f, [4, doneAt], [0, 1], clamp));
  const done = f >= doneAt;
  const pop = spring({ frame: f - doneAt, fps, config: { damping: 8, stiffness: 300 } });
  const glow = done ? Math.max(0.3, 1 - (f - doneAt) / 12) : 0;
  return (
    <AbsoluteFill>
      <At y={g.y ?? 0.765}>
        <div style={{ ...a }}>
          <div style={{ transform: done ? `scale(${1 + 0.06 * Math.sin(Math.min(1, pop) * Math.PI)})` : undefined }}>
            <Glass width={860} glow={glow}>
              <div style={{ display: "flex", alignItems: "center", gap: 22 }}>
                <svg width={78} height={78} viewBox="0 0 24 24" style={{ transform: `rotate(${f * (done ? 2 : 9)}deg)`, filter: `drop-shadow(0 0 18px rgba(217,119,87,0.7))` }}>
                  <path d={LOGO} fill={P.claude} />
                </svg>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 900, fontSize: 44, lineHeight: 1.05 }}>Claude</div>
                  <div style={{ fontWeight: 700, fontSize: 28, color: P.grey }}>{done ? "Montaggio completato" : "sta montando il tuo reel…"}</div>
                </div>
                <div style={{ fontFamily: ANTON, fontSize: 92, lineHeight: 1, color: done ? P.accent : P.white, fontVariantNumeric: "tabular-nums", width: 230, textAlign: "right" }}>
                  {Math.round(p * 100)}%
                </div>
              </div>
              <div style={{ marginTop: 24, height: 26, borderRadius: 13, background: "rgba(255,255,255,0.1)", overflow: "hidden" }}>
                <div
                  style={{
                    width: `${p * 100}%`,
                    height: "100%",
                    borderRadius: 13,
                    background: `repeating-linear-gradient(115deg, ${P.accent} 0 22px, ${darken(P.accent, 0.22)} 22px 44px)`,
                    backgroundPosition: `${f * 4}px 0`,
                    boxShadow: `0 0 24px ${P.accentDim}`,
                  }}
                />
              </div>
              <div style={{ marginTop: 24, display: "grid", gridTemplateColumns: "1fr 1fr", rowGap: 14, columnGap: 18 }}>
                {tasks.map((t, i) => {
                  const at = checkAt?.[i] ?? Math.round(4 + ((i + 1) / tasks.length) * (doneAt - 4));
                  const on = f >= at - 1;
                  const ck = interpolate(f, [at - 3, at + 4], [0, 1], clamp);
                  return (
                    <div key={i} style={{ display: "flex", alignItems: "center", gap: 14, fontWeight: 800, fontSize: 30, color: on ? P.white : "rgba(255,255,255,0.4)" }}>
                      <div style={{ width: 42, height: 42, borderRadius: 12, background: on ? P.accent : "rgba(255,255,255,0.08)", display: "flex", alignItems: "center", justifyContent: "center", transform: `scale(${1 + 0.2 * Math.sin(ck * Math.PI)})` }}>
                        <Check size={34} p={ck} />
                      </div>
                      {t}
                    </div>
                  );
                })}
              </div>
            </Glass>
          </div>
        </div>
      </At>
    </AbsoluteFill>
  );
};
