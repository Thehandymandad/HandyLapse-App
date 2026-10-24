/**
 * npm run compare -- <progetto> --ref <reference> [--at 0.5,2,4.5]
 *
 * Affianca il fotogramma della reference (sinistra) e il render del progetto (destra) agli stessi secondi,
 * in out/compare/<progetto>/. Serve a Claude Code per verificare che lo stile copiato sia identico.
 */
import fs from "node:fs";
import path from "node:path";
import { render } from "./render";
import { arg, ffmpeg, log, positional, ROOT } from "./lib/sh";

const [name] = positional();
const ref = arg("ref");
if (!name || !ref) {
  console.error("Uso: npm run compare -- <progetto> --ref <reference> [--at 0.5,2,4.5]");
  process.exit(1);
}
const refDir = path.join(ROOT, "references", ref, "frames");
if (!fs.existsSync(refDir)) {
  console.error(`Reference non analizzata: esegui prima npm run reference -- <video> --name ${ref}`);
  process.exit(1);
}
const refFrames = fs.readdirSync(refDir).filter((f) => f.endsWith(".jpg")).sort();
const times = (arg("at") ?? "0.3,1.5,3,5,8").split(",").map(Number);

(async () => {
  const stillsDir = await render(name, { stills: times.map((t) => Math.round(t * 30)) });
  const outDir = path.join(ROOT, "out/compare", name);
  fs.mkdirSync(outDir, { recursive: true });
  for (const t of times) {
    const refFile = path.join(refDir, refFrames[Math.min(refFrames.length - 1, Math.round(t * 10))]);
    const mine = path.join(stillsDir as string, `${String(Math.round(t * 30)).padStart(5, "0")}.png`);
    const out = path.join(outDir, `${t.toFixed(2)}s.png`);
    await ffmpeg(["-i", refFile, "-i", mine, "-filter_complex", "[0]scale=540:960:force_original_aspect_ratio=decrease,pad=540:960:-1:-1[a];[1]scale=540:960[b];[a][b]hstack=2", out]);
    log(out);
  }
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
