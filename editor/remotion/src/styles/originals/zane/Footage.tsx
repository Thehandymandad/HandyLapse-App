import React from "react";
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { Clip, isSprite, type Sprite } from "../../../lib/media";
import type { GraphicEvent } from "../../../lib/timeline";
import { bounce, BOUNCE, BOUNCE_SOFT, breathe, EXIT_FRAMES, exitPull, LAND, nudge, squash, STAGGER, wobble } from "../../../motion/bouncy";
import { clamp, INTER, MONO, P, rgba } from "../pulse/shared";
import { KWord, parseRuns } from "./text";

/**
 * Il girato DENTRO le grafiche (README di movimento, sezione 5): 1–3 s del soggetto in un telefono inclinato o in
 * schede 3D, con dietro la copia sfocata dello stesso girato. `clip: [da, a]` nelle props = secondi del montato
 * (hf-project ne fa un foglio di fotogrammi).
 */

/** Fondo a schermo intero: girato sfocato e scurito, con vignetta d'accento (opzionale per phone/cards: bg "blur"). */
export const BlurBackdrop: React.FC<{ sprite: Sprite; f: number; dark?: number }> = ({ sprite, f, dark = 0.55 }) => (
  <AbsoluteFill>
    <Clip sprite={sprite} f={f} w={1080} h={1920} blur={40} zoom={1.15} />
    <AbsoluteFill style={{ background: `rgba(5,8,5,${dark})` }} />
    <AbsoluteFill style={{ background: `radial-gradient(ellipse 70% 45% at 50% 50%, ${rgba(P.accent, 0.1)} 0%, rgba(0,0,0,0) 70%)` }} />
  </AbsoluteFill>
);

/** Titolo sopra le grafiche: "• LIVE *updates*", "In this video" (mono piccolo) ecc. */
const Title: React.FC<{ text: string; f: number; fps: number; y: number; size?: number }> = ({ text, f, fps, y, size = 72 }) => {
  const runs = parseRuns(text)[0] ?? [];
  return (
    <div style={{ position: "absolute", left: 0, right: 0, top: y, display: "flex", justifyContent: "center", alignItems: "baseline", columnGap: size * 0.22 }}>
      {runs.map((r, i) => (
        <KWord key={i} run={r} f={f} start={2 + i * STAGGER.word} fps={fps} entry="pop" size={size} />
      ))}
    </div>
  );
};

type Note = { at: number; title: string; sub?: string };

/**
 * "phoneclip": telefono inclinato in 3D con il girato dentro che ondeggia piano; notifiche iOS che arrivano a molla e
 * spingono giù le precedenti; titolo sopra e parola in corsivo sotto.
 * props: clip, header (mono, es. "In this video"), title ("• LIVE *updates*"), caption ("*walk away.*"), captionAt,
 * notifications [{at, title, sub}], tilt (gradi, default −12), bg ("blur" = fondo sfocato a schermo intero), gray.
 */
