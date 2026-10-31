import React from "react";
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import type { GraphicEvent } from "../../../lib/timeline";
import { Odometer, rollValue } from "../zane/parts";
import { IPhone, MediaView, type Media } from "./Device";
import { A, blurIn, clamp, easeOut, Glass, Glyph, lin, outro, pop, Rich, SANS, smooth } from "./kit";

type G = { g: GraphicEvent };
const num = (v: unknown, d: number) => (typeof v === "number" ? v : d);
const str = (v: unknown, d = "") => (typeof v === "string" ? v : d);

/** "stage": fondo bianco Apple a schermo intero (sotto le altre grafiche). props.cut: entra/esce senza dissolvenza. */
export const Stage: React.FC<G> = ({ g }) => {
  const f = useCurrentFrame();
  const cut = !!g.props?.cut;
  const o = cut ? 1 : Math.min(lin(f, 0, 5), outro(f, g.frames, 5));
  return (
    <AbsoluteFill style={{ opacity: o, background: `radial-gradient(120% 80% at 50% 38%, #FFFFFF 0%, ${A.bg} 60%, #E9EBF0 100%)` }}>
      <AbsoluteFill style={{ backgroundImage: `radial-gradient(${A.line} 1.6px, transparent 1.6px)`, backgroundSize: "44px 44px", opacity: 0.55, transform: `translateY(${(-f * 0.4).toFixed(1)}px)` }} />
    </AbsoluteFill>
  );
};

/** "title": titolo grande, parola per parola (props.text con \n e *blu*, size, wordAt[], light = bianco sul girato). */
export const Title: React.FC<G> = ({ g }) => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const p = g.props ?? {};
  const size = num(p.size, 120);
  const light = !!p.light;
  const wordAt = Array.isArray(p.wordAt) ? (p.wordAt as number[]) : [];
  let wi = 0;
  const lines = str(p.text, g.text ?? "").split("\n");
  return (
    <AbsoluteFill style={{ opacity: outro(f, g.frames) }}>
      <div style={{ position: "absolute", left: 60, right: 60, top: `${(g.y ?? 0.2) * 100}%`, transform: "translateY(-50%)", textAlign: "center" }}>
        {lines.map((line, li) => (
          <div key={li} style={{ display: "flex", justifyContent: "center", flexWrap: "wrap", columnGap: size * 0.24, lineHeight: 1.0 }}>
            {line.split(/(\*[^*]+\*|\s+)/).filter((w) => w && !/^\s+$/.test(w)).map((w, k) => {
              const at = wordAt[wi] ?? wi * 3;
              wi++;
              const blue = w.startsWith("*");
              const t = blue ? w.slice(1, -1) : w;
              return (
                <span
                  key={k}
                  style={{
                    display: "inline-block",
                    fontFamily: SANS,
                    fontWeight: 900,
                    fontSize: size,
                    letterSpacing: "-0.045em",
                    color: blue ? A.blue : light ? "#FFFFFF" : A.ink,
                    textShadow: light ? "0 6px 24px rgba(0,0,0,0.45)" : undefined,
                    ...(at < 0 ? {} : blurIn(f, fps, at, size * 0.35)),
                  }}
                >
                  {t}
                </span>
              );
            })}
          </div>
        ))}
      </div>
    </AbsoluteFill>
  );
};

/**
 * "hero": iPhone con un clip o un'immagine dentro (props.media), con zoom veloce in entrata e spinta lenta poi.
 * props: w (larghezza schermo), landscape, tilt (gradi), zoomFrom (scala iniziale), label (pillola sotto).
 */
