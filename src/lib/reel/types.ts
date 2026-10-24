/** Tipi condivisi dell'editor di reel (client + API). Tutti i tempi sono in secondi. */

export type Range = { start: number; end: number };

/** Parola trascritta, tempi riferiti al video sorgente. */
export type Word = {
  text: string;
  start: number;
  end: number;
};

export type CaptionAnimation = "pop" | "bounce" | "fade" | "slide-up" | "typewriter" | "none";
export type HighlightMode = "color" | "box" | "scale" | "underline" | "none";
export type CaptionBackground = "none" | "box" | "pill";
export type ZoomMode = "punch" | "smooth" | "mixed";
export type MotionKind = "hook" | "keyword" | "emoji" | "stat" | "list";

/**
 * Stile completo di un reel. Tutte le misure in pixel sono riferite a un canvas 1080x1920.
 * È ciò che si "copia" da una reference: font, colori, animazioni, ritmo dei tagli, zoom, grafiche.
 */
export type ReelStyle = {
  id: string;
  name: string;
  description?: string;
  captions: {
    enabled: boolean;
    fontFamily: string;
    fontWeight: number;
    fontSize: number;
    uppercase: boolean;
    letterSpacing: number;
    color: string;
    highlightColor: string;
    highlightMode: HighlightMode;
    /** Colore alternativo per le parole chiave (enfasi AI). */
    keywordColor: string;
    strokeColor: string;
    strokeWidth: number;
    shadowColor: string;
    shadowBlur: number;
    shadowOffsetY: number;
    background: CaptionBackground;
    backgroundColor: string;
    /** Centro verticale dei sottotitoli, 0 = alto, 1 = basso. */
    positionY: number;
    maxWordsPerCaption: number;
    maxCharsPerLine: number;
    animation: CaptionAnimation;
    /** Mostra un'emoji sopra al sottotitolo quando l'AI la suggerisce. */
    emojis: boolean;
    /** Leggera rotazione casuale dei blocchi (stile "MrBeast"). */
    tilt: number;
  };
  cuts: {
    /** Soglia silenzio in dB; null = automatica in base al rumore di fondo. */
    silenceThresholdDb: number | null;
    /** Pause più lunghe di questo valore vengono tagliate. */
    minSilence: number;
    /** Margine lasciato prima/dopo il parlato. */
    paddingBefore: number;
    paddingAfter: number;
    removeFillers: boolean;
    removeRetakes: boolean;
  };
  zoom: {
    enabled: boolean;
    mode: ZoomMode;
    /** Scala massima di uno zoom di enfasi (1.0 = nessuno). */
    intensity: number;
    /** Secondi medi tra uno zoom e l'altro. */
    every: number;
    /** Alterna inquadratura larga/stretta a ogni jump cut (nasconde i tagli). */
    alternateOnCuts: boolean;
    alternateScale: number;
    /** Punto di fuoco dello zoom (0..1), di solito il viso. */
    focusX: number;
    focusY: number;
    shake: boolean;
  };
  motion: {
    accentColor: string;
    secondaryColor: string;
    textColor: string;
    fontFamily: string;
    hookTitle: boolean;
    hookDuration: number;
    keywordPops: boolean;
    emojiPops: boolean;
    progressBar: boolean;
    progressBarPosition: "top" | "bottom";
    flashOnCut: boolean;
    /** Ogni quanti secondi (circa) inserire una grafica. */
    density: number;
  };
  grade: {
    brightness: number;
    contrast: number;
    saturation: number;
    /** -1 freddo … +1 caldo */
    warmth: number;
    vignette: number;
  };
  sfx: {
    enabled: boolean;
    volume: number;
    whooshOnZoom: boolean;
    popOnGraphics: boolean;
  };
  music: {
    volume: number;
    /** Abbassa la musica quando si parla. */
    ducking: boolean;
  };
};

/** Taglio suggerito (filler, ripetizione…) su un intervallo di parole. */
export type SuggestedRemoval = {
  id: string;
  startWord: number;
  endWord: number;
  reason: "filler" | "retake" | "off-topic" | "manual";
  enabled: boolean;
};

export type PlannedZoom = {
  id: string;
  wordIndex: number;
  kind: "punch" | "smooth";
  strength: number; // 0..1
};

export type PlannedGraphic = {
  id: string;
  kind: MotionKind;
  startWord: number;
  endWord: number;
  text: string;
  emoji?: string;
};

/** Piano di montaggio, ancorato agli indici delle parole così resta valido anche cambiando i tagli. */
export type EditPlan = {
  hook: string;
  emphasis: { wordIndex: number; emoji?: string }[];
  zooms: PlannedZoom[];
  graphics: PlannedGraphic[];
  removals: SuggestedRemoval[];
  source: "ai" | "local";
};

/** Eventi già risolti sul tempo di output, consumati dal renderer. */
export type ZoomEvent = { start: number; end: number; scale: number; kind: "punch" | "smooth" };
export type GraphicEvent = { id: string; start: number; end: number; kind: MotionKind; text: string; emoji?: string };
export type CaptionWord = { text: string; start: number; end: number; keyword: boolean };
export type CaptionGroup = { start: number; end: number; words: CaptionWord[]; emoji?: string; seed: number };

export type Timeline = {
  duration: number;
  /** Intervalli del sorgente tenuti, in ordine. */
  segments: Range[];
  /** Inizio di ogni segmento sul tempo di output. */
  offsets: number[];
  captions: CaptionGroup[];
  zooms: ZoomEvent[];
  graphics: GraphicEvent[];
  /** Istanti dei jump cut sul tempo di output. */
  cuts: number[];
  sfx: { time: number; type: "whoosh" | "pop" }[];
};

/** Statistiche misurate sulla reference (lato client) da passare all'analisi AI. */
export type ReferenceStats = {
  duration: number;
  width: number;
  height: number;
  cutsPerMinute: number;
  avgShotLength: number;
};
