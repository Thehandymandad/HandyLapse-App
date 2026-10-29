import React from "react";
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import type { GraphicEvent } from "../../../lib/timeline";
import { At, clamp, flipIn, INTER, P, rgba } from "./shared";

/**
 * Chat in stile WhatsApp (riconoscibile, senza logo): intestazione verde con il contatto, fondo carta, fumetti verdi
 * (tuoi) e bianchi (risposte), campo di testo in basso.
 * props.messages: [{ from: "me" | "bot", text, at, typeFrom? }] (frame relativi):
 *   - "me": il testo si scrive nel campo da typeFrom ad at, su at parte il fumetto (spunte che diventano blu);
 *   - "bot": "sta scrivendo…" per mezzo secondo, su at arriva il fumetto; `**parola**` in grassetto, `\n` a capo.
 * props.highlights: [{ at, text }]: da at quel pezzo di testo nelle risposte si evidenzia col colore d'accento.
 * props.name, props.status.
 */
type Msg = { from: "me" | "bot"; text: string; at: number; typeFrom?: number };
type Hl = { at: number; text: string };

const C = { head: "#0F7C5F", bg: "#EFE7DD", me: "#D9FDD3", bot: "#FFFFFF", ink: "#111B21", grey: "#667781", blue: "#34B7F1" };

function richText(text: string, hls: Hl[], f: number, fps: number) {
  // grassetto **x** + evidenziazioni a tempo
  const parts: React.ReactNode[] = [];
  text.split(/(\*\*[^*]+\*\*)/).forEach((chunk, i) => {
    const bold = chunk.startsWith("**") && chunk.endsWith("**");
    const raw = bold ? chunk.slice(2, -2) : chunk;
    let nodes: React.ReactNode[] = [raw];
    for (const h of hls) {
      if (f < h.at) continue;
      const k = spring({ frame: f - h.at, fps, config: { damping: 12, stiffness: 260 } });
      nodes = nodes.flatMap((n): React.ReactNode[] => {
        if (typeof n !== "string" || !n.includes(h.text)) return [n];
        const [pre, ...rest] = n.split(h.text);
        return [
          pre,
          <span key={`${h.text}${i}`} style={{ background: rgba(P.accent, 0.85 * Math.min(1, k)), color: k > 0.5 ? P.ink : undefined, borderRadius: 8, padding: "0 6px", boxShadow: `0 0 0 ${3 * Math.sin(Math.min(1, k) * Math.PI)}px ${rgba(P.accent, 0.4)}` }}>{h.text}</span>,
          rest.join(h.text),
        ];
      });
    }
    parts.push(<span key={i} style={{ fontWeight: bold ? 900 : 600 }}>{nodes}</span>);
  });
  return parts;
}