export const Hero: React.FC<G> = ({ g }) => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const p = g.props ?? {};
  const w = num(p.w, 860);
  const s = smooth(f, fps);
  const zoomFrom = num(p.zoomFrom, 0.7);
  const scale = zoomFrom + (1 - zoomFrom) * s + f * num(p.push, 0.0018);
  const tilt = num(p.tilt, -8) * (1 - s * 0.6);
  const o = outro(f, g.frames, 6);
  return (
    <AbsoluteFill style={{ perspective: 1800, opacity: o }}>
      <div style={{ position: "absolute", left: "50%", top: `${(g.y ?? 0.4) * 100}%`, transform: `translate(-50%,-50%) scale(${scale.toFixed(4)}) rotateY(${tilt.toFixed(2)}deg) rotateZ(${(num(p.roll, -3) * (1 - s)).toFixed(2)}deg)`, opacity: p.instant ? 1 : Math.min(1, f / 3) }}>
        <IPhone w={w} landscape={p.landscape !== false}>
          <MediaView m={(p.media ?? {}) as Media} f={f} w={w} h={p.landscape === false ? w * (19.5 / 9) : w * (9 / 19.5)} />
        </IPhone>
        {typeof p.label === "string" && (
          <div style={{ display: "flex", justifyContent: "center", marginTop: 34, ...blurIn(f, fps, num(p.labelAt, 8), 20) }}>
            <Glass radius={999} pad="14px 30px" style={{ fontFamily: SANS, fontWeight: 800, fontSize: 40, color: A.ink, letterSpacing: "-0.02em" }}>
              <Rich text={p.label} />
            </Glass>
          </div>
        )}
      </div>
    </AbsoluteFill>
  );
};

/** "promise": pillola della promessa ("Alla fine: *cosa ti serve*") con clessidra che gira. */
export const Promise_: React.FC<G> = ({ g }) => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const p = g.props ?? {};
  const s = pop(f, fps);
  return (
    <AbsoluteFill style={{ opacity: outro(f, g.frames) }}>
      <div style={{ position: "absolute", left: "50%", top: `${(g.y ?? 0.2) * 100}%`, transform: `translate(-50%,-50%) scale(${(0.6 + 0.4 * s).toFixed(3)})`, opacity: Math.min(1, f / 4) }}>
        <Glass radius={999} pad="20px 36px 20px 24px" style={{ display: "flex", alignItems: "center", gap: 18, whiteSpace: "nowrap" }}>
          <div style={{ width: 64, height: 64, borderRadius: 32, background: A.blue, display: "flex", alignItems: "center", justifyContent: "center", transform: `rotate(${(easeOut(lin(f, 10, 26)) * 180).toFixed(1)}deg)` }}>
            <Glyph name="hourglass" size={38} color="#FFFFFF" stroke={2.2} />
          </div>
          <Rich text={str(p.text, "Alla fine: *cosa ti serve*")} style={{ fontFamily: SANS, fontWeight: 800, fontSize: 46, color: A.ink, letterSpacing: "-0.025em" }} />
        </Glass>
      </div>
    </AbsoluteFill>
  );
};

/** "progress": barra sottile in alto che si riempie fino al momento promesso (props.label alla fine). */
export const Progress: React.FC<G> = ({ g }) => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const p = g.props ?? {};
  const doneAt = num(p.doneAt, g.frames - 1);
  const t = Math.min(1, f / Math.max(1, doneAt));
  const s = smooth(f, fps);
  const done = f >= doneAt;
  const dp = done ? pop(f, fps, doneAt) : 0;
  return (
    <AbsoluteFill style={{ opacity: Math.min(lin(f, 0, 6), outro(f, g.frames, 4)) }}>
      <div style={{ position: "absolute", left: 90, right: 90, top: `${(g.y ?? 0.135) * 100}%`, transform: `translateY(${((1 - s) * -30).toFixed(1)}px)`, display: "flex", alignItems: "center", gap: 18 }}>
        <div style={{ flex: 1, height: 14, borderRadius: 7, background: "rgba(255,255,255,0.75)", boxShadow: A.shadowSoft, overflow: "hidden", border: "1px solid rgba(255,255,255,0.9)" }}>
          <div style={{ width: `${(t * 100).toFixed(2)}%`, height: "100%", borderRadius: 7, background: `linear-gradient(90deg, #6FA0FF, ${A.blue})` }} />
        </div>
        <div style={{ padding: done ? "12px 26px" : "8px 18px", borderRadius: 999, background: done ? A.blue : "rgba(255,255,255,0.92)", boxShadow: A.shadowSoft, fontFamily: SANS, fontWeight: 800, fontSize: done ? 26 + 14 * Math.min(1, dp) : 26, transform: done ? `scale(${(0.9 + 0.1 * dp).toFixed(3)})` : undefined, color: done ? "#FFFFFF" : A.ink, whiteSpace: "nowrap", display: "flex", gap: 8, alignItems: "center" }}>
          <Glyph name={done ? "check" : "hourglass"} size={24} color={done ? "#FFFFFF" : A.blue} stroke={2.4} />
          {str(p.label, "Cosa ti serve")}
        </div>
      </div>
    </AbsoluteFill>
  );
};

