import React from "react";
import { interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import type { GraphicEvent } from "../../../lib/timeline";
import { C } from "./palette";
import { ClaudeLogo, POPPINS, Rich } from "./shared";

/**
 * CTA finale: card scura "GUIDA GRATUITA" + titolo + sottotitolo + logo, e sotto la pillola bianca
 * "Commenta GUIDA". Reference 23,4 s→fine: entra con uno zoom morbido e resta fino alla fine.
 * props: tag, title (markup [c]…[/c]), subtitle, cta (markup [b]…[/b]).
 */
export const GuideCard: React.FC<{ g: GraphicEvent }> = ({ g }) => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const s = spring({ frame: f, fps, config: { damping: 14, stiffness: 170 } });
  const blur = interpolate(f, [0, 6], [10, 0], { extrapolateRight: "clamp" });
  const tag = String(g.props?.tag ?? "GUIDA GRATUITA");
  const title = String(g.props?.title ?? "Fai montare i tuoi reel a [c]Claude[/c]");
  const subtitle = String(g.props?.subtitle ?? "Passo per passo, dalla ripresa al video finito. Prompt inclusi.");
  const cta = String(g.props?.cta ?? "Commenta [b]GUIDA[/b]");
  return (
    <div
      style={{
        position: "absolute",
        left: 0,
        right: 0,
        top: `${(g.y ?? 0.69) * 100}%`,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        transform: `translateY(-50%) scale(${interpolate(s, [0, 1], [0.7, 1])})`,
        opacity: Math.min(1, s * 1.5),
        filter: blur > 0.3 ? `blur(${blur}px)` : undefined,
        fontFamily: POPPINS,
      }}
    >
      <div
        style={{
          width: 330,
          height: 420,
          background: C.guideBg,
          borderRadius: 18,
          boxShadow: "0 24px 50px rgba(0,0,0,0.5), inset 0 0 0 1.5px rgba(255,255,255,0.1)",
          padding: "26px 24px",
          position: "relative",
          overflow: "hidden",
          color: "#fff",
        }}
      >
        <div style={{ display: "inline-block", background: C.yellow, color: "#141414", fontSize: 17, fontWeight: 800, letterSpacing: 1.2, padding: "6px 12px", borderRadius: 5 }}>{tag}</div>
        <div style={{ fontSize: 41, fontWeight: 800, lineHeight: 1.04, letterSpacing: -1, marginTop: 18 }}>
          <Rich text={title} />
        </div>
        <div style={{ fontSize: 16, lineHeight: 1.35, color: "rgba(255,255,255,0.78)", marginTop: 14 }}>{subtitle}</div>
        <div style={{ position: "absolute", right: 22, bottom: -20 }}>
          <ClaudeLogo size={104} />
        </div>
      </div>
      <div
        style={{
          marginTop: -26,
          background: C.pill,
          borderRadius: 14,
          padding: "11px 28px",
          fontSize: 40,
          fontWeight: 800,
          color: "#141414",
          boxShadow: "0 10px 26px rgba(0,0,0,0.35)",
          transform: `scale(${interpolate(spring({ frame: f - 4, fps, config: { damping: 9, stiffness: 200 } }), [0, 1], [0.6, 1])})`,
        }}
      >
        <Rich text={cta} />
      </div>
    </div>
  );
};