export const WhatsAppChat: React.FC<{ g: GraphicEvent }> = ({ g }) => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const msgs = (Array.isArray(g.props?.messages) ? (g.props!.messages as Msg[]) : []);
  const hls = (Array.isArray(g.props?.highlights) ? (g.props!.highlights as Hl[]) : []);
  const a = flipIn(f, g.frames, fps, 6);
  const typingMe = msgs.find((m) => m.from === "me" && m.typeFrom !== undefined && f >= m.typeFrom && f < m.at);
  const typingBot = msgs.find((m) => m.from === "bot" && f >= m.at - 15 && f < m.at);
  const sent = msgs.filter((m) => f >= m.at);
  const caret = Math.floor(f / 8) % 2 === 0;
  let draft = "";
  if (typingMe) {
    const k = interpolate(f, [typingMe.typeFrom!, typingMe.at - 3], [0, 1], clamp);
    draft = typingMe.text.replace(/\*\*/g, "").slice(0, Math.ceil(k * typingMe.text.replace(/\*\*/g, "").length));
  }
  const H = 330;
  return (
    <AbsoluteFill>
      <At y={g.y ?? 0.27}>
        <div style={{ ...a }}>
          <div style={{ width: 860, borderRadius: 36, overflow: "hidden", background: C.bg, boxShadow: P.cardShadow, fontFamily: INTER, color: C.ink }}>
            {/* intestazione */}
            <div style={{ height: 92, background: C.head, color: "#fff", display: "flex", alignItems: "center", gap: 18, padding: "0 26px" }}>
              <div style={{ width: 60, height: 60, borderRadius: 30, background: P.accent, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <svg width={34} height={34} viewBox="0 0 24 24" fill="none" stroke={P.ink} strokeWidth={2} strokeLinejoin="round">
                  <path d="M3 8l9-5 9 5v8l-9 5-9-5z" />
                  <path d="M3 8l9 5 9-5M12 13v8" />
                </svg>
              </div>
              <div>
                <div style={{ fontWeight: 900, fontSize: 32 }}>{(g.props?.name as string) ?? "Magazzino"}</div>
                <div style={{ fontWeight: 600, fontSize: 22, opacity: 0.85 }}>{typingBot ? "sta scrivendo…" : ((g.props?.status as string) ?? "online")}</div>
              </div>
            </div>
            {/* messaggi: ancorati in basso, i vecchi salgono */}
            <div style={{ position: "relative", height: H, padding: "16px 22px", boxSizing: "border-box", display: "flex", flexDirection: "column", justifyContent: "flex-end", gap: 12, overflow: "hidden" }}>
              {sent.map((m, i) => {
                const me = m.from === "me";
                const e = spring({ frame: f - m.at, fps, config: { damping: 13, stiffness: 260, mass: 0.7 } });
                const read = f >= m.at + 10;
                return (
                  <div key={i} style={{ alignSelf: me ? "flex-end" : "flex-start", maxWidth: "82%", transform: `translateY(${(1 - e) * 40}px) scale(${0.85 + 0.15 * e})`, transformOrigin: me ? "100% 100%" : "0% 100%", opacity: Math.min(1, e * 2), flexShrink: 0 }}>
                    <div style={{ background: me ? C.me : C.bot, borderRadius: me ? "22px 22px 6px 22px" : "22px 22px 22px 6px", padding: "14px 20px 10px", fontSize: 32, lineHeight: 1.3, boxShadow: "0 2px 4px rgba(0,0,0,0.08)", whiteSpace: "pre-line" }}>
                      {me ? <span style={{ fontWeight: 600 }}>{m.text.replace(/\*\*/g, "")}</span> : richText(m.text, hls, f, fps)}
                      <div style={{ textAlign: "right", fontSize: 18, color: C.grey, marginTop: 2, fontWeight: 600 }}>
                        9:41{me && <span style={{ color: read ? C.blue : C.grey, marginLeft: 6, fontWeight: 900 }}>✓✓</span>}
                      </div>
                    </div>
                  </div>
                );
              })}
              {typingBot && (
                <div style={{ alignSelf: "flex-start", background: C.bot, borderRadius: "22px 22px 22px 6px", padding: "18px 22px", display: "flex", gap: 9, flexShrink: 0 }}>
                  {[0, 1, 2].map((i) => (
                    <div key={i} style={{ width: 14, height: 14, borderRadius: 7, background: C.grey, opacity: 0.35 + 0.65 * Math.max(0, Math.sin((f - i * 4) / 3)) }} />
                  ))}
                </div>
              )}
            </div>
            {/* campo di testo */}
            <div style={{ display: "flex", alignItems: "center", gap: 14, padding: "12px 18px 18px" }}>
              <div style={{ flex: 1, minHeight: 66, borderRadius: 33, background: "#fff", display: "flex", alignItems: "center", padding: "0 26px", fontSize: 30, fontWeight: 600, color: draft ? C.ink : C.grey, overflow: "hidden", whiteSpace: "nowrap" }}>
                {draft || "Messaggio"}
                {typingMe && <span style={{ width: 3, height: 36, background: C.head, marginLeft: 4, opacity: caret ? 1 : 0 }} />}
              </div>
              <div style={{ width: 66, height: 66, borderRadius: 33, background: C.head, display: "flex", alignItems: "center", justifyContent: "center", transform: `scale(${typingMe && f >= typingMe.at - 3 ? 0.88 : 1})` }}>
                <svg width={32} height={32} viewBox="0 0 24 24">
                  <path d="M3 11.5L21 3l-6.5 18-3.2-7.3z" fill="#fff" />
                </svg>
              </div>
            </div>
          </div>
        </div>
      </At>
    </AbsoluteFill>
  );
};