/**
 * "repo": la pagina GitHub del progetto in vetro. props: owner, name, desc, stars (numero), starsAt, plus ("+" dopo il
 * numero), chips[] (etichette), chipsAt.
 */
export const Repo: React.FC<G> = ({ g }) => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const p = g.props ?? {};
  const s = smooth(f, fps);
  const starsAt = num(p.starsAt, 30);
  const stars = rollValue(f, 0, num(p.stars, 10000), starsAt, 26);
  const landed = f >= starsAt + 26;
  const chips = Array.isArray(p.chips) ? (p.chips as string[]) : [];
  const chipsAt = num(p.chipsAt, 20);
  const pulse = landed ? 1 + 0.08 * Math.max(0, Math.sin((f - starsAt - 26) / 3)) * Math.max(0, 1 - (f - starsAt - 26) / 18) : 1;
  return (
    <AbsoluteFill style={{ opacity: outro(f, g.frames) }}>
      <div style={{ position: "absolute", left: "50%", top: `${(g.y ?? 0.25) * 100}%`, width: 900, transform: `translate(-50%,-50%) translateY(${((1 - s) * 80).toFixed(1)}px) scale(${(0.94 + 0.06 * s).toFixed(3)})`, opacity: Math.min(1, f / 5) }}>
        <Glass radius={44} pad="34px 40px">
          <div style={{ display: "flex", alignItems: "center", gap: 16, fontFamily: SANS, fontSize: 30, color: A.sub, fontWeight: 600 }}>
            <Glyph name="repo" size={36} color={A.sub} />
            github.com
          </div>
          <div style={{ fontFamily: SANS, fontWeight: 800, fontSize: 64, letterSpacing: "-0.035em", color: A.ink, marginTop: 12 }}>
            <span style={{ color: A.sub, fontWeight: 600 }}>{str(p.owner, "seedds")} / </span>
            <span style={{ color: A.blue }}>{str(p.name, "nxnative")}</span>
          </div>
          <div style={{ fontFamily: SANS, fontWeight: 500, fontSize: 31, lineHeight: 1.3, color: "#3A3A3F", marginTop: 10 }}>{str(p.desc)}</div>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 26 }}>
            <div style={{ display: "flex", gap: 12 }}>
              {chips.map((c, i) => (
                <span key={i} style={{ padding: "8px 18px", borderRadius: 999, background: "rgba(31,107,255,0.10)", color: A.blue, fontFamily: SANS, fontWeight: 700, fontSize: 26, ...blurIn(f, fps, chipsAt + i * 4, 14) }}>
                  {c}
                </span>
              ))}
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 22px", borderRadius: 22, background: landed ? A.blue : "rgba(11,11,15,0.05)", transform: `scale(${pulse.toFixed(3)})` }}>
              <Glyph name="star" size={40} color={landed ? "#FFD60A" : A.sub} />
              <Odometer value={stars} size={48} color={landed ? "#FFFFFF" : A.ink} />
              {p.plus !== false && <span style={{ fontFamily: SANS, fontWeight: 900, fontSize: 44, color: landed ? "#FFFFFF" : A.ink, opacity: landed ? 1 : 0 }}>+</span>}
            </div>
          </div>
        </Glass>
      </div>
    </AbsoluteFill>
  );
};

/**
 * "chip": il chip dello Switch che si dissolve e diventa il chip Apple, con l'etichetta Metal.
 * props: emuAt (pillola "Emulatore → finge di essere uno Switch"), noAt (la pillola si barra e cade), appleAt
 * (dissolvenza), metalAt (etichetta Metal), from/to (nomi dei chip).
 */
