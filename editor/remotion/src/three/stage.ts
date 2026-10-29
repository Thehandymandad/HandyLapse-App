/**
 * three.js disegnato dal fotogramma corrente, senza @remotion/three: funziona uguale in Remotion e dentro HyperFrames
 * (dove i componenti girano su hf-seek). La scena si costruisce una volta per <canvas> e a ogni fotogramma
 * `draw(f)` aggiorna gli oggetti e ridisegna in modo sincrono (useLayoutEffect), così lo screenshot la vede.
 */
import { useLayoutEffect, useRef } from "react";
import * as THREE from "three";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";

export type Stage<S> = { renderer: THREE.WebGLRenderer; scene: THREE.Scene; camera: THREE.PerspectiveCamera; state: S };

const stages = new WeakMap<HTMLCanvasElement, Stage<unknown>>();

export function useThreeStage<S>(
  frame: number,
  opts: { width: number; height: number; fov?: number; camZ?: number; camY?: number; lookY?: number },
  build: (scene: THREE.Scene, camera: THREE.PerspectiveCamera) => S,
  draw: (stage: Stage<S>, frame: number) => void,
) {
  const ref = useRef<HTMLCanvasElement>(null);
  useLayoutEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    let st = stages.get(canvas) as Stage<S> | undefined;
    if (!st) {
      const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true, preserveDrawingBuffer: true });
      renderer.setPixelRatio(1);
      renderer.setSize(opts.width, opts.height, false);
      renderer.setClearColor(0x000000, 0);
      renderer.outputColorSpace = THREE.SRGBColorSpace;
      // tone mapping neutro: i colori pieni (l'arancione elettrico) restano saturi, come nelle grafiche 2D
      renderer.toneMapping = THREE.NeutralToneMapping;
      renderer.toneMappingExposure = 1;
      const scene = new THREE.Scene();
      const pmrem = new THREE.PMREMGenerator(renderer);
      scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
      scene.environmentIntensity = 0.55;
      pmrem.dispose();
      const key = new THREE.DirectionalLight(0xffffff, 1.6);
      key.position.set(2.5, 4, 5);
      scene.add(key, new THREE.AmbientLight(0xffffff, 0.35));
      const camera = new THREE.PerspectiveCamera(opts.fov ?? 30, opts.width / opts.height, 0.1, 100);
      camera.position.set(0, opts.camY ?? 0, opts.camZ ?? 8);
      camera.lookAt(0, opts.lookY ?? 0, 0);
      st = { renderer, scene, camera, state: build(scene, camera) };
      stages.set(canvas, st as Stage<unknown>);
    }
    draw(st, frame);
    st.renderer.render(st.scene, st.camera);
  });
  useLayoutEffect(
    () => () => {
      const canvas = ref.current;
      const st = canvas && stages.get(canvas);
      if (st) {
        st.renderer.dispose();
        st.renderer.forceContextLoss();
        stages.delete(canvas!);
      }
    },
    [],
  );
  return ref;
}

/** Texture da un disegno 2D (icone, testo) per le facce degli oggetti. */
export function canvasTexture(w: number, h: number, paint: (ctx: CanvasRenderingContext2D) => void) {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  paint(c.getContext("2d")!);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}

/** Molla di Remotion in forma chiusa (uguale a spring() con from 0 → 1). */
export function springAt(frame: number, fps: number, damping: number, stiffness: number, mass = 1) {
  const t = Math.max(0, frame) / fps;
  const zeta = damping / (2 * Math.sqrt(stiffness * mass));
  const w0 = Math.sqrt(stiffness / mass);
  if (zeta < 1) {
    const w1 = w0 * Math.sqrt(1 - zeta * zeta);
    return 1 - Math.exp(-zeta * w0 * t) * (Math.sin(w1 * t) * ((zeta * w0) / w1) + Math.cos(w1 * t));
  }
  return 1 - Math.exp(-w0 * t) * (1 + w0 * t);
}
