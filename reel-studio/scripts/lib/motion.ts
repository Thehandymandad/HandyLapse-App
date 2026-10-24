import { rawFrames } from "./sh";

/**
 * Stima del movimento globale della camera tra fotogrammi consecutivi (10 fps):
 * cerca la scala e lo spostamento che allineano meglio i due fotogrammi (minima differenza assoluta),
 * su immagini piccole in scala di grigi. Robusto alle scritte sovrapposte perché usa il centro dell'immagine.
 */
const W = 72;
const H = 128;
const SCALES = [-0.03, -0.022, -0.015, -0.01, -0.006, -0.003, 0, 0.003, 0.006, 0.01, 0.015, 0.022, 0.03].map((d) => 1 + d);
const SHIFTS = [-6, -4, -3, -2, -1.5, -1, -0.5, 0, 0.5, 1, 1.5, 2, 3, 4, 6];

function gray(rgb: Buffer) {
  const g = new Float32Array(W * H);
  for (let i = 0; i < W * H; i++) g[i] = 0.299 * rgb[i * 3] + 0.587 * rgb[i * 3 + 1] + 0.114 * rgb[i * 3 + 2];
  return g;
}

function sample(img: Float32Array, x: number, y: number) {
  const x0 = Math.floor(x);
  const y0 = Math.floor(y);
  const fx = x - x0;
  const fy = y - y0;
  const i = y0 * W + x0;
  return (img[i] * (1 - fx) + img[i + 1] * fx) * (1 - fy) + (img[i + W] * (1 - fx) + img[i + W + 1] * fx) * fy;
}

function cost(a: Float32Array, b: Float32Array, s: number, dx: number, dy: number, best: number) {
  const cx = W / 2;
  const cy = H / 2;
  let sum = 0;
  let n = 0;
  for (let y = 16; y < H - 16; y += 1) {
    for (let x = 9; x < W - 9; x += 1) {
      const ax = cx + (x - cx) / s - dx;
      const ay = cy + (y - cy) / s - dy;
      if (ax < 0 || ay < 0 || ax >= W - 1 || ay >= H - 1) continue;
      sum += Math.abs(b[y * W + x] - sample(a, ax, ay));
      n++;
    }
    if (n > 200 && sum / n > best * 1.5) return Infinity; // potatura
  }
  return n ? sum / n : Infinity;
}

export type Motion = { t: number; scale: number; dx: number; dy: number };

/** Movimento tra ogni coppia di fotogrammi a 10 fps: scala e spostamento del CONTENUTO (dx/dy in px su larghezza 1080). */
export async function estimateMotion(input: string): Promise<Motion[]> {
  const frames = (await rawFrames(input, { fps: 10, width: W, height: H })).map(gray);
  const out: Motion[] = [];
  for (let i = 1; i < frames.length; i++) {
    const a = frames[i - 1];
    const b = frames[i];
    let best = { c: cost(a, b, 1, 0, 0, Infinity), s: 1, dx: 0, dy: 0 };
    for (const s of SCALES) {
      for (const dy of SHIFTS) {
        for (const dx of SHIFTS) {
          const c = cost(a, b, s, dx, dy, best.c);
          if (c < best.c) best = { c, s, dx, dy };
        }
      }
    }
    // rifinitura sub-pixel attorno al minimo
    for (const step of [0.25, 0.125]) {
      for (const [ds, ddx, ddy] of [[0, step, 0], [0, -step, 0], [0, 0, step], [0, 0, -step], [step / 100, 0, 0], [-step / 100, 0, 0]]) {
        const c = cost(a, b, best.s + ds, best.dx + ddx, best.dy + ddy, best.c);
        if (c < best.c) best = { c, s: best.s + ds, dx: best.dx + ddx, dy: best.dy + ddy };
      }
    }
    out.push({ t: +(i / 10).toFixed(2), scale: best.s, dx: (best.dx * 1080) / W, dy: (best.dy * 1080) / W });
  }
  return out;
}
