import React from "react";
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import type { GraphicEvent } from "../../../lib/timeline";
import { bounce, BOUNCE, BOUNCE_SNAP, BOUNCE_SOFT, breathe, EXIT_FRAMES, exitPull, LAND, nudge, squash, STAGGER, wobble } from "../../../motion/bouncy";
import { clamp, INTER, MONO, P, rgba } from "../pulse/shared";
import { Cursor, Odometer, rollValue } from "./parts";

/**
 * Interfacce finte dello stile zane (UI che "funzionano": numeri che rotolano, pulsanti cliccati, interruttori).
 * Tutte entrano ed escono con le molle del README di movimento. Tempi nelle props: secondi assoluti nel piano
 * (diventano frame relativi).
 */

const num = (v: unknown, d: number) => (typeof v === "number" ? v : d);
const str = (v: unknown, d = "") => (typeof v === "string" ? v : d);

/** Entrata comune: sale a molla con squash e wobble; uscita con rincorsa. */
function enter(f: number, fps: number, frames: number) {
  const s = bounce(f, fps, BOUNCE);
  const q = squash(f, LAND, true);
  const pull = exitPull(f, frames - EXIT_FRAMES);
  return {
    transform: `translateY(${((1 - s) * 260 + pull * -1300).toFixed(1)}px) rotate(${wobble(f, 0.5).toFixed(2)}deg) scale(${(Math.max(0, s) * q.sx).toFixed(3)}, ${(Math.max(0, s) * q.sy).toFixed(3)})`,
    opacity: Math.min(1, f / 3) * interpolate(f, [frames - 3, frames], [1, 0], clamp),
  };
}

const glassCard: React.CSSProperties = {
  background: "rgba(10,16,9,0.9)",
  border: "1.5px solid rgba(204,255,0,0.18)",
  boxShadow: "0 40px 90px rgba(0,0,0,0.6)",
  borderRadius: 40,
};

/**
 * "counter": pillola con numero a rullo ($109.708 → $120.000) e icona d'accento.
 * props: from, to, prefix, suffix, rollAt (inizio), rollDur (frame, default 45), icon ("$" | "↑" | testo), x, y.
 */
export const Counter: React.FC<{ g: GraphicEvent }> = ({ g }) => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const pr = g.props ?? {};
  const v = rollValue(f, num(pr.from, 0), num(pr.to, 100), num(pr.rollAt, 4), num(pr.rollDur, 45));
  const landed = f >= num(pr.rollAt, 4) + num(pr.rollDur, 45);
  const kick = landed ? 1 + 0.08 * Math.max(0, 1 - (f - num(pr.rollAt, 4) - num(pr.rollDur, 45)) / 6) : 1;
  return (
    <AbsoluteFill>
      <div
        style={{
          position: "absolute",
          left: `${(g.x ?? 0.5) * 100}%`,
          top: `${(g.y ?? 0.17) * 100}%`,
          transform: `translate(-50%, -50%) ${enter(f, fps, g.frames).transform} scale(${kick})`,
          opacity: enter(f, fps, g.frames).opacity,
          display: "flex",
          alignItems: "center",
          gap: 18,
          padding: "14px 30px 14px 16px",
          borderRadius: 999,
          background: "rgba(10,16,9,0.88)",
          border: `3px solid ${P.accent}`,
          boxShadow: P.glow,
        }}
      >
        <div style={{ width: 62, height: 62, borderRadius: 18, background: P.accent, color: "#0A0B0E", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: INTER, fontWeight: 900, fontSize: 38 }}>
          {str(pr.icon, "$")}
        </div>
        <Odometer value={v} size={74} prefix={str(pr.prefix)} suffix={str(pr.suffix)} digits={String(Math.round(num(pr.to, 100))).length} />
      </div>
    </AbsoluteFill>
  );
};

type Val = { at: number; v: number };

/**
 * "ring": card con anello di progresso che conta (0 → 83 → 99 → 98), etichetta mono, pulsante "Claim offer" che il
 * cursore clicca → "Offer accepted ✓".
 * props: label, values [{at, v}], sub, button, done, clickAt, y.
 */
