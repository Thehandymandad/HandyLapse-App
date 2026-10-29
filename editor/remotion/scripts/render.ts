/**
 * npx tsx scripts/render.ts <edit_dir> [--still 0.5,3.2] [--frames 0-150] [--out file.mp4]
 *
 * Legge <edit_dir>/reel.json (formato EditProject, vedi src/types.ts) e renderizza con Remotion il video MUTO:
 * footage di video-use (`source.file`, relativo a <edit_dir>) + camera + grafiche + sottotitoli → <edit_dir>/remotion.mp4.
 * Il suono (voce trattata, effetti, master −14 LUFS) lo aggiunge dopo compose.py --video.
 * --still: tempi in SECONDI del montato → PNG in <edit_dir>/review/remotion/ (da guardare con Read).
 */
import fs from "node:fs";
import path from "node:path";
import { bundle } from "@remotion/bundler";
import { renderMedia, renderStill, selectComposition } from "@remotion/renderer";
import { loadReel } from "./lib/reel";
import { arg, log, positional, ROOT } from "./lib/sh";
import type { ReelProps } from "../src/types";

const chromium = {
  browserExecutable: process.env.REMOTION_BROWSER_EXECUTABLE || null,
  chromiumOptions: { gl: "swangle" as const },
};

/** I file del progetto vanno nella cartella public di Remotion: link fisico (niente copia di centinaia di MB) o copia. */
function publish(file: string, name: string): string {
  const rel = path.join("footage", name, path.basename(file));
  const dst = path.join(ROOT, "public", rel);
  fs.mkdirSync(path.dirname(dst), { recursive: true });
  fs.rmSync(dst, { force: true });
  try {
    fs.linkSync(file, dst);
  } catch {
    fs.copyFileSync(file, dst);
  }
  return rel;
}

export async function render(editDir: string, opts: { out?: string; frames?: string; stills?: number[] } = {}) {
  const { project, style, edit, src } = await loadReel(editDir);
  const name = path.basename(path.dirname(edit)) || project.name;
  project.source = {
    ...project.source,
    file: publish(src, name),
    matte: project.source.matte ? publish(path.resolve(edit, project.source.matte), name) : undefined,
    plate: project.source.plate ? publish(path.resolve(edit, project.source.plate), name) : undefined,
  };
  const inputProps: ReelProps = { project, style };

  log("Bundle Remotion…");
  const serveUrl = await bundle({ entryPoint: path.join(ROOT, "src/index.ts"), publicDir: path.join(ROOT, "public") });
  const composition = await selectComposition({ serveUrl, id: "Reel", inputProps, ...chromium });
  log(`Composizione: ${composition.durationInFrames} frame (${(composition.durationInFrames / composition.fps).toFixed(2)}s)`);

  if (opts.stills?.length) {
    const dir = path.join(edit, "review", "remotion");
    fs.mkdirSync(dir, { recursive: true });
    for (const t of opts.stills) {
      const frame = Math.min(Math.round(t * composition.fps), composition.durationInFrames - 1);
      const output = path.join(dir, `t_${t.toFixed(2).padStart(6, "0")}.png`);
      await renderStill({ serveUrl, composition, inputProps, frame, output, ...chromium });
      log(output);
    }
    return dir;
  }

  const out = opts.out ? path.resolve(process.env.INIT_CWD ?? process.cwd(), opts.out) : path.join(edit, "remotion.mp4");
  const range = opts.frames?.split("-").map(Number) as [number, number] | undefined;
  let last = -1;
  await renderMedia({
    serveUrl,
    composition,
    inputProps,
    codec: "h264",
    crf: 16,
    muted: true,
    outputLocation: out,
    frameRange: range ?? null,
    concurrency: process.env.REMOTION_CONCURRENCY ? Number(process.env.REMOTION_CONCURRENCY) : null,
    onProgress: ({ progress }) => {
      const p = Math.floor(progress * 20);
      if (p !== last) {
        last = p;
        process.stdout.write(`\r  render ${Math.round(progress * 100)}%   `);
      }
    },
    ...chromium,
  });
  process.stdout.write("\n");
  log(`Fatto: ${out}`);
  return out;
}

const [editDir] = positional();
if (!editDir) {
  console.error("Uso: npx tsx scripts/render.ts <edit_dir> [--still 0.5,3.2] [--frames 0-150] [--out file.mp4]");
  process.exit(1);
}
render(editDir, { out: arg("out"), frames: arg("frames"), stills: arg("still")?.split(",").map(Number) }).catch((e) => {
  console.error(e);
  process.exit(1);
});
