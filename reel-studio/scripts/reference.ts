/**
 * npm run reference -- <reel di riferimento> [--name nome] [--whisper]
 *
 * Prepara la reference perché Claude Code la studi e la ricopi (niente AI esterne). In references/<nome>/:
 *  - sheets/motion-XX.jpg  tutto il video a 10 fps (30 fotogrammi = 3 s per foglio): animazioni, camera, grafiche
 *  - sheets/sheet-XX.jpg   panoramica a 2 fps;  sheets/burst.jpg 15 fps su 2 s
 *  - cuts/                 fotogramma subito prima e subito dopo ogni taglio (transizioni)
 *  - frames/               fotogrammi a 540 px, 10 al secondo, per i dettagli (font, colori, bordi)
 *  - camera.json           movimento della camera stimato fotogramma per fotogramma: zoom e pan per inquadratura
 *  - colors.json           colori dominanti e colori "accesi" (grafiche, evidenziazioni)
 *  - audio.json            loudness, pause, picchi (effetti sonori) e se cadono sui tagli
 *  - transcript.txt        (con --whisper) testo con tempi, per capire ritmo e sottotitoli
 *  - report.md             riassunto + checklist per scrivere lo style pack
 */
import fs from "node:fs";
import path from "node:path";
import { arg, ffmpeg, flag, log, positional, probe, rawFrames, ROOT, run, slug } from "./lib/sh";
import { estimateMotion } from "./lib/motion";
import { extractWav16k } from "./lib/silence";
import { transcribeWords } from "./lib/transcribe";

type Shot = { from: number; to: number; zoomPct: number; panX: number; panY: number; rotDeg: number; shake: number; move: string };

async function sceneCuts(input: string) {
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
  // soglia adattiva: i jump cut su un talking head hanno punteggi bassi
  const sorted = scores.map((x) => x.s).sort((a, b) => a - b);
  const median = sorted[Math.floor(sorted.length / 2)] ?? 0;
  const threshold = Math.max(0.1, median * 6);
  const cuts: number[] = [];
  scores.forEach((x, i) => {
    const peak = x.s >= (scores[i - 1]?.s ?? 0) && x.s >= (scores[i + 1]?.s ?? 0);
    if (x.s > threshold && peak && x.t > 0.2 && (!cuts.length || x.t - cuts[cuts.length - 1] > 0.25)) cuts.push(+x.t.toFixed(2));
  });
  return cuts;
}

/** Movimento della camera (stima propria a 10 fps) → riassunto per inquadratura + curva cumulata. */
async function cameraMotion(input: string, cuts: number[], duration: number) {
  const motion = await estimateMotion(input);
  const nearCut = (t: number) => cuts.some((c) => t > c - 0.05 && t < c + 0.15);
  const bounds = [0, ...cuts, duration];
  const shots: Shot[] = [];
  for (let i = 0; i < bounds.length - 1; i++) {
    const seg = motion.filter((m) => m.t > bounds[i] + 0.05 && m.t <= bounds[i + 1] && !nearCut(m.t));
    if (!seg.length) continue;
    const zoomPct = (seg.reduce((p, m) => p * m.scale, 1) - 1) * 100;
    const panX = seg.reduce((n, m) => n + m.dx, 0);
    const panY = seg.reduce((n, m) => n + m.dy, 0);
    const mean = panX / seg.length;
    const shake = Math.sqrt(seg.reduce((n, m) => n + (m.dx - mean) ** 2, 0) / seg.length);
    const moves: string[] = [];
    if (zoomPct > 3) moves.push(`push-in ${zoomPct.toFixed(0)}%`);
    if (zoomPct < -3) moves.push(`pull-out ${(-zoomPct).toFixed(0)}%`);
    // dx/dy = spostamento del contenuto: la camera va nel verso opposto
    if (Math.abs(panX) > 60) moves.push(`camera ${panX < 0 ? "→" : "←"} ${Math.abs(panX).toFixed(0)}px`);
    if (Math.abs(panY) > 60) moves.push(`camera ${panY < 0 ? "↓" : "↑"} ${Math.abs(panY).toFixed(0)}px`);
    if (shake > 25) moves.push(`mosso/shake (${shake.toFixed(0)})`);
    shots.push({ from: bounds[i], to: bounds[i + 1], zoomPct: +zoomPct.toFixed(1), panX: Math.round(panX), panY: Math.round(panY), rotDeg: 0, shake: +shake.toFixed(1), move: moves.join(", ") || "fermo" });
  }
  const curve: { t: number; scale: number; x: number; y: number }[] = [];
  let sc = 1;
  let x = 0;
  let y = 0;
  let ci = 0;
  for (const m of motion) {
    if (ci < cuts.length && m.t >= cuts[ci]) {
      sc = 1;
      x = 0;
      y = 0;
      ci++;
    } else if (!nearCut(m.t)) {
      sc *= m.scale;
      x += m.dx;
      y += m.dy;
    }
    curve.push({ t: m.t, scale: +sc.toFixed(3), x: Math.round(x), y: Math.round(y) });
  }
  return { shots, curve };
}

