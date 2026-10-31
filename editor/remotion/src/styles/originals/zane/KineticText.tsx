import React from "react";
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import type { GraphicEvent } from "../../../lib/timeline";
import { breathe, EXIT_FRAMES, exitPull, STAGGER } from "../../../motion/bouncy";
import { clamp, INTER, P, rgba } from "../pulse/shared";
import { ENTRIES, KWord, parseRuns, type Entry } from "./text";

/**
 * "ktext": testo cinetico a schermo ("MOTION *graphics*", "*finally,*", "Advanced *B-roll*").
 * props: text (con *accento* e \n), entry (pop|drop|sticker|wipe|type|led|flap|roll; se manca ruota lungo il video),
 * size (px della parola principale, default 150), wordAt (frame relativo d'inizio di ogni parola, per agganciarle al
 * parlato; default sfalsate di 4), giant (true o testo: parola gigante sfocata dietro, come texture),
 * curve (curva di easing disegnata sotto), cursor (cursore che lampeggia con entry "type").
 * Esce con la rincorsa del README (anticipo all'indietro, poi via in alto).
 */
export const KineticText: React.FC<{ g: GraphicEvent }> = ({ g }) => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const pr = g.props ?? {};
  const text = typeof pr.text === "string" ? pr.text : g.text ?? "";
  const lines = parseRuns(text);
  const entry: Entry = ENTRIES.includes(pr.entry as Entry) ? (pr.entry as Entry) : ENTRIES[Math.abs(Math.round(g.from / 7)) % ENTRIES.length];
  const size = typeof pr.size === "number" ? pr.size : 150;
  const wordAt = Array.isArray(pr.wordAt) ? (pr.wordAt as number[]) : null;
  const exitFrom = g.frames - EXIT_FRAMES;
  const pull = exitPull(f, exitFrom);
  const fade = interpolate(f, [g.frames - 3, g.frames], [1, 0], clamp);
  const giant = pr.giant ? (typeof pr.giant === "string" ? pr.giant : lines.flat().filter((r) => !r.accent).map((r) => r.text).join(" ")) : null;
  let wi = 0;
  return (
    <AbsoluteFill style={{ opacity: fade }}>
      {giant && (
        <div
          style={{
            position: "absolute",
            left: "50%",
            top: `${(g.y ?? 0.32) * 100}%`,
            transform: `translate(-50%, -50%) translateX(${(Math.sin(f / 40) * 30).toFixed(1)}px) scale(${breathe(f, 0.02)})`,
            fontFamily: INTER,
            fontWeight: 900,
            fontSize: size * 3.2,
            letterSpacing: "-0.06em",
            color: "rgba(255,255,255,0.07)",
            filter: "blur(10px)",
            whiteSpace: "nowrap",
          }}
        >
          {giant}
        </div>
      )}
      <div
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          top: `${(g.y ?? 0.32) * 100}%`,
          transform: `translateY(-50%) translateY(${(pull * -1100).toFixed(1)}px) scale(${(g.scale ?? 1) * (1 + Math.max(0, -pull) * 0.5)})`,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: size * 0.02,
        }}
      >
        {lines.map((line, li) => (
          <div key={li} style={{ display: "flex", alignItems: "baseline", justifyContent: "center", columnGap: size * 0.22, flexWrap: "wrap", lineHeight: 1 }}>
            {line.map((run, ri) => {
              const k = wi++;
              const start = wordAt?.[k] ?? k * STAGGER.word * (entry === "type" ? 3 : 1);
              const last = li === lines.length - 1 && ri === line.length - 1;
              return <KWord key={ri} run={run} f={f} start={start} fps={fps} entry={entry} size={size} seed={g.from + k} cursor={last && pr.cursor !== false} />;
            })}
          </div>
        ))}
        {pr.curve ? <EaseCurve f={f} width={size * 4.2} /> : null}
      </div>
    </AbsoluteFill>
  );
};

/** La curva di easing con overshoot disegnata sotto il testo, con un punto che la percorre (decorazione). */
const EaseCurve: React.FC<{ f: number; width: number }> = ({ f, width }) => {
  const h = width * 0.22;
  const p = interpolate(f, [6, 26], [0, 1], { ...clamp, easing: (t) => 1 - Math.pow(1 - t, 3) });
  // una cubica: parte bassa a sinistra, sale oltre il bersaglio e si assesta (la forma di una molla)
  const P0 = [0, h];
  const P1 = [width * 0.45, h];
  const P2 = [width * 0.5, -h * 0.4];
  const P3 = [width, h * 0.1];
  const at = (t: number) => {
    const u = 1 - t;
    return [0, 1].map((k) => u * u * u * P0[k] + 3 * u * u * t * P1[k] + 3 * u * t * t * P2[k] + t * t * t * P3[k]);
  };
  const [dx, dy] = at(p);
  return (
    <svg width={width} height={h * 1.5} viewBox={`-10 ${-h * 0.4} ${width + 20} ${h * 1.5}`} style={{ marginTop: width * 0.03, overflow: "visible" }}>
      <line x1={0} y1={h} x2={width} y2={h} stroke="rgba(255,255,255,0.14)" strokeWidth={2} strokeDasharray="6 8" />
      <path
        d={`M ${P0} C ${P1} ${P2} ${P3}`}
        fill="none"
        stroke={P.accent}
        strokeWidth={5}
        strokeLinecap="round"
        pathLength={1}
        strokeDasharray={1}
        strokeDashoffset={1 - p}
        style={{ filter: `drop-shadow(0 0 10px ${rgba(P.accent, 0.8)})` }}
      />
      {p > 0.02 && <circle cx={dx} cy={dy} r={9} fill={P.accent} style={{ filter: `drop-shadow(0 0 10px ${rgba(P.accent, 0.9)})` }} />}
    </svg>
  );
};
