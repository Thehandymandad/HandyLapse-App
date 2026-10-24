import React, { useMemo } from "react";
import { interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { ThreeCanvas } from "@remotion/three";
import * as THREE from "three";
import type { GraphicEvent } from "../../../lib/timeline";
import { logoShape } from "./logo";
import { C } from "./palette";

/** Anello arrotondato (rettangolo con foro) per le maglie del logo OpenAI. */
function ringShape(w: number, h: number, r: number, t: number) {
  const rr = (s: THREE.Shape | THREE.Path, x: number, y: number, ww: number, hh: number, rad: number) => {
    s.moveTo(x + rad, y);
    s.lineTo(x + ww - rad, y);
    s.quadraticCurveTo(x + ww, y, x + ww, y + rad);
    s.lineTo(x + ww, y + hh - rad);
    s.quadraticCurveTo(x + ww, y + hh, x + ww - rad, y + hh);
    s.lineTo(x + rad, y + hh);
    s.quadraticCurveTo(x, y + hh, x, y + hh - rad);
    s.lineTo(x, y + rad);
    s.quadraticCurveTo(x, y, x + rad, y);
  };
  const s = new THREE.Shape();
  rr(s, -w / 2, -h / 2, w, h, r);
  const hole = new THREE.Path();
  rr(hole, -w / 2 + t, -h / 2 + t, w - 2 * t, h - 2 * t, Math.max(0.01, r - t));
  s.holes.push(hole);
  return s;
}

/** Logo OpenAI stilizzato: sei maglie arrotondate ruotate di 60° attorno al centro. */
function openaiGeometries() {
  return Array.from({ length: 6 }, (_, k) => {
    const geo = new THREE.ExtrudeGeometry(ringShape(0.42, 0.92, 0.2, 0.13), { depth: 0.2, bevelEnabled: true, bevelThickness: 0.04, bevelSize: 0.025, bevelSegments: 4, curveSegments: 8 });
    geo.translate(0.12, 0.28, -0.1);
    geo.rotateZ((k * Math.PI) / 3);
    return geo;
  });
}

/**
 * Logo di Claude in 3D (estruso, arancione opaco) che compare sopra la mano e gira sull'asse verticale.
 * Reference 12,9–15,5 s: entra crescendo con un giro veloce, poi ruota ~1 giro ogni 2,4 s.
 */
export const Logo3D: React.FC<{ g: GraphicEvent }> = ({ g }) => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const logo = g.props?.logo === "openai" ? "openai" : "claude";
  const openai = useMemo(() => (logo === "openai" ? openaiGeometries() : []), [logo]);
  const geometry = useMemo(() => {
    const geo = new THREE.ExtrudeGeometry(logoShape(), { depth: 0.32, bevelEnabled: true, bevelThickness: 0.06, bevelSize: 0.035, bevelSegments: 5, curveSegments: 4 });
    geo.center();
    return geo;
  }, []);
  const size = 760;
  // props.enter=false: già presente (es. continua dopo un taglio)
  const enter = g.props?.enter === false ? 1 : spring({ frame: f, fps, config: { damping: 11, stiffness: 140, mass: 0.8 } });
  const exit = interpolate(f, [g.frames - 6, g.frames], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const t = f / fps;
  // props.spin: "turn" (giro continuo, come la reference) | "wobble" (oscilla mostrando sempre la faccia)
  const spin =
    g.props?.spin === "wobble"
      ? Math.sin(t * 2.6) * 0.55 + (1 - enter) * Math.PI * 2
      : t * ((Math.PI * 2) / 2.4) + (1 - enter) * Math.PI * 2.5;
  // props.track: [{ f, x, y }] posizione (0..1 nel reel) per frame della grafica → il logo segue la mano
  const track = Array.isArray(g.props?.track) ? (g.props!.track as { f: number; x: number; y: number }[]) : null;
  let x = g.x ?? 0.47;
  let y = g.y ?? 0.42;
  if (track?.length) {
    const i = Math.max(0, track.findIndex((p) => p.f > f) - 1);
    const a = track[Math.min(i, track.length - 1)];
    const b = track[Math.min(i + 1, track.length - 1)];
    const k = b.f > a.f ? Math.min(1, Math.max(0, (f - a.f) / (b.f - a.f))) : 0;
    x = a.x + (b.x - a.x) * k;
    y = a.y + (b.y - a.y) * k;
  }
  return (
    <div style={{ position: "absolute", left: `${x * 100}%`, top: `${y * 100}%`, width: size, height: size, transform: "translate(-50%, -50%)" }}>
      <ThreeCanvas width={size} height={size} camera={{ fov: 30, position: [0, 0, 7] }} gl={{ antialias: true, alpha: true }}>
        <ambientLight intensity={1.1} />
        <directionalLight position={[2.5, 3, 4]} intensity={2.2} color="#ffe2cc" />
        <directionalLight position={[-3, -1, 2]} intensity={0.8} color="#ff8a5c" />
        <group scale={Math.max(0.001, enter * exit) * 1.05 * (typeof g.props?.size === "number" ? g.props.size : 1)} rotation={[0.12, spin, 0.05]} position={[0, Math.sin(t * 2.2) * 0.08 + (1 - enter) * -0.6, 0]}>
          {logo === "claude" ? (
            <mesh geometry={geometry}>
              <meshStandardMaterial color={g.color ?? C.logo3d} roughness={0.6} metalness={0.05} />
            </mesh>
          ) : (
            openai.map((geo, k) => (
              <mesh key={k} geometry={geo}>
                <meshStandardMaterial color={g.color ?? "#141414"} roughness={0.25} metalness={0.4} />
              </mesh>
            ))
          )}
        </group>
      </ThreeCanvas>
    </div>
  );
};
