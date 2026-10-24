import React, { useEffect, useMemo, useState } from "react";
import { continueRender, delayRender, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { ThreeCanvas } from "@remotion/three";
import * as THREE from "three";
import type { GraphicEvent } from "../../../lib/timeline";
import { drawAppIcon, type AppIcon } from "./appIcons";

/**
 * Carosello 3D di "reel" (card verticali con angoli arrotondati) che gira attorno alla testa, DIETRO la persona
 * (usare "behind": true + source.matte). Reference 18,7–23,4 s: le card entrano a ventaglio e ruotano lente.
 * props.images: copertine dei tuoi reel (percorsi in public/), altrimenti card generate.
 * props.icons: ["instagram","tiktok","claude","openai"] → card quadrate con le icone delle app (ripetute props.repeat volte).
 * props.highlights: [{ frame, icon }] → l'icona nominata "salta" (frame relativo all'inizio della grafica).
 */
const CARD_W = 1;
const CARD_H = 1.78;

function roundedCanvas(draw: (ctx: CanvasRenderingContext2D, w: number, h: number) => void) {
  const w = 360;
  const h = 640;
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  const ctx = c.getContext("2d")!;
  const r = 34;
  ctx.beginPath();
  ctx.moveTo(r, 0);
  ctx.arcTo(w, 0, w, h, r);
  ctx.arcTo(w, h, 0, h, r);
  ctx.arcTo(0, h, 0, 0, r);
  ctx.arcTo(0, 0, w, 0, r);
  ctx.closePath();
  ctx.save();
  ctx.clip();
  draw(ctx, w, h);
  ctx.restore();
  ctx.lineWidth = 8;
  ctx.strokeStyle = "rgba(255,255,255,0.85)";
  ctx.stroke();
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

/** Card quadrata con l'icona di un'app (con un leggero bordo luminoso). */
function iconTexture(icon: AppIcon) {
  const size = 512;
  const c = document.createElement("canvas");
  c.width = c.height = size;
  const ctx = c.getContext("2d")!;
  ctx.translate(16, 16);
  drawAppIcon(ctx, icon, size - 32);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

/** Card segnaposto nello stile della reference: copertina color petrolio con titolo giallo/bianco. */
function placeholder(i: number) {
  const titles = ["5 TRUCCHI DI MONTAGGIO", "IL MIO SETUP", "FONT CHE FUNZIONANO", "VIDEO VIRALE IN 1 ORA", "STORYTELLING", "LUCI LOW COST", "HOOK PERFETTI", "COLOR GRADING", "B-ROLL"];
  return roundedCanvas((ctx, w, h) => {
    const g = ctx.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, ["#0E6E78", "#11808A", "#0B5E6B"][i % 3]);
    g.addColorStop(1, "#06262C");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
    // "persona" stilizzata
    ctx.fillStyle = "rgba(255,255,255,0.18)";
    ctx.beginPath();
    ctx.arc(w * 0.5, h * 0.55, 70, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillRect(w * 0.18, h * 0.66, w * 0.64, h * 0.4);
    ctx.font = "800 38px Poppins, Montserrat, sans-serif";
    ctx.textAlign = "center";
    const words = titles[i % titles.length].split(" ");
    words.forEach((word, k) => {
      ctx.fillStyle = k % 2 ? "#FFFFFF" : "#F0C828";
      ctx.fillText(word, w / 2, 90 + k * 44);
    });
  });
}

export const Carousel3D: React.FC<{ g: GraphicEvent }> = ({ g }) => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const images = (Array.isArray(g.props?.images) ? (g.props!.images as string[]) : []).slice(0, 12);
  const icons = (Array.isArray(g.props?.icons) ? (g.props!.icons as AppIcon[]) : []).slice(0, 8);
  const repeat = typeof g.props?.repeat === "number" ? g.props.repeat : 2;
  const count = icons.length ? icons.length * repeat : Math.max(images.length, typeof g.props?.count === "number" ? g.props.count : 9);
  const highlights = Array.isArray(g.props?.highlights) ? (g.props!.highlights as { frame: number; icon: AppIcon }[]) : [];
  const [handle] = useState(() => (images.length ? delayRender("copertine carosello") : null));
  const [loaded, setLoaded] = useState<THREE.Texture[]>([]);

  useEffect(() => {
    if (!images.length || handle === null) return;
    const loader = new THREE.TextureLoader();
    Promise.all(
      images.map(
        (src) =>
          new Promise<THREE.Texture>((res) =>
            loader.load(staticFile(src), (tex) => {
              const img = tex.image as HTMLImageElement;
              res(roundedCanvas((ctx, w, h) => ctx.drawImage(img, 0, 0, w, h)));
            }, undefined, () => res(placeholder(0))),
          ),
      ),
    ).then((tx) => {
      setLoaded(tx);
      continueRender(handle);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const textures = useMemo(
    () =>
      Array.from({ length: count }, (_, i) =>
        icons.length ? iconTexture(icons[i % icons.length]) : loaded[i % Math.max(1, loaded.length)] ?? placeholder(i),
      ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [count, loaded, icons.join(",")],
  );
  const cardW = icons.length ? 1.15 : CARD_W;
  const cardH = icons.length ? 1.15 : CARD_H;
  /**
   * Icona nominata: si ingrandisce con un rimbalzo e resta in evidenza finché non viene nominata la successiva;
   * le altre si attenuano.
   */
  const active = [...highlights].filter((h) => h.frame <= f).sort((x, y) => y.frame - x.frame)[0];
  const emphasis = (i: number) => {
    if (!icons.length || !active) return { scale: 1, opacity: 1 };
    const on = icons[i % icons.length] === active.icon;
    const k = spring({ frame: f - active.frame, fps, config: { damping: 9, stiffness: 220 } });
    return on ? { scale: 1 + 0.6 * k, opacity: 1 } : { scale: 1, opacity: 1 - 0.55 * k };
  };
  const exit = interpolate(f, [g.frames - 8, g.frames], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const radius = typeof g.props?.radius === "number" ? g.props.radius : 3.1;
  const speed = typeof g.props?.speed === "number" ? g.props.speed : 0.35; // radianti al secondo
  const rot = (f / fps) * speed + 0.6;
  const width = 1080;
  const height = 1000;
  return (
    <div style={{ position: "absolute", left: 0, top: `${(g.y ?? 0.43) * 100}%`, width, height, transform: "translateY(-50%)", opacity: exit }}>
      <ThreeCanvas width={width} height={height} camera={{ fov: 32, position: [0, 0.3, 9.4] }} gl={{ antialias: true, alpha: true }}>
        <group rotation={[0.05, rot, 0]}>
          {textures.map((tex, i) => {
            const a = (i / count) * Math.PI * 2;
            const s = spring({ frame: f - i * 2, fps, config: { damping: 13, stiffness: 120 } });
            return (
              <mesh key={i} position={[Math.sin(a) * radius * s, (1 - s) * -1.2, Math.cos(a) * radius * s]} rotation={[0, a, 0]} scale={Math.max(0.001, s * emphasis(i).scale)}>
                <planeGeometry args={[cardW, cardH]} />
                <meshBasicMaterial map={tex} transparent opacity={emphasis(i).opacity} side={THREE.DoubleSide} toneMapped={false} />
              </mesh>
            );
          })}
        </group>
      </ThreeCanvas>
    </div>
  );
};