/** Colori dominanti e colori saturi (le grafiche/evidenziazioni di solito sono i più saturi). */
async function colors(input: string) {
  const frames = await rawFrames(input, { fps: 2, width: 96, height: 170 });
  const all = new Map<string, number>();
  const vivid = new Map<string, number>();
  for (const f of frames) {
    for (let i = 0; i < f.length; i += 3) {
      const r = f[i];
      const g = f[i + 1];
      const b = f[i + 2];
      const key = `#${[r, g, b].map((v) => (Math.round(v / 32) * 32).toString(16).padStart(2, "0").slice(-2)).join("")}`;
      all.set(key, (all.get(key) ?? 0) + 1);
      const max = Math.max(r, g, b);
      const min = Math.min(r, g, b);
      if (max > 140 && (max - min) / max > 0.55) vivid.set(key, (vivid.get(key) ?? 0) + 1);
    }
  }
  const top = (m: Map<string, number>, n: number) => {
    const total = [...m.values()].reduce((a, b) => a + b, 0) || 1;
    return [...m.entries()].sort((a, b) => b[1] - a[1]).slice(0, n).map(([c, k]) => ({ color: c.toUpperCase(), pct: +((k / total) * 100).toFixed(1) }));
  };
  return { dominant: top(all, 10), vivid: top(vivid, 10), note: "colori quantizzati a passi di 32: per il valore esatto guarda i pixel nei fotogrammi" };
}

/** Picchi di volume (probabili effetti sonori) ogni 20 ms. */
async function audioInfo(input: string, cuts: number[]) {
  const l = await run("ffmpeg", ["-hide_banner", "-nostats", "-i", input, "-af", "ebur128", "-f", "null", "-"], { quiet: true });
  const lufs = Number(l.stderr.match(/I:\s+(-?[\d.]+) LUFS\s*\n\s*Threshold/)?.[1] ?? NaN);
  const s = await run("ffmpeg", ["-hide_banner", "-nostats", "-i", input, "-af", "silencedetect=noise=-35dB:d=0.3", "-f", "null", "-"], { quiet: true });
  const pauses = (s.stderr.match(/silence_end/g) ?? []).length;
  const a = await run(
    "ffmpeg",
    ["-hide_banner", "-nostats", "-i", input, "-af", "aresample=48000,asetnsamples=960,astats=metadata=1:reset=1,ametadata=print:key=lavfi.astats.Overall.RMS_level", "-f", "null", "-"],
    { quiet: true },
  );
  const rms: number[] = [];
  for (const line of a.stderr.split("\n")) {
    const m = line.match(/RMS_level=(-?[\d.]+|-inf)/);
    if (m) rms.push(m[1] === "-inf" ? -100 : Number(m[1]));
  }
  const onsets: { t: number; jumpDb: number; onCut: boolean }[] = [];
  for (let i = 5; i < rms.length; i++) {
    const prev = rms.slice(i - 5, i).reduce((x, y) => x + y, 0) / 5;
    const jump = rms[i] - prev;
    const t = i * 0.02;
    if (jump > 9 && rms[i] > -32 && (!onsets.length || t - onsets[onsets.length - 1].t > 0.25)) {
      onsets.push({ t: +t.toFixed(2), jumpDb: +jump.toFixed(1), onCut: cuts.some((c) => Math.abs(c - t) < 0.1) });
    }
  }
  return { lufs: isNaN(lufs) ? null : lufs, pausesOver300ms: pauses, onsets };
}

