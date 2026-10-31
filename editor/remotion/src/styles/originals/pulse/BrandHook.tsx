import React from "react";
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import type { GraphicEvent } from "../../../lib/timeline";
import { ANTON, clamp, INTER } from "./shared";

/**
 * "brandhook": hook a schermo intero col colore e il logo di un marchio (va con props.overFrame, sopra la cornice).
 * 1) dal fotogramma 0: fondo del marchio, il logo sbatte al centro (scala 1.7 → 1 con rimbalzo) e lo schermo trema;
 * 2) a `bandAt`: una fascia nera di censura attraversa lo schermo in diagonale con `band` ("NON VUOLE");
 * 3) a `openAt`: glitch (fette sfasate, canali separati) poi il pannello si apre in due metà che volano via e resta
 *    una pillola col logo in alto fino alla fine della grafica.
 * props: logo (immagine), color (fondo), band, bandAt, openAt, pillY.
 */
export const BrandHook: React.FC<{ g: GraphicEvent }> = ({ g }) => {
  const f = useCurrentFrame();
  const { fps, width: W, height: H } = useVideoConfig();
  const p = g.props ?? {};
  const logo = typeof p.src === "string" ? p.src : typeof p.logo === "string" ? p.logo : "";
  const color = typeof p.color === "string" ? p.color : "#E60012";
  const band = typeof p.band === "string" ? p.band : "NON VUOLE";
  const bandAt = typeof p.bandAt === "number" ? p.bandAt : 20;
  const openAt = typeof p.openAt === "number" ? p.openAt : 34;
  const pillY = typeof p.pillY === "number" ? p.pillY : 0.2;
  const pillLogo = (p.pill as { src?: string } | undefined)?.src ?? logo;
  const pillText = typeof p.pillText === "string" ? p.pillText : "non vuole";
  const pillScale = typeof p.pillScale === "number" ? p.pillScale : 1;

  // 1) logo che sbatte (già visibile al fotogramma 0: parte a metà corsa)
  const ls = spring({ frame: f + 3, fps, config: { damping: 9, stiffness: 260, mass: 0.8 } });
  const logoScale = 1.7 - 0.7 * ls;
  const hit = (at: number, amp: number) => (f >= at && f < at + 12 ? Math.sin((f - at) * 2.9) * (12 - (f - at)) * amp : 0);
  const shakeX = hit(1, 2.2) + hit(bandAt + 2, 2.6);
  const shakeY = hit(1, 1.2) * 0.6 + hit(bandAt + 2, 1.4) * 0.6;

  // 2) fascia di censura che entra da sinistra in diagonale
  const bs = spring({ frame: f - bandAt, fps, config: { damping: 15, stiffness: 240, mass: 0.7 } });
  const bandX = f < bandAt ? -1.4 * W : (1 - bs) * -1.4 * W;

  // 3) glitch e apertura
  const g0 = openAt - 6;
  const glitch = f >= g0 && f < openAt ? 1 : 0;
  const o = Math.max(0, f - openAt);
  const open = o > 0 ? Math.pow(Math.min(1, o / 11), 2.2) : 0; // accelera via
  const gone = o > 12;

  const slices = glitch
    ? Array.from({ length: 9 }, (_, i) => {
        const r = Math.sin((f + 1) * 12.9898 + i * 78.233) * 43758.5453;
        const fr = r - Math.floor(r);
        return { y0: i / 9, y1: (i + 1) / 9, dx: (fr - 0.5) * 140 };
      })
    : null;

  const panel = (half: "top" | "bottom" | null) => {
    // la diagonale di taglio va da (0, 0.56H) a (W, 0.44H)
    const clip = half === "top" ? `polygon(0 0, 100% 0, 100% 44%, 0 56%)` : half === "bottom" ? `polygon(0 56%, 100% 44%, 100% 100%, 0 100%)` : undefined;
    const dy = half === "top" ? -open * H * 0.75 : half === "bottom" ? open * H * 0.75 : 0;
    const rot = half === "top" ? -open * 6 : half === "bottom" ? open * 6 : 0;
    return (
      <AbsoluteFill key={half ?? "full"} style={{ clipPath: clip, transform: `translate(${shakeX.toFixed(1)}px, ${(shakeY + dy).toFixed(1)}px) rotate(${rot.toFixed(2)}deg)` }}>
        <AbsoluteFill style={{ background: `radial-gradient(90% 70% at 50% 45%, ${color} 0%, ${color} 55%, #9E000C 100%)` }} />
        {/* logo */}
        <div style={{ position: "absolute", left: "50%", top: "45%", width: W * 0.86, transform: `translate(-50%,-50%) scale(${logoScale.toFixed(3)}) rotate(${(-3 * (1 - ls)).toFixed(2)}deg)`, filter: "drop-shadow(0 14px 22px rgba(90,0,8,0.45))" }}>
          {logo && <img src={logo} style={{ width: "100%", display: "block" }} />}
          {glitch === 1 && logo && (
            <>
              <img src={logo} style={{ position: "absolute", inset: 0, width: "100%", mixBlendMode: "screen", opacity: 0.7, transform: "translate(-14px, 4px)", filter: "hue-rotate(160deg) saturate(3)" }} />
              <img src={logo} style={{ position: "absolute", inset: 0, width: "100%", mixBlendMode: "screen", opacity: 0.6, transform: "translate(12px, -3px)", filter: "hue-rotate(260deg) saturate(3)" }} />
            </>
          )}
        </div>
        {/* fascia di censura */}
        <div style={{ position: "absolute", left: "50%", top: "62%", width: W * 1.6, height: 210, transform: `translate(-50%,-50%) translateX(${bandX.toFixed(1)}px) rotate(-8deg)`, background: "#0A0B0E", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 24px 60px rgba(0,0,0,0.45)" }}>
          <span style={{ fontFamily: ANTON, fontSize: 168, letterSpacing: "0.04em", color: "#FFFFFF", lineHeight: 1 }}>{band}</span>
        </div>
      </AbsoluteFill>
    );
  };

  const pillS = spring({ frame: f - openAt - 4, fps, config: { damping: 13, stiffness: 220 } });
  const end = interpolate(f, [g.frames - 6, g.frames], [1, 0], clamp);

  return (
    <AbsoluteFill>
      {!gone && (
        <AbsoluteFill>
          {slices && !open && <AbsoluteFill style={{ background: color }} />}
          {slices && !open
            ? slices.map((s, i) => (
                <AbsoluteFill key={i} style={{ clipPath: `inset(${(s.y0 * 100).toFixed(2)}% 0 ${((1 - s.y1) * 100).toFixed(2)}% 0)`, transform: `translateX(${s.dx.toFixed(1)}px)` }}>
                  {panel(null)}
                </AbsoluteFill>
              ))
            : open > 0
              ? [panel("top"), panel("bottom")]
              : panel(null)}
          {/* bagliore bianco lungo la crepa mentre si apre */}
          {open > 0 && open < 1 && (
            <AbsoluteFill style={{ background: "linear-gradient(-4.6deg, transparent 47%, rgba(255,255,255,0.95) 50%, transparent 53%)", opacity: 1 - open }} />
          )}
        </AbsoluteFill>
      )}
      {/* pillola col logo che resta in alto */}
      {f >= openAt + 4 && (
        <div style={{ position: "absolute", left: "50%", top: `${pillY * 100}%`, transform: `translate(-50%,-50%) scale(${(Math.max(0, pillS) * pillScale).toFixed(3)})`, opacity: end, whiteSpace: "nowrap", display: "flex", alignItems: "center", gap: 18, padding: "16px 30px", borderRadius: 999, background: color, boxShadow: "0 18px 40px rgba(230,0,18,0.35)" }}>
          {pillLogo && <img src={pillLogo} style={{ height: 62, display: "block" }} />}
          <span style={{ fontFamily: INTER, fontWeight: 900, fontSize: 40, color: "#FFFFFF", letterSpacing: "-0.02em" }}>{pillText}</span>
        </div>
      )}
    </AbsoluteFill>
  );
};
