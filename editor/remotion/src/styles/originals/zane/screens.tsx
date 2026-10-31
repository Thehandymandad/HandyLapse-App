import React from "react";
import { interpolate, useVideoConfig } from "remotion";
import { Clip, isSprite, type Sprite } from "../../../lib/media";
import { bounce, BOUNCE_SNAP, LAND, squash } from "../../../motion/bouncy";
import { INTER, P, rgba } from "../pulse/shared";
import { Odometer, rollValue } from "./parts";

/**
 * Cosa si vede DENTRO un telefono o una scheda: deve essere inerente a ciò che si dice in quel momento.
 * - chat: la chat dell'app nominata (WhatsApp) con i messaggi della frase
 * - sheet: il foglio Excel con la riga che entra o la cella che si aggiorna
 * - image: un'immagine (B-roll generato o una foto dell'oggetto di cui si parla)
 * - clip: il girato (il soggetto solo quando parla di sé, o un B-roll vero)
 * Tempi dei messaggi/righe: frame relativi all'inizio della grafica (nel piano: secondi assoluti).
 */
export type Msg = { from: "me" | "bot"; text: string; at: number };
export type Screen =
  | { kind: "chat"; title?: string; status?: string; messages: Msg[] }
  | { kind: "sheet"; title?: string; columns: string[]; rows: string[][]; highlightRow?: number; addAt?: number; addRow?: string[]; updateAt?: number; updateRow?: number; updateCol?: number; updateTo?: number }
  | { kind: "image"; src: string; zoom?: number }
  | { kind: "clip"; clip: Sprite; gray?: boolean };

/** Disegna lo schermo nel riquadro w×h; `f` = frame della grafica che lo contiene. */
export const ScreenView: React.FC<{ screen: Screen | undefined; f: number; w: number; h: number; gray?: boolean }> = ({ screen, f, w, h, gray }) => {
  if (!screen) return <div style={{ width: w, height: h, background: "#111" }} />;
  if (screen.kind === "clip") return isSprite(screen.clip) ? <Clip sprite={screen.clip} f={f} w={w} h={h} gray={screen.gray ?? gray} /> : null;
  if (screen.kind === "image")
    return <div style={{ width: w, height: h, backgroundImage: `url(${screen.src})`, backgroundSize: "cover", backgroundPosition: "center", transform: `scale(${(screen.zoom ?? 1.04) + f * 0.0008})`, filter: gray ? "grayscale(1)" : undefined }} />;
  if (screen.kind === "chat") return <ChatScreen s={screen} f={f} w={w} h={h} />;
  return <SheetScreen s={screen} f={f} w={w} h={h} />;
};

