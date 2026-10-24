/**
 * npm run render -- <progetto> [--out file.mp4] [--frames 0-150] [--still 30,90,200]
 *
 * Renderizza con Remotion, poi normalizza il volume con ffmpeg (loudnorm a -14 LUFS, standard Reels/TikTok).
 * --still: invece del video salva dei fotogrammi PNG in out/stills/ (utile per controllare il risultato).
 */
import fs from "node:fs";
import path from "node:path";
import { bundle } from "@remotion/bundler";
import { renderMedia, renderStill, selectComposition } from "@remotion/renderer";
import { loadProject } from "./lib/project";
import { arg, ffmpeg, log, positional, ROOT } from "./lib/sh";
import { makeSfx } from "./sfx";
import { resolveStyle } from "../src/styles";
import type { ReelProps } from "../src/types";

const chromium = {
  browserExecutable: process.env.REMOTION_BROWSER_EXECUTABLE || null,
  chromiumOptions: { gl: "swangle" as const },
};

export async function render(name: string, opts: { out?: string; frames?: string; stills?: number[] } = {}) {
  await makeSfx();
  const project = loadProject(name);
  const style = resolveStyle(project.styleId, project.styleOverrides);
  const inputProps: ReelProps = { project, style };

  log("Bundle Remotion…");
  const serveUrl = await bundle({ entryPoint: path.join(ROOT, "src/index.ts"), publicDir: path.join(ROOT, "public") });
  const composition = await selectComposition({ serveUrl, id: "Reel", inputProps, ...chromium });
  log(`Composizione: ${composition.durationInFrames} frame (${(composition.durationInFrames / composition.fps).toFixed(1)}s)`);

  if (opts.stills?.length) {
    const dir = path.join(ROOT, "out/stills", name);
    fs.mkdirSync(dir, { recursive: true });
    for (const f of opts.stills) {
      const output = path.join(dir, `${String(f).padStart(5, "0")}.png`);
      await renderStill({ serveUrl, composition, inputProps, frame: Math.min(f, composition.durationInFrames - 1), output, ...chromium });
      log(output);
    }
    return dir;
  }

  fs.mkdirSync(path.join(ROOT, "out"), { recursive: true });
  const raw = path.join(ROOT, "out", `${name}.raw.mp4`);
  const final = opts.out ? path.resolve(process.env.INIT_CWD ?? process.cwd(), opts.out) : path.join(ROOT, "out", `${name}.mp4`);
  const range = opts.frames?.split("-").map(Number) as [number, number] | undefined;
  let last = -1;
  await renderMedia({
    serveUrl,
    composition,
    inputProps,
    codec: "h264",
    crf: 18,
    audioBitrate: "320k",
    outputLocation: raw,
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
  log(`Loudnorm ${style.audio.targetLufs} LUFS…`);
  await ffmpeg(["-i", raw, "-c:v", "copy", "-af", `loudnorm=I=${style.audio.targetLufs}:TP=-1.5:LRA=11`, "-ar", "48000", "-c:a", "aac", "-b:a", "256k", "-movflags", "+faststart", final]);
  fs.rmSync(raw, { force: true });
  log(`Fatto: ${final}`);
  return final;
}

if (process.argv[1]?.endsWith("render.ts")) {
  const [name] = positional();
  if (!name) {
    console.error("Uso: npm run render -- <progetto> [--out file.mp4] [--frames 0-150] [--still 30,90,200]");
    process.exit(1);
  }
  render(name, { out: arg("out"), frames: arg("frames"), stills: arg("still")?.split(",").map(Number) }).catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
