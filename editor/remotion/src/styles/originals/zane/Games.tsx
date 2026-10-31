import React from "react";
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import type { GraphicEvent } from "../../../lib/timeline";
import { bounce, BOUNCE_SNAP, BOUNCE_SOFT, EXIT_FRAMES, exitPull, LAND, squash, wobble } from "../../../motion/bouncy";
import { IPhone, MediaView, type Media } from "../apple/Device";
import { clamp, INTER, MONO, P, rgba } from "../pulse/shared";
import { Odometer, rollValue } from "./parts";

type G = { g: GraphicEvent };
const num = (v: unknown, d: number) => (typeof v === "number" ? v : d);

/**
 * "gameintro": il gameplay a schermo intero (primo fotogramma del reel), che a `shrinkAt` si rimpicciolisce a molla
 * dentro un iPhone verticale e vola alla posizione (px, py). props: media (clip verticale), shrinkAt, px, py, pw.
 */
export const GameIntro: React.FC<G> = ({ g }) => {
  const f = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const p = g.props ?? {};
  const m = (p.media ?? {}) as Media;
  const shrinkAt = num(p.shrinkAt, 15);
  const pw = num(p.pw, 250);
  const ph = pw * (19.5 / 9);
  const s = f < shrinkAt ? 0 : bounce(f - shrinkAt, fps, BOUNCE_SOFT);
  const t = Math.min(1, Math.max(0, s));
  // da schermo intero (scala 1 rispetto allo schermo) al telefono: la scala va da width/pw a 1
  const sc = interpolate(t, [0, 1], [width / pw, 1]) * (s > 1 ? 1 + (s - 1) * 0.6 : 1);
  const cx = interpolate(t, [0, 1], [width / 2, num(p.px, 0.8) * width]);
  const cy = interpolate(t, [0, 1], [height / 2, num(p.py, 0.45) * height]);
  const rot = f < shrinkAt ? 0 : interpolate(t, [0, 1], [0, num(p.rot, 8)]) + wobble(f - shrinkAt, 0.6);
  const pull = exitPull(f, g.frames - EXIT_FRAMES);
  const bez = interpolate(t, [0, 0.35], [0, 1], clamp);
  return (
    <AbsoluteFill>
      <div style={{ position: "absolute", left: cx, top: cy, transform: `translate(-50%,-50%) translateY(${(pull * 900).toFixed(1)}px) rotate(${rot.toFixed(2)}deg) scale(${sc.toFixed(4)})` }}>
        <div style={{ position: "relative", width: pw, height: ph }}>
          {/* schermo: a pieno schermo il telefono non ha cornice, poi la cornice compare */}
          <div style={{ position: "absolute", inset: 0, borderRadius: 34 * bez, overflow: "hidden", background: "#000", boxShadow: bez > 0 ? `0 0 0 ${(7 * bez).toFixed(1)}px #2A2B2F, 0 0 0 ${(9 * bez).toFixed(1)}px #9A9BA0, 0 30px 60px rgba(0,0,0,${(0.35 * bez).toFixed(2)})` : undefined }}>
            <MediaView m={m} f={f} w={pw} h={ph} />
            {bez > 0 && <div style={{ position: "absolute", top: 10, left: "50%", width: 74, height: 22, borderRadius: 11, background: "#000", transform: "translateX(-50%)", opacity: bez }} />}
          </div>
        </div>
      </div>
    </AbsoluteFill>
  );
};

/**
 * "fpsduo": due iPhone orizzontali affiancati sopra la testa con lo stesso clip: a sinistra fluido ("iPhone 60"),
 * a destra a scatti ("Switch 30"). props: media, leftAt, rightAt, rollLeftAt, rollRightAt, y.
 */
