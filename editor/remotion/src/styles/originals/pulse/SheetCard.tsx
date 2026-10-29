import React from "react";
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { seeded } from "../../../lib/timeline";
import type { GraphicEvent } from "../../../lib/timeline";
import { At, clamp, fg, flipIn, Glass, INTER, P, rgba } from "./shared";

/**
 * Foglio Excel del magazzino (un foglio di calcolo generico, senza loghi): intestazione verde con il nome del file,
 * colonne, righe. Azioni a tempo (frame relativi):
 * - props.scrollAt [da, a]: le righe scorrono velocissime (centinaia di righe) e frenano, con sfocatura di movimento;
 * - props.highlightAt + props.highlightCol: una colonna si illumina (es. la misura da controllare);
 * - props.addAt + props.addRow: una riga nuova entra in cima, evidenziata, le altre scendono;
 * - props.updateAt + props.updateRow/updateCol/updateTo: una cella lampeggia e il numero conta fino al nuovo valore.
 * props.title, props.columns, props.rows (array di righe), props.visible (righe visibili, default 6).
 */
const GREEN = "#1F7A4C";

export const SheetCard: React.FC<{ g: GraphicEvent }> = ({ g }) => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const p = (g.props ?? {}) as Record<string, unknown>;
  const num = (k: string) => (typeof p[k] === "number" ? (p[k] as number) : null);
  const cols = (p.columns as string[]) ?? ["Articolo", "Misura", "Q.tà", "Scaffale"];
  const base = (p.rows as string[][]) ?? [];
  const visible = (p.visible as number) ?? 6;
  const widths = (p.widths as number[]) ?? [0.42, 0.2, 0.14, 0.24];
  const ROW = 64;
  const a = flipIn(f, g.frames, fps, 6);

  // scorrimento: tante righe finte (rimescolate in modo deterministico) che passano veloci e frenano
  const scroll = Array.isArray(p.scrollAt) ? (p.scrollAt as number[]) : null;
  const total = 60;
  let pos = 0;
  let speed = 0;
  if (scroll) {
    const t = interpolate(f, scroll, [0, 1], clamp);
    const ease = (x: number) => 1 - (1 - x) ** 3;
    pos = ease(t) * total;
    speed = (ease(Math.min(1, t + 0.02)) - ease(t)) * total * 50;
  }
  const rowAt = (k: number): string[] => {
    const r = base[((k % base.length) + base.length) % base.length];
    if (k < base.length) return r;
    const q = Math.round(5 + seeded(k * 7) * 140);
    return [r[0], r[1], String(q), `${"ABCDEF"[k % 6]}${1 + (k % 5)}`];
  };

  const addAt = num("addAt");
  const added = addAt !== null && f >= addAt;
  const addIn = addAt === null ? 0 : spring({ frame: f - addAt, fps, config: { damping: 14, stiffness: 200 } });
  const addRow = (p.addRow as string[]) ?? null;
  const addGlow = addAt === null ? 0 : interpolate(f - addAt, [0, 4, 40], [0, 1, 0.35], clamp);

  const updAt = num("updateAt");
  const updRow = num("updateRow") ?? 0;
  const updCol = num("updateCol") ?? 2;
  const updTo = p.updateTo as string | number | undefined;
  const updK = updAt === null ? 0 : interpolate(f, [updAt, updAt + 10], [0, 1], { ...clamp, easing: (x) => 1 - (1 - x) ** 3 });
  const updFlash = updAt === null ? 0 : interpolate(f - updAt, [0, 3, 30], [0, 1, 0], clamp);

  const hiAt = num("highlightAt");
  const hiCol = num("highlightCol");
  const hi = hiAt === null ? 0 : spring({ frame: f - hiAt, fps, config: { damping: 14, stiffness: 220 } });

  const first = Math.floor(pos);
  const frac = pos - first;
  const rows: { cells: string[]; key: string; isNew?: boolean }[] = [];
  if (addRow && added) rows.push({ cells: addRow, key: "new", isNew: true });
  for (let k = first; k < first + visible + 1; k++) rows.push({ cells: rowAt(k), key: `r${k}` });

  const colX = (i: number) => widths.slice(0, i).reduce((s, w) => s + w, 0);
  const W = 860;
  const cellStyle = (i: number): React.CSSProperties => ({ position: "absolute", left: `${colX(i) * 100}%`, width: `${widths[i] * 100}%`, padding: "0 18px", boxSizing: "border-box", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" });
  return (
    <AbsoluteFill>
      <At y={g.y ?? 0.27}>
        <div style={{ ...a }}>
          <Glass width={W} style={{ padding: 0, overflow: "hidden" }}>
            {/* barra del file */}
            <div style={{ height: 76, background: GREEN, color: "#fff", display: "flex", alignItems: "center", gap: 16, padding: "0 26px", fontWeight: 900, fontSize: 30 }}>
              <svg width={40} height={40} viewBox="0 0 24 24">
                <rect x="3" y="3" width="18" height="18" rx="3" fill="#fff" />
                <path d="M3 9h18M3 15h18M9 3v18M15 3v18" stroke={GREEN} strokeWidth={1.6} />
              </svg>
              {(p.title as string) ?? "Magazzino.xlsx"}
              <div style={{ marginLeft: "auto", fontWeight: 700, fontSize: 22, opacity: 0.8 }}>{scroll && f >= scroll[0] && f < scroll[1] ? `riga ${Math.round(pos * 7 + 2)}` : ""}</div>
            </div>
            {/* intestazioni di colonna */}
            <div style={{ position: "relative", height: 54, background: fg(0.05), borderBottom: `2px solid ${P.line}`, fontWeight: 900, fontSize: 24, color: fg(0.55), letterSpacing: 1, textTransform: "uppercase", lineHeight: "54px" }}>
              {cols.map((c, i) => (
                <div key={i} style={cellStyle(i)}>{c}</div>
              ))}
            </div>
            {/* righe */}
            <div style={{ position: "relative", height: ROW * visible, overflow: "hidden" }}>
              {hiCol !== null && hi > 0 && (
                <div style={{ position: "absolute", top: 0, bottom: 0, left: `${colX(hiCol) * 100}%`, width: `${widths[hiCol] * 100}%`, background: rgba(P.accent, 0.16 * hi), borderLeft: `3px solid ${rgba(P.accent, hi)}`, borderRight: `3px solid ${rgba(P.accent, hi)}` }} />
              )}
              <div style={{ transform: `translateY(${-frac * ROW + (added ? (addIn - 1) * ROW : 0)}px)`, filter: speed > 1.5 ? `blur(${Math.min(8, speed * 0.6).toFixed(1)}px)` : undefined }}>
                {rows.map((r, ri) => {
                  const updating = updAt !== null && !r.isNew && ri - (added ? 1 : 0) === updRow;
                  return (
                    <div key={r.key} style={{ position: "relative", height: ROW, lineHeight: `${ROW}px`, borderBottom: `1px solid ${P.line}`, fontSize: 30, fontWeight: r.isNew ? 900 : 700, color: P.fg, background: r.isNew ? rgba(P.accent, 0.22 * addGlow + 0.06) : undefined }}>
                      {r.cells.map((c, i) => {
                        let text = c;
                        let flash = 0;
                        if (updating && i === updCol && f >= (updAt ?? 0) && updTo !== undefined) {
                          const fromN = parseFloat(c);
                          const toN = typeof updTo === "number" ? updTo : parseFloat(String(updTo));
                          text = !isNaN(fromN) && !isNaN(toN) ? String(Math.round(fromN + (toN - fromN) * updK)) : String(updTo);
                          flash = updFlash;
                        }
                        return (
                          <div key={i} style={{ ...cellStyle(i), background: flash > 0 ? rgba(P.accent, 0.5 * flash) : undefined, borderRadius: 8, fontVariantNumeric: "tabular-nums" }}>
                            {i === 0 && r.isNew ? <span style={{ background: P.accent, color: P.ink, borderRadius: 6, padding: "2px 8px", marginRight: 10, fontSize: 20, verticalAlign: "middle" }}>NUOVO</span> : null}
                            {text}
                          </div>
                        );
                      })}
                    </div>
                  );
                })}
              </div>
            </div>
          </Glass>
        </div>
      </At>
    </AbsoluteFill>
  );
};
