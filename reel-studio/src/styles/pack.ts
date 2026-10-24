import type React from "react";
import type { CameraContext, CameraState } from "../lib/camera";
import type { GraphicEvent, Timeline } from "../lib/timeline";
import type { EditProject, IconName, ReelStyle, Word } from "../types";

/**
 * Style pack: tutto ciò che serve per replicare una reference.
 * Lo `style` contiene i parametri (font, colori, ritmo…); i componenti opzionali sostituiscono quelli
 * di base quando la reference ha animazioni, grafiche o movimenti di camera propri.
 */
export type StylePack = {
  style: ReelStyle;
  /** Movimento di camera: riceve la camera di base e la modifica (o ne restituisce una nuova). */
  camera?: (ctx: CameraContext, base: CameraState) => CameraState;
  /** Sottotitoli completamente personalizzati. */
  Captions?: React.FC<{ tl: Timeline; style: ReelStyle }>;
  Hook?: React.FC<{ text: string; icon?: IconName; frames: number; style: ReelStyle }>;
  Cta?: React.FC<{ text: string; icon?: IconName; style: ReelStyle }>;
  /** Grafiche: sostituiscono quelle base con lo stesso nome o ne aggiungono di nuove (type in edit.json). */
  graphics?: Record<string, React.FC<{ g: GraphicEvent; style: ReelStyle }>>;
  /** Livelli extra sopra il video (grana, light leak, cornici, logo…). */
  Overlay?: React.FC<{ tl: Timeline; style: ReelStyle }>;
  /** Livelli extra sotto il video (sfondi, se il video non copre tutto il frame). */
  Underlay?: React.FC<{ tl: Timeline; style: ReelStyle }>;
  /**
   * Piano automatico dello stile: riceve quello generico e restituisce le parti da sostituire,
   * così l'ingest usa solo il "vocabolario" di grafiche della reference.
   */
  plan?: (input: { words: Word[]; duration: number; plan: AutoPlan }) => Partial<AutoPlan>;
};

export type AutoPlan = Pick<EditProject, "cuts" | "emphasis" | "hook" | "zooms" | "graphics" | "cta">;

export const definePack = (pack: StylePack) => pack;