export async function analyzeReference(input: string, nameOpt?: string, whisper = false) {
  const name = slug(nameOpt ?? path.basename(input, path.extname(input)));
  const dir = path.join(ROOT, "references", name);
  for (const d of ["frames", "sheets", "cuts"]) {
    fs.rmSync(path.join(dir, d), { recursive: true, force: true });
    fs.mkdirSync(path.join(dir, d), { recursive: true });
  }
  const info = await probe(input);
  log(`${path.basename(input)}: ${info.width}x${info.height}, ${info.duration.toFixed(1)}s`);

  log("Tagli (scene detection)…");
  const cuts = await sceneCuts(input);
  const shots = [0, ...cuts, info.duration];
  const shotLens = shots.slice(1).map((t, i) => t - shots[i]);

  log("Fotogrammi e fogli provino…");
  await ffmpeg(["-i", input, "-vf", "fps=10,scale=540:-2", "-q:v", "3", path.join(dir, "frames/f-%04d.jpg")]);
  await ffmpeg(["-i", input, "-vf", "fps=10,scale=180:-2,tile=6x5:padding=4:color=white", "-q:v", "3", path.join(dir, "sheets/motion-%02d.jpg")]);
  await ffmpeg(["-i", input, "-vf", "fps=2,scale=270:-2,tile=4x3:padding=6:color=white", "-q:v", "3", path.join(dir, "sheets/sheet-%02d.jpg")]);
  const burstAt = Math.max(0, Math.min(info.duration - 2.2, info.duration * 0.35));
  await ffmpeg(["-ss", burstAt.toFixed(2), "-t", "2", "-i", input, "-vf", "fps=15,scale=216:-2,tile=6x5:padding=4:color=white", "-frames:v", "1", "-q:v", "3", path.join(dir, "sheets/burst.jpg")]);
  for (const [i, t] of cuts.slice(0, 40).entries()) {
    const n = String(i + 1).padStart(2, "0");
    await ffmpeg(["-ss", Math.max(0, t - 0.07).toFixed(2), "-i", input, "-frames:v", "1", "-vf", "scale=540:-2", "-q:v", "3", path.join(dir, "cuts", `cut-${n}-${t.toFixed(2)}s-a-prima.jpg`)]);
    await ffmpeg(["-ss", (t + 0.04).toFixed(2), "-i", input, "-frames:v", "1", "-vf", "scale=540:-2", "-q:v", "3", path.join(dir, "cuts", `cut-${n}-${t.toFixed(2)}s-b-dopo.jpg`)]);
  }

  log("Movimento della camera…");
  let camera: Awaited<ReturnType<typeof cameraMotion>> | null = null;
  try {
    camera = await cameraMotion(input, cuts, info.duration);
    fs.writeFileSync(path.join(dir, "camera.json"), JSON.stringify(camera, null, 1));
  } catch (e) {
    console.warn("⚠️  stima camera non riuscita:", e instanceof Error ? e.message.split("\n")[0] : e);
  }

  log("Colori…");
  const palette = await colors(input);
  fs.writeFileSync(path.join(dir, "colors.json"), JSON.stringify(palette, null, 2));

  let audio: Awaited<ReturnType<typeof audioInfo>> | null = null;
  if (info.hasAudio) {
    log("Audio…");
    audio = await audioInfo(input, cuts);
    fs.writeFileSync(path.join(dir, "audio.json"), JSON.stringify(audio, null, 2));
    if (whisper) {
      try {
        const wav = path.join(dir, "audio16k.wav");
        await extractWav16k(input, wav);
        const words = await transcribeWords(wav, { model: "small", language: "it" });
        fs.writeFileSync(path.join(dir, "transcript.txt"), words.map((w) => `${w.start.toFixed(2)}–${w.end.toFixed(2)}  ${w.text}`).join("\n") + "\n");
      } catch (e) {
        console.warn("⚠️  trascrizione non riuscita:", e instanceof Error ? e.message.split("\n")[0] : e);
      }
    }
  }

  const stats = {
    name,
    file: path.resolve(input),
    duration: +info.duration.toFixed(2),
    size: `${info.width}x${info.height}`,
    cuts,
    cutsPerMinute: +((cuts.length / info.duration) * 60).toFixed(1),
    avgShot: +(shotLens.reduce((a, b) => a + b, 0) / shotLens.length).toFixed(2),
    shortestShot: +Math.min(...shotLens).toFixed(2),
    lufs: audio?.lufs ?? null,
    pausesOver300ms: audio?.pausesOver300ms ?? null,
  };
  fs.writeFileSync(path.join(dir, "stats.json"), JSON.stringify(stats, null, 2));

  const motionSheets = fs.readdirSync(path.join(dir, "sheets")).filter((f) => f.startsWith("motion-")).sort();
  const sfxOnCuts = audio ? audio.onsets.filter((o) => o.onCut).length : 0;
  fs.writeFileSync(
    path.join(dir, "report.md"),
    `# Reference: ${name}

| | |
|---|---|
| Durata | ${stats.duration}s (${stats.size}) |
| Tagli | ${cuts.length} → **${stats.cutsPerMinute}/min**, inquadratura media ${stats.avgShot}s (min ${stats.shortestShot}s) |
| Loudness | ${audio?.lufs ?? "n/d"} LUFS |
| Pause > 0,3 s rimaste | ${audio?.pausesOver300ms ?? "n/d"} (0 = pause tagliate tutte) |
| Picchi audio | ${audio?.onsets.length ?? 0}, di cui ${sfxOnCuts} sui tagli (→ effetto sonoro sui tagli?) |
| Colori accesi | ${palette.vivid.slice(0, 6).map((c) => c.color).join(" ")} |

## Movimento della camera per inquadratura (stima a 10 fps)
${camera ? camera.shots.map((s) => `- ${s.from.toFixed(2)}–${s.to.toFixed(2)}s: ${s.move}`).join("\n") : "n/d"}

Curva completa (scala e spostamento del contenuto x, y cumulati, azzerati a ogni taglio, 10 campioni al secondo) in \`camera.json\` → si può ricopiare
nella \`camera\` dello style pack. È una stima 2D (zoom e spostamento): rotazioni e movimenti 3D si vedono nei fogli \`motion-XX.jpg\`.

## Cosa guardare
- \`sheets/motion-XX.jpg\`: **tutto il video a 10 fps** (6×5 = 3 s per foglio, si legge riga per riga) → animazioni di sottotitoli e grafiche, camera, transizioni
${motionSheets.map((s, i) => `  - ${s}: ${(i * 3).toFixed(0)}–${(i * 3 + 3).toFixed(0)}s`).join("\n")}
- \`sheets/burst.jpg\`: 15 fps da ${burstAt.toFixed(2)}s · \`sheets/sheet-XX.jpg\`: panoramica 2 fps
- \`cuts/\`: fotogramma prima e dopo ogni taglio → tipo di transizione
- \`frames/f-NNNN.jpg\`: fotogramma N/10 s a 540 px → font, spessori, colori esatti
- \`colors.json\`, \`camera.json\`, \`audio.json\`${whisper ? ", `transcript.txt`" : ""}

## Checklist dello style pack (src/styles/references/${name}/index.tsx, partendo da _modello)
1. **Sottotitoli**: font, peso, maiuscolo, dimensione (px su 1080: fotogrammi a 540 → ×2), colori (testo, parola attiva, parole chiave), contorno, ombra, sfondo, posizione, parole per volta, **come entrano ed escono** parola per parola (se nessuna animazione base va bene, scrivi un componente Captions su misura).
2. **Camera**: push-in/pull-out per inquadratura, pan, rotazioni, rotazioni 3D, shake, alternanza sui tagli → \`style.camera\` + funzione \`camera\` del pack (si può usare la curva di camera.json).
3. **Transizioni sui tagli**: guarda \`cuts/\` (flash, whip, zoom blur, glitch, rotazione 3D… o una nuova).
4. **Motion graphics**: ogni tipo che compare (card, titoli, numeri, liste, icone, emoji, oggetti 3D, frecce, sticker, cornici, CTA): forma, colori, font, entrata, uscita, durata, posizione → riusa quelle base solo se identiche, altrimenti **scrivi componenti nuovi** nel pack (\`graphics\`), icone SVG e oggetti three.js nuovi.
5. **Colore**: luminosità, contrasto, saturazione, calore, vignettatura, grana/overlay (→ \`Overlay\`).
6. **Audio**: effetti sonori (picchi in audio.json, sui tagli/grafiche), musica, loudness.
7. **Verifica**: renderizza degli still e confrontali con i fotogrammi della reference (\`npm run compare\`).
`,
  );
  log(`Pronto: references/${name}/report.md`);
  return stats;
}

if (process.argv[1]?.endsWith("reference.ts")) {
  const [input] = positional();
  if (!input) {
    console.error("Uso: npm run reference -- <video> [--name nome] [--whisper]");
    process.exit(1);
  }
  analyzeReference(path.resolve(process.env.INIT_CWD ?? process.cwd(), input), arg("name"), flag("whisper")).catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
