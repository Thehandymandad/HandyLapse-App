import React from "react";
import { seeded } from "../../../lib/timeline";
import { bounce, LAND, squash, STAGGER, wobble } from "../../../motion/bouncy";
import { INTER, MONO, P, rgba, SERIF } from "../pulse/shared";

/**
 * Testo cinetico dello stile zane: sans bianco molto pesante per la parola principale, serif corsivo d'accento (con
 * bagliore) per la parola accanto ("MOTION *graphics*"). Mai una dissolvenza semplice: si anima per lettera o per
 * parola con uno degli stili d'entrata del README di movimento, a rotazione lungo il video.
 */
export type Entry = "pop" | "drop" | "sticker" | "wipe" | "type" | "led" | "flap" | "roll";
export const ENTRIES: Entry[] = ["pop", "drop", "sticker", "wipe", "type", "led", "flap", "roll"];

export type Run = { text: string; accent: boolean };

/** "MOTION *graphics*" → [{MOTION}, {graphics, accent}]; le righe si separano con \n. */
export function parseRuns(src: string): Run[][] {
  return src.split("\n").map((line) => {
    const out: Run[] = [];
    line.split(/(\*[^*]+\*)/).forEach((part) => {
      if (!part) return;
      const accent = part.startsWith("*") && part.endsWith("*");
      const text = accent ? part.slice(1, -1) : part;
      text.split(/(\s+)/).forEach((w) => {
        if (w.trim()) out.push({ text: w, accent });
      });
    });
    return out;
  });
}

const FLAP = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789$%#";

/** Una parola animata lettera per lettera (o tutta insieme) secondo lo stile d'entrata. */
export const KWord: React.FC<{
  run: Run;
  f: number;
  start: number;
  fps: number;
  entry: Entry;
  size: number;
  seed?: number;
  cursor?: boolean;
}> = ({ run, f, start, fps, entry, size, seed = 0, cursor }) => {
  const accent = run.accent;
  const led = entry === "led";
  const base: React.CSSProperties = accent
    ? { fontFamily: SERIF, fontStyle: "italic", fontWeight: 400, fontSize: size * 0.95, color: P.accent, textShadow: P.glow !== "none" ? P.glow : undefined, letterSpacing: "-0.01em" }
    : led
      ? { fontFamily: MONO, fontWeight: 700, fontSize: size * 0.72, color: P.accent, textShadow: `0 0 18px ${rgba(P.accent, 0.8)}, 0 0 40px ${rgba(P.accent, 0.35)}`, textTransform: "uppercase" }
      : { fontFamily: INTER, fontWeight: 900, fontSize: size, color: "#FFFFFF", letterSpacing: "-0.045em", textShadow: P.textShadow };
  const chars = Array.from(run.text);
  const wordAge = f - start;

  // stili a parola intera
  if (entry === "sticker") {
    if (wordAge < 0) return <span style={{ ...base, visibility: "hidden" }}>{run.text}</span>;
    const s = bounce(wordAge, fps);
    const sc = 1.8 - 0.8 * s;
    const q = squash(wordAge, LAND, false);
    return (
      <span style={{ ...base, display: "inline-block", transform: `rotate(${wobble(wordAge, 0.8)}deg) scale(${(sc * q.sx).toFixed(3)}, ${(sc * q.sy).toFixed(3)})`, opacity: Math.min(1, wordAge / 2) }}>
        {run.text}
      </span>
    );
  }
  if (entry === "wipe" || (accent && entry !== "type")) {
    if (wordAge < 0) return <span style={{ ...base, visibility: "hidden" }}>{run.text}</span>;
    const s = bounce(wordAge, fps);
    const cut = Math.max(0, 1 - Math.min(1, s * 1.05)) * 100;
    return (
      <span style={{ display: "inline-block", clipPath: `inset(-20% ${cut.toFixed(1)}% -20% -5%)`, transform: `translateX(${((1 - s) * -size * 0.25).toFixed(1)}px)` }}>
        <span style={base}>{run.text}</span>
      </span>
    );
  }

  return (
    <span style={{ ...base, display: "inline-block", whiteSpace: "pre" }}>
      {chars.map((ch, i) => {
        const age = wordAge - i * (entry === "type" ? 2 : STAGGER.letter);
        if (age < 0) {
          // la macchina da scrivere lascia il posto vuoto, gli altri tengono lo spazio invisibile
          return <span key={i} style={{ visibility: "hidden" }}>{ch}</span>;
        }
        if (entry === "type") return <span key={i}>{ch}</span>;
        if (entry === "led") {
          const on = age >= 6 || seeded(seed * 31 + i * 7 + age) > 0.4;
          return <span key={i} style={{ opacity: on ? 1 : 0.15 }}>{ch}</span>;
        }
        if (entry === "flap") {
          const settled = age >= 8;
          const shown = settled || ch === " " ? ch : FLAP[Math.floor(seeded(seed * 13 + i * 5 + Math.floor(age / 1.5)) * FLAP.length)];
          const flip = settled ? Math.max(0, 1 - (age - 8) / 3) * 60 : 70 * (1 - ((age % 3) / 3));
          return (
            <span key={i} style={{ display: "inline-block", transform: `perspective(400px) rotateX(${flip.toFixed(0)}deg)` }}>
              {shown}
            </span>
          );
        }
        if (entry === "roll") {
          const s = bounce(age, fps);
          return (
            <span key={i} style={{ display: "inline-block", overflow: "hidden", verticalAlign: "bottom", lineHeight: 1.1 }}>
              <span style={{ display: "inline-block", transform: `translateY(${((1 - s) * 110).toFixed(1)}%)` }}>{ch}</span>
            </span>
          );
        }
        // pop / drop
        const s = bounce(age, fps);
        const q = squash(age, LAND, true);
        const tr =
          entry === "drop"
            ? `translateY(${((1 - s) * -size * 1.6).toFixed(1)}px) scale(${q.sx.toFixed(3)}, ${q.sy.toFixed(3)})`
            : `scale(${(Math.max(0, s) * q.sx).toFixed(3)}, ${(Math.max(0, s) * q.sy).toFixed(3)})`;
        return (
          <span key={i} style={{ display: "inline-block", transform: tr, transformOrigin: "50% 85%", opacity: Math.min(1, age / 2) }}>
            {ch}
          </span>
        );
      })}
      {cursor && entry === "type" && (
        <span
          style={{
            display: "inline-block",
            width: size * 0.07,
            height: size * 0.95,
            marginLeft: size * 0.04,
            verticalAlign: "-0.12em",
            background: P.accent,
            boxShadow: `0 0 16px ${rgba(P.accent, 0.8)}`,
            opacity: wordAge < 0 ? 0 : Math.floor(f / 8) % 2 === 0 ? 1 : 0.15,
          }}
        />
      )}
    </span>
  );
};
