/** npm run make -- <video> [--style hormozi] [--name nome] [--lang it] [--text testo.txt] — ingest + piano automatico + render. */
import path from "node:path";
import { ingest } from "./ingest";
import { render } from "./render";
import { arg, flag, positional } from "./lib/sh";

const [input] = positional();
if (!input) {
  console.error("Uso: npm run make -- <video> [--style hormozi] [--name nome] [--lang it] [--text testo.txt]");
  process.exit(1);
}
const cwd = process.env.INIT_CWD ?? process.cwd();
ingest(path.resolve(cwd, input), {
  name: arg("name"),
  style: arg("style"),
  lang: arg("lang"),
  model: arg("model"),
  text: arg("text") && path.resolve(cwd, arg("text")!),
  whisper: !flag("no-whisper"),
})
  .then((p) => render(p.name, { out: arg("out") }))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