export const Chip: React.FC<G> = ({ g }) => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const p = g.props ?? {};
  const emuAt = num(p.emuAt, 0);
  const noAt = num(p.noAt, 40);
  const appleAt = num(p.appleAt, 70);
  const metalAt = num(p.metalAt, appleAt + 24);
  const s = smooth(f, fps);
  const N = 9;
  const size = 440;
  const tiles: React.ReactNode[] = [];
  for (let i = 0; i < N * N; i++) {
    const x = i % N;
    const y = Math.floor(i / N);
    // dissolvenza dal centro verso fuori, con un po' di caso
    const d = Math.hypot(x - (N - 1) / 2, y - (N - 1) / 2) / ((N - 1) * 0.71);
    const rnd = (Math.sin(i * 12.9898) * 43758.5453) % 1;
    const at = appleAt + d * 14 + Math.abs(rnd) * 6;
    const t = easeOut(lin(f, at, at + 8));
    tiles.push(
      <div
        key={i}
        style={{
          position: "absolute",
          left: (x * size) / N,
          top: (y * size) / N,
          width: size / N + 0.6,
          height: size / N + 0.6,
          background: `linear-gradient(135deg, #3A3B40, #1C1D21)`,
          opacity: 1 - t,
          transform: `translateZ(${(t * 120).toFixed(1)}px) scale(${(1 - t * 0.6).toFixed(3)})`,
        }}
      />,
    );
  }
  const apple = lin(f, appleAt + 6, appleAt + 22);
  const swLabel = 1 - lin(f, appleAt - 2, appleAt + 6);
  const emu = blurIn(f, fps, emuAt, 30);
  const no = lin(f, noAt, noAt + 6);
  const fall = lin(f, noAt + 10, noAt + 24);
  const metal = pop(f, fps, metalAt);
  const pins = (side: number) =>
    Array.from({ length: 9 }, (_, k) => (
      <div
        key={`${side}-${k}`}
        style={{
          position: "absolute",
          width: side % 2 ? 34 : 14,
          height: side % 2 ? 14 : 34,
          borderRadius: 3,
          background: "linear-gradient(180deg,#E7E7EA,#A9AAB0)",
          ...(side === 0 ? { top: -30, left: 40 + k * 44 } : side === 1 ? { right: -30, top: 40 + k * 44 } : side === 2 ? { bottom: -30, left: 40 + k * 44 } : { left: -30, top: 40 + k * 44 }),
        }}
      />
    ));
  return (
    <AbsoluteFill style={{ opacity: outro(f, g.frames) }}>
      {/* pillola dell'emulatore */}
      <div style={{ position: "absolute", left: "50%", top: `${((g.y ?? 0.42) - num(p.emuGap, 0.2)) * 100}%`, transform: `translate(-50%,-50%) translateY(${(fall * 260).toFixed(1)}px) rotate(${(fall * 14).toFixed(1)}deg)`, opacity: 1 - fall, ...{} }}>
        <div style={{ ...emu, display: "flex", alignItems: "center", gap: 16, whiteSpace: "nowrap" }}>
          <Glass radius={999} pad="16px 30px" style={{ position: "relative", fontFamily: SANS, fontWeight: 800, fontSize: 44, color: A.ink }}>
            Emulatore <span style={{ color: A.sub, fontWeight: 600 }}>= finge di essere uno Switch</span>
            <div style={{ position: "absolute", left: 24, right: 24, top: "50%", height: 7, borderRadius: 4, background: "#FF3B30", transformOrigin: "0 50%", transform: `scaleX(${no.toFixed(3)})` }} />
          </Glass>
        </div>
      </div>
      {/* il chip */}
      <div style={{ position: "absolute", left: "50%", top: `${(g.y ?? 0.42) * 100}%`, transform: `translate(-50%,-50%) scale(${(0.86 + 0.14 * s).toFixed(3)})`, perspective: 1600 }}>
        <div style={{ position: "relative", width: size, height: size, transformStyle: "preserve-3d", transform: `rotateX(${(48 - f * 0.05).toFixed(2)}deg) rotateZ(${(-28 + f * 0.12).toFixed(2)}deg)` }}>
          {[0, 1, 2, 3].map((side) => pins(side))}
          {/* chip Apple (sotto) */}
          <div style={{ position: "absolute", inset: 0, borderRadius: 36, background: "linear-gradient(135deg,#FDFDFE,#D5D7DD 55%,#F4F5F8)", boxShadow: `0 40px 80px rgba(20,30,60,${(0.25 + 0.15 * apple).toFixed(2)}), 0 0 ${(apple * 90).toFixed(0)}px rgba(31,107,255,${(apple * 0.55).toFixed(2)})`, border: `3px solid rgba(31,107,255,${(apple * 0.8).toFixed(2)})`, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
            <div style={{ opacity: apple, fontFamily: SANS, fontWeight: 900, fontSize: 92, letterSpacing: "-0.05em", color: A.ink }}>{str(p.to, "A17 Pro")}</div>
            <div style={{ opacity: apple, fontFamily: SANS, fontWeight: 700, fontSize: 32, color: A.blue, marginTop: 4 }}>chip Apple</div>
          </div>
          {/* chip Switch (sopra, a tessere che si dissolvono) */}
          <div style={{ position: "absolute", inset: 0, borderRadius: 36, overflow: "hidden", transformStyle: "preserve-3d" }}>{tiles}</div>
          <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", opacity: swLabel }}>
            <div style={{ fontFamily: SANS, fontWeight: 900, fontSize: 100, letterSpacing: "-0.04em", color: "#F2F2F5" }}>{str(p.from, "SWITCH")}</div>
            <div style={{ fontFamily: SANS, fontWeight: 600, fontSize: 30, color: "#9A9BA2" }}>{str(p.fromSub, "NVIDIA Tegra X1")}</div>
          </div>
        </div>
      </div>
      {/* etichetta Metal */}
      <div style={{ position: "absolute", left: "50%", top: `${((g.y ?? 0.42) + 0.2) * 100}%`, transform: `translate(-50%,-50%) scale(${Math.max(0, metal).toFixed(3)})`, opacity: f >= metalAt ? 1 : 0 }}>
        <Glass radius={999} pad="14px 34px" style={{ display: "flex", alignItems: "center", gap: 14, whiteSpace: "nowrap" }}>
          <Glyph name="bolt" size={38} color={A.blue} stroke={2.2} />
          <span style={{ fontFamily: SANS, fontWeight: 800, fontSize: 42, color: A.ink }}>
            Grafica su <span style={{ color: A.blue }}>Metal</span>
          </span>
        </Glass>
      </div>
    </AbsoluteFill>
  );
};

/**
 * "fps": confronto Switch 30 fps / iPhone 60 fps con lo stesso clip (sopra a scatti, sotto fluido).
 * props: media, thirtyAt, sixtyAt, topY, botY.
 */
export const FpsCompare: React.FC<G> = ({ g }) => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const p = g.props ?? {};
  const m = (p.media ?? {}) as Media;
  const sixtyAt = num(p.sixtyAt, 20);
  const thirtyAt = num(p.thirtyAt, 60);
  const w = 760;
  const h = w * (9 / 19.5);
  const row = (y: number, at: number, label: string, n: number, blue: boolean, hold: number) => {
    const s = smooth(f, fps, at - 4);
    const roll = rollValue(f, 0, n, at, 16);
    const landed = f >= at + 16;
    const beat = blue && landed ? 1 + 0.07 * (0.5 + 0.5 * Math.sin((f - at - 16) / 2.6)) : 1;
    return (
      <div style={{ position: "absolute", left: "50%", top: `${y * 100}%`, transform: `translate(-50%,-50%) translateY(${((1 - s) * 90).toFixed(1)}px)`, opacity: Math.min(1, Math.max(0, (f - at + 4) / 5)) }}>
        <IPhone w={w}>
          <MediaView m={m} f={f} w={w} h={h} hold={hold} />
          {!blue && <div style={{ position: "absolute", inset: 0, background: "rgba(255,255,255,0.08)", filter: "grayscale(0.4)" }} />}
        </IPhone>
        <div style={{ position: "absolute", left: -20, top: -46, display: "flex", alignItems: "center", gap: 14, padding: "12px 24px", borderRadius: 26, background: blue ? A.blue : "#FFFFFF", boxShadow: A.shadow, transform: `scale(${beat.toFixed(3)})`, transformOrigin: "0 100%" }}>
          <span style={{ fontFamily: SANS, fontWeight: 700, fontSize: 32, color: blue ? "rgba(255,255,255,0.85)" : A.sub }}>{label}</span>
          <Odometer value={roll} size={58} color={blue ? "#FFFFFF" : A.ink} />
          <span style={{ fontFamily: SANS, fontWeight: 800, fontSize: 34, color: blue ? "#FFFFFF" : A.ink }}>fps</span>
        </div>
      </div>
    );
  };
  return (
    <AbsoluteFill style={{ opacity: outro(f, g.frames) }}>
      {row(num(p.topY, 0.3), sixtyAt, "iPhone", 60, true, 1)}
      {row(num(p.botY, 0.54), thirtyAt, "Primo Switch", 30, false, 2)}
    </AbsoluteFill>
  );
};

