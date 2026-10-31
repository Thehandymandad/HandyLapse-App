import React from "react";
import { AbsoluteFill, interpolate, Sequence, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { ThreeCanvas } from "@remotion/three";
import { Icon } from "../icons";
import { fontStack, fontWeightFor } from "../lib/fonts";
import { seeded, type GraphicEvent, type Timeline } from "../lib/timeline";
import { Object3DMesh } from "../three/objects";
import type { StylePack } from "../styles/pack";
import type { IconName, ReelStyle } from "../types";

/** Entrata a molla + uscita negli ultimi frame. */
export function useInOut(frames: number, damping = 12, stiffness = 220) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const enter = spring({ frame, fps, config: { damping, stiffness, mass: 0.7 } });
  const exit = interpolate(frame, [frames - 6, frames], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  return { frame, fps, enter, exit };
}

export const defaultY = (style: ReelStyle) => (style.captions.positionY > 0.5 ? 0.26 : 0.72);

export const Positioned: React.FC<{ x?: number; y: number; children: React.ReactNode; style?: React.CSSProperties }> = ({ x = 0.5, y, children, style }) => (
  <AbsoluteFill>
    <div style={{ position: "absolute", left: `${x * 100}%`, top: `${y * 100}%`, transform: "translate(-50%, -50%)", ...style }}>{children}</div>
  </AbsoluteFill>
);

export const cardText = (style: ReelStyle, size: number): React.CSSProperties => ({
  fontFamily: fontStack(style.motion.fontFamily),
  fontWeight: fontWeightFor(style.motion.fontFamily, 900),
  fontSize: size,
  lineHeight: 1.08,
  color: style.motion.textColor,
  textAlign: "center",
  textTransform: "uppercase",
});

/** Badge rotondo con icona che si disegna. */
export const IconBadge: React.FC<{ name: IconName; size: number; style: ReelStyle; progress: number; color?: string }> = ({ name, size, style, progress, color }) => {
  const solid = style.motion.iconStyle === "solid";
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: "50%",
        background: solid ? color ?? style.motion.accentColor : "transparent",
        border: solid ? `${size * 0.04}px solid ${style.motion.secondaryColor}` : undefined,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        boxShadow: solid ? "0 12px 30px rgba(0,0,0,0.35)" : undefined,
      }}
    >
      <Icon
        name={name}
        size={size * (solid ? 0.62 : 0.9)}
        color={solid ? style.motion.textColor : color ?? style.motion.accentColor}
        strokeWidth={solid ? 2.4 : 2}
        progress={progress}
        style={solid ? undefined : { filter: "drop-shadow(0 6px 14px rgba(0,0,0,0.5))" }}
      />
    </div>
  );
};

