import React, { useMemo } from "react";
import { interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { ThreeCanvas } from "@remotion/three";
import * as THREE from "three";
import type { GraphicEvent } from "../../../lib/timeline";
import { logoShape } from "./logo";
import { C } from "./palette";

/**
 * Logo di Claude in 3D (estruso, arancione opaco) che compare sopra la mano e gira sull'asse verticale.
 * Reference 12,9–15,5 s: entra crescendo con un giro veloce, poi ruota ~1 giro ogni 2,4 s.
 */
export const Logo3D: React.FC<{ g: GraphicEvent }> = ({ g }) => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const geometry = useMemo(() => {
    const geo = new THREE.ExtrudeGeometry(logoShape(), { depth: 0.32, bevelEnabled: true, bevelThickness: 0.06, bevelSize: 0.035, bevelSegments: 5, curveSegments: 4 });
    geo.center();
    return geo;
  }, []);
  const size = 760;
  const enter = spring({ frame: f, fps, config: { damping: 11, stiffness: 140, mass: 0.8 } });
  const exit = interpolate(f, [g.frames - 6, g.frames], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const t = f / fps;
  const spin = t * ((Math.PI * 2) / 2.4) + (1 - enter) * Math.PI * 2.5;
  const x = g.x ?? 0.47;
  const y = g.y ?? 0.42;
  return (
    <div style={{ position: "absolute", left: `${x * 100}%`, top: `${y * 100}%`, width: size, height: size, transform: "translate(-50%, -50%)" }}>
      <ThreeCanvas width={size} height={size} camera={{ fov: 30, position: [0, 0, 7] }} gl={{ antialias: true, alpha: true }}>
        <ambientLight intensity={1.1} />
        <directionalLight position={[2.5, 3, 4]} intensity={2.2} color="#ffe2cc" />
        <directionalLight position={[-3, -1, 2]} intensity={0.8} color="#ff8a5c" />
        <group scale={Math.max(0.001, enter * exit) * 1.05} rotation={[0.12, spin, 0.05]} position={[0, Math.sin(t * 2.2) * 0.08 + (1 - enter) * -0.6, 0]}>
          <mesh geometry={geometry}>
            <meshStandardMaterial color={g.color ?? C.logo3d} roughness={0.6} metalness={0.05} />
          </mesh>
        </group>
      </ThreeCanvas>
    </div>
  );
};
