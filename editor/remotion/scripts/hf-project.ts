/**
 * npx tsx scripts/hf-project.ts <edit_dir>
 *
 * Crea (o aggiorna) il progetto HyperFrames <edit_dir>/hf/ che disegna grafiche e sottotitoli del reel su fondo
 * trasparente: index.html + assets/pulse.js (i componenti dello style pack, scripts/build-hf.ts) + font + reel risolto.
 * Il footage con la camera lo fa camera.py; poi compose.py mette il suono.
 */
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { loadReel } from "./lib/reel";
import { log, positional, ROOT } from "./lib/sh";
import { buildTimeline } from "../src/lib/timeline";

// [famiglia, peso, stile, file in node_modules (o percorso relativo a editor/)]
const FONTS: [string, number, "normal" | "italic", string][] = [
  ["Anton", 400, "normal", "node_modules/@fontsource/anton/files/anton-latin-400-normal.woff2"],
  ...[500, 700, 800, 900].map((w) => ["Inter", w, "normal", `node_modules/@fontsource/inter/files/inter-latin-${w}-normal.woff2`] as [string, number, "normal", string]),
  ["Instrument Serif", 400, "italic", "../assets/fonts/instrument-serif-400-italic.woff2"],
  ["Permanent Marker", 400, "normal", "node_modules/@fontsource/permanent-marker/files/permanent-marker-latin-400-normal.woff2"],
];

const [editDir] = positional();
if (!editDir) {
  console.error("Uso: npx tsx scripts/hf-project.ts <edit_dir>");
  process.exit(1);
}
const { project, style, edit } = await loadReel(editDir);
const tl = buildTimeline(project, style);
const duration = +(tl.durationInFrames / tl.fps).toFixed(3);
const hf = path.join(edit, "hf");
fs.mkdirSync(path.join(hf, "assets/fonts"), { recursive: true });
fs.mkdirSync(path.join(hf, "assets/lib"), { recursive: true });

