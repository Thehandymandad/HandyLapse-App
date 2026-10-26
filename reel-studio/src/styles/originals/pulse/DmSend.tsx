import React from "react";
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import type { GraphicEvent } from "../../../lib/timeline";
import { At, clamp, flipIn, Glass, INTER, P } from "./shared";

/**
 * CTA "scrivetemi EDITING in DM": una chat in cui la parola si scrive da sola (props.typeAt), parte con l'aeroplanino
 * (props.sendAt) e arriva la risposta (props.replyAt, props.reply). Frame relativi all'inizio della grafica.
 */
const Plane: React.FC<{ size: number; color: string }> = ({ size, color }) => (
  <svg width={size} height={size} viewBox="0 0 24 24">
    <path d="M2.5 11.2L21.5 3l-6.8 18.5-3.4-7.6z" fill={color} />
    <path d="M11.3 13.9L21.5 3" stroke={P.ink} strokeWidth={1.6} />
  </svg>
);

const Dots: React.FC<{ f: number }> = ({ f }) => (
  <div style={{ display: "flex", gap: 10, padding: "6px 4px" }}>
    {[0, 1, 2].map((i) => (
      <div key={i} style={{ width: 16, height: 16, borderRadius: 8, background: P.white, opacity: 0.35 + 0.65 * Math.max(0, Math.sin((f - i * 4) / 3)) }} />
    ))}
  </div>
);

