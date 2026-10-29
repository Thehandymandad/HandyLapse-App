/**
 * npx tsx scripts/camera-track.ts <edit_dir>
 *
 * Calcola la camera di ogni fotogramma con lo STESSO codice di Remotion (src/lib/camera.ts + camera dello style pack +
 * reinquadratura del progetto) e la scrive in <edit_dir>/camera.json, che camera.py applica al footage
 * (trasformazioni CSS 2D/3D con prospettiva, sfocatura, riquadro-telefono, grade, vignetta).
 */
import fs from "node:fs";
import path from "node:path";
import { loadReel } from "./lib/reel";
import { log, positional } from "./lib/sh";
import { cameraContext, defaultCamera } from "../src/lib/camera";
import { buildTimeline } from "../src/lib/timeline";
import { interpolate } from "remotion";
import { getPack } from "../src/styles";

const [editDir] = positional();
if (!editDir) {
  console.error("Uso: npx tsx scripts/camera-track.ts <edit_dir>");
  process.exit(1);
}
const { project, style, edit } = await loadReel(editDir);
const tl = buildTimeline(project, style);
const pack = getPack(style.id);
const r = (v: number | undefined, d = 4) => (v === undefined ? undefined : +v.toFixed(d));
const frames = [];
for (let frame = 0; frame < tl.durationInFrames; frame++) {
  const ctx = cameraContext(frame, tl, style);
  const base = defaultCamera(ctx);
  const st = pack.camera ? pack.camera(ctx, base) : base;
  const fr = project.framing;
  const cam = fr
    ? { ...st, scale: st.scale * fr.scale, y: st.y + (fr.offsetY ?? 0), originX: fr.originX ?? st.originX, originY: fr.originY ?? st.originY }
    : st;
  // NopeStamp (pulse) toglie il colore al footage con backdrop-filter: nel livello trasparente non si vede, lo fa camera.py
  let gray = 0;
  for (const g of tl.graphics) {
    const f = frame - g.from;
    if (g.type === "nope" && f >= 0 && f < g.frames) gray = Math.max(gray, interpolate(f, [0, 3, g.frames - 5, g.frames], [0, 1, 1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }));
  }
  frames.push({
    gray: r(gray, 3),
    s: r(cam.scale, 5), x: r(cam.x, 2), y: r(cam.y, 2), rx: r(cam.rotateX, 3), ry: r(cam.rotateY, 3), rz: r(cam.rotateZ, 3),
    blur: r(cam.blur, 2), flash: r(cam.flash, 3), glitch: r(cam.glitch, 3), ox: cam.originX, oy: cam.originY,
    inset: r(cam.inset, 5), ir: r(cam.insetRadius, 2), irx: r(cam.insetRotateX, 3), iry: r(cam.insetRotateY, 3),
  });
}
const out = {
  fps: tl.fps,
  width: 1080,
  height: 1920,
  videoFrames: tl.videoFrames,
  durationInFrames: tl.durationInFrames,
  perspective: style.camera.perspective,
  framingX: project.framingX ?? 0.5,
  grade: style.grade,
  backdrop: style.id === "pulse" ? "pulse" : "black",
  frames,
};
fs.writeFileSync(path.join(edit, "camera.json"), JSON.stringify(out));
log(`${path.join(edit, "camera.json")}: ${frames.length} fotogrammi`);
