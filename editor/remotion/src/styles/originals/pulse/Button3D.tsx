import React from "react";
import * as THREE from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import type { GraphicEvent } from "../../../lib/timeline";
import { canvasTexture, springAt, useThreeStage } from "../../../three/stage";
import { clamp, fg, INTER, P, rgba } from "./shared";

/**
 * Bottone 3D (three.js): un tasto grosso e lucido su una base, visto un po' dall'alto, con la scritta sulla faccia.
 * Un cursore arriva e lo preme su props.pressAt (frame relativo): il tasto affonda e risale a molla, parte un'onda di
 * luce e sopra compare la pillola props.tag. props.label (es. "● REC"), props.color (default accento), props.dot.
 */
const W = 1000;
const H = 520;

function labelTexture(text: string, dot: string | null) {
  return canvasTexture(1024, 384, (ctx) => {
    ctx.clearRect(0, 0, 1024, 384);
    ctx.font = "900 190px Inter, Arial Black, sans-serif";
    ctx.textBaseline = "middle";
    const tw = ctx.measureText(text).width;
    const dotW = dot ? 150 : 0;
    let x = 512 - (tw + dotW) / 2;
    if (dot) {
      ctx.fillStyle = dot;
      ctx.beginPath();
      ctx.arc(x + 55, 196, 55, 0, Math.PI * 2);
      ctx.fill();
      x += dotW;
    }
    ctx.fillStyle = "#ffffff";
    ctx.fillText(text, x, 200);
  });
}

export const Button3D: React.FC<{ g: GraphicEvent }> = ({ g }) => {
  const f = useCurrentFrame();
  const { fps, height } = useVideoConfig();
  const pressAt = typeof g.props?.pressAt === "number" ? g.props.pressAt : 20;
  const label = String(g.props?.label ?? g.text ?? "OK");
  const color = String(g.props?.color ?? P.accent);
  const dot = typeof g.props?.dot === "string" ? (g.props.dot as string) : null;
  const tag = typeof g.props?.tag === "string" ? (g.props.tag as string) : null;
  const out = interpolate(f, [g.frames - 7, g.frames], [0, 1], clamp);
  const enter = spring({ frame: f, fps, config: { damping: 12, stiffness: 170, mass: 0.9 } });
  const ref = useThreeStage(
    f,
    { width: W, height: H, fov: 24, camZ: 7.4, camY: 4.4, lookY: -0.3 },
    (scene) => {
      const base = new THREE.Mesh(new RoundedBoxGeometry(4.4, 0.5, 2.2, 6, 0.24), new THREE.MeshPhysicalMaterial({ color: new THREE.Color("#1b1c21"), roughness: 0.45, clearcoat: 0.5 }));
      base.position.y = -0.35;
      const key = new THREE.Group();
      const body = new THREE.Mesh(new RoundedBoxGeometry(3.9, 0.7, 1.75, 8, 0.3), new THREE.MeshPhysicalMaterial({ color: new THREE.Color(color), roughness: 0.25, metalness: 0.05, clearcoat: 1, clearcoatRoughness: 0.1 }));
      const tex = labelTexture(label, dot);
      const top = new THREE.Mesh(new THREE.PlaneGeometry(3.3, 1.24), new THREE.MeshBasicMaterial({ map: tex, transparent: true }));
      top.rotation.x = -Math.PI / 2;
      top.position.y = 0.352;
      key.add(body, top);
      const root = new THREE.Group();
      root.add(base, key);
      scene.add(root);
      return { root, key };
    },
    ({ state }) => {
      const press = f < pressAt - 3 ? 0 : f < pressAt ? (f - (pressAt - 3)) / 3 : 1 - springAt(f - pressAt, fps, 9, 260);
      state.key.position.y = 0.12 - 0.36 * Math.max(0, press);
      state.root.scale.setScalar(Math.max(0.0001, enter) * (1 - out * 0.3));
      state.root.rotation.y = (1 - enter) * 0.9 + Math.sin(f / 26) * 0.08;
      state.root.rotation.x = Math.sin(f / 33) * 0.03;
      state.root.position.y = (1 - enter) * -1.5;
    },
  );
  // cursore: arriva da in basso a destra, "clicca" su pressAt
  const cur = interpolate(f, [pressAt - 16, pressAt - 2], [0, 1], { ...clamp, easing: (x) => 1 - (1 - x) ** 3 });
  const curOut = interpolate(f, [pressAt + 8, pressAt + 16], [0, 1], clamp);
  const ring = interpolate(f - pressAt, [0, 14], [0, 1], clamp);
  const tagIn = spring({ frame: f - pressAt, fps, config: { damping: 10, stiffness: 260 } });
  const cy = (g.y ?? 0.3) * height;
  return (
    <AbsoluteFill style={{ opacity: 1 - out }}>
      {tag && f >= pressAt && (
        <div style={{ position: "absolute", left: "50%", top: cy - H / 2 - 10, transform: `translate(-50%, -50%) scale(${0.5 + 0.5 * tagIn}) rotate(-2deg)`, opacity: Math.min(1, tagIn * 2), padding: "14px 40px", borderRadius: 999, background: P.accent, color: P.ink, fontFamily: INTER, fontWeight: 900, fontSize: 44, letterSpacing: 3, boxShadow: `0 14px 34px ${rgba(P.accent, 0.4)}` }}>
          {tag}
        </div>
      )}
      <div style={{ position: "absolute", left: "50%", top: cy, transform: "translate(-50%, -50%)", width: W, height: H }}>
        {f >= pressAt && ring < 1 && (
          <div style={{ position: "absolute", left: W / 2 - 300 * ring, top: H / 2 - 120 * ring, width: 600 * ring, height: 240 * ring, borderRadius: "50%", border: `${6 * (1 - ring)}px solid ${color}`, opacity: 1 - ring }} />
        )}
        <canvas ref={ref} width={W} height={H} style={{ width: W, height: H, filter: `drop-shadow(0 30px 34px ${fg(0.22)})` }} />
        {cur > 0 && curOut < 1 && (
          <svg
            width={110}
            height={110}
            viewBox="0 0 24 24"
            style={{ position: "absolute", left: W / 2 + 40 + (1 - cur) * 260, top: H / 2 - 30 + (1 - cur) * 220, opacity: 1 - curOut, transform: `scale(${f >= pressAt - 1 && f < pressAt + 3 ? 0.85 : 1})`, filter: "drop-shadow(0 6px 10px rgba(0,0,0,0.35))" }}
          >
            <path d="M5 3l14 8-6 1.5L10 19z" fill={P.fg} stroke={P.theme === "light" ? "#ffffff" : P.ink} strokeWidth={1.4} strokeLinejoin="round" />
          </svg>
        )}
      </div>
    </AbsoluteFill>
  );
};
