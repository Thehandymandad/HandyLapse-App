/**
 * npx tsx scripts/build-hf.ts <out.js>
 *
 * Impacchetta i componenti (src/) per HyperFrames: React + style pack + sottotitoli in un unico script per il browser.
 * "remotion" diventa hf/remotion-shim.tsx (il fotogramma arriva da HyperFrames), "@remotion/three" uno stub vuoto.
 */
import path from "node:path";
import { build } from "esbuild";
import { ROOT } from "./lib/sh";

const out = process.argv[2];
if (!out) {
  console.error("Uso: npx tsx scripts/build-hf.ts <out.js>");
  process.exit(1);
}
await build({
  entryPoints: [path.join(ROOT, "hf/overlay.tsx")],
  bundle: true,
  minify: true,
  format: "iife",
  target: "chrome120",
  outfile: path.resolve(process.env.INIT_CWD ?? process.cwd(), out),
  alias: { remotion: path.join(ROOT, "hf/remotion-shim.tsx"), "@remotion/three": path.join(ROOT, "hf/three-stub.tsx") },
  define: { "process.env.NODE_ENV": '"production"' },
  // i CSS dei font li dichiara l'index.html di HyperFrames
  loader: { ".css": "empty" },
  logLevel: "warning",
});
console.log(`Fatto: ${out}`);
