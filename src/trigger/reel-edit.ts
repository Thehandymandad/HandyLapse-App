import { task } from "@trigger.dev/sdk/v3";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { spawn } from "node:child_process";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";

/**
 * Montaggio automatico di un reel caricato dall'app su iPhone (/reel).
 * Scarica il video (bucket "reels" o link Drive/Dropbox), lancia la pipeline di reel-studio
 * (normalizza → trascrive con ElevenLabs → taglia le pause → piano automatico dello stile → render Remotion → loudnorm)
 * e carica il risultato. Il codice di reel-studio e le sue dipendenze sono nell'immagine (vedi trigger.config.ts).
 */
const BUCKET = "reels";

function supabase(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Supabase env not configured");
  return createClient(url, key);
}

/** Link condiviso → download diretto (come reel-studio/scripts/fetch.ts). */
function directUrl(link: string) {
  const drive = link.match(/drive\.google\.com\/(?:file\/d\/|open\?id=|uc\?id=)([\w-]{10,})/) ?? link.match(/[?&]id=([\w-]{10,})/);
  if (/google\.com/.test(link) && drive) return `https://drive.usercontent.google.com/download?id=${drive[1]}&export=download&confirm=t`;
  if (/dropbox\.com/.test(link)) {
    const u = new URL(link);
    u.searchParams.set("dl", "1");
    return u.toString();
  }
  return link;
}

async function download(url: string, dest: string) {
  const res = await fetch(url);
  if (!res.ok || !res.body) throw new Error(`Download non riuscito (${res.status})`);
  if ((res.headers.get("content-type") ?? "").includes("text/html")) {
    throw new Error("Il link non dà il file video: condividilo con 'Chiunque abbia il link'.");
  }
  await pipeline(Readable.fromWeb(res.body as import("node:stream/web").ReadableStream), fs.createWriteStream(dest));
}

/** Esegue la pipeline di reel-studio, riportando le fasi e la percentuale del render. */
function runMake(dir: string, args: string[], onLine: (line: string) => void) {
  return new Promise<void>((resolve, reject) => {
    const child = spawn("npx", ["tsx", "scripts/make.ts", ...args], { cwd: dir, env: { ...process.env, FORCE_COLOR: "0" } });
    let tail = "";
    const feed = (chunk: Buffer) => {
      const text = chunk.toString();
      tail = (tail + text).slice(-4000);
      text.split(/[\r\n]+/).forEach((l) => l.trim() && onLine(l.trim()));
    };
    child.stdout.on("data", feed);
    child.stderr.on("data", feed);
    child.on("error", reject);
    child.on("close", (code) => (code === 0 ? resolve() : reject(new Error(`reel-studio è uscito con codice ${code}:\n${tail}`))));
  });
}

export const reelEditTask = task({
  id: "reel-edit",
  machine: "large-2x",
  maxDuration: 3600,
  retry: { maxAttempts: 1 },
  run: async ({ jobId }: { jobId: string }) => {
    const sb = supabase();
    const update = (fields: Record<string, unknown>) => sb.from("reel_jobs").update({ ...fields, updated_at: new Date().toISOString() }).eq("id", jobId);
    const { data: job, error } = await sb.from("reel_jobs").select("*").eq("id", jobId).single();
    if (error || !job) throw new Error(`Lavoro ${jobId} non trovato`);

    const studio = process.env.REEL_STUDIO_DIR ?? path.join(process.cwd(), "reel-studio");
    const work = fs.mkdtempSync(path.join(os.tmpdir(), "reel-"));
    const name = `job-${jobId.slice(0, 8)}`;
    try {
      await update({ status: "processing", stage: "Scarico il video", progress: 2, error: null });
      const input = path.join(work, "input.mp4");
      if (job.source_path) {
        const { data, error: dlErr } = await sb.storage.from(BUCKET).createSignedUrl(job.source_path, 3600);
        if (dlErr || !data) throw new Error(`Video non trovato nello storage: ${dlErr?.message}`);
        await download(data.signedUrl, input);
      } else if (job.source_link) {
        await download(directUrl(job.source_link), input);
      } else throw new Error("Nessun video");

      const output = path.join(work, "reel.mp4");
      // fasi della pipeline → avanzamento mostrato nell'app
      const stages: [RegExp, string, number][] = [
        [/Normalizzo/, "Preparo il video", 8],
        [/Cerco le pause/, "Trovo le pause", 15],
        [/Trascri|ElevenLabs/i, "Trascrivo il parlato", 22],
        [/Progetto pronto/, "Preparo grafiche e sottotitoli", 30],
        [/Bundle Remotion/, "Avvio il montaggio", 33],
        [/Loudnorm/, "Sistemo l'audio", 96],
      ];
      let lastWrite = 0;
      let current = 2;
      let warning = "";
      await runMake(studio, [input, "--style", job.style ?? "pulse", "--name", name, "--out", output], (line) => {
        if (/Trascrizione non riuscita/.test(line)) warning = "senza sottotitoli: trascrizione non riuscita (controlla ELEVENLABS_API_KEY su Trigger.dev)";
        const st = stages.find(([re]) => re.test(line));
        const r = line.match(/render (\d+)%/);
        let next: { stage: string; progress: number } | null = null;
        if (st && st[2] > current) next = { stage: st[1], progress: st[2] };
        if (r) next = { stage: "Monto il video", progress: Math.max(current, 35 + Math.round(Number(r[1]) * 0.6)) };
        if (!next || next.progress <= current) return;
        current = next.progress;
        // al massimo una scrittura ogni 2 s (il render manda molti aggiornamenti)
        if (Date.now() - lastWrite > 2000 || st) {
          lastWrite = Date.now();
          void update(next);
        }
      });

      await update({ stage: "Carico il reel", progress: 98 });
      const outPath = `${jobId}/reel.mp4`;
      const { error: upErr } = await sb.storage
        .from(BUCKET)
        .upload(outPath, fs.readFileSync(output), { contentType: "video/mp4", upsert: true });
      if (upErr) throw new Error(`Caricamento non riuscito: ${upErr.message}`);
      await update({ status: "done", stage: warning ? `Pronto, ${warning}` : "Pronto", progress: 100, output_path: outPath });
      return { outPath };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      await update({ status: "error", error: msg.slice(-1500) });
      throw err;
    } finally {
      fs.rmSync(work, { recursive: true, force: true });
      for (const d of [path.join(studio, "public/projects", name), path.join(studio, "projects", name)]) fs.rmSync(d, { recursive: true, force: true });
    }
  },
});
