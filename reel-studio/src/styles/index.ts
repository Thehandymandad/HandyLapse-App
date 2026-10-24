import type { DeepPartial, ReelStyle } from "../types";
import { mergeStyle } from "./base";
import * as presets from "./presets";
import * as references from "./references/index";

/**
 * Registro degli stili. Gli stili copiati dalle reference stanno in ./references/*.ts
 * (li scrive Claude Code dopo aver analizzato la reference, vedi CLAUDE.md).
 */
export const STYLES: Record<string, ReelStyle> = Object.fromEntries(
  ([...Object.values(presets), ...Object.values(references)] as ReelStyle[]).map((s) => [s.id, s]),
);

export function resolveStyle(id: string, overrides?: DeepPartial<ReelStyle>): ReelStyle {
  const base = STYLES[id];
  if (!base) throw new Error(`Stile "${id}" non trovato. Disponibili: ${Object.keys(STYLES).join(", ")}`);
  return mergeStyle(base, overrides);
}
