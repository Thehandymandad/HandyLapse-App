/**
 * Regole di movimento "bouncy" (metodo Zane Hoyer, editor/styles/zane/README-movimento.md): tutti i numeri stanno
 * qui, i componenti li importano invece di inventarsi molle proprie. Frame a 30 fps (a 60 fps raddoppiano).
 *
 * Molla di Remotion (massa 1): per un overshoot OS lo smorzamento è ζ = −ln(OS)/√(π² + ln²(OS)), damping = 2ζ√stiffness.
 */
import { interpolate, spring } from "remotion";

type Cfg = { damping: number; stiffness: number; mass?: number };

/** Default: 20% di overshoot, si assesta in ~0,55 s. */
export const BOUNCE: Cfg = { damping: 14.4, stiffness: 250 };
/** Più morbida: 20% di overshoot, ~0,67 s (oggetti grandi, card). */
export const BOUNCE_SOFT: Cfg = { damping: 11.9, stiffness: 170 };
/** Più secca: 15% di overshoot, ~0,49 s (testo piccolo, etichette). */
export const BOUNCE_SNAP: Cfg = { damping: 16.3, stiffness: 250 };

/** Sfalsamento in frame. */
export const STAGGER = { letter: 2, word: 4, card: 4 } as const;

/** Fotogramma in cui la molla BOUNCE passa per la prima volta da 1 (l'"atterraggio"): ~0,15 s. */
export const LAND = 4;

/** Valore della molla (0 → 1 con overshoot) a `age` fotogrammi dall'inizio. */
export function bounce(age: number, fps: number, cfg: Cfg = BOUNCE): number {
  if (age <= 0) return 0;
  return spring({ frame: age, fps, config: cfg });
}

/**
 * Squash & stretch all'atterraggio: per 3 fotogrammi da `landAt` scala 1.12 nella direzione del moto e 0.9 di traverso,
 * poi torna a 1. `vertical`: il moto era verticale (caduta) → stretch su Y; altrimenti su X.
 */
export function squash(age: number, landAt = LAND, vertical = true): { sx: number; sy: number } {
  const d = age - landAt;
  if (d < 0 || d > 3) return { sx: 1, sy: 1 };
  const k = 1 - d / 3;
  const along = 1 + 0.12 * k;
  const across = 1 - 0.1 * k;
  return vertical ? { sx: across, sy: along } : { sx: along, sy: across };
}

/** Rotazione che si assesta con un'oscillazione: −8° → +4° → −1° → 0° in ~0,5 s (scalata da `amp`). */
export function wobble(age: number, amp = 1): number {
  if (age <= 0) return -8 * amp;
  return interpolate(age, [0, 5, 10, 15], [-8 * amp, 4 * amp, -1 * amp, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: (t) => t * t * (3 - 2 * t),
  });
}

/**
 * Uscita a molla: 3–4 fotogrammi di rincorsa all'indietro (~6% della distanza), poi 7 fotogrammi di accelerazione
 * verso l'esterno. Restituisce la frazione della distanza percorsa (negativa durante la rincorsa) da `exitFrom`.
 */
export function exitPull(f: number, exitFrom: number): number {
  const d = f - exitFrom;
  if (d <= 0) return 0;
  if (d <= 4) return -0.06 * Math.sin((d / 4) * Math.PI * 0.5);
  const t = Math.min(1, (d - 4) / 7);
  return -0.06 + 1.06 * t * t * t;
}

/** Fotogramma da cui far partire l'uscita per finire esattamente a fine grafica. */
export const EXIT_FRAMES = 11;

/**
 * Movimento secondario: quando un elemento atterra (a `landFrame`), i vicini si spostano di `px` nella sua direzione
 * e tornano indietro con la stessa molla. Restituisce lo spostamento in px.
 */
export function nudge(f: number, landFrame: number, px = 8): number {
  const d = f - landFrame;
  if (d < 0 || d > 20) return 0;
  return px * Math.exp(-d / 5) * Math.sin((d / 20) * Math.PI * 3.2);
}

/** "Respiro" continuo per gli elementi fermi: niente è mai statico. */
export function breathe(f: number, amp = 0.012, period = 70): number {
  return 1 + amp * Math.sin((f / period) * Math.PI * 2);
}

/** easeOutBack con overshoot ~19% (s = 2.5): per le interpolazioni che non usano una molla. */
export function easeOutBack(t: number, s = 2.5): number {
  const x = Math.min(1, Math.max(0, t)) - 1;
  return 1 + (s + 1) * x * x * x + s * x * x;
}