/**
 * "burst": raffica di telefoni, uno per nome (props.items[{label, media, at}]): il nuovo arriva da destra girando,
 * i precedenti arretrano. Il nome grande sotto.
 */
export const Burst: React.FC<G> = ({ g }) => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const p = g.props ?? {};
  const items = (Array.isArray(p.items) ? p.items : []) as { label: string; media: Media; at: number }[];
  const w = 820;
  const h = w * (9 / 19.5);
  const cur = items.reduce((k, it, i) => (f >= it.at ? i : k), 0);
  return (
    <AbsoluteFill style={{ perspective: 1800, opacity: outro(f, g.frames) }}>
      {items.map((it, i) => {
        if (f < it.at - 1 || i < cur - 2) return null;
        const s = smooth(f, fps, it.at);
        const back = cur - i; // quanti ne sono arrivati dopo
        const bs = back > 0 ? smooth(f, fps, items[i + 1].at) : 0;
        const depth = back > 0 ? back - 1 + bs : 0;
        const x = (1 - s) * 900 - depth * 60;
        const y = -depth * 70;
        const sc = 1 - depth * 0.1;
        return (
          <div key={i} style={{ position: "absolute", left: "50%", top: `${(g.y ?? 0.36) * 100}%`, zIndex: 10 + i, transform: `translate(-50%,-50%) translate(${x.toFixed(1)}px, ${y.toFixed(1)}px) scale(${sc.toFixed(3)}) rotateY(${((1 - s) * -40 + depth * 6).toFixed(2)}deg)`, opacity: Math.max(0, 1 - Math.max(0, depth - 1.2)), filter: depth > 0.3 ? `brightness(${(1 - depth * 0.12).toFixed(2)})` : undefined }}>
            <IPhone w={w}>
              <MediaView m={it.media} f={f - it.at} w={w} h={h} />
            </IPhone>
          </div>
        );
      })}
      {items.map((it, i) =>
        i === cur && f >= it.at ? (
          <div key={`l${i}`} style={{ position: "absolute", left: 0, right: 0, top: `${((g.y ?? 0.36) + 0.2) * 100}%`, textAlign: "center", fontFamily: SANS, fontWeight: 900, fontSize: 96, letterSpacing: "-0.045em", color: A.ink, ...blurIn(f, fps, it.at, 30) }}>
            <Rich text={it.label} />
          </div>
        ) : null,
      )}
    </AbsoluteFill>
  );
};

