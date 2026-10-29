import React from "react";
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import type { GraphicEvent } from "../../../lib/timeline";
import { ANTON, At, clamp, INTER, P } from "./shared";

/**
 * "Ti ho scritto una guida gratuita": la copertina della guida (PDF) cade inclinata in 3D e fluttua,
 * con un riflesso che la attraversa e il bollino "GRATIS" che sbatte sopra (props.freeAt).
 * props.tag, props.title (\n per andare a capo), props.subtitle, props.footer.
 */
export const GuideBook: React.FC<{ g: GraphicEvent }> = ({ g }) => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const freeAt = typeof g.props?.freeAt === "number" ? g.props.freeAt : 10;
  const e = spring({ frame: f, fps, config: { damping: 12, stiffness: 150, mass: 0.9 } });
  const out = interpolate(f, [g.frames - 7, g.frames], [0, 1], clamp);
  const free = spring({ frame: f - freeAt, fps, config: { damping: 8, stiffness: 320 } });
  const shine = interpolate((f % 45) / 45, [0, 1], [-120, 220]);
  const title = ((g.props?.title as string) ?? "IL MIO EDITOR\nDI REEL").split("\n");
  return (
    <AbsoluteFill>
      <At y={g.y ?? 0.775}>
        <div style={{ perspective: 1400, opacity: Math.min(1, e * 1.5) * (1 - out), filter: out > 0 ? `blur(${out * 12}px)` : undefined }}>
          <div
            style={{
              position: "relative",
              width: 400,
              height: 500,
              transform: `translateY(${(1 - e) * -500 + Math.sin(f / 12) * 10}px) rotateY(${-22 + (1 - e) * 60 + Math.sin(f / 20) * 6}deg) rotateX(${8 + (1 - e) * 30}deg) rotateZ(${(1 - e) * -20}deg) scale(${1 + out * 0.15})`,
              transformStyle: "preserve-3d",
            }}
          >
            {/* spessore delle pagine */}
            <div style={{ position: "absolute", inset: 0, transform: "translateZ(-26px) translateX(14px)", borderRadius: "10px 26px 26px 10px", background: "linear-gradient(90deg, #d9dbe0, #ffffff 30%, #cfd2d8)", boxShadow: "0 50px 90px rgba(0,0,0,0.6)" }} />
            <div
              style={{
                position: "absolute",
                inset: 0,
                borderRadius: "10px 26px 26px 10px",
                background: `linear-gradient(160deg, #15171d 0%, ${P.ink} 60%)`,
                border: `3px solid ${P.lime}`,
                overflow: "hidden",
                padding: 36,
                boxSizing: "border-box",
                display: "flex",
                flexDirection: "column",
                color: P.white,
              }}
            >
              <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: 18, background: P.lime }} />
              <div style={{ alignSelf: "flex-start", fontFamily: INTER, fontWeight: 900, fontSize: 24, letterSpacing: 3, color: P.ink, background: P.lime, padding: "6px 14px", borderRadius: 8, marginLeft: 10 }}>
                {(g.props?.tag as string) ?? "GUIDA GRATUITA"}
              </div>
              <div style={{ marginTop: 34, marginLeft: 10, fontFamily: ANTON, fontSize: 82, lineHeight: 0.98 }}>
                {title.map((l, i) => (
                  <div key={i} style={{ color: i === title.length - 1 ? P.lime : P.white }}>{l}</div>
                ))}
              </div>
              <div style={{ marginTop: 18, marginLeft: 10, fontFamily: INTER, fontWeight: 700, fontSize: 26, color: "rgba(255,255,255,0.7)" }}>
                {(g.props?.subtitle as string) ?? "Come l'ho costruito, passo per passo"}
              </div>
              <div style={{ marginTop: "auto", marginLeft: 10, display: "flex", alignItems: "center", gap: 12, fontFamily: INTER, fontWeight: 900, fontSize: 24, color: P.grey }}>
                <span style={{ border: `2px solid ${P.grey}`, borderRadius: 6, padding: "2px 8px" }}>PDF</span>
                {(g.props?.footer as string) ?? "CLAUDE CODE · HYPERFRAMES"}
              </div>
              <div style={{ position: "absolute", top: -100, bottom: -100, left: shine, width: 80, background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.18), transparent)", transform: "rotate(18deg)" }} />
            </div>
            {f >= freeAt && (
              <div
                style={{
                  position: "absolute",
                  right: -70,
                  top: -60,
                  width: 190,
                  height: 190,
                  borderRadius: "50%",
                  background: P.red,
                  color: P.white,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontFamily: ANTON,
                  fontSize: 58,
                  transform: `translateZ(40px) rotate(14deg) scale(${f - freeAt < 4 ? 2.2 - 1.2 * ((f - freeAt) / 4) : 1 + 0.08 * (1 - free)})`,
                  boxShadow: "0 20px 40px rgba(0,0,0,0.5)",
                  border: "6px dashed rgba(255,255,255,0.6)",
                }}
              >
                GRATIS
              </div>
            )}
          </div>
        </div>
      </At>
    </AbsoluteFill>
  );
};
