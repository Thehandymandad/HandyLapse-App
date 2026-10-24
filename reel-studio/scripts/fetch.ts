/**
 * npm run fetch -- <link Google Drive / Dropbox / URL diretto> [--out inbox/nome.mov]
 *
 * Scarica un video condiviso con un link (per file troppo grandi da allegare in chat) in inbox/.
 * - Google Drive: link "Chiunque abbia il link"; si usa il download diretto (anche per file grandi)
 * - Dropbox: link condiviso; viene forzato dl=1
 */
import fs from "node:fs";
import path from "node:path";
import { arg, log, positional, probe, ROOT, run } from "./lib/sh";

export function directUrl(link: string) {
  const drive = link.match(/drive\.google\.com\/(?:file\/d\/|open\?id=|uc\?id=)([\w-]{10,})/) ?? link.match(/[?&]id=([\w-]{10,})/);
  if (/google\.com/.test(link) && drive) return `https://drive.usercontent.google.com/download?id=${drive[1]}&export=download&confirm=t`;
  if (/dropbox\.com/.test(link)) {
    const u = new URL(link);
    u.searchParams.set("dl", "1");
    return u.toString();
  }
  return link;
}

export async function fetchVideo(link: string, out?: string) {
  const dir = path.join(ROOT, "inbox");
  fs.mkdirSync(dir, { recursive: true });
  const dest = out ? path.resolve(ROOT, out) : path.join(dir, `video-${Date.now().toString(36)}.mp4`);
  log(`Scarico ${link}…`);
  await run("curl", ["-sS", "-L", "--fail", "-o", dest, directUrl(link)], { quiet: true });
  const size = fs.statSync(dest).size;
  const head = fs.readFileSync(dest).subarray(0, 512).toString("utf8");
  if (size < 100_000 || /<html|<!doctype/i.test(head)) {
    fs.rmSync(dest, { force: true });
    throw new Error("Il link non dà il file video (forse non è condiviso con 'Chiunque abbia il link', o è una pagina di anteprima).");
  }
  const info = await probe(dest);
  log(`Scaricato: ${(size / 1024 / 1024).toFixed(1)} MB, ${info.width}x${info.height}, ${info.duration.toFixed(1)}s → ${path.relative(ROOT, dest)}`);
  return dest;
}

if (process.argv[1]?.endsWith("fetch.ts")) {
  const [link] = positional();
  if (!link) {
    console.error("Uso: npm run fetch -- <link Drive/Dropbox> [--out inbox/nome.mov]");
    process.exit(1);
  }
  fetchVideo(link, arg("out")).catch((e) => {
    console.error(e instanceof Error ? e.message : e);
    process.exit(1);
  });
}
