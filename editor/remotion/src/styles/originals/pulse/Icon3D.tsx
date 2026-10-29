import React from "react";
import * as THREE from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { ICONS } from "../../../icons";
import type { GraphicEvent } from "../../../lib/timeline";
import { canvasTexture, springAt, useThreeStage } from "../../../three/stage";
import type { IconName } from "../../../types";
import { clamp, INTER, P } from "./shared";

/**
 * Icone 3D (three.js): tessere lucide del colore d'accento con l'icona in rilievo chiaro sulla faccia, che entrano
 * girando su sé stesse una alla volta, poi ondeggiano piano; sotto ogni tessera un'etichetta.
 * props.items: [{ icon, label, at }] (at = frame relativo in cui la tessera atterra; 1–4 tessere).
 */
type Item = { icon: IconName; label?: string; at?: number };
const W = 1080;
const H = 470;
const FOV = 26;
const CAMZ = 6.2;
/** px per unità three.js sul piano z=0 (per mettere le etichette HTML sotto le tessere). */
const PX = H / (2 * CAMZ * Math.tan(((FOV / 2) * Math.PI) / 180));

function iconTexture(name: IconName, color: string) {
  return canvasTexture(512, 512, (ctx) => {
    ctx.clearRect(0, 0, 512, 512);
    ctx.translate(256, 256);
    ctx.scale(15, 15);
    ctx.translate(-12, -12);
    ctx.strokeStyle = color;
    ctx.lineWidth = 2.3;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    for (const el of ICONS[name] ?? ICONS.spark) {
      if (typeof el === "string") ctx.stroke(new Path2D(el));
      else {
        ctx.beginPath();
        ctx.arc(el.c[0], el.c[1], el.c[2], 0, Math.PI * 2);
        ctx.stroke();
      }
    }
  });
}

export const Icon3D: React.FC<{ g: GraphicEvent }> = ({ g }) => {
  const f = useCurrentFrame();
  const { fps, height } = useVideoConfig();
  const items = ((Array.isArray(g.props?.items) ? g.props!.items : [{ icon: g.icon ?? "spark", label: g.text, at: 6 }]) as Item[]).slice(0, 4);
  const n = items.length;
  // con 4 tessere più strette e più piccole, così stanno tutte nella fascia
  const gap = n >= 4 ? 1.38 : 2.25;
  const tile = n >= 4 ? 0.7 : 1;
  const out = interpolate(f, [g.frames - 7, g.frames], [0, 1], clamp);
  const ref = useThreeStage(
    f,
    { width: W, height: H, fov: FOV, camZ: CAMZ, camY: 0.6, lookY: 0 },
    (scene) => {
      const geo = new RoundedBoxGeometry(1.7, 1.7, 0.55, 6, 0.32);
      return items.map((it, i) => {
        const group = new THREE.Group();
        const body = new THREE.Mesh(geo, new THREE.MeshPhysicalMaterial({ color: new THREE.Color(P.accent), roughness: 0.32, metalness: 0, clearcoat: 1, clearcoatRoughness: 0.08 }));
        const face = new THREE.Mesh(
          new THREE.PlaneGeometry(1.25, 1.25),
          new THREE.MeshPhysicalMaterial({ map: iconTexture(it.icon, "#ffffff"), transparent: true, roughness: 0.3, clearcoat: 0.6, emissive: new THREE.Color("#ffffff"), emissiveIntensity: 0.25, emissiveMap: iconTexture(it.icon, "#ffffff") }),
        );
        face.position.z = 0.281;
        group.add(body, face);
        group.position.x = (i - (n - 1) / 2) * gap;
        scene.add(group);
        return group;
      });
    },
    ({ state }) => {
      state.forEach((group, i) => {
        const at = items[i].at ?? 6 + i * 6;
        const e = springAt(f - at + 10, fps, 11, 150, 0.9); // l'entrata dura ~10 fotogrammi prima di "at"
        const kick = springAt(f - at, fps, 8, 320);
        const s = tile * Math.max(0.0001, e) * (f >= at ? 1 + 0.12 * Math.sin(Math.min(1, kick) * Math.PI) : 1) * (1 - out * 0.4);
        group.scale.setScalar(s);
        group.rotation.y = (1 - e) * -Math.PI * 1.5 + Math.sin(f / 22 + i) * 0.22;
        group.rotation.x = 0.18 + Math.sin(f / 31 + i * 2) * 0.06;
        group.position.y = (1 - e) * -1.2 + Math.sin(f / 18 + i * 1.3) * 0.08;
        group.visible = f >= at - 10;
      });
    },
  );
  return (
    <AbsoluteFill style={{ opacity: 1 - out }}>
      <div style={{ position: "absolute", left: "50%", top: (g.y ?? 0.3) * height, transform: "translate(-50%, -50%)", width: W, height: H + 70 }}>
        <canvas ref={ref} width={W} height={H} style={{ width: W, height: H, filter: "drop-shadow(0 26px 30px rgba(40,25,15,0.28))" }} />
        {items.map((it, i) => {
          const at = it.at ?? 6 + i * 6;
          const k = interpolate(f, [at, at + 6], [0, 1], clamp);
          const x = W / 2 + (i - (n - 1) / 2) * gap * PX;
          return it.label ? (
            <div key={i} style={{ position: "absolute", left: x, top: H - (n >= 4 ? 70 : 4), transform: `translate(-50%, ${(1 - k) * 20}px)`, opacity: k, fontFamily: INTER, fontWeight: 900, fontSize: n >= 4 ? 28 : 34, letterSpacing: n >= 4 ? 1 : 2, color: P.fg, whiteSpace: "nowrap", textShadow: P.theme === "light" ? "none" : "0 3px 12px rgba(0,0,0,0.6)" }}>
              {it.label}
            </div>
          ) : null;
        })}
      </div>
    </AbsoluteFill>
  );
};
