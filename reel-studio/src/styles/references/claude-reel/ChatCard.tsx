import React from "react";
import { interpolate, useCurrentFrame } from "remotion";
import type { GraphicEvent } from "../../../lib/timeline";
import { C } from "./palette";
import { cardInOut, ClaudeLogo, POPPINS } from "./shared";

/**
 * Card della chat di Claude: il prompt viene scritto lettera per lettera, inviato (diventa un fumetto in alto
 * a destra) e Claude "pensa" (tre puntini). Con props.morph la card nasce dalla card timeline scura.
 * Misure reference: 700x330 px, centro y≈64,6%.
 */
const W = 700;
const H = 330;
const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;

function mix(a: string, b: string, t: number) {
  const pa = a.match(/\w\w/g)!.map((h) => parseInt(h, 16));
  const pb = b.match(/\w\w/g)!.map((h) => parseInt(h, 16));
  return `rgb(${pa.map((v, i) => Math.round(v + (pb[i] - v) * t)).join(",")})`;
}

export const ChatCard: React.FC<{ g: GraphicEvent }> = ({ g }) => {
  const f = useCurrentFrame();
  const morph = !!g.props?.morph;
  const base = cardInOut(f, g.frames, 8, 9);
  // trasformazione dalla card precedente: visibile e nitida dal primo frame, cambia solo colore e contenuto
  const io = morph ? { opacity: 1 - base.out, scale: 1 + base.out * 0.06, blur: base.out * 16, out: base.out } : base;
  const p = f / Math.max(1, g.frames);
  const prompt = g.text ?? "Edita questo video!";
  const sendAt = typeof g.props?.sendAt === "number" ? g.props.sendAt : 0.5;
  const typed = Math.round(interpolate(p, [0.06, sendAt - 0.06], [0, prompt.length], clamp));
  const sent = p >= sendAt;
  const bubble = interpolate(p, [sendAt, sendAt + 0.06], [0, 1], clamp);
  const thinking = p > sendAt + 0.1;
  const caret = Math.floor(f / 8) % 2 === 0;
  const bg = morph ? mix("141012", "FAFAF8", interpolate(f, [0, 7], [0, 1], clamp)) : C.chatBg;
  const content = morph ? interpolate(f, [4, 9], [0, 1], clamp) : 1;
  const press = sent ? interpolate(p, [sendAt, sendAt + 0.03, sendAt + 0.06], [1, 0.85, 1], clamp) : 1;

  return (
    <div style={{ position: "absolute", left: 0, right: 0, top: `${(g.y ?? 0.646) * 100}%`, display: "flex", justifyContent: "center", transform: "translateY(-50%)" }}>
      <div
        style={{
          width: W,
          height: H,
          background: bg,
          borderRadius: 24,
          boxShadow: "0 30px 60px rgba(0,0,0,0.35)",
          opacity: io.opacity,
          transform: `scale(${io.scale})`,
          filter: io.blur > 0.3 ? `blur(${io.blur}px)` : undefined,
          position: "relative",
          overflow: "hidden",
          fontFamily: POPPINS,
          color: C.chatText,
        }}
      >
        <div style={{ opacity: content }}>
          <div style={{ position: "absolute", left: 24, top: 20, display: "flex", alignItems: "center", gap: 10, fontSize: 26, fontWeight: 700 }}>
            <ClaudeLogo size={26} />
            Claude
          </div>
          {sent && (
            <div
              style={{
                position: "absolute",
                right: 26,
                top: 92,
                background: C.bubble,
                borderRadius: 14,
                padding: "10px 18px",
                fontSize: 22,
                fontWeight: 600,
                opacity: bubble,
                transform: `translateY(${(1 - bubble) * 120}px)`,
              }}
            >
              {prompt}
            </div>
          )}
          {thinking && (
            <div style={{ position: "absolute", left: 26, top: 150, display: "flex", alignItems: "center", gap: 10 }}>
              <ClaudeLogo size={24} rotate={f * 6} />
              {[0, 1, 2].map((i) => (
                <div key={i} style={{ width: 9, height: 9, borderRadius: 5, background: C.logo, opacity: 0.35 + 0.65 * Math.max(0, Math.sin((f - i * 4) / 4)) }} />
              ))}
            </div>
          )}
          <div
            style={{
              position: "absolute",
              left: 18,
              right: 18,
              bottom: 18,
              height: 64,
              borderRadius: 14,
              border: "1.5px solid #E6E2DC",
              background: "#FFFFFF",
              display: "flex",
              alignItems: "center",
              padding: "0 12px 0 20px",
              fontSize: 26,
              fontWeight: 500,
            }}
          >
            <span style={{ flex: 1, whiteSpace: "nowrap" }}>
              {sent ? "" : prompt.slice(0, typed)}
              {!sent && caret && <span style={{ display: "inline-block", width: 2.5, height: 30, background: "#222", marginLeft: 2, verticalAlign: "middle" }} />}
            </span>
            <div style={{ width: 42, height: 42, borderRadius: 10, background: C.send, display: "flex", alignItems: "center", justifyContent: "center", transform: `scale(${press})` }}>
              <svg width={24} height={24} viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 19V5M5 12l7-7 7 7" />
              </svg>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