export const PhoneClip: React.FC<{ g: GraphicEvent }> = ({ g }) => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const pr = g.props ?? {};
  const sprite = isSprite(pr.clip) ? pr.clip : null;
  const tilt = typeof pr.tilt === "number" ? pr.tilt : -12;
  const s = bounce(f, fps, BOUNCE_SOFT);
  const pull = exitPull(f, g.frames - EXIT_FRAMES);
  const W = 500;
  const H = 1030;
  const cy = (g.y ?? 0.52) * 1920;
  const notes = (Array.isArray(pr.notifications) ? (pr.notifications as Note[]) : []).filter((n) => f >= n.at);
  const lastLand = notes.length ? notes[notes.length - 1].at + LAND : -99;
  const float = Math.sin(f / 22) * 8;
  const fade = interpolate(f, [g.frames - 3, g.frames], [1, 0], clamp);
  return (
    <AbsoluteFill style={{ opacity: fade }}>
      {pr.bg === "blur" && sprite && <BlurBackdrop sprite={sprite} f={f} />}
      {typeof pr.header === "string" && (
        <div style={{ position: "absolute", top: cy - H / 2 - 120, left: 0, right: 0, textAlign: "center", fontFamily: MONO, fontSize: 28, letterSpacing: 4, color: rgba("#FFFFFF", 0.7), textTransform: "uppercase", opacity: Math.min(1, f / 6) }}>
          {pr.header}
        </div>
      )}
      {typeof pr.title === "string" && <Title text={pr.title} f={f} fps={fps} y={cy - H / 2 - 150} />}
      <div style={{ position: "absolute", left: 0, right: 0, top: 0, bottom: 0, perspective: 1600 }}>
        <div
          style={{
            position: "absolute",
            left: 540 - W / 2,
            top: cy - H / 2,
            width: W,
            height: H,
            transform: `translateY(${((1 - s) * 700 + float + pull * -1500).toFixed(1)}px) rotateY(${(tilt * (0.6 + 0.4 * s) + Math.sin(f / 35) * 2).toFixed(2)}deg) rotateX(${((1 - s) * 25 + 4).toFixed(2)}deg) rotateZ(${(wobble(f, 0.5) * 0.6 - 3).toFixed(2)}deg) scale(${breathe(f, 0.008)})`,
            borderRadius: 74,
            background: "#0B0C0B",
            padding: 14,
            boxShadow: `0 60px 120px rgba(0,0,0,0.6), 0 0 0 2px rgba(255,255,255,0.12), inset 0 0 0 2px rgba(255,255,255,0.06), 0 0 80px ${rgba(P.accent, 0.12)}`,
          }}
        >
          <div style={{ position: "relative", width: W - 28, height: H - 28, borderRadius: 60, overflow: "hidden", background: "#111" }}>
            {sprite && <Clip sprite={sprite} f={f} w={W - 28} h={H - 28} gray={!!pr.gray} />}
            <div style={{ position: "absolute", left: "50%", top: 18, width: 150, height: 42, marginLeft: -75, borderRadius: 21, background: "#000" }} />
            {notes.map((n, i) => {
              const age = f - n.at;
              const ns = bounce(age, fps, BOUNCE);
              const q = squash(age, LAND, true);
              const idx = notes.length - 1 - i; // 0 = la più recente, in alto
              const off = idx * 118 + (idx > 0 ? nudge(f, lastLand, 10) : 0);
              return (
                <div
                  key={i}
                  style={{
                    position: "absolute",
                    left: 18,
                    right: 18,
                    top: 90 + off,
                    transform: `translateY(${((1 - ns) * -160).toFixed(1)}px) scale(${q.sx.toFixed(3)}, ${q.sy.toFixed(3)})`,
                    opacity: Math.min(1, age / 3) * (idx > 2 ? 0 : 1 - idx * 0.12),
                    display: "flex",
                    alignItems: "center",
                    gap: 16,
                    padding: "16px 18px",
                    borderRadius: 26,
                    background: "rgba(245,247,244,0.94)",
                    boxShadow: "0 12px 30px rgba(0,0,0,0.35)",
                    fontFamily: INTER,
                  }}
                >
                  <div style={{ width: 52, height: 52, borderRadius: 14, background: P.accent, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    <svg width={30} height={30} viewBox="0 0 24 24">
                      <path d="M5 12.5l4.5 4.5L19 7" fill="none" stroke="#0A0B0E" strokeWidth={3.2} strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontWeight: 800, fontSize: 26, color: "#0A0B0E" }}>{n.title}</div>
                    {n.sub && <div style={{ fontWeight: 500, fontSize: 20, color: "rgba(10,11,14,0.55)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{n.sub}</div>}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
      {typeof pr.caption === "string" && (
        <div style={{ position: "absolute", left: 0, right: 0, top: cy + H / 2 - 210, display: "flex", justifyContent: "center", columnGap: 30 }}>
          {(parseRuns(pr.caption)[0] ?? []).map((r, i) => (
            <KWord key={i} run={r} f={f} start={(typeof pr.captionAt === "number" ? pr.captionAt : 10) + i * STAGGER.word} fps={fps} entry="wipe" size={130} />
          ))}
        </div>
      )}
    </AbsoluteFill>
  );
};

type Card = { clip?: Sprite; at?: number; label?: string };

/**
 * "cards3d": 2–3 schede di girato inclinate in 3D, impilate, che cadono una dopo l'altra (le precedenti vengono spinte);
 * pillola "CHAPTER 01", etichetta mono ("B-ROLL 02 · EYES") e titolo "Advanced *B-roll*" sotto.
 * props: cards [{clip, at, label}], pill, tag, title, titleAt, gray, bg ("blur": fondo sfocato dalla prima scheda).
 */
export const Cards3D: React.FC<{ g: GraphicEvent }> = ({ g }) => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const pr = g.props ?? {};
  const cards = (Array.isArray(pr.cards) ? (pr.cards as Card[]) : []).slice(0, 3);
  const pull = exitPull(f, g.frames - EXIT_FRAMES);
  const cy = (g.y ?? 0.42) * 1920;
  const fade = interpolate(f, [g.frames - 3, g.frames], [1, 0], clamp);
  const first = cards.find((c) => isSprite(c.clip))?.clip;
  const W = 780;
  const H = 440;
  const STEP = 205;
  // pillola e titolo stanno sotto l'ultima scheda
  const lastBottom = cy + ((cards.length - 1) / 2) * STEP + H / 2;
  return (
    <AbsoluteFill style={{ opacity: fade }}>
      {pr.bg === "blur" && first && <BlurBackdrop sprite={first} f={f} dark={0.62} />}
      <div style={{ position: "absolute", inset: 0, perspective: 1800, transform: `translateY(${(pull * -1400).toFixed(1)}px)` }}>
        {cards.map((c, i) => {
          const at = c.at ?? i * STAGGER.card * 2;
          const age = f - at;
          if (age < 0) return null;
          const s = bounce(age, fps, BOUNCE_SOFT);
          const later = cards.slice(i + 1).map((d, j) => (d.at ?? (i + 1 + j) * STAGGER.card * 2) + LAND);
          const push = later.reduce((acc, t) => acc + nudge(f, t, 12), 0);
          const y = cy - H / 2 + (i - (cards.length - 1) / 2) * STEP + push;
          const rz = (i % 2 === 0 ? -5 : 4) + wobble(age, 0.6) * 0.5;
          return (
            <div
              key={i}
              style={{
                position: "absolute",
                left: 540 - W / 2 + (i % 2 === 0 ? -30 : 40),
                top: y,
                width: W,
                height: H,
                transform: `translateY(${((1 - s) * -900).toFixed(1)}px) rotateX(${(18 + (1 - s) * 30).toFixed(1)}deg) rotateZ(${rz.toFixed(2)}deg) translateY(${(Math.sin((f + i * 20) / 25) * 6).toFixed(1)}px)`,
                borderRadius: 34,
                overflow: "hidden",
                boxShadow: `0 40px 90px rgba(0,0,0,0.65), 0 0 0 2px rgba(255,255,255,0.14)`,
                background: "#111",
              }}
            >
              {isSprite(c.clip) && <Clip sprite={c.clip} f={age} w={W} h={H} gray={!!pr.gray} />}
              {c.label && (
                <div style={{ position: "absolute", left: 22, bottom: 18, fontFamily: MONO, fontSize: 22, letterSpacing: 3, color: "#FFFFFF", textTransform: "uppercase", textShadow: "0 2px 8px rgba(0,0,0,0.8)" }}>{c.label}</div>
              )}
            </div>
          );
        })}
      </div>
      {typeof pr.pill === "string" && (
        <div
          style={{
            position: "absolute",
            left: "50%",
            top: lastBottom + 50,
            transform: `translateX(-50%) scale(${bounce(f - 8, fps).toFixed(3)})`,
            padding: "8px 22px",
            borderRadius: 999,
            background: P.accent,
            color: "#0A0B0E",
            fontFamily: MONO,
            fontWeight: 700,
            fontSize: 24,
            letterSpacing: 2,
            boxShadow: P.glow,
          }}
        >
          {pr.pill}
        </div>
      )}
      {typeof pr.title === "string" && (
        <div style={{ position: "absolute", left: 0, right: 0, top: lastBottom + 120, display: "flex", flexDirection: "column", alignItems: "center", lineHeight: 0.95 }}>
          {parseRuns(pr.title).map((line, li) => (
            <div key={li} style={{ display: "flex", columnGap: 26 }}>
              {line.map((r, i) => (
                <KWord key={i} run={r} f={f} start={(typeof pr.titleAt === "number" ? pr.titleAt : 12) + (li * 2 + i) * STAGGER.word} fps={fps} entry="pop" size={120} />
              ))}
            </div>
          ))}
        </div>
      )}
    </AbsoluteFill>
  );
};
