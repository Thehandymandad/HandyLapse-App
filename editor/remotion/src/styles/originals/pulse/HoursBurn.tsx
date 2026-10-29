import React from "react";
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import type { GraphicEvent } from "../../../lib/timeline";
import { ANTON, At, clamp, flipIn, INTER, P } from "./shared";

/**
 * "...ci perdete ORE": orologio con le lancette che girano all'impazzata e un contatore di ore/minuti che vola,
 * con un colpo di scala quando si dice "ore" (props.hitAt, frame relativo). Ore finali in props.hours.
 */
export const HoursBurn: React.FC<{ g: GraphicEvent }> = ({ g }) => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const hitAt = typeof g.props?.hitAt === "number" ? g.props.hitAt : 18;
  const hours = typeof g.props?.hours === "number" ? g.props.hours : 6;
  const a = flipIn(f, g.frames, fps);
  // tempo che passa sempre più veloce
  const t = interpolate(f, [0, g.frames - 6], [0, 1], clamp);
  const minutesTot = Math.pow(t, 1.6) * (hours * 60 + 47);
  const h = Math.floor(minutesTot / 60);
  const m = Math.floor(minutesTot % 60);
  const minuteAngle = minutesTot * 6;
  const hourAngle = minutesTot * 0.5;
  const hit = spring({ frame: f - hitAt, fps, config: { damping: 7, stiffness: 300 } });
  const kick = f >= hitAt ? 1 + 0.18 * Math.sin(hit * Math.PI) : 1;
  const hot = interpolate(f, [hitAt - 2, hitAt + 6], [0, 1], clamp);
  const R = 118;
  return (
    <AbsoluteFill>
      <At y={g.y ?? 0.765}>
        <div style={{ ...a, display: "flex", alignItems: "center", gap: 40 }}>
          <svg width={R * 2 + 20} height={R * 2 + 20} viewBox={`${-R - 10} ${-R - 10} ${R * 2 + 20} ${R * 2 + 20}`} style={{ filter: `drop-shadow(0 20px 40px rgba(0,0,0,0.6)) drop-shadow(0 0 ${30 * hot}px ${P.accentDim})` }}>
            <circle r={R} fill={P.glass} stroke={P.accent} strokeWidth={8} />
            {Array.from({ length: 12 }, (_, i) => {
              const an = (i / 12) * Math.PI * 2;
              return <line key={i} x1={Math.sin(an) * (R - 18)} y1={-Math.cos(an) * (R - 18)} x2={Math.sin(an) * (R - (i % 3 ? 30 : 42))} y2={-Math.cos(an) * (R - (i % 3 ? 30 : 42))} stroke="white" strokeWidth={i % 3 ? 4 : 7} strokeLinecap="round" />;
            })}
            {/* scia della lancetta dei minuti */}
            {[0.6, 0.35, 0.15].map((o, k) => (
              <line key={k} x1={0} y1={0} x2={0} y2={-(R - 30)} stroke={P.accent} strokeWidth={9} strokeLinecap="round" opacity={o * 0.6} transform={`rotate(${minuteAngle - (k + 1) * 14 * t})`} />
            ))}
            <line x1={0} y1={0} x2={0} y2={-(R - 62)} stroke="white" strokeWidth={14} strokeLinecap="round" transform={`rotate(${hourAngle})`} />
            <line x1={0} y1={0} x2={0} y2={-(R - 30)} stroke={P.accent} strokeWidth={9} strokeLinecap="round" transform={`rotate(${minuteAngle})`} />
            <circle r={13} fill={P.accent} />
          </svg>
          <div style={{ transform: `scale(${kick})`, transformOrigin: "left center" }}>
            <div style={{ whiteSpace: "nowrap", fontFamily: ANTON, fontSize: 160, lineHeight: 0.95, color: P.white, fontVariantNumeric: "tabular-nums", textShadow: "0 10px 40px rgba(0,0,0,0.6)" }}>
              {h}
              <span style={{ color: P.accent }}>H</span> {String(m).padStart(2, "0")}
              <span style={{ color: P.accent }}>M</span>
            </div>
            <div style={{ whiteSpace: "nowrap", fontFamily: INTER, fontWeight: 900, fontSize: 34, letterSpacing: 3, color: P.ink, background: P.accent, display: "inline-block", padding: "6px 16px", borderRadius: 10, marginTop: 6, transform: "rotate(-2deg)" }}>
              {(g.props?.label as string) ?? "BUTTATE SULLA TIMELINE"}
            </div>
          </div>
        </div>
      </At>
    </AbsoluteFill>
  );
};
