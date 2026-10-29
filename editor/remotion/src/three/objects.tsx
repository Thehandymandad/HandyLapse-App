import React, { useMemo } from "react";
import * as THREE from "three";
import type { Object3DName } from "../types";

/** Oggetti 3D generati da codice (niente modelli esterni). Ogni oggetto è centrato e alto ~2 unità. */

const extrude = (shape: THREE.Shape, depth = 0.45) => {
  const g = new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: true, bevelThickness: 0.12, bevelSize: 0.08, bevelSegments: 6, curveSegments: 32 });
  g.center();
  return g;
};

function starShape(points = 5, outer = 1.1, inner = 0.48) {
  const s = new THREE.Shape();
  for (let i = 0; i <= points * 2; i++) {
    const r = i % 2 ? inner : outer;
    const a = (i / (points * 2)) * Math.PI * 2 + Math.PI / 2;
    const x = Math.cos(a) * r;
    const y = Math.sin(a) * r;
    if (i === 0) s.moveTo(x, y);
    else s.lineTo(x, y);
  }
  return s;
}

function heartShape() {
  const s = new THREE.Shape();
  s.moveTo(0, -1);
  s.bezierCurveTo(-0.2, -0.75, -1.15, -0.3, -1.1, 0.35);
  s.bezierCurveTo(-1.05, 0.95, -0.35, 1.15, 0, 0.6);
  s.bezierCurveTo(0.35, 1.15, 1.05, 0.95, 1.1, 0.35);
  s.bezierCurveTo(1.15, -0.3, 0.2, -0.75, 0, -1);
  return s;
}

function houseShape() {
  // contorno con la porta come incavo + finestra come foro
  const s = new THREE.Shape();
  [[-0.9, -1], [-0.22, -1], [-0.22, -0.35], [0.22, -0.35], [0.22, -1], [0.9, -1], [0.9, 0.2], [1.15, 0.2], [0, 1.1], [-1.15, 0.2], [-0.9, 0.2]].forEach(
    ([x, y], i) => (i ? s.lineTo(x, y) : s.moveTo(x, y)),
  );
  s.closePath();
  const win = new THREE.Path();
  win.moveTo(0.38, -0.1);
  win.lineTo(0.7, -0.1);
  win.lineTo(0.7, 0.2);
  win.lineTo(0.38, 0.2);
  win.closePath();
  s.holes.push(win);
  return s;
}

function boltShape() {
  const s = new THREE.Shape();
  [[0.25, 1.1], [-0.65, -0.1], [-0.05, -0.1], [-0.3, -1.1], [0.65, 0.15], [0.05, 0.15], [0.25, 1.1]].forEach(([x, y], i) =>
    i ? s.lineTo(x, y) : s.moveTo(x, y),
  );
  return s;
}

function arrowShape() {
  const s = new THREE.Shape();
  [[0, 1.1], [0.9, 0.1], [0.35, 0.1], [0.35, -1.1], [-0.35, -1.1], [-0.35, 0.1], [-0.9, 0.1], [0, 1.1]].forEach(([x, y], i) =>
    i ? s.lineTo(x, y) : s.moveTo(x, y),
  );
  return s;
}

/** Texture con un simbolo (es. €) per le facce della moneta. */
function symbolTexture(symbol: string, bg: string, fg: string) {
  const c = document.createElement("canvas");
  c.width = c.height = 256;
  const ctx = c.getContext("2d")!;
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, 256, 256);
  ctx.strokeStyle = fg;
  ctx.lineWidth = 10;
  ctx.beginPath();
  ctx.arc(128, 128, 104, 0, Math.PI * 2);
  ctx.stroke();
  ctx.fillStyle = fg;
  // specchiato: compensa l'orientamento delle UV del tappo
  ctx.translate(256, 0);
  ctx.scale(-1, 1);
  ctx.font = "900 150px Montserrat, Arial Black, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(symbol, 128, 138);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  // il tappo del cilindro ruotato verso la camera ha le UV girate di 90°
  t.center.set(0.5, 0.5);
  t.rotation = -Math.PI / 2;
  return t;
}

const gold = { color: "#FFC83D", metalness: 0.35, roughness: 0.3, emissive: "#5a3a00", emissiveIntensity: 0.25 };

export const Object3DMesh: React.FC<{ name: Object3DName; color?: string; label?: string }> = ({ name, color, label }) => {
  const content = useMemo(() => {
    switch (name) {
      case "coin": {
        const face = symbolTexture(label || "€", "#F5B700", "#8A5A00");
        return (
          <mesh rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[1.1, 1.1, 0.22, 64]} />
            <meshStandardMaterial attach="material-0" {...gold} color={color ?? gold.color} />
            <meshStandardMaterial attach="material-1" map={face} metalness={0.25} roughness={0.35} />
            <meshStandardMaterial attach="material-2" map={face} metalness={0.25} roughness={0.35} />
          </mesh>
        );
      }
      case "star":
        return (
          <mesh geometry={extrude(starShape())}>
            <meshStandardMaterial {...gold} color={color ?? "#FFD200"} />
          </mesh>
        );
      case "heart":
        return (
          <mesh geometry={extrude(heartShape(), 0.5)}>
            <meshPhysicalMaterial color={color ?? "#FF2D55"} roughness={0.2} metalness={0.1} clearcoat={1} />
          </mesh>
        );
      case "house":
        return (
          <mesh geometry={extrude(houseShape(), 0.6)}>
            <meshStandardMaterial color={color ?? "#FFD200"} roughness={0.4} metalness={0.2} />
          </mesh>
        );
      case "bolt":
        return (
          <mesh geometry={extrude(boltShape(), 0.4)}>
            <meshStandardMaterial color={color ?? "#FFE600"} emissive={color ?? "#FFB800"} emissiveIntensity={0.35} roughness={0.3} />
          </mesh>
        );
      case "arrow":
        return (
          <mesh geometry={extrude(arrowShape(), 0.4)}>
            <meshPhysicalMaterial color={color ?? "#22E06B"} roughness={0.25} clearcoat={0.8} />
          </mesh>
        );
      case "gem":
        return (
          <mesh scale={1.2}>
            <octahedronGeometry args={[1, 0]} />
            <meshPhysicalMaterial color={color ?? "#38E1FF"} roughness={0.05} metalness={0.1} clearcoat={1} flatShading />
          </mesh>
        );
      case "gift":
        return (
          <group>
            <mesh>
              <boxGeometry args={[1.6, 1.4, 1.6]} />
              <meshStandardMaterial color={color ?? "#FF3B6B"} roughness={0.45} />
            </mesh>
            <mesh>
              <boxGeometry args={[0.32, 1.44, 1.64]} />
              <meshStandardMaterial color="#FFD200" metalness={0.5} roughness={0.3} />
            </mesh>
            <mesh>
              <boxGeometry args={[1.64, 1.44, 0.32]} />
              <meshStandardMaterial color="#FFD200" metalness={0.5} roughness={0.3} />
            </mesh>
            <mesh position={[0, 0.9, 0]} rotation={[0, 0, Math.PI / 4]}>
              <torusGeometry args={[0.32, 0.1, 16, 32]} />
              <meshStandardMaterial color="#FFD200" metalness={0.5} roughness={0.3} />
            </mesh>
          </group>
        );
    }
  }, [name, color, label]);
  return <>{content}</>;
};
