/**
 * npm run ingest -- <video> [--name nome] [--style hormozi] [--lang it] [--model small] [--text testo.txt] [--no-whisper]
 *
 * 1. normalizza il video con ffmpeg (H.264, 30 fps, lato corto max 1080) in public/projects/<nome>/source.mp4
 * 2. estrae l'audio e trova le pause (ffmpeg silencedetect, soglia automatica)
 * 3. trascrive parola per parola in locale con whisper.cpp (o usa un testo scritto a mano)
 * 4. crea un piano automatico (tagli intercalari/ripetizioni, hook, zoom, grafiche) in projects/<nome>/edit.json
 */
import fs from "node:fs";
import path from "node:path";
import { autoPlan } from "./lib/autoplan";
import { saveProject } from "./lib/project";
import { arg, ffmpeg, flag, log, positional, probe, ROOT, slug } from "./lib/sh";
import { autoThreshold, detectSpeech, envelopeDb, extractWav16k } from "./lib/silence";
import { distributeText, readTextFile, transcribeAuto } from "./lib/transcribe";
import { getPack, resolveStyle } from "../src/styles";
import type { EditProject, Word } from "../src/types";
import type { WhisperModel } from "@remotion/install-whisper-cpp";

export async function ingest(input: string, opts: { name?: string; style?: string; lang?: string; model?: string; text?: string; whisper?: boolean }) {
  if (!fs.existsSync(input)) throw new Error(`File non trovato: ${input}`);
  const name = slug(opts.name ?? path.basename(input, path.extname(input)));
  const styleId = opts.style ?? "hormozi";
  const style = resolveStyle(styleId);
  const pubDir = path.join(ROOT, "public/projects", name);
  const projDir = path.join(ROOT, "projects", name);
  fs.mkdirSync(pubDir, { recursive: true });
  fs.mkdirSync(projDir, { recursive: true });

  const info = await probe(input);
  log(`${path.basename(input)}: ${info.width}x${info.height}, ${info.duration.toFixed(1)}s, ${info.fps.toFixed(2)} fps, ${info.videoCodec}`);

  log("Normalizzo il video (H.264 30 fps)…");
  const src = path.join(pubDir, "source.mp4");
  const scale = "scale=w='if(gt(iw,ih),-2,min(1080,iw))':h='if(gt(iw,ih),min(1080,ih),-2)'";
  await ffmpeg([
    "-i", input, "-vf", `${scale},fps=30,format=yuv420p`, "-c:v", "libx264", "-preset", "veryfast", "-crf", "17", "-g", "15",
    ...(info.hasAudio ? ["-c:a", "aac", "-b:a", "192k", "-ar", "48000"] : ["-an"]), "-movflags", "+faststart", src,
  ]);
  const norm = await probe(src);

  let speech: EditProject["keep"] = [];
  let words: Word[] = [];
  if (info.hasAudio) {
    const wav = path.join(projDir, "audio16k.wav");
    await extractWav16k(src, wav);
    const { db } = envelopeDb(wav);
    const thr = style.cuts.silenceDb ?? autoThreshold(db);
    log(`Cerco le pause (soglia ${thr} dB, pausa minima ${style.cuts.minSilence}s)…`);
    ({ speech } = await detectSpeech(wav, norm.duration, { thresholdDb: thr, ...style.cuts }));
    const kept = speech.reduce((n, r) => n + r.end - r.start, 0);
    log(`Parlato: ${kept.toFixed(1)}s su ${norm.duration.toFixed(1)}s (${speech.length} blocchi)`);

    if (opts.text) {
      words = distributeText(readTextFile(opts.text), speech);
      log(`Testo manuale: ${words.length} parole distribuite sul parlato`);
    } else if (opts.whisper !== false) {
      try {
        words = await transcribeAuto(wav, { model: (opts.model ?? "small") as WhisperModel, language: opts.lang ?? "it" });
        log(`Trascritte ${words.length} parole`);
      } catch (e) {
        console.warn(`⚠️  Trascrizione non riuscita: ${e instanceof Error ? e.message.split("\n")[0] : e}\n   Puoi passare il testo con --text testo.txt`);
      }
    }
  }

  const generic = autoPlan(words, style, norm.duration);
  const pack = getPack(styleId);
  const plan = { ...generic, ...(pack.plan?.({ words, duration: norm.duration, plan: generic }) ?? {}) };
  const project: EditProject = {
    version: 1,
    name,
    source: { file: `projects/${name}/source.mp4`, width: norm.width, height: norm.height, fps: 30, duration: norm.duration },
    styleId,
    keep: speech,
    words,
    captionOffset: 0,
    framingX: 0.5,
    music: null,
    ...plan,
  };
  saveProject(project);
  log(`Progetto pronto: projects/${name}/edit.json (+ transcript.txt)`);
  return project;
}

if (process.argv[1]?.endsWith("ingest.ts")) {
  const [input] = positional();
  if (!input) {
    console.error("Uso: npm run ingest -- <video> [--name nome] [--style hormozi] [--lang it] [--model small] [--text testo.txt]");
    process.exit(1);
  }
  ingest(path.resolve(process.env.INIT_CWD ?? process.cwd(), input), {
    name: arg("name"),
    style: arg("style"),
    lang: arg("lang"),
    model: arg("model"),
    text: arg("text") && path.resolve(process.env.INIT_CWD ?? process.cwd(), arg("text")!),
    whisper: !flag("no-whisper"),
  }).catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
