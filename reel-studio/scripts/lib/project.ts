import fs from "node:fs";
import path from "node:path";
import { ROOT } from "./sh";
import type { EditProject } from "../../src/types";

export const projectDir = (name: string) => path.join(ROOT, "projects", name);
export const editPath = (name: string) => path.join(projectDir(name), "edit.json");

export function loadProject(name: string): EditProject {
  const p = editPath(name);
  if (!fs.existsSync(p)) throw new Error(`Progetto "${name}" non trovato (${p}). Progetti: ${listProjects().join(", ") || "nessuno"}`);
  return JSON.parse(fs.readFileSync(p, "utf8")) as EditProject;
}

export function listProjects(): string[] {
  const dir = path.join(ROOT, "projects");
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir).filter((d) => fs.existsSync(path.join(dir, d, "edit.json")));
}

export function saveProject(p: EditProject) {
  fs.mkdirSync(projectDir(p.name), { recursive: true });
  fs.writeFileSync(editPath(p.name), JSON.stringify(p, null, 2) + "\n");
  writeTranscript(p);
  regenerateRegistry();
}

/** transcript.txt: una parola per riga "indice | inizio | fine | parola" — è ciò che legge Claude Code per montare. */
export function writeTranscript(p: EditProject) {
  const lines = p.words.map((w, i) => `${String(i).padStart(4)} | ${w.start.toFixed(2).padStart(7)} | ${w.end.toFixed(2).padStart(7)} | ${w.text}`);
  const sentences: string[] = [];
  let cur: string[] = [];
  let from = 0;
  p.words.forEach((w, i) => {
    if (!cur.length) from = w.start;
    cur.push(w.text);
    if (/[.!?]$/.test(w.text) || i === p.words.length - 1) {
      sentences.push(`[${from.toFixed(1)}s] ${cur.join(" ")}`);
      cur = [];
    }
  });
  fs.writeFileSync(
    path.join(projectDir(p.name), "transcript.txt"),
    `# ${p.name} — ${p.source.duration.toFixed(1)}s\n\n## Frasi\n${sentences.join("\n")}\n\n## Parole (indice | inizio | fine | testo)\n${lines.join("\n")}\n`,
  );
}

/** Aggiorna src/projects.generated.ts così Remotion Studio mostra un'anteprima per ogni progetto. */
export function regenerateRegistry() {
  const names = listProjects();
  const imports = names.map((n, i) => `import p${i} from "../projects/${n}/edit.json";`).join("\n");
  const body = `// File generato da scripts/lib/project.ts: elenco dei progetti in projects/*/edit.json. Non modificare a mano.
import type { EditProject } from "./types";
${imports}

export const PROJECTS: EditProject[] = [${names.map((_, i) => `p${i} as EditProject`).join(", ")}];
`;
  fs.writeFileSync(path.join(ROOT, "src/projects.generated.ts"), body);
}
