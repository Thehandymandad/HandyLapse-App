import React from "react";
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { Icon } from "../../../icons";
import type { GraphicEvent } from "../../../lib/timeline";
import type { IconName } from "../../../types";
import { At, clamp, fg, flipIn, Glass, INTER, P, rgba } from "./shared";

/**
 * Scheda "a carta d'identità" (dalla referenza): cerchio d'accento con icona che si disegna, etichetta piccola spaziata,
 * titolo grande, barra a segmenti che si riempie; sopra, una pillola grigia (tipo "PRIMA").
 * Va bene per riempire una frase senza un oggetto suo: chi/cosa/quanto.
 * Props (frame relativi): icon, kicker, title, tag, bar (0..1) + barAt, strikeAt (barra rossa sul titolo),
 * title2 + swapAt (il titolo cambia), tag2 (pillola dopo swapAt).
 */
export const IdCard: React.FC<{ g: GraphicEvent }> = ({ g }) => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const p = (g.props ?? {}) as Record<string, unknown>;
  const num = (k: string, d: number | null) => (typeof p[k] === "number" ? (p[k] as number) : d);
  const a = flipIn(f, g.frames, fps, 6);
  const tagIn = spring({ frame: f - 2, fps, config: { damping: 12, stiffness: 240 } });
  const iconP = interpolate(f, [4, 22], [0, 1], { ...clamp, easing: (x) => 1 - (1 - x) ** 3 });
  const bar = num("bar", 0.6)!;
  const barAt = num("barAt", 8)!;
  const fill = bar * spring({ frame: f - barAt, fps, config: { damping: 16, stiffness: 120 } });
  const strikeAt = num("strikeAt", null);
  const strike = strikeAt === null ? 0 : interpolate(f, [strikeAt, strikeAt + 6], [0, 1], { ...clamp, easing: (x) => 1 - (1 - x) ** 3 });
  const swapAt = num("swapAt", null);
  const swapped = swapAt !== null && f >= swapAt;
  const swapPop = swapAt === null ? 1 : spring({ frame: f - swapAt, fps, config: { damping: 9, stiffness: 300 } });
  const title = String((swapped ? p.title2 : p.title) ?? g.text ?? "");
  const tag = String((swapped && p.tag2 ? p.tag2 : p.tag) ?? "");
  const icon = ((p.icon as IconName) ?? "spark") as IconName;
  // segmenti come nella referenza: inchiostro, grigio, accento, vuoto
  const segs = [
    { w: 0.42, c: P.fg },
    { w: 0.22, c: fg(0.22) },
    { w: 0.36, c: P.accent },
  ];
  let acc = 0;
  return (
    <AbsoluteFill>
      <At y={g.y ?? 0.3}>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 30 }}>
          {tag && (
            <div
              style={{
                transform: `scale(${(0.6 + 0.4 * tagIn) * (swapped ? 1 + 0.12 * Math.sin(Math.min(1, swapPop) * Math.PI) : 1)})`,
                opacity: Math.min(1, tagIn * 2) * (1 - a.exit),
                padding: "14px 40px",
                borderRadius: 999,
                background: swapped && p.tag2 ? P.accent : fg(0.09),
                color: swapped && p.tag2 ? P.ink : fg(0.62),
                fontFamily: INTER,
                fontWeight: 900,
                fontSize: 44,
                letterSpacing: 3,
              }}
            >
              {tag}
            </div>
          )}
          <div style={{ ...a, filter: a.filter }}>
            <Glass width={860} style={{ padding: "36px 40px 40px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 34 }}>
                <div style={{ width: 132, height: 132, flexShrink: 0, borderRadius: 66, background: P.accent, display: "flex", alignItems: "center", justifyContent: "center", boxShadow: `0 10px 30px ${rgba(P.accent, 0.35)}` }}>
                  <Icon name={icon} size={70} color={P.ink} strokeWidth={2.2} progress={iconP} />
                </div>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontWeight: 800, fontSize: 28, letterSpacing: "0.22em", color: fg(0.45), textTransform: "uppercase" }}>{String(p.kicker ?? "")}</div>
                  <div style={{ position: "relative", display: "inline-block", marginTop: 6 }}>
                    <div
                      style={{
                        fontWeight: 900,
                        fontSize: 66,
                        lineHeight: 1.0,
                        letterSpacing: "-0.035em",
                        color: strike > 0 ? fg(1 - 0.45 * strike) : P.fg,
                        transform: swapped ? `scale(${0.7 + 0.3 * swapPop})` : undefined,
                        transformOrigin: "0% 50%",
                      }}
                    >
                      {title}
                    </div>
                    {strike > 0 && <div style={{ position: "absolute", left: -6, top: "52%", height: 9, width: `calc(${strike * 100}% + 12px)`, background: P.red, borderRadius: 5, transform: "rotate(-2deg)" }} />}
                  </div>
                </div>
              </div>
              <div style={{ marginTop: 30, height: 40, borderRadius: 10, background: fg(0.06), display: "flex", overflow: "hidden", gap: 8 }}>
                {segs.map((s, i) => {
                  const from = acc;
                  acc += s.w;
                  const w = Math.max(0, Math.min(s.w, fill - from));
                  return w > 0 ? <div key={i} style={{ width: `${w * 100}%`, height: "100%", background: s.c, borderRadius: 8 }} /> : null;
                })}
              </div>
            </Glass>
          </div>
        </div>
      </At>
    </AbsoluteFill>
  );
};