export const FpsDuo: React.FC<G> = ({ g }) => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const p = g.props ?? {};
  const m = (p.media ?? {}) as Media;
  const w = 430;
  const h = w * (9 / 19.5);
  const pull = exitPull(f, g.frames - EXIT_FRAMES);
  const one = (x: number, at: number, rollAt: number, n: number, label: string, hi: boolean, hold: number) => {
    const age = f - at;
    if (age < 0) return null;
    const s = bounce(age, fps);
    const q = squash(age, LAND, true);
    const roll = rollValue(f, 0, n, rollAt, 14);
    const landed = f >= rollAt + 14;
    const beat = hi && landed ? 1 + 0.08 * (0.5 + 0.5 * Math.sin((f - rollAt) / 2.4)) : 1;
    return (
      <div style={{ position: "absolute", left: `${x * 100}%`, top: `${(g.y ?? 0.27) * 100}%`, transform: `translate(-50%,-50%) translateY(${((1 - s) * -260 + pull * -700).toFixed(1)}px) rotate(${wobble(age, hi ? -0.6 : 0.6).toFixed(2)}deg) scale(${q.sx.toFixed(3)}, ${q.sy.toFixed(3)})` }}>
        <div style={{ display: "flex", justifyContent: "center", marginBottom: 16 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 20px", borderRadius: 999, background: hi ? P.accent : "#0B0B0B", transform: `scale(${beat.toFixed(3)})`, boxShadow: hi ? `0 0 26px ${rgba(P.accent, 0.6)}` : "0 10px 24px rgba(0,0,0,0.25)" }}>
            <span style={{ fontFamily: MONO, fontWeight: 700, fontSize: 24, color: hi ? "#0B0B0B" : "rgba(255,255,255,0.7)", textTransform: "uppercase" }}>{label}</span>
            <Odometer value={roll} size={52} color={hi ? "#0B0B0B" : "#FFFFFF"} />
            <span style={{ fontFamily: INTER, fontWeight: 900, fontSize: 28, color: hi ? "#0B0B0B" : "#FFFFFF" }}>fps</span>
          </div>
        </div>
        <IPhone w={w} shadow>
          <MediaView m={m} f={f} w={w} h={h} hold={hold} />
        </IPhone>
      </div>
    );
  };
  return (
    <AbsoluteFill>
      {one(0.27, num(p.leftAt, 0), num(p.rollLeftAt, 20), 60, "iPhone", true, 1)}
      {one(0.73, num(p.rightAt, 30), num(p.rollRightAt, 40), 30, "Switch", false, 2)}
    </AbsoluteFill>
  );
};

/**
 * "gamestack": un iPhone orizzontale per gioco sopra la testa: ognuno cade dall'alto a molla (squash all'atterraggio),
 * il precedente vola via di lato. Etichetta mono sotto. props: items[{label, media, at}], y, w.
 */
export const GameStack: React.FC<G> = ({ g }) => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const p = g.props ?? {};
  const items = (Array.isArray(p.items) ? p.items : []) as { label: string; media: Media; at: number }[];
  const w = num(p.w, 640);
  const h = w * (9 / 19.5);
  const pull = exitPull(f, g.frames - EXIT_FRAMES);
  return (
    <AbsoluteFill>
      {items.map((it, i) => {
        const age = f - it.at;
        if (age < 0) return null;
        const next = items[i + 1];
        const gone = next && f >= next.at ? bounce(f - next.at, fps, BOUNCE_SNAP) : 0;
        if (gone > 1.05) return null;
        const s = bounce(age, fps);
        const q = squash(age, LAND, true);
        const side = i % 2 ? 1 : -1;
        const x = gone * side * 1100;
        const y = (1 - s) * -520 + pull * -800;
        const rot = wobble(age, side * 0.7) + gone * side * 18;
        return (
          <div key={i} style={{ position: "absolute", left: "50%", top: `${(g.y ?? 0.27) * 100}%`, zIndex: 10 + i, transform: `translate(-50%,-50%) translate(${x.toFixed(1)}px, ${y.toFixed(1)}px) rotate(${rot.toFixed(2)}deg) scale(${q.sx.toFixed(3)}, ${q.sy.toFixed(3)})` }}>
            <IPhone w={w}>
              <MediaView m={it.media} f={age} w={w} h={h} />
            </IPhone>
            <div style={{ display: "flex", justifyContent: "center", marginTop: 14 }}>
              <span style={{ padding: "8px 18px", borderRadius: 999, background: "#0B0B0B", color: P.accent, fontFamily: MONO, fontWeight: 700, fontSize: 26, letterSpacing: "0.04em" }}>{it.label}</span>
            </div>
          </div>
        );
      })}
    </AbsoluteFill>
  );
};
