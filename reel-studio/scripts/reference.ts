/**
 * npm run reference -- <reel di riferimento> [--name nome]
 *
 * Prepara la reference perché Claude Code la studi (niente AI esterne):
 *  - fogli provino (1 fotogramma ogni 0,5 s), fotogrammi subito dopo ogni taglio, raffica a 15 fps
 *    di 2 secondi per vedere come si animano i sottotitoli
 *  - misure con ffmpeg: tagli al minuto (scene detection), durata media delle inquadrature,
 *    loudness, pause nel parlato
 *  - references/<nome>/report.md con i numeri e la checklist di cosa ricavare per scrivere lo stile
 */
import fs from "node:fs";
import path from "node:path";
import { arg, ffmpeg, log, positional, probe, ROOT, run, slug } from "./lib/sh";

export async function analyzeReference(input: string, nameOpt?: string) {
  const name = slug(nameOpt ?? path.basename(input, path.extname(input)));
  const dir = path.join(ROOT, "references", name);
  for (const d of ["frames", "sheets", "cuts", "burst"]) {
    fs.rmSync(path.join(dir, d), { recursive: true, force: true });
    fs.mkdirSync(path.join(dir, d), { recursive: true });
  }
  const info = await probe(input);
  log(`${path.basename(input)}: ${info.width}x${info.height}, ${info.duration.toFixed(1)}s`);

  // 1) tagli: punteggio di cambio scena per ogni frame, soglia adattiva (i jump cut su un talking head hanno punteggi bassi)
  const { stderr } = await run(
    "ffmpeg",
    ["-hide_banner", "-nostats", "-i", input, "-vf", "select='gte(scene,0)',metadata=print:key=lavfi.scene_score", "-an", "-f", "null", "-"],
    { quiet: true },
  );
  const scores: { t: number; s: number }[] = [];
  let lastT = 0;
  for (const line of stderr.split("\n")) {
    const t = line.match(/pts_time:([\d.]+)/);
    if (t) lastT = Number(t[1]);
    const sc = line.match(/scene_score=([\d.]+)/);
    if (sc) scores.push({ t: lastT, s: Number(sc[1]) });
  }
  const sorted = scores.map((x) => x.s).sort((a, b) => a - b);
  const median = sorted[Math.floor(sorted.length / 2)] ?? 0;
  const threshold = Math.max(0.1, median * 6);
  const cuts: number[] = [];
  scores.forEach((x, i) => {
    const isPeak = x.s >= (scores[i - 1]?.s ?? 0) && x.s >= (scores[i + 1]?.s ?? 0);
    if (x.s > threshold && isPeak && x.t > 0.2 && (!cuts.length || x.t - cuts[cuts.length - 1] > 0.25)) cuts.push(+x.t.toFixed(2));
  });
  const shots = [0, ...cuts, info.duration];
  const shotLens = shots.slice(1).map((t, i) => t - shots[i]);
  const cutsPerMinute = (cuts.length / info.duration) * 60;

  // 2) fotogrammi e fogli provino
  log("Estraggo i fotogrammi…");
  await ffmpeg(["-i", input, "-vf", "fps=2,scale=540:-2", "-q:v", "3", path.join(dir, "frames/f-%04d.jpg")]);
  await ffmpeg(["-i", input, "-vf", "fps=2,scale=270:-2,tile=4x3:padding=6:color=white", "-q:v", "3", path.join(dir, "sheets/sheet-%02d.jpg")]);
  for (const [i, t] of cuts.slice(0, 40).entries()) {
    await ffmpeg(["-ss", (t + 0.12).toFixed(2), "-i", input, "-frames:v", "1", "-vf", "scale=540:-2", "-q:v", "3", path.join(dir, "cuts", `cut-${String(i + 1).padStart(2, "0")}-${t.toFixed(2)}s.jpg`)]);
  }
  const burstAt = Math.max(0, Math.min(info.duration - 2.2, info.duration * 0.35));
  await ffmpeg(["-ss", burstAt.toFixed(2), "-t", "2", "-i", input, "-vf", "fps=15,scale=540:-2", "-q:v", "3", path.join(dir, "burst/b-%03d.jpg")]);
  await ffmpeg(["-ss", burstAt.toFixed(2), "-t", "2", "-i", input, "-vf", "fps=15,scale=216:-2,tile=6x5:padding=4:color=white", "-frames:v", "1", "-q:v", "3", path.join(dir, "sheets/burst.jpg")]);

  // 3) audio: loudness e pause
  let lufs: number | null = null;
  let pauses = 0;
  if (info.hasAudio) {
    const l = await run("ffmpeg", ["-hide_banner", "-nostats", "-i", input, "-af", "ebur128", "-f", "null", "-"], { quiet: true });
    const m = l.stderr.match(/I:\s+(-?[\d.]+) LUFS\s*\n\s*Threshold/);
    lufs = m ? Number(m[1]) : null;
    const s = await run("ffmpeg", ["-hide_banner", "-nostats", "-i", input, "-af", "silencedetect=noise=-35dB:d=0.3", "-f", "null", "-"], { quiet: true });
    pauses = (s.stderr.match(/silence_end/g) ?? []).length;
  }

  const sheets = fs.readdirSync(path.join(dir, "sheets")).filter((f) => f.startsWith("sheet-")).sort();
  const stats = {
    name,
    file: path.resolve(input),
    duration: +info.duration.toFixed(2),
    size: `${info.width}x${info.height}`,
    cuts,
    cutsPerMinute: +cutsPerMinute.toFixed(1),
    avgShot: +(shotLens.reduce((a, b) => a + b, 0) / shotLens.length).toFixed(2),
    shortestShot: +Math.min(...shotLens).toFixed(2),
    lufs,
    pausesOver300ms: pauses,
    burst: { from: +burstAt.toFixed(2), fps: 15 },
  };
  fs.writeFileSync(path.join(dir, "stats.json"), JSON.stringify(stats, null, 2));
  fs.writeFileSync(
    path.join(dir, "report.md"),
    `# Reference: ${name}

| | |
|---|---|
| Durata | ${stats.duration}s (${stats.size}) |
| Tagli | ${cuts.length} → **${stats.cutsPerMinute}/min**, inquadratura media ${stats.avgShot}s (min ${stats.shortestShot}s) |
| Loudness | ${lufs ?? "n/d"} LUFS |
| Pause > 0,3 s rimaste | ${pauses} (0 = pause tagliate tutte) |

## File da guardare
- \`sheets/sheet-XX.jpg\`: 12 fotogrammi per foglio, uno ogni 0,5 s
${sheets.map((s, i) => `  - ${s}: ${(i * 6).toFixed(0)}–${(i * 6 + 6).toFixed(0)}s`).join("\n")}
- \`sheets/burst.jpg\`: 30 fotogrammi a 15 fps da ${stats.burst.from}s → animazione dei sottotitoli parola per parola
- \`cuts/\`: il fotogramma subito dopo ogni taglio (transizioni, zoom, grafiche che entrano)
- \`frames/\`: tutti i fotogrammi a 540 px (2 al secondo) per i dettagli

## Checklist per scrivere lo stile (src/styles/references/${name}.ts)
1. Sottotitoli: font (il più simile in src/lib/fonts.ts), peso, maiuscolo?, dimensione (px su 1080 di larghezza: i fotogrammi sono 540 px → ×2), colore, colore parola attiva e modalità (colore/box/scala/sottolineata), contorno e spessore, ombra, sfondo, posizione verticale, parole per volta, animazione d'entrata, inclinazione.
2. Ritmo: pause tagliate (minSilence/padding), tagli al minuto → zoom.every, alternanza largo/stretto sui jump cut.
3. Zoom: punch/lenti, intensità, shake.
4. Motion graphics: card, numeri, liste, icone, 3D, frecce, CTA — colori (accent/secondary/text), font, raggio angoli, densità, barra di avanzamento, flash.
5. Colore: luminosità, contrasto, saturazione, calore, vignettatura.
6. Audio: effetti sonori sì/no, musica e volume, loudness (${lufs ?? "-14"} LUFS).
`,
  );
  log(`Pronto: references/${name}/report.md`);
  return stats;
}

if (process.argv[1]?.endsWith("reference.ts")) {
  const [input] = positional();
  if (!input) {
    console.error("Uso: npm run reference -- <video> [--name nome]");
    process.exit(1);
  }
  analyzeReference(path.resolve(process.env.INIT_CWD ?? process.cwd(), input), arg("name")).catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