export const DmSend: React.FC<{ g: GraphicEvent }> = ({ g }) => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const word = (g.text ?? "EDITING").toUpperCase();
  const typeAt = typeof g.props?.typeAt === "number" ? g.props.typeAt : 10;
  const sendAt = typeof g.props?.sendAt === "number" ? g.props.sendAt : 30;
  const replyAt = typeof g.props?.replyAt === "number" ? g.props.replyAt : sendAt + 22;
  const reply = (g.props?.reply as string) ?? "Ecco la guida completa";
  const name = (g.props?.name as string) ?? "Messaggi";
  const a = flipIn(f, g.frames, fps);
  const typed = Math.max(0, Math.min(word.length, Math.floor((f - typeAt) / 2) + 1));
  const sent = f >= sendAt;
  const sendPress = spring({ frame: f - sendAt + 3, fps, config: { damping: 8, stiffness: 400 } });
  const bubble = spring({ frame: f - sendAt, fps, config: { damping: 12, stiffness: 240 } });
  const fly = interpolate(f, [sendAt, sendAt + 14], [0, 1], clamp);
  const replyIn = spring({ frame: f - replyAt, fps, config: { damping: 12, stiffness: 240 } });
  const typing = f >= sendAt + 6 && f < replyAt;
  const caret = Math.floor(f / 8) % 2 === 0;
  return (
    <AbsoluteFill>
      <At y={g.y ?? 0.765}>
        <div style={{ ...a }}>
          <Glass width={840} style={{ padding: 28 }}>
            {/* intestazione */}
            <div style={{ display: "flex", alignItems: "center", gap: 18, paddingBottom: 18, borderBottom: `2px solid ${P.line}` }}>
              <div style={{ width: 64, height: 64, borderRadius: 32, background: `conic-gradient(from 200deg, ${P.lime}, #FF2E63, #FF8A1F, ${P.lime})`, padding: 4, boxSizing: "border-box" }}>
                <div style={{ width: "100%", height: "100%", borderRadius: "50%", background: P.ink, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <Plane size={30} color={P.lime} />
                </div>
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 900, fontSize: 32 }}>{name}</div>
                <div style={{ fontWeight: 700, fontSize: 24, color: typing ? P.lime : P.grey }}>{typing ? "sta scrivendo…" : "attivo ora"}</div>
              </div>
              <div style={{ width: 16, height: 16, borderRadius: 8, background: "#35E07A", boxShadow: "0 0 14px #35E07A" }} />
            </div>
            {/* messaggi */}
            <div style={{ position: "relative", height: 190, display: "flex", flexDirection: "column", justifyContent: "flex-end", gap: 12, paddingTop: 14 }}>
              {sent && (
                <div style={{ alignSelf: "flex-end", transform: `translateY(${(1 - bubble) * 120}px) scale(${0.6 + 0.4 * bubble})`, transformOrigin: "100% 100%", opacity: Math.min(1, bubble * 2) }}>
                  <div style={{ background: P.lime, color: P.ink, fontWeight: 900, fontSize: 44, letterSpacing: 2, padding: "12px 30px", borderRadius: "30px 30px 8px 30px" }}>{word}</div>
                  <div style={{ textAlign: "right", fontWeight: 700, fontSize: 20, color: P.grey, marginTop: 4 }}>Inviato</div>
                </div>
              )}
              {typing && (
                <div style={{ alignSelf: "flex-start", background: "rgba(255,255,255,0.12)", padding: "12px 22px", borderRadius: "30px 30px 30px 8px" }}>
                  <Dots f={f} />
                </div>
              )}
              {f >= replyAt && (
                <div
                  style={{
                    alignSelf: "flex-start",
                    transform: `scale(${0.6 + 0.4 * replyIn})`,
                    transformOrigin: "0% 100%",
                    display: "flex",
                    alignItems: "center",
                    gap: 14,
                    background: "rgba(255,255,255,0.14)",
                    fontWeight: 800,
                    fontSize: 32,
                    padding: "14px 26px 14px 16px",
                    borderRadius: "30px 30px 30px 8px",
                  }}
                >
                  <div style={{ width: 52, height: 52, borderRadius: 14, background: P.lime, display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <svg width={32} height={32} viewBox="0 0 24 24">
                      <path d="M6 2.5h8l5 5v14H6z" fill="none" stroke={P.ink} strokeWidth={2.4} strokeLinejoin="round" />
                      <path d="M14 2.5v5h5M9 13h7M9 17h5" stroke={P.ink} strokeWidth={2.4} strokeLinecap="round" />
                    </svg>
                  </div>
                  {reply}
                </div>
              )}
            </div>
            {/* campo di testo */}
            <div style={{ marginTop: 18, display: "flex", alignItems: "center", gap: 16 }}>
              <div style={{ flex: 1, height: 84, borderRadius: 42, border: `3px solid ${!sent && typed > 0 ? P.lime : P.line}`, background: "rgba(255,255,255,0.06)", display: "flex", alignItems: "center", padding: "0 30px", fontWeight: 900, fontSize: 40, letterSpacing: 2 }}>
                {!sent && typed > 0 ? (
                  <>
                    {word.slice(0, typed)}
                    <span style={{ width: 4, height: 46, background: P.lime, marginLeft: 6, opacity: caret ? 1 : 0 }} />
                  </>
                ) : (
                  <span style={{ color: P.grey, fontWeight: 700, fontSize: 32, letterSpacing: 0 }}>Scrivi un messaggio…</span>
                )}
              </div>
              <div
                style={{
                  width: 84,
                  height: 84,
                  borderRadius: 42,
                  background: P.lime,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  transform: `scale(${f >= sendAt - 3 && f < sendAt + 10 ? 0.8 + 0.2 * sendPress : 1})`,
                  boxShadow: typed === word.length && !sent ? `0 0 ${30 + 20 * Math.sin(f / 2)}px ${P.lime}` : undefined,
                }}
              >
                <div style={{ transform: `translate(${fly * 700}px, ${-fly * 900}px) rotate(${-fly * 20}deg) scale(${1 + fly * 1.5})`, opacity: f >= sendAt + 14 ? 0 : 1 }}>
                  <Plane size={44} color={P.ink} />
                </div>
                {f >= sendAt + 14 && (
                  <div style={{ position: "absolute", transform: `scale(${spring({ frame: f - sendAt - 14, fps, config: { damping: 10, stiffness: 260 } })})` }}>
                    <Plane size={44} color={P.ink} />
                  </div>
                )}
              </div>
            </div>
          </Glass>
        </div>
      </At>
    </AbsoluteFill>
  );
};
