import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

export function run(bin: string, args: string[], opts: { quiet?: boolean; cwd?: string } = {}): Promise<{ stdout: string; stderr: string }> {
  return new Promise((resolve, reject) => {
    const p = spawn(bin, args, { cwd: opts.cwd ?? ROOT });
    let stdout = "";
    let stderr = "";
    p.stdout.on("data", (d) => (stdout += d));
    p.stderr.on("data", (d) => {
      stderr += d;
      if (!opts.quiet) process.stderr.write(d);
    });
    p.on("error", reject);
    // mai chiavi/token nei messaggi d'errore
    const shown = args.map((a) => a.replace(/((?:api[-_]?key|token|authorization)\s*[:=]\s*)\S+/gi, "$1***"));
    p.on("close", (code) => (code === 0 ? resolve({ stdout, stderr }) : reject(new Error(`${bin} ${shown.join(" ")} → exit ${code}\n${stderr.slice(-2000)}`))));
  });
}

export const ffmpeg = (args: string[], cwd?: string) => run("ffmpeg", ["-hide_banner", "-y", "-loglevel", "error", ...args], { quiet: true, cwd });

/** Decodifica un video in frame RGB grezzi piccoli (per analisi colori/movimento in Node). */
export async function rawFrames(input: string, opts: { fps: number; width: number; height: number }): Promise<Buffer[]> {
  const { spawn } = await import("node:child_process");
  return new Promise((resolve, reject) => {
    const p = spawn("ffmpeg", ["-v", "error", "-i", input, "-vf", `fps=${opts.fps},scale=${opts.width}:${opts.height}`, "-f", "rawvideo", "-pix_fmt", "rgb24", "-"]);
    const chunks: Buffer[] = [];
    p.stdout.on("data", (d: Buffer) => chunks.push(d));
    p.on("error", reject);
    p.on("close", () => {
      const all = Buffer.concat(chunks);
      const size = opts.width * opts.height * 3;
      const frames: Buffer[] = [];
      for (let o = 0; o + size <= all.length; o += size) frames.push(all.subarray(o, o + size));
      resolve(frames);
    });
  });
}

export async function probe(file: string) {
  const { stdout } = await run("ffprobe", ["-v", "error", "-print_format", "json", "-show_format", "-show_streams", file], { quiet: true });
  const j = JSON.parse(stdout) as {
    format: { duration: string };
    streams: { codec_type: string; width?: number; height?: number; r_frame_rate?: string; codec_name: string; side_data_list?: { rotation?: number }[] }[];
  };
  const v = j.streams.find((s) => s.codec_type === "video");
  const rot = Math.abs(v?.side_data_list?.find((d) => d.rotation !== undefined)?.rotation ?? 0);
  const [n, d] = (v?.r_frame_rate ?? "30/1").split("/").map(Number);
  const w = v?.width ?? 0;
  const h = v?.height ?? 0;
  return {
    duration: Number(j.format.duration),
    width: rot === 90 ? h : w,
    height: rot === 90 ? w : h,
    fps: d ? n / d : 30,
    hasAudio: j.streams.some((s) => s.codec_type === "audio"),
    videoCodec: v?.codec_name,
  };
}

export function arg(name: string, fallback?: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`);
  if (i >= 0 && process.argv[i + 1] && !process.argv[i + 1].startsWith("--")) return process.argv[i + 1];
  return fallback;
}
export const flag = (name: string) => process.argv.includes(`--${name}`);
/** Argomenti posizionali (esclusi --opzioni e i loro valori). */
export function positional(): string[] {
  const out: string[] = [];
  const a = process.argv.slice(2);
  for (let i = 0; i < a.length; i++) {
    if (a[i].startsWith("--")) {
      if (a[i + 1] && !a[i + 1].startsWith("--")) i++;
      continue;
    }
    out.push(a[i]);
  }
  return out;
}

export const slug = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 40) || "reel";

export const log = (msg: string) => console.log(`\x1b[33m▸\x1b[0m ${msg}`);