execFileSync("npx", ["tsx", path.join(ROOT, "scripts/build-hf.ts"), path.join(hf, "assets/pulse.js")], { cwd: ROOT, stdio: "inherit" });
fs.copyFileSync(path.join(ROOT, "node_modules/gsap/dist/gsap.min.js"), path.join(hf, "assets/lib/gsap.min.js"));
const faces = FONTS.map(([family, weight, fstyle, file]) => {
  const name = path.basename(file);
  fs.copyFileSync(path.join(ROOT, file), path.join(hf, "assets/fonts", name));
  return `      @font-face { font-family: "${family}"; font-style: ${fstyle}; font-weight: ${weight}; src: url("assets/fonts/${name}") format("woff2"); }`;
}).join("\n");
const fontLoads = FONTS.map(([family, weight, fstyle]) => `document.fonts.load('${fstyle} ${weight} 64px "${family}"')`).join(", ");
// media delle grafiche, copiati in assets/img e precaricati prima del render (window.__hfImages), così chi li disegna
// su canvas li trova già decodificati:
// - props.src: un'immagine (percorso relativo a edit/)
// - qualsiasi chiave "clip": [da, a] (secondi del montato, anche dentro liste): un pezzo del girato da mettere dentro
//   la grafica → foglio di fotogrammi (sprite) 360x640 a 30 fps, sostituito da { src, cols, rows, fw, fh, n }
fs.mkdirSync(path.join(hf, "assets/img"), { recursive: true });
const images: string[] = [];
const SPRITE = { fw: 360, fh: 640, cols: 10 };
let clipN = 0;
const prepMedia = (v: unknown): unknown => {
  if (Array.isArray(v)) return v.map(prepMedia);
  if (!v || typeof v !== "object") return v;
  const out: Record<string, unknown> = {};
  for (const [k, x] of Object.entries(v as Record<string, unknown>)) {
    if (k === "src" && typeof x === "string" && !x.startsWith("assets/") && !/^[a-z]+:/.test(x)) {
      const file = path.resolve(edit, x);
      if (fs.existsSync(file)) {
        const rel = `assets/img/${path.basename(file)}`;
        fs.copyFileSync(file, path.join(hf, rel));
        images.push(rel);
        out[k] = rel;
        continue;
      }
    }
    if (k === "clip" && Array.isArray(x) && x.length === 2 && x.every((t) => typeof t === "number")) {
      const [a, b] = x as number[];
      const n = Math.max(1, Math.round((b - a) * 30));
      const rows = Math.ceil(n / SPRITE.cols);
      const rel = `assets/img/clip_${clipN++}_${a.toFixed(2)}.jpg`;
      execFileSync("ffmpeg", ["-y", "-v", "error", "-ss", a.toFixed(3), "-t", (b - a).toFixed(3), "-i", path.join(edit, project.source.file),
        "-vf", `fps=30,scale=${SPRITE.fw}:${SPRITE.fh}:force_original_aspect_ratio=increase,crop=${SPRITE.fw}:${SPRITE.fh},tile=${SPRITE.cols}x${rows}`,
        "-frames:v", "1", "-q:v", "3", path.join(hf, rel)]);
      images.push(rel);
      out[k] = { src: rel, cols: SPRITE.cols, rows, fw: SPRITE.fw, fh: SPRITE.fh, n };
      continue;
    }
    out[k] = prepMedia(x);
  }
  return out;
};
for (const gr of project.graphics ?? []) if (gr.props) gr.props = prepMedia(gr.props) as typeof gr.props;
const imageLoads = JSON.stringify(images);
// il JSON va dentro <script>: niente "</" che chiuderebbe il tag
const data = JSON.stringify({ project, style }).replace(/<\//g, "<\\/");

fs.writeFileSync(
  path.join(hf, "index.html"),
  `<!doctype html>
<html lang="it">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=1080, height=1920" />
    <script src="assets/lib/gsap.min.js"></script>
    <style>
${faces}
      * { box-sizing: border-box; }
      /* sotto le grafiche qui non c'è niente (il footage lo aggiunge camera.py): il backdrop-filter non cambierebbe un
         pixel e nel render software costa caro. La desaturazione di "nope" la fa camera.py. */
      * { backdrop-filter: none !important; }
      html, body { margin: 0; width: 1080px; height: 1920px; overflow: hidden; background: transparent; }
      #main { position: relative; width: 1080px; height: 1920px; overflow: hidden; }
      #reel-overlay { position: absolute; inset: 0; }
    </style>
  </head>
  <body>
    <!-- Generato da editor/remotion/scripts/hf-project.ts da edit/reel.json: grafiche e sottotitoli dello style pack
         "${style.id}" (stessi componenti React di Remotion), disegnati a ogni hf-seek. Si cambia reel.json, non questo file. -->
    <div id="main" data-composition-id="main" data-start="0" data-duration="${duration}" data-width="1080" data-height="1920">
      <div id="reel-overlay" class="clip" data-start="0" data-duration="${duration}" data-track-index="1" data-track-kind="graphics"
           data-layout-allow-overflow data-layout-allow-overlap></div>
    </div>
    <script id="reel-data" type="application/json">${data}</script>
    <script>
      window.__hf = window.__hf || {};
      window.__hf.buildReady = window.__hf.buildReady || {};
      window.__hf.buildReady.fonts = Promise.all([${fontLoads}]);
      window.__hfImages = {};
      window.__hf.buildReady.images = Promise.all(${imageLoads}.map((src) => {
        const im = new Image();
        im.src = src;
        window.__hfImages[src] = im;
        return im.decode().catch(() => {});
      }));
    </script>
    <script src="assets/pulse.js"></script>
    <script>
      window.__timelines = window.__timelines || {};
      window.__timelines["main"] = gsap.timeline({ paused: true });
    </script>
  </body>
</html>
`,
);
for (const [f, body] of [
  ["hyperframes.json", { $schema: "https://hyperframes.heygen.com/schema/hyperframes.json", paths: { assets: "assets" }, media: { autoProxy: true } }],
  ["package.json", { name: "hf", private: true, type: "module" }],
] as const) {
  if (!fs.existsSync(path.join(hf, f))) fs.writeFileSync(path.join(hf, f), JSON.stringify(body, null, 2) + "\n");
}
log(`${hf}: ${tl.graphics.length} grafiche, ${tl.captions.length} gruppi di sottotitoli, ${duration} s`);
