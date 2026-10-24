import * as THREE from "three";

/**
 * Logo di Claude (stella a raggi irregolari) generato da codice: contorno polare = unione di "bastoncini"
 * di lunghezza diversa attorno a un nucleo. Lo stesso contorno serve per l'icona SVG e per l'oggetto 3D.
 */
const RAYS = [1.0, 0.82, 0.95, 0.78, 0.98, 0.86, 0.93, 0.8, 1.0, 0.84, 0.9, 0.79];
const JITTER = [0, 4, -3, 5, -2, 3, -4, 2, 1, -5, 3, -1];

export function logoOutline(points = 720, width = 0.2, core = 0.3): [number, number][] {
  const rho = width / 2;
  const out: [number, number][] = [];
  for (let i = 0; i < points; i++) {
    const t = (i / points) * Math.PI * 2;
    let r = core;
    RAYS.forEach((len, k) => {
      const a = (k / RAYS.length) * Math.PI * 2 + (JITTER[k] * Math.PI) / 180 - Math.PI / 2;
      const d = Math.abs(((t - a + Math.PI * 3) % (Math.PI * 2)) - Math.PI);
      if (d >= Math.PI / 2) return;
      const L = len - rho;
      // raggio dall'origine che esce dal "bastoncino" (capsula dal centro fino a L, raggio rho)
      const sin = Math.sin(d);
      const cos = Math.cos(d);
      const disc = rho * rho - L * L * sin * sin;
      if (disc >= 0) r = Math.max(r, L * cos + Math.sqrt(disc)); // calotta in punta
      if (sin > 1e-6 && rho / sin <= L / cos) r = Math.max(r, rho / sin); // fianco
    });
    out.push([Math.cos(t) * r, Math.sin(t) * r]);
  }
  return out;
}

/** Path SVG su griglia 24x24. */
export function logoSvgPath() {
  const pts = logoOutline(360);
  return pts.map(([x, y], i) => `${i ? "L" : "M"}${(12 + x * 11).toFixed(2)} ${(12 + y * 11).toFixed(2)}`).join(" ") + "Z";
}

export function logoShape() {
  const pts = logoOutline(540);
  const s = new THREE.Shape();
  pts.forEach(([x, y], i) => (i ? s.lineTo(x, -y) : s.moveTo(x, -y)));
  s.closePath();
  return s;
}
