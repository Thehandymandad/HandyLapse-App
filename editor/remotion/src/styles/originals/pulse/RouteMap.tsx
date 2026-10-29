import React from "react";
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import type { GraphicEvent } from "../../../lib/timeline";
import { ANTON, At, clamp, easeInOut, flipIn, Glass, INTER, P, fg } from "./shared";

/**
 * "Sto guidando… sto andando al lavoro": mini navigatore. Il percorso si disegna in accento, l'auto lo segue
 * e arriva al pin di destinazione quando lo si nomina (props.arriveAt, frame relativo). props.to = etichetta del pin.
 */
const W = 860;
const H = 330;
const ROUTE: [number, number][] = [
  [70, 290], [190, 290], [245, 235], [400, 235], [450, 185], [560, 185], [605, 140], [760, 140],
];
const SEG = ROUTE.slice(1).map((p, i) => Math.hypot(p[0] - ROUTE[i][0], p[1] - ROUTE[i][1]));
const LEN = SEG.reduce((a, b) => a + b, 0);

function pointAt(d: number) {
  let rest = Math.max(0, Math.min(LEN, d));
  for (let i = 0; i < SEG.length; i++) {
    if (rest <= SEG[i] || i === SEG.length - 1) {
      const [x0, y0] = ROUTE[i];
      const [x1, y1] = ROUTE[i + 1];
      const t = SEG[i] ? rest / SEG[i] : 0;
      return { x: x0 + (x1 - x0) * t, y: y0 + (y1 - y0) * t, angle: (Math.atan2(y1 - y0, x1 - x0) * 180) / Math.PI };
    }
    rest -= SEG[i];
  }
  return { x: ROUTE[0][0], y: ROUTE[0][1], angle: 0 };
}

// strade di sfondo (fisse)
const STREETS = [
  "M0 60 H860", "M0 180 H860", "M0 300 H860", "M120 0 V330", "M330 0 V330", "M520 0 V330", "M700 0 V330",
  "M0 330 L300 0", "M500 330 L860 40",
];

export const RouteMap: React.FC<{ g: GraphicEvent }> = ({ g }) => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const arriveAt = typeof g.props?.arriveAt === "number" ? g.props.arriveAt : g.frames - 20;
  const a = flipIn(f, g.frames, fps);
  const p = easeInOut(interpolate(f, [6, arriveAt], [0, 1], clamp));
  const car = pointAt(p * LEN);
  // smussa la rotazione dell'auto in curva
  const ahead = pointAt(p * LEN + 30);
  const behind = pointAt(p * LEN - 30);
  const angle = (Math.atan2(ahead.y - behind.y, ahead.x - behind.x) * 180) / Math.PI;
  const pinDrop = spring({ frame: f - 4, fps, config: { damping: 9, stiffness: 220 } });
  const arrived = spring({ frame: f - arriveAt, fps, config: { damping: 8, stiffness: 260 } });
  const ring = f >= arriveAt ? interpolate(f - arriveAt, [0, 18], [0, 1], clamp) : 0;
  const eta = Math.max(0, Math.round(14 * (1 - p)));
  const kmh = Math.round(48 + Math.sin(f / 7) * 9 + p * 12);
  const path = "M" + ROUTE.map((q) => q.join(" ")).join(" L");
  const end = ROUTE[ROUTE.length - 1];
  return (
    <AbsoluteFill>
      <At y={g.y ?? 0.765}>
        <div style={{ ...a }}>
          <Glass width={W + 40} style={{ padding: 20 }} glow={f >= arriveAt ? 1 - ring * 0.6 : 0}>
            <div style={{ position: "relative", width: W, height: H, borderRadius: 26, overflow: "hidden", background: "#121419" }}>
              <svg width={W} height={H} style={{ position: "absolute", inset: 0 }}>
                {STREETS.map((d, i) => (
                  <path key={i} d={d} stroke={fg(0.07)} strokeWidth={i < 3 ? 16 : 10} fill="none" />
                ))}
                <path d={path} stroke={fg(0.18)} strokeWidth={14} fill="none" strokeLinejoin="round" strokeLinecap="round" />
                <path d={path} stroke={P.accent} strokeWidth={14} fill="none" strokeLinejoin="round" strokeLinecap="round" strokeDasharray={LEN} strokeDashoffset={LEN * (1 - p)} style={{ filter: `drop-shadow(0 0 10px ${P.accent})` }} />
                <circle cx={ROUTE[0][0]} cy={ROUTE[0][1]} r={14} fill={P.fg} stroke={P.ink} strokeWidth={5} />
                {ring > 0 && <circle cx={end[0]} cy={end[1]} r={20 + ring * 70} fill="none" stroke={P.accent} strokeWidth={5} opacity={1 - ring} />}
                {/* auto vista dall'alto */}
                <g transform={`translate(${car.x} ${car.y}) rotate(${angle})`}>
                  <rect x={-30} y={-17} width={60} height={34} rx={11} fill={P.accent} style={{ filter: `drop-shadow(0 0 14px ${P.accent})` }} />
                  <rect x={4} y={-12} width={14} height={24} rx={4} fill={P.ink} opacity={0.85} />
                  <rect x={-22} y={-12} width={10} height={24} rx={3} fill={P.ink} opacity={0.6} />
                </g>
              </svg>
              {/* pin destinazione */}
              <div
                style={{
                  position: "absolute",
                  left: end[0],
                  top: end[1],
                  transform: `translate(-50%, -100%) translateY(${(1 - pinDrop) * -120}px) scale(${1 + 0.25 * Math.sin(Math.min(1, arrived) * Math.PI)})`,
                  transformOrigin: "50% 100%",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                }}
              >
                <div style={{ fontFamily: INTER, fontWeight: 900, fontSize: 26, letterSpacing: 2, color: f >= arriveAt ? P.ink : P.white, background: f >= arriveAt ? P.accent : P.ink, padding: "6px 14px", borderRadius: 10, marginBottom: 6, border: `2px solid ${P.accent}` }}>
                  {((g.props?.to as string) ?? "LAVORO").toUpperCase()}
                </div>
                <svg width={46} height={56} viewBox="0 0 24 30">
                  <path d="M12 29s10-10 10-17A10 10 0 0 0 2 12c0 7 10 17 10 17z" fill={P.accent} stroke={P.ink} strokeWidth={1.5} />
                  <circle cx={12} cy={12} r={4} fill={P.ink} />
                </svg>
              </div>
              {/* HUD del navigatore */}
              <div style={{ position: "absolute", left: 22, top: 18, display: "flex", gap: 12, alignItems: "baseline", fontFamily: INTER, fontWeight: 800 }}>
                <span style={{ fontFamily: ANTON, fontSize: 64, color: P.fg, lineHeight: 1 }}>{eta}</span>
                <span style={{ fontSize: 26, color: P.grey }}>MIN</span>
              </div>
              <div style={{ position: "absolute", right: 22, bottom: 18, fontFamily: INTER, fontWeight: 900, fontSize: 26, color: P.ink, background: P.white, padding: "6px 14px", borderRadius: 12, fontVariantNumeric: "tabular-nums" }}>
                {kmh} km/h
              </div>
            </div>
          </Glass>
        </div>
      </At>
    </AbsoluteFill>
  );
};