/**
 * "grid": griglia di giochi che si riempie (props.items[media], cols), con il contatore al centro (count, countAt) e
 * la nota (note, noteAt).
 */
export const Grid: React.FC<G> = ({ g }) => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const p = g.props ?? {};
  const items = (Array.isArray(p.items) ? p.items : []) as Media[];
  const cols = num(p.cols, 3);
  const tw = 300;
  const th = 170;
  const gap = 22;
  const rows = Math.ceil(items.length / cols);
  const W = cols * tw + (cols - 1) * gap;
  const H = rows * th + (rows - 1) * gap;
  const countAt = num(p.countAt, 10);
  const noteAt = num(p.noteAt, 50);
  const cs = pop(f, fps, countAt);
  const roll = rollValue(f, 0, num(p.count, 100), countAt, 20);
  return (
    <AbsoluteFill style={{ opacity: outro(f, g.frames) }}>
      <div style={{ position: "absolute", left: "50%", top: `${(g.y ?? 0.38) * 100}%`, width: W, height: H, transform: `translate(-50%,-50%) scale(${(1.04 - f * 0.0007).toFixed(4)})` }}>
        {items.map((m, i) => {
          const c = i % cols;
          const r = Math.floor(i / cols);
          const d = Math.hypot(c - (cols - 1) / 2, r - (rows - 1) / 2);
          const at = d * 2.4 + (i % 2);
          const s = pop(f, fps, at);
          return (
            <div key={i} style={{ position: "absolute", left: c * (tw + gap), top: r * (th + gap), width: tw, height: th, borderRadius: 22, overflow: "hidden", boxShadow: A.shadowSoft, transform: `scale(${Math.max(0, s).toFixed(3)})`, opacity: Math.min(1, Math.max(0, (f - at) / 3)), border: "2px solid rgba(255,255,255,0.9)" }}>
              <MediaView m={m} f={f} w={tw} h={th} kb={0.6} />
            </div>
          );
        })}
      </div>
      <div style={{ position: "absolute", left: "50%", top: `${(g.y ?? 0.38) * 100}%`, transform: `translate(-50%,-50%) scale(${Math.max(0, cs).toFixed(3)})`, opacity: f >= countAt ? 1 : 0 }}>
        <Glass radius={48} pad="22px 48px" style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
          <div style={{ display: "flex", alignItems: "flex-end", gap: 6 }}>
            <Odometer value={roll} size={150} color={A.blue} />
            <span style={{ fontFamily: SANS, fontWeight: 900, fontSize: 120, color: A.blue, lineHeight: 1.05 }}>+</span>
          </div>
          <div style={{ fontFamily: SANS, fontWeight: 800, fontSize: 44, color: A.ink, marginTop: -6 }}>{str(p.unit, "giochi testati")}</div>
        </Glass>
      </div>
      {typeof p.note === "string" && (
        <div style={{ position: "absolute", left: 0, right: 0, top: `${((g.y ?? 0.38) + H / 1920 / 2 + 0.05) * 100}%`, display: "flex", justifyContent: "center", whiteSpace: "nowrap", ...blurIn(f, fps, noteAt, 20) }}>
          <Glass radius={999} pad="14px 30px" style={{ display: "flex", alignItems: "center", gap: 12, fontFamily: SANS, fontWeight: 700, fontSize: 38, color: A.ink }}>
            <Glyph name="mac" size={40} color={A.blue} />
            <Rich text={p.note} />
          </Glass>
        </div>
      )}
    </AbsoluteFill>
  );
};

