import React from "react";
import { AbsoluteFill, interpolate, Sequence, useCurrentFrame } from "remotion";
import { ThreeCanvas } from "@remotion/three";
import { Icon, ICON_NAMES } from "./icons";
import { Object3DMesh } from "./three/objects";
import type { Object3DName } from "./types";

const OBJECTS: Object3DName[] = ["coin", "star", "heart", "house", "gem", "bolt", "arrow", "gift"];

/** Catalogo visivo: tutte le icone (che si disegnano) e gli oggetti 3D. */
export const Gallery: React.FC = () => {
  const frame = useCurrentFrame();
  const p = interpolate(frame, [0, 40], [0, 1], { extrapolateRight: "clamp" });
  return (
    <AbsoluteFill style={{ background: "#151515", padding: 40, fontFamily: "Montserrat", color: "#fff" }}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(6, 1fr)", gap: 18 }}>
        {ICON_NAMES.map((n) => (
          <div key={n} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
            <div style={{ width: 120, height: 120, borderRadius: 60, background: "#FFD200", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Icon name={n} size={76} color="#111" strokeWidth={2.4} progress={p} />
            </div>
            <span style={{ fontSize: 20 }}>{n}</span>
          </div>
        ))}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", marginTop: 30 }}>
        {OBJECTS.map((o, i) => (
          <div key={o} style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
            <Sequence layout="none">
              <ThreeCanvas width={240} height={240} camera={{ fov: 35, position: [0, 0, 7] }}>
                <ambientLight intensity={0.8} />
                <directionalLight position={[3, 4, 5]} intensity={2.4} />
                <pointLight position={[0, 0, 4]} intensity={8} />
                <group rotation={[0.2, Math.sin(frame / 12 + i) * 0.5, 0]}>
                  <Object3DMesh name={o} />
                </group>
              </ThreeCanvas>
            </Sequence>
            <span style={{ fontSize: 22 }}>{o}</span>
          </div>
        ))}
      </div>
    </AbsoluteFill>
  );
};
