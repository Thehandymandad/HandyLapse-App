/**
 * npm run transcribe -- <progetto> [--lang it] [--text testo.txt]
 *
 * (Ri)trascrive un progetto già importato senza toccare tagli e grafiche: ElevenLabs Scribe se c'è
 * ELEVENLABS_API_KEY, altrimenti whisper.cpp in locale; con --text distribuisce un testo scritto a mano.
 */
import fs from "node:fs";
import path from "node:path";
import { loadProject, saveProject } from "./lib/project";
import { arg, log, positional, ROOT } from "./lib/sh";
import { extractWav16k } from "./lib/silence";
import { distributeText, readTextFile, transcribeAuto } from "./lib/transcribe";
import type { WhisperModel } from "@remotion/install-whisper-cpp";

const [name] = positional();
if (!name) {
  console.error("Uso: npm run transcribe -- <progetto> [--lang it] [--text testo.txt]");
  process.exit(1);
}
(async () => {
  const p = loadProject(name);
  const wav = path.join(ROOT, "projects", name, "audio16k.wav");
  if (!fs.existsSync(wav)) await extractWav16k(path.join(ROOT, "public", p.source.file), wav);
  const text = arg("text");
  p.words = text
    ? distributeText(readTextFile(path.resolve(process.env.INIT_CWD ?? process.cwd(), text)), p.keep)
    : await transcribeAuto(wav, { model: (arg("model") ?? "small") as WhisperModel, language: arg("lang") ?? "it" });
  saveProject(p);
  log(`${p.words.length} parole → projects/${name}/transcript.txt`);
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
