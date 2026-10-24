/**
 * npm run matte -- <progetto> [--plate sfondo.jpg | --plate-at 12.5 | --plate-window 10-14]
 *
 * Ritaglia la persona dal video (MediaPipe selfie multiclass eseguito in locale con LiteRT) e crea
 * public/projects/<progetto>/person.webm (VP9 con canale alpha). Serve per grafiche DIETRO la persona
 * ("behind": true) e per l'effetto "vanish" (la persona sparisce e ricompare).
 * --plate / --plate-at: inquadratura vuota (senza persona) da usare come sfondo quando la persona sparisce.
 *   Senza --plate/--plate-at lo sfondo viene ricostruito in automatico dai punti che la persona lascia scoperti
 *   (meglio con --plate-window sui secondi della stessa inquadratura in cui sparisce).
 *
 * Requisiti Python: pip install ai-edge-litert numpy
 */
import fs from "node:fs";
import path from "node:path";
import { loadProject, saveProject } from "./lib/project";
import { arg, ffmpeg, log, positional, ROOT, run } from "./lib/sh";

const MODEL_URL = "https://storage.googleapis.com/mediapipe-models/image_segmenter/selfie_multiclass_256x256/float32/latest/selfie_multiclass_256x256.tflite";

async function ensureModel() {
  const p = path.join(ROOT, "models/selfie_multiclass.tflite");
  if (fs.existsSync(p) && fs.statSync(p).size > 1_000_000) return p;
  log("Scarico il modello di segmentazione (MediaPipe)…");
  fs.mkdirSync(path.dirname(p), { recursive: true });
  const res = await fetch(MODEL_URL);
  if (!res.ok) throw new Error(`Download modello fallito: ${res.status}`);
  fs.writeFileSync(p, Buffer.from(await res.arrayBuffer()));
  return p;
}

export async function makeMatte(name: string, opts: { plate?: string; plateAt?: number; plateWindow?: string } = {}) {
  const project = loadProject(name);
  const src = path.join(ROOT, "public", project.source.file);
  const dir = path.dirname(src);
  const model = await ensureModel();
  const matte = path.join(ROOT, "projects", name, "matte.mp4");
  log("Ritaglio la persona…");
  const autoPlate = path.join(dir, "plate-auto.jpg");
  const wantAuto = !opts.plate && opts.plateAt === undefined;
  await run("python3", [path.join(ROOT, "scripts/matte.py"), src, matte, "--model", model, ...(wantAuto ? ["--plate-out", autoPlate] : []), ...(wantAuto && opts.plateWindow ? ["--plate-window", opts.plateWindow] : [])]);
  log("Creo il video trasparente (VP9 alpha)…");
  const person = path.join(dir, "person.webm");
  await ffmpeg([
    "-i", src, "-i", matte, "-filter_complex", "[0:v][1:v]alphamerge,format=yuva420p", "-an",
    "-c:v", "libvpx-vp9", "-pix_fmt", "yuva420p", "-b:v", "0", "-crf", "28", "-deadline", "good", "-cpu-used", "5", "-row-mt", "1", person,
  ]);
  // ricarico il progetto: edit.json può essere stato modificato mentre il ritaglio girava
  Object.assign(project, loadProject(name));
  project.source.matte = path.relative(path.join(ROOT, "public"), person);
  if (wantAuto && fs.existsSync(autoPlate)) {
    project.source.plate = path.relative(path.join(ROOT, "public"), autoPlate);
  } else if (opts.plate) {
    const out = path.join(dir, `plate${path.extname(opts.plate)}`);
    fs.copyFileSync(opts.plate, out);
    project.source.plate = path.relative(path.join(ROOT, "public"), out);
  } else if (opts.plateAt !== undefined) {
    const out = path.join(dir, "plate.jpg");
    await ffmpeg(["-ss", String(opts.plateAt), "-i", src, "-frames:v", "1", "-q:v", "2", out]);
    project.source.plate = path.relative(path.join(ROOT, "public"), out);
  }
  saveProject(project);
  log(`Fatto: ${project.source.matte}${project.source.plate ? ` + sfondo ${project.source.plate}` : ""}`);
}

if (process.argv[1]?.endsWith("matte.ts")) {
  const [name] = positional();
  if (!name) {
    console.error("Uso: npm run matte -- <progetto> [--plate sfondo.jpg | --plate-at 12.5]");
    process.exit(1);
  }
  const cwd = process.env.INIT_CWD ?? process.cwd();
  makeMatte(name, {
    plate: arg("plate") && path.resolve(cwd, arg("plate")!),
    plateAt: arg("plate-at") ? Number(arg("plate-at")) : undefined,
    plateWindow: arg("plate-window"),
  }).catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