export const Ring: React.FC<{ g: GraphicEvent }> = ({ g }) => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const pr = g.props ?? {};
  const vals = (Array.isArray(pr.values) ? (pr.values as Val[]) : [{ at: 4, v: 98 }]).slice().sort((a, b) => a.at - b.at);
  let v = 0;
  let prev = 0;
  let lastAt = -99;
  for (const k of vals) {
    if (f >= k.at) {
      v = rollValue(f, prev, k.v, k.at, 14);
      lastAt = k.at;
    }
    prev = f >= k.at ? k.v : prev;
  }
  const hit = f - lastAt - 14;
  const kick = hit >= 0 && hit < 8 ? 1 + 0.06 * Math.sin((hit / 8) * Math.PI) : 1;
  const clickAt = num(pr.clickAt, -1);
  const done = clickAt >= 0 && f >= clickAt;
  const ds = done ? bounce(f - clickAt, fps, BOUNCE_SNAP) : 0;
  const R = 120;
  const C = 2 * Math.PI * R;
  const e = enter(f, fps, g.frames);
  const btnY = 640;
  return (
    <AbsoluteFill>
      <div style={{ position: "absolute", left: 540 - 330, top: (g.y ?? 0.42) * 1920 - 380, width: 660, height: 760, ...glassCard, transform: e.transform, opacity: e.opacity }}>
        <div style={{ position: "absolute", left: 40, top: 36, fontFamily: MONO, fontSize: 22, letterSpacing: 3, color: rgba("#FFFFFF", 0.6), textTransform: "uppercase" }}>{str(pr.label, "score")}</div>
        <div style={{ position: "absolute", right: 36, top: 30, padding: "4px 14px", borderRadius: 999, border: `1.5px solid ${rgba(P.accent, 0.5)}`, fontFamily: MONO, fontSize: 20, color: P.accent }}>LIVE</div>
        <svg width={320} height={320} viewBox="0 0 320 320" style={{ position: "absolute", left: 170, top: 110, transform: `scale(${kick})`, overflow: "visible" }}>
          <circle cx={160} cy={160} r={R} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth={22} />
          <circle cx={160} cy={160} r={R} fill="none" stroke={P.accent} strokeWidth={22} strokeLinecap="round" strokeDasharray={C} strokeDashoffset={C * (1 - Math.min(1, v / 100))} transform="rotate(-90 160 160)" style={{ filter: `drop-shadow(0 0 14px ${rgba(P.accent, 0.8)})` }} />
        </svg>
        <div style={{ position: "absolute", left: 0, right: 0, top: 200, display: "flex", justifyContent: "center", transform: `scale(${kick})` }}>
          <Odometer value={v} size={120} digits={2} />
        </div>
        <div style={{ position: "absolute", left: 0, right: 0, top: 460, textAlign: "center", fontFamily: INTER, fontWeight: 600, fontSize: 28, color: rgba("#FFFFFF", 0.6) }}>{str(pr.sub)}</div>
        <div
          style={{
            position: "absolute",
            left: 60,
            right: 60,
            top: btnY - 100,
            height: 96,
            borderRadius: 999,
            background: P.accent,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "0 14px 0 36px",
            fontFamily: INTER,
            fontWeight: 800,
            fontSize: 36,
            color: "#0A0B0E",
            boxShadow: P.glow,
            transform: `scale(${done ? 0.94 + 0.06 * ds : bounce(f - 10, fps)})`,
          }}
        >
          <span>{done ? str(pr.done, "Offer accepted") : str(pr.button, "Claim offer")}</span>
          <span style={{ width: 70, height: 70, borderRadius: 35, background: "#0A0B0E", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <svg width={36} height={36} viewBox="0 0 24 24">
              {done ? (
                <path d="M5 12.5l4.5 4.5L19 7" fill="none" stroke={P.accent} strokeWidth={3.2} strokeLinecap="round" strokeLinejoin="round" pathLength={1} strokeDasharray={1} strokeDashoffset={1 - Math.min(1, ds)} />
              ) : (
                <path d="M5 12h13M13 6l6 6-6 6" fill="none" stroke={P.accent} strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" />
              )}
            </svg>
          </span>
        </div>
        {clickAt >= 0 && <Cursor f={f} fps={fps} x={480} y={btnY - 52} clickAt={clickAt} />}
      </div>
    </AbsoluteFill>
  );
};

type Toggle = { label: string; at: number };

/**
 * "toggles": card chiara stile iOS ("Autopilot") con interruttori che si accendono uno alla volta (la card vicina riceve
 * una piccola spinta a ogni scatto). props: title, icon (lettera), items [{label, at}], y.
 */
export const Toggles: React.FC<{ g: GraphicEvent }> = ({ g }) => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const pr = g.props ?? {};
  const items = (Array.isArray(pr.items) ? (pr.items as Toggle[]) : []).slice(0, 5);
  const e = enter(f, fps, g.frames);
  const shake = items.reduce((a, it) => a + nudge(f, it.at + 3, 4), 0);
  return (
    <AbsoluteFill>
      <div
        style={{
          position: "absolute",
          left: 540 - 340,
          top: (g.y ?? 0.62) * 1920 - (90 + items.length * 52),
          width: 680,
          padding: "34px 36px 18px",
          borderRadius: 44,
          background: "rgba(250,251,249,0.97)",
          boxShadow: "0 40px 90px rgba(0,0,0,0.45)",
          fontFamily: INTER,
          color: "#0A0B0E",
          transform: `${e.transform} translateX(${shake.toFixed(1)}px)`,
          opacity: e.opacity,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 18, marginBottom: 16 }}>
          <div style={{ width: 58, height: 58, borderRadius: 16, background: "#0A0B0E", color: P.accent, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 900, fontSize: 30 }}>{str(pr.icon, "A")}</div>
          <div style={{ fontWeight: 800, fontSize: 40, letterSpacing: "-0.02em" }}>{str(pr.title, "Autopilot")}</div>
        </div>
        {items.map((it, i) => {
          const on = f >= it.at;
          const k = on ? Math.min(1.12, bounce(f - it.at, fps, BOUNCE_SNAP)) : 0;
          const row = bounce(f - 4 - i * STAGGER.card, fps, BOUNCE_SNAP);
          return (
            <div key={i} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "20px 0", borderTop: "1.5px solid rgba(10,11,14,0.08)", opacity: Math.min(1, Math.max(0, row)), transform: `translateX(${((1 - row) * 40).toFixed(1)}px)` }}>
              <span style={{ fontWeight: 600, fontSize: 32 }}>{it.label}</span>
              <span style={{ position: "relative", width: 104, height: 60, borderRadius: 30, background: on ? interpolateColor(Math.min(1, k)) : "rgba(10,11,14,0.14)" }}>
                <span style={{ position: "absolute", top: 5, left: 5 + 44 * Math.min(1.05, k), width: 50, height: 50, borderRadius: 25, background: "#FFFFFF", boxShadow: "0 3px 8px rgba(0,0,0,0.25)" }} />
              </span>
            </div>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};

const interpolateColor = (k: number) => (k > 0.5 ? "#34C759" : `rgba(52,199,89,${(k * 2).toFixed(2)})`);

/**
 * "chart": grafico a barre che salgono a molla una dopo l'altra, l'ultima d'accento con bagliore, linea che le collega
 * e numero a rullo in alto. props: values [], from, to, prefix, rollAt, y.
 */
export const Chart: React.FC<{ g: GraphicEvent }> = ({ g }) => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const pr = g.props ?? {};
  const vals = Array.isArray(pr.values) ? (pr.values as number[]) : [20, 32, 28, 45, 60, 100];
  const max = Math.max(...vals);
  const W = 860;
  const H = 520;
  const bw = W / vals.length - 26;
  const e = enter(f, fps, g.frames);
  const tops = vals.map((v, i) => {
    const s = bounce(f - 6 - i * STAGGER.card, fps, BOUNCE_SOFT);
    return { x: i * (bw + 26) + bw / 2, h: (v / max) * H * Math.max(0, s) };
  });
  const lineP = interpolate(f, [10, 10 + vals.length * STAGGER.card + 12], [0, 1], clamp);
  return (
    <AbsoluteFill>
      <div style={{ position: "absolute", left: 540 - W / 2, top: (g.y ?? 0.45) * 1920 - H / 2, width: W, height: H + 180, transform: e.transform, opacity: e.opacity }}>
        <div style={{ position: "absolute", left: 0, top: 0 }}>
          <Odometer value={rollValue(f, num(pr.from, 0), num(pr.to, 100), num(pr.rollAt, 6), 50)} size={110} prefix={str(pr.prefix)} suffix={str(pr.suffix)} digits={String(Math.round(num(pr.to, 100))).length} />
        </div>
        <svg width={W} height={H} style={{ position: "absolute", left: 0, top: 170, overflow: "visible" }}>
          {tops.map((t, i) => {
            const last = i === tops.length - 1;
            return <rect key={i} x={t.x - bw / 2} y={H - t.h} width={bw} height={t.h} rx={16} fill={last ? P.accent : "rgba(255,255,255,0.16)"} style={last ? { filter: `drop-shadow(0 0 22px ${rgba(P.accent, 0.8)})` } : undefined} />;
          })}
          <polyline points={tops.map((t) => `${t.x},${H - t.h - 30}`).join(" ")} fill="none" stroke={P.accent} strokeWidth={6} strokeLinejoin="round" pathLength={1} strokeDasharray={1} strokeDashoffset={1 - lineP} style={{ filter: `drop-shadow(0 0 10px ${rgba(P.accent, 0.9)})` }} />
        </svg>
      </div>
    </AbsoluteFill>
  );
};

/**
 * "scribble": freccia disegnata a mano che si traccia + scritta a mano ("NO EMPLOYEES") che si scrive lettera per
 * lettera, d'accento con bagliore: si "attacca" al soggetto (x, y in frazioni del fotogramma).
 * props: text, x, y, angle (gradi della scritta), arrow ("up" | "down" | "left" | "right"), writeAt.
 */
export const Scribble: React.FC<{ g: GraphicEvent }> = ({ g }) => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const pr = g.props ?? {};
  const x = (g.x ?? 0.62) * 1080;
  const y = (g.y ?? 0.45) * 1920;
  const arrow = str(pr.arrow, "up");
  const drawP = interpolate(f, [0, 10], [0, 1], { ...clamp, easing: (t) => 1 - Math.pow(1 - t, 3) });
  const text = str(pr.text, g.text ?? "");
  const writeAt = num(pr.writeAt, 8);
  const fade = interpolate(f, [g.frames - 4, g.frames], [1, 0], clamp);
  const rot = { up: 0, right: 90, down: 180, left: 270 }[arrow as "up"] ?? 0;
  return (
    <AbsoluteFill style={{ opacity: fade }}>
      <svg width={220} height={300} viewBox="0 0 220 300" style={{ position: "absolute", left: x - 110, top: y - 300, transform: `rotate(${rot}deg) scale(${breathe(f, 0.01)})`, transformOrigin: "50% 100%", overflow: "visible", filter: `drop-shadow(0 0 10px ${rgba(P.accent, 0.8)})` }}>
        <path d="M 60 280 C 20 200, 40 110, 120 40" fill="none" stroke={P.accent} strokeWidth={11} strokeLinecap="round" pathLength={1} strokeDasharray={1} strokeDashoffset={1 - drawP} />
        {drawP > 0.95 && <path d="M 82 44 L 122 38 L 112 78" fill="none" stroke={P.accent} strokeWidth={11} strokeLinecap="round" strokeLinejoin="round" />}
      </svg>
      <div style={{ position: "absolute", left: x - 40, top: y + 10, transform: `rotate(${num(pr.angle, -12)}deg)`, transformOrigin: "0 50%", fontFamily: '"Permanent Marker", cursive', fontSize: 76, lineHeight: 0.95, color: P.accent, textShadow: `0 0 16px ${rgba(P.accent, 0.7)}`, whiteSpace: "pre" }}>
        {text.split("\n").map((line, li, all) => {
          const before = all.slice(0, li).join("").length;
          return (
            <div key={li}>
              {Array.from(line).map((ch, i) => {
                const a = f - writeAt - (before + i) * 1.5;
                if (a < 0) return <span key={i} style={{ visibility: "hidden" }}>{ch}</span>;
                const s = bounce(a, fps, BOUNCE_SNAP);
                return <span key={i} style={{ display: "inline-block", transform: `scale(${Math.max(0, s).toFixed(3)}) rotate(${((1 - Math.min(1, s)) * -20).toFixed(1)}deg)` }}>{ch}</span>;
              })}
            </div>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};
