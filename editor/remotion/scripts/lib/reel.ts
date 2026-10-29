import fs from "node:fs";
import path from "node:path";
import { probe } from "./sh";
import { resolveStyle } from "../../src/styles";
import type { EditProject, ReelProps } from "../../src/types";

/** Legge <edit_dir>/reel.json e completa i campi che dipendono dal montato (durata, keep) e lo stile risolto. */
export async function loadReel(editDir: string): Promise<ReelProps & { edit: string; src: string }> {
  const edit = path.resolve(process.env.INIT_CWD ?? process.cwd(), editDir);
  const project = JSON.parse(fs.readFileSync(path.join(edit, "reel.json"), "utf8")) as EditProject;
  const src = path.resolve(edit, project.source.file);
  const info = await probe(src);
  project.source = { ...project.source, width: info.width, height: info.height, fps: project.source.fps || 30, duration: info.duration };
  if (!project.keep?.length) project.keep = [{ start: 0, end: info.duration }];
  project.cuts ??= [];
  return { project, style: resolveStyle(project.styleId, project.styleOverrides), edit, src };
}