/**
 * "needs": cosa serve, tre tessere di vetro in fila (props.items[{icon, label, sub, at}], title, titleAt).
 */
export const Needs: React.FC<G> = ({ g }) => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const p = g.props ?? {};
  const items = (Array.isArray(p.items) ? p.items : []) as { icon: "mac" | "iphone" | "gamepad"; label: string; sub?: string; at: number; subAt?: number }[];
  const tw = 296;
  return (
    <AbsoluteFill style={{ opacity: outro(f, g.frames) }}>
      {typeof p.title === "string" && (
        <div style={{ position: "absolute", left: 0, right: 0, top: `${((g.y ?? 0.27) - 0.115) * 100}%`, textAlign: "center", fontFamily: SANS, fontWeight: 900, fontSize: 70, letterSpacing: "-0.04em", color: "#FFFFFF", textShadow: "0 6px 26px rgba(0,0,0,0.45)", ...blurIn(f, fps, num(p.titleAt, 0), 24) }}>
          <Rich text={p.title} />
        </div>
      )}
      <div style={{ position: "absolute", left: "50%", top: `${(g.y ?? 0.27) * 100}%`, transform: "translate(-50%,-50%)", display: "flex", gap: 22 }}>
        {items.map((it, i) => {
          const s = pop(f, fps, it.at);
          const on = f >= it.at;
          return (
            <div key={i} style={{ width: tw, transform: `translateY(${((1 - Math.min(1, s)) * 60).toFixed(1)}px) scale(${(0.7 + 0.3 * Math.max(0, s)).toFixed(3)})`, opacity: on ? Math.min(1, (f - it.at) / 4) : 0 }}>
              <Glass radius={40} pad="30px 18px 26px" style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 14, textAlign: "center" }}>
                <div style={{ width: 120, height: 120, borderRadius: 32, background: "rgba(31,107,255,0.10)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <Glyph name={it.icon} size={84} color={A.blue} stroke={1.7} />
                </div>
                <div style={{ fontFamily: SANS, fontWeight: 800, fontSize: 42, letterSpacing: "-0.03em", color: A.ink, lineHeight: 1.05 }}>{it.label}</div>
                {it.sub && <div style={{ fontFamily: SANS, fontWeight: 600, fontSize: 26, color: A.sub, lineHeight: 1.15, ...blurIn(f, fps, it.subAt ?? it.at + 6, 10) }}>{it.sub}</div>}
              </Glass>
            </div>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};

/** "cta": barra dei commenti di vetro: si scrive la parola (props.word, typeAt), invio (sendAt), freccia che rimbalza. */
export const Cta: React.FC<G> = ({ g }) => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const p = g.props ?? {};
  const word = str(p.word, "SWITCH");
  const typeAt = num(p.typeAt, 6);
  const sendAt = num(p.sendAt, typeAt + word.length * 3 + 6);
  const typed = word.slice(0, Math.max(0, Math.min(word.length, Math.floor((f - typeAt) / 3) + 1)));
  const s = smooth(f, fps);
  const sent = f >= sendAt;
  const press = f >= sendAt && f < sendAt + 4 ? 0.86 : 1;
  const sp = pop(f, fps, sendAt);
  const bob = Math.sin(f / 4) * 12;
  return (
    <AbsoluteFill style={{ opacity: outro(f, g.frames, 5) }}>
      <div style={{ position: "absolute", left: "50%", top: `${(g.y ?? 0.24) * 100}%`, width: 900, transform: `translate(-50%,-50%) translateY(${((1 - s) * 80).toFixed(1)}px)`, opacity: Math.min(1, f / 5) }}>
        <div style={{ textAlign: "center", fontFamily: SANS, fontWeight: 900, fontSize: 72, letterSpacing: "-0.04em", color: "#FFFFFF", textShadow: "0 6px 26px rgba(0,0,0,0.45)", marginBottom: 26 }}>
          <Rich text={str(p.title, "Commenta *SWITCH*")} />
        </div>
        <Glass radius={999} pad="18px 18px 18px 30px" style={{ display: "flex", alignItems: "center", gap: 18 }}>
          <div style={{ width: 70, height: 70, borderRadius: 35, background: "linear-gradient(135deg,#C7D2FE,#1F6BFF)" }} />
          <div style={{ flex: 1, fontFamily: SANS, fontWeight: sent ? 500 : 800, fontSize: 46, color: typed ? A.ink : A.sub }}>
            {sent ? <span style={{ color: A.sub }}>Aggiungi un commento…</span> : typed || "Aggiungi un commento…"}
            {!sent && f >= typeAt && <span style={{ display: "inline-block", width: 4, height: 50, background: A.blue, marginLeft: 6, verticalAlign: "middle", opacity: f % 16 < 9 ? 1 : 0 }} />}
          </div>
          <div style={{ width: 84, height: 84, borderRadius: 42, background: A.blue, display: "flex", alignItems: "center", justifyContent: "center", transform: `scale(${press})` }}>
            <svg width={44} height={44} viewBox="0 0 24 24">
              <path d="M12 19V5M5.5 11.5L12 5l6.5 6.5" fill="none" stroke="#FFFFFF" strokeWidth={2.6} strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
        </Glass>
        {sent && (
          <div style={{ display: "flex", justifyContent: "flex-start", marginTop: 22, transform: `scale(${Math.max(0, sp).toFixed(3)})`, transformOrigin: "10% 0%" }}>
            <Glass radius={30} pad="16px 26px" style={{ display: "flex", alignItems: "center", gap: 14 }}>
              <div style={{ width: 52, height: 52, borderRadius: 26, background: "linear-gradient(135deg,#C7D2FE,#1F6BFF)" }} />
              <span style={{ fontFamily: SANS, fontWeight: 800, fontSize: 40, color: A.ink }}>{word}</span>
              <Glyph name="check" size={36} color={A.blue} stroke={2.6} />
            </Glass>
          </div>
        )}
        <div style={{ display: "flex", justifyContent: "center", marginTop: 18, transform: `translateY(${bob.toFixed(1)}px)`, opacity: lin(f, sendAt + 4, sendAt + 10) }}>
          <svg width={90} height={90} viewBox="0 0 24 24" style={{ filter: "drop-shadow(0 6px 16px rgba(0,0,0,0.35))" }}>
            <path d="M12 4v15M5.5 12.5L12 19l6.5-6.5" fill="none" stroke="#FFFFFF" strokeWidth={2.8} strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
      </div>
    </AbsoluteFill>
  );
};

export { interpolate, clamp };
