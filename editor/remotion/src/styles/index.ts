import type { DeepPartial, ReelStyle } from "../types";
import { mergeStyle } from "./base";
import type { StylePack } from "./pack";
import * as presets from "./presets";
import * as originals from "./originals/index";
import * as references from "./references/index";
import { setAccent } from "./originals/pulse/shared";

/**
 * Registro degli style pack. I preset sono solo parametri; le reference (./references/<nome>/)
 * possono avere componenti propri. Le scrive Claude Code dopo aver analizzato la reference (vedi CLAUDE.md).
 */
export const PACKS: Record<string, StylePack> = Object.fromEntries([
  ...(Object.values(presets) as ReelStyle[]).map((s) => [s.id, { style: s }] as const),
  ...(Object.values(references) as StylePack[]).map((p) => [p.style.id, p] as const),
  ...(Object.values(originals) as StylePack[]).map((p) => [p.style.id, p] as const),
]);

export const STYLES: Record<string, ReelStyle> = Object.fromEntries(Object.entries(PACKS).map(([id, p]) => [id, p.style]));

export function resolveStyle(id: string, overrides?: DeepPartial<ReelStyle>): ReelStyle {
  const pack = PACKS[id];
  if (!pack) throw new Error(`Stile "${id}" non trovato. Disponibili: ${Object.keys(PACKS).join(", ")}`);
  return mergeStyle(pack.style, overrides);
}

export const getPack = (id: string): StylePack => PACKS[id] ?? { style: PACKS.hormozi.style };

/** Prima del render: il colore d'accento dello stile entra nella palette del pack (lo legge ogni componente). */
export function applyTheme(style: ReelStyle) {
  if (style.id === "pulse") setAccent(style.motion.accentColor);
}
