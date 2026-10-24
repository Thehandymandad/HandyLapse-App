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

type Fly = { frame: number; icon: AppIcon };

/** Fotocamera a tutto schermo equivalente a quella della reference (fov 32° su 1000 px, anello a y≈0.43). */
const FULL_W = 1080;
const FULL_H = 1920;
const FOV = 2 * Math.atan(Math.tan((16 * Math.PI) / 180) * (FULL_H / 1000)); // stessa scala in pixel
const FOCAL = FULL_H / 2 / Math.tan(FOV / 2); // px per unità a distanza 1
const CAM_Z = 9.4;

function rotateXY(v: [number, number, number], rx: number, ry: number): [number, number, number] {
  // prima Y poi X (come <group rotation={[rx, ry, 0]}> con ordine XYZ applicato al vettore)
  const [x, y, z] = v;
  const x1 = x * Math.cos(ry) + z * Math.sin(ry);
  const z1 = -x * Math.sin(ry) + z * Math.cos(ry);
  const y2 = y * Math.cos(rx) - z1 * Math.sin(rx);
  const z2 = y * Math.sin(rx) + z1 * Math.cos(rx);
  return [x1, y2, z2];
}

const ease = (t: number) => (t <= 0 ? 0 : t >= 1 ? 1 : 1 - Math.pow(1 - t, 3));

/**
 * props.mode:
 *  - "ring" (con "behind": true): l'anello di icone/card che gira DIETRO la persona; le icone già chiamate escono dall'anello
 *  - "front" (stessa grafica, senza behind): le icone chiamate (props.flyOut) volano in avanti e si fermano in fila sotto la persona
 * props.flyOut: [{ frame, icon }] frame relativo all'inizio della grafica. props.slotY (0..1), props.slotSize (px).
 */
export const Carousel3D: React.FC<{ g: GraphicEvent }> = ({ g }) => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const mode = g.props?.mode === "front" ? "front" : "ring";
  const images = (Array.isArray(g.props?.images) ? (g.props!.images as string[]) : []).slice(0, 12);
  const icons = (Array.isArray(g.props?.icons) ? (g.props!.icons as AppIcon[]) : []).slice(0, 8);
  const count = icons.length || Math.max(images.length, typeof g.props?.count === "number" ? g.props.count : 9);
  const flyOut = Array.isArray(g.props?.flyOut) ? (g.props!.flyOut as Fly[]) : [];
  const [handle] = useState(() => (images.length && !icons.length ? delayRender("copertine carosello") : null));
  const [loaded, setLoaded] = useState<THREE.Texture[]>([]);

  useEffect(() => {
    if (handle === null) return;
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
    () => Array.from({ length: count }, (_, i) => (icons.length ? iconTexture(icons[i]) : loaded[i % Math.max(1, loaded.length)] ?? placeholder(i))),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [count, loaded, icons.join(",")],
  );
  const cardW = icons.length ? 1.15 : CARD_W;
  const cardH = icons.length ? 1.15 : CARD_H;
  const exit = interpolate(f, [g.frames - 8, g.frames], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const radius = typeof g.props?.radius === "number" ? g.props.radius : 3.1;
  const speed = typeof g.props?.speed === "number" ? g.props.speed : 0.35; // radianti al secondo
  const rotAt = (frame: number) => (frame / fps) * speed + 0.6;
  const RX = 0.05;
  // centro dell'anello a schermo come nella reference (y≈0.43 + 55 px), quindi camera spostata di conseguenza
  const ringScreenY = (g.y ?? 0.43) * FULL_H + 55.6;
  const camY = (ringScreenY - FULL_H / 2) / (FOCAL / CAM_Z);

  const ringPos = (i: number, frame: number): [number, number, number] => {
    const a = (i / count) * Math.PI * 2;
    const s = spring({ frame: frame - i * 3, fps, config: { damping: 13, stiffness: 120 } });
    return rotateXY([Math.sin(a) * radius * s, (1 - s) * -1.2, Math.cos(a) * radius * s], RX, rotAt(frame));
  };

  const meshes: React.ReactNode[] = [];
  const slotY = typeof g.props?.slotY === "number" ? g.props.slotY : 0.8;
  const slotSize = typeof g.props?.slotSize === "number" ? g.props.slotSize : 190;
  const n = flyOut.length;
  for (let i = 0; i < count; i++) {
    const fly = icons.length ? flyOut.find((x) => x.icon === icons[i]) : undefined;
    const flying = fly && f >= fly.frame;
    if (mode === "ring" && !flying) {
      const a = (i / count) * Math.PI * 2;
      const s = spring({ frame: f - i * 3, fps, config: { damping: 13, stiffness: 120 } });
      const [x, y, z] = ringPos(i, f);
      meshes.push(
        <mesh key={i} position={[x, y, z]} rotation={[RX, a + rotAt(f), 0]} scale={Math.max(0.001, s)}>
          <planeGeometry args={[cardW, cardH]} />
          <meshBasicMaterial map={textures[i]} transparent side={THREE.DoubleSide} toneMapped={false} />
        </mesh>,
      );
    }
    if (mode === "front" && fly && flying) {
      const k = flyOut.indexOf(fly);
      const p = ease((f - fly.frame) / 18);
      const land = spring({ frame: f - fly.frame - 14, fps, config: { damping: 8, stiffness: 220 } });
      const start = ringPos(i, fly.frame);
      // posto in fila sotto la persona, più vicino alla camera
      const zT = 5;
      const d = CAM_Z - zT;
      const px = FULL_W / 2 + (k - (n - 1) / 2) * (slotSize * 1.25);
      const py = slotY * FULL_H;
      const target: [number, number, number] = [((px - FULL_W / 2) * d) / FOCAL, camY - ((py - FULL_H / 2) * d) / FOCAL, zT];
      const pos = start.map((v, j) => v + (target[j] - v) * p) as [number, number, number];
      pos[2] += Math.sin(Math.PI * p) * 1.2; // arco verso la camera
      const scaleT = (slotSize * d) / FOCAL / cardW;
      let ang = ((i / count) * Math.PI * 2 + rotAt(fly.frame)) % (Math.PI * 2);
      if (ang > Math.PI) ang -= Math.PI * 2;
      const scale = (1 + (scaleT - 1) * p) * (p >= 1 ? 1 + 0.12 * (1 - land) * Math.sin(land * Math.PI) + 0 : 1);
      meshes.push(
        <mesh key={i} position={pos} rotation={[RX * (1 - p), ang * (1 - p) + Math.sin(Math.PI * p) * 0.6, 0]} scale={Math.max(0.001, scale)}>
          <planeGeometry args={[cardW, cardH]} />
          <meshBasicMaterial map={textures[i]} transparent side={THREE.DoubleSide} toneMapped={false} />
        </mesh>,
      );
    }
  }

  return (
    <div style={{ position: "absolute", inset: 0, opacity: exit }}>
      <ThreeCanvas width={FULL_W} height={FULL_H} camera={{ fov: (FOV * 180) / Math.PI, position: [0, camY, CAM_Z] }} gl={{ antialias: true, alpha: true }}>
        {meshes}
      </ThreeCanvas>
    </div>
  );
};