/** Chat stile WhatsApp (tema scuro): i messaggi entrano a molla al loro tempo; prima di quelli del bot, "sta scrivendo". */
const ChatScreen: React.FC<{ s: Extract<Screen, { kind: "chat" }>; f: number; w: number; h: number }> = ({ s, f, w, h }) => {
  const { fps } = useVideoConfig();
  // tutto è disegnato per uno schermo largo 380 e scalato; nelle schede orizzontali in base all'altezza, e i messaggi
  // stanno in alto (sotto c'è la scheda successiva)
  const landscape = w > h;
  const k = landscape ? h / 290 : w / 380;
  const headH = (landscape ? 86 : 120) * k;
  const shown = s.messages.filter((m) => f >= m.at);
  const typing = s.messages.find((m) => m.from === "bot" && f < m.at && f >= m.at - 16);
  return (
    <div style={{ position: "relative", width: w, height: h, background: "#0B141A", overflow: "hidden", fontFamily: INTER }}>
      <div style={{ position: "absolute", left: 0, right: 0, top: 0, height: headH, background: "#1F2C34", display: "flex", alignItems: "flex-end", padding: `0 ${18 * k}px ${16 * k}px`, gap: 14 * k }}>
        <div style={{ width: 52 * k, height: 52 * k, borderRadius: 26 * k, background: "#25D366", display: "flex", alignItems: "center", justifyContent: "center", color: "#0B141A", fontWeight: 900, fontSize: 24 * k }}>
          {(s.title ?? "Magazzino").slice(0, 1)}
        </div>
        <div>
          <div style={{ color: "#E9EDEF", fontWeight: 700, fontSize: 24 * k }}>{s.title ?? "Magazzino"}</div>
          <div style={{ color: "#8696A0", fontSize: 17 * k }}>{typing ? "sta scrivendo…" : s.status ?? "online"}</div>
        </div>
      </div>
      <div style={{ position: "absolute", left: 14 * k, right: 14 * k, ...(landscape ? { top: headH + 14 * k } : { bottom: 22 * k }), display: "flex", flexDirection: "column", gap: 10 * k }}>
        {shown.map((m, i) => {
          const age = f - m.at;
          const sp = bounce(age, fps, BOUNCE_SNAP);
          const q = squash(age, LAND, true);
          const me = m.from === "me";
          return (
            <div
              key={i}
              style={{
                alignSelf: me ? "flex-end" : "flex-start",
                maxWidth: "84%",
                padding: `${12 * k}px ${16 * k}px`,
                borderRadius: 18 * k,
                borderTopRightRadius: me ? 4 * k : 18 * k,
                borderTopLeftRadius: me ? 18 * k : 4 * k,
                background: me ? "#005C4B" : "#202C33",
                color: "#E9EDEF",
                fontSize: 22 * k,
                fontWeight: 500,
                lineHeight: 1.3,
                whiteSpace: "pre-line",
                transformOrigin: me ? "100% 100%" : "0% 100%",
                transform: `translateY(${((1 - Math.min(1, sp)) * 30 * k).toFixed(1)}px) scale(${(Math.max(0, sp) * q.sx).toFixed(3)}, ${(Math.max(0, sp) * q.sy).toFixed(3)})`,
              }}
            >
              {m.text.split(/(\*[^*]+\*)/).map((part, j) =>
                part.startsWith("*") && part.endsWith("*") ? <b key={j} style={{ color: me ? "#FFFFFF" : P.accent }}>{part.slice(1, -1)}</b> : <span key={j}>{part}</span>,
              )}
              <span style={{ marginLeft: 8 * k, fontSize: 14 * k, color: me ? "#53BDEB" : "#8696A0" }}>{me ? "✓✓" : "09:41"}</span>
            </div>
          );
        })}
        {typing && (
          <div style={{ alignSelf: "flex-start", padding: `${14 * k}px ${18 * k}px`, borderRadius: 18 * k, background: "#202C33", display: "flex", gap: 6 * k }}>
            {[0, 1, 2].map((d) => (
              <span key={d} style={{ width: 10 * k, height: 10 * k, borderRadius: 5 * k, background: "#8696A0", opacity: 0.4 + 0.6 * Math.max(0, Math.sin((f - d * 4) / 3)) }} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

/** Foglio Excel: riga evidenziata, riga nuova che entra a molla con un lampo d'accento, cella che conta al nuovo valore. */
const SheetScreen: React.FC<{ s: Extract<Screen, { kind: "sheet" }>; f: number; w: number; h: number }> = ({ s, f, w, h }) => {
  const { fps } = useVideoConfig();
  const k = w / 640;
  const rowH = 64 * k;
  const added = typeof s.addAt === "number" && s.addRow && f >= s.addAt;
  const rows = added ? [...s.rows, s.addRow!] : s.rows;
  const cols = s.columns.length;
  return (
    <div style={{ position: "relative", width: w, height: h, background: "#FFFFFF", overflow: "hidden", fontFamily: INTER, color: "#1F2328" }}>
      <div style={{ height: 70 * k, background: "#217346", color: "#FFFFFF", display: "flex", alignItems: "center", padding: `0 ${22 * k}px`, gap: 14 * k, fontWeight: 700, fontSize: 26 * k }}>
        <span style={{ width: 36 * k, height: 36 * k, borderRadius: 6 * k, background: "#FFFFFF", color: "#217346", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 900, fontSize: 22 * k }}>X</span>
        {s.title ?? "Inventario.xlsx"}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: `repeat(${cols}, 1fr)`, background: "#F3F4F6", borderBottom: "2px solid #D0D7DE" }}>
        {s.columns.map((c, i) => (
          <div key={i} style={{ padding: `${14 * k}px ${16 * k}px`, fontWeight: 700, fontSize: 21 * k, color: "#57606A" }}>{c}</div>
        ))}
      </div>
      {rows.map((r, ri) => {
        const isNew = added && ri === rows.length - 1;
        const age = isNew ? f - (s.addAt as number) : 99;
        const sp = isNew ? bounce(age, fps, BOUNCE_SNAP) : 1;
        const flash = isNew ? Math.max(0, 1 - age / 20) : 0;
        const hl = ri === s.highlightRow;
        return (
          <div
            key={ri}
            style={{
              display: "grid",
              gridTemplateColumns: `repeat(${cols}, 1fr)`,
              height: rowH,
              alignItems: "center",
              borderBottom: "1px solid #E5E7EB",
              background: isNew ? rgba(P.accent, 0.25 + 0.5 * flash) : hl ? rgba(P.accent, 0.3) : ri % 2 ? "#FAFBFC" : "#FFFFFF",
              transform: `translateX(${((1 - Math.min(1, sp)) * -w * 0.4).toFixed(1)}px)`,
              opacity: Math.min(1, Math.max(0, sp) * 1.5),
            }}
          >
            {r.map((cell, ci) => {
              const upd = typeof s.updateAt === "number" && s.updateRow === ri && s.updateCol === ci && typeof s.updateTo === "number";
              const from = Number(cell);
              return (
                <div key={ci} style={{ padding: `0 ${16 * k}px`, fontSize: 22 * k, fontWeight: ci === 0 || upd ? 700 : 500, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                  {upd && f >= (s.updateAt as number) ? (
                    <span style={{ display: "inline-flex", padding: `0 ${8 * k}px`, borderRadius: 6 * k, background: rgba(P.accent, interpolate(f - (s.updateAt as number), [0, 30], [0.9, 0.35], { extrapolateRight: "clamp" })) }}>
                      <Odometer value={rollValue(f, from, s.updateTo as number, s.updateAt as number, 20)} size={30 * k} color="#1F2328" />
                    </span>
                  ) : (
                    cell
                  )}
                </div>
              );
            })}
          </div>
        );
      })}
    </div>
  );
};