export const HookTitle: React.FC<{ text: string; icon?: IconName; frames: number; style: ReelStyle }> = ({ text, icon, frames, style }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  // parte già "aperto": il primo frame del reel (quello nel feed) mostra il titolo
  const enter = interpolate(spring({ frame, fps, config: { damping: 12, stiffness: 180 } }), [0, 1], [0.86, 1]);
  const exit = interpolate(frame, [frames - 6, frames], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const bar = interpolate(frame, [4, 18], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const y = style.captions.positionY > 0.5 ? 0.2 : 0.74;
  return (
    <Positioned y={y} style={{ width: "86%" }}>
      <div style={{ transform: `rotate(-2deg) scale(${enter * (0.7 + 0.3 * exit)})`, opacity: exit, display: "flex", flexDirection: "column", alignItems: "center" }}>
        {icon && (
          <div style={{ marginBottom: -24, zIndex: 1, transform: `rotate(${interpolate(frame, [0, 30], [-12, 6])}deg)` }}>
            <IconBadge name={icon} size={150} style={style} progress={1} />
          </div>
        )}
        <div
          style={{
            ...cardText(style, 90),
            background: style.motion.accentColor,
            borderRadius: style.motion.radius,
            padding: "36px 48px 30px",
            boxShadow: "0 18px 50px rgba(0,0,0,0.45)",
          }}
        >
          {text}
        </div>
        <div style={{ height: 16, width: `${50 * bar}%`, background: style.motion.secondaryColor, borderRadius: 8, marginTop: 22 }} />
      </div>
    </Positioned>
  );
};

const KeywordCard: React.FC<{ g: GraphicEvent; style: ReelStyle }> = ({ g, style }) => {
  const { enter, exit, frame } = useInOut(g.frames, 9, 260);
  const rot = (seeded(g.from) - 0.5) * 8;
  return (
    <Positioned x={g.x} y={g.y ?? defaultY(style)} style={{ maxWidth: "80%" }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 26,
          transform: `rotate(${rot}deg) scale(${enter * (0.6 + 0.4 * exit)})`,
          opacity: exit,
          background: g.color ?? style.motion.accentColor,
          borderRadius: style.motion.radius,
          padding: "26px 40px",
          boxShadow: "0 16px 44px rgba(0,0,0,0.45)",
        }}
      >
        {g.icon && <Icon name={g.icon} size={92} color={style.motion.textColor} strokeWidth={2.6} progress={interpolate(frame, [2, 14], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" })} />}
        <div style={cardText(style, 80)}>{g.text}</div>
      </div>
    </Positioned>
  );
};

/** Numero che "conta" fino al valore (es. "100€", "3X", "50%"). */
const StatCounter: React.FC<{ g: GraphicEvent; style: ReelStyle }> = ({ g, style }) => {
  const { enter, exit, frame, fps } = useInOut(g.frames, 10, 180);
  const text = g.text ?? "";
  const m = text.match(/^(\D*?)(\d+(?:[.,]\d+)?)(.*)$/);
  let shown = text;
  if (m) {
    const target = parseFloat(m[2].replace(",", "."));
    const decimals = (m[2].split(/[.,]/)[1] ?? "").length;
    const p = interpolate(frame, [0, fps * 0.7], [0, 1], { extrapolateRight: "clamp", easing: (t) => 1 - Math.pow(1 - t, 3) });
    shown = `${m[1]}${(target * p).toFixed(decimals).replace(".", m[2].includes(",") ? "," : ".")}${m[3]}`;
  }
  const x = interpolate(enter, [0, 1], [-700, 0]);
  return (
    <Positioned x={g.x} y={g.y ?? defaultY(style)}>
      <div style={{ transform: `translateX(${x}px) rotate(-4deg)`, opacity: exit, display: "flex", alignItems: "center", gap: 24 }}>
        {g.icon && <IconBadge name={g.icon} size={150} style={style} progress={interpolate(frame, [4, 18], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" })} />}
        <div
          style={{
            ...cardText(style, 170),
            color: g.color ?? style.motion.accentColor,
            WebkitTextStroke: `20px ${style.motion.secondaryColor}`,
            paintOrder: "stroke fill",
            filter: "drop-shadow(0 12px 24px rgba(0,0,0,0.45))",
            whiteSpace: "nowrap",
          }}
        >
          {shown}
        </div>
      </div>
    </Positioned>
  );
};

const ListItem: React.FC<{ g: GraphicEvent; style: ReelStyle }> = ({ g, style }) => {
  const { enter, exit, frame } = useInOut(g.frames, 14, 200);
  const x = interpolate(enter, [0, 1], [-1100, 0]) + interpolate(exit, [0, 1], [-1100, 0]);
  return (
    <AbsoluteFill>
      <div
        style={{
          position: "absolute",
          left: 60,
          top: `${(g.y ?? defaultY(style)) * 100}%`,
          transform: `translate(${x}px, -50%)`,
          display: "flex",
          alignItems: "center",
          gap: 22,
          background: g.color ?? style.motion.accentColor,
          borderRadius: 999,
          padding: "22px 44px 22px 26px",
          boxShadow: "0 14px 36px rgba(0,0,0,0.4)",
          maxWidth: 900,
        }}
      >
        <div style={{ width: 76, height: 76, borderRadius: "50%", background: style.motion.secondaryColor, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <Icon name={g.icon ?? "check"} size={52} color={g.color ?? style.motion.accentColor} strokeWidth={3} progress={interpolate(frame, [6, 16], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" })} />
        </div>
        <div style={{ ...cardText(style, 62), textAlign: "left" }}>{g.text}</div>
      </div>
    </AbsoluteFill>
  );
};

const IconPop: React.FC<{ g: GraphicEvent; style: ReelStyle }> = ({ g, style }) => {
  const { enter, exit, frame } = useInOut(g.frames, 7, 200);
  const wobble = Math.sin(frame / 4) * 6 * Math.max(0, 1 - frame / 30);
  return (
    <Positioned x={g.x} y={g.y ?? defaultY(style)}>
      <div style={{ transform: `scale(${enter * exit}) rotate(${wobble}deg)`, display: "flex", flexDirection: "column", alignItems: "center", gap: 20 }}>
        <IconBadge name={g.icon ?? "spark"} size={300} style={style} color={g.color} progress={interpolate(frame, [3, 20], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" })} />
        {g.text && (
          <div style={{ ...cardText(style, 70), color: "#FFFFFF", WebkitTextStroke: `14px #000`, paintOrder: "stroke fill" }}>{g.text}</div>
        )}
      </div>
    </Positioned>
  );
};

/** Oggetto 3D three.js che entra ruotando. */
const Object3DPop: React.FC<{ g: GraphicEvent; style: ReelStyle }> = ({ g, style }) => {
  const { enter, exit, frame, fps } = useInOut(g.frames, 9, 160);
  const size = 640;
  const t = frame / fps;
  return (
    <Positioned x={g.x} y={g.y ?? defaultY(style)}>
      <div style={{ width: size, height: size, opacity: exit, display: "flex", flexDirection: "column", alignItems: "center" }}>
        <ThreeCanvas width={size} height={size} camera={{ fov: 35, position: [0, 0, 7] }} gl={{ antialias: true, alpha: true }}>
          <ambientLight intensity={0.8} />
          <directionalLight position={[3, 4, 5]} intensity={2.4} />
          <directionalLight position={[-4, -2, 3]} intensity={0.9} color="#88aaff" />
          <pointLight position={[0, 0, 4]} intensity={8} />
          <group
            scale={Math.max(0.001, enter * (0.5 + 0.5 * exit))}
            rotation={[0.15 + Math.sin(t * 2) * 0.1, Math.sin(t * 2.2) * 0.55 + (1 - enter) * Math.PI * 2, Math.sin(t * 1.7) * 0.08]}
            position={[0, Math.sin(t * 3) * 0.12, 0]}
          >
            <Object3DMesh name={g.object ?? "star"} color={g.color} label={g.object === "coin" ? g.text?.match(/[€$£%]/)?.[0] : undefined} />
          </group>
        </ThreeCanvas>
        {g.text && (
          <div style={{ ...cardText(style, 72), color: "#FFFFFF", WebkitTextStroke: "14px #000", paintOrder: "stroke fill", marginTop: -60, transform: `scale(${enter})` }}>
            {g.text}
          </div>
        )}
      </div>
    </Positioned>
  );
};

/** Freccia disegnata a mano che punta verso (x, y) con angolo `angle`. */
const ArrowGraphic: React.FC<{ g: GraphicEvent; style: ReelStyle }> = ({ g, style }) => {
  const { exit, frame } = useInOut(g.frames);
  const draw = interpolate(frame, [0, 10], [0, 1], { extrapolateRight: "clamp" });
  const head = interpolate(frame, [8, 14], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const color = g.color ?? style.motion.accentColor;
  return (
    <Positioned x={g.x ?? 0.5} y={g.y ?? 0.45}>
      <div style={{ transform: `rotate(${g.angle ?? 0}deg)`, opacity: exit, display: "flex", alignItems: "center" }}>
        <svg width={360} height={200} viewBox="0 0 360 200" fill="none" stroke={color} strokeWidth={22} strokeLinecap="round" strokeLinejoin="round" style={{ filter: "drop-shadow(0 8px 14px rgba(0,0,0,0.5))" }}>
          <path d="M20 150 C 110 40, 220 40, 320 100" pathLength={1} strokeDasharray={1} strokeDashoffset={1 - draw} />
          <path d="M260 60 L 325 102 L 255 140" pathLength={1} strokeDasharray={1} strokeDashoffset={1 - head} />
        </svg>
        {g.text && <div style={{ ...cardText(style, 60), color: "#fff", WebkitTextStroke: "12px #000", paintOrder: "stroke fill", marginLeft: 10, opacity: head }}>{g.text}</div>}
      </div>
    </Positioned>
  );
};

export const CallToAction: React.FC<{ text: string; icon?: IconName; style: ReelStyle }> = ({ text, icon, style }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const enter = spring({ frame, fps, config: { damping: 8, stiffness: 180 } });
  const ring = Math.sin(frame / 2.2) * 14 * Math.max(0, 1 - frame / 40);
  return (
    <Positioned y={0.18}>
      <div
        style={{
          transform: `scale(${enter})`,
          display: "flex",
          alignItems: "center",
          gap: 22,
          background: style.motion.accentColor,
          borderRadius: 999,
          padding: "22px 46px 22px 24px",
          boxShadow: "0 16px 44px rgba(0,0,0,0.45)",
          whiteSpace: "nowrap",
        }}
      >
        <div style={{ transform: `rotate(${ring}deg)` }}>
          <IconBadge name={icon ?? "bell"} size={96} style={{ ...style, motion: { ...style.motion, accentColor: style.motion.secondaryColor, textColor: style.motion.accentColor } }} progress={1} />
        </div>
        <div style={cardText(style, 60)}>{text}</div>
      </div>
    </Positioned>
  );
};

export const RENDERERS: Record<string, React.FC<{ g: GraphicEvent; style: ReelStyle }>> = {
  keyword: KeywordCard,
  stat: StatCounter,
  list: ListItem,
  icon: IconPop,
  object3d: Object3DPop,
  arrow: ArrowGraphic,
};

const LAYER: Record<string, number> = { scene: 0, chapter: 2 };

/** Grafiche: `layer="behind"` disegna solo quelle con behind=true (dietro la persona), `front` tutte le altre + hook e CTA. */
export const GraphicsLayer: React.FC<{ tl: Timeline; style: ReelStyle; pack: StylePack; layer?: "front" | "behind" }> = ({ tl, style, pack, layer = "front" }) => {
  const renderers = { ...RENDERERS, ...pack.graphics };
  const Hook = pack.Hook ?? HookTitle;
  const Cta = pack.Cta ?? CallToAction;
  const front = layer === "front";
  return (
    <AbsoluteFill>
      {front && tl.hook && (
        <Sequence from={tl.hook.from} durationInFrames={tl.hook.frames} name="Hook">
          <Hook text={tl.hook.text} icon={tl.hook.icon} frames={tl.hook.frames} style={style} />
        </Sequence>
      )}
      {tl.graphics
        .filter((g) => (front ? !g.behind : g.behind))
        // le scene a schermo intero stanno sotto tutto, le barre fisse (capitolo) sopra tutto
        .sort((a, b) => (LAYER[a.type] ?? 1) - (LAYER[b.type] ?? 1))
        .map((g) => {
          const C = renderers[g.type];
          if (!C) return null;
          return (
            <Sequence key={g.key} from={g.from} durationInFrames={g.frames} name={`${g.type}: ${g.text ?? g.icon ?? g.object ?? ""}`} premountFor={10}>
              {g.scale && g.scale !== 1 ? (
                // scala generica attorno al centro della grafica: per farla stare nello spazio libero (zone sicure, viso)
                <AbsoluteFill style={{ transform: `scale(${g.scale})`, transformOrigin: `${(g.x ?? 0.5) * 100}% ${(g.y ?? 0.77) * 100}%` }}>
                  <C g={g} style={style} />
                </AbsoluteFill>
              ) : (
                <C g={g} style={style} />
              )}
            </Sequence>
          );
        })}
      {front && tl.cta && (
        <Sequence from={tl.cta.from} durationInFrames={tl.cta.frames} name="CTA">
          <Cta text={tl.cta.text} icon={tl.cta.icon} style={style} />
        </Sequence>
      )}
    </AbsoluteFill>
  );
};
