/** Tutti i tempi sono in secondi del video SORGENTE, salvo dove indicato. */

export type Range = { start: number; end: number };

export type Word = { text: string; start: number; end: number };

export type CaptionAnimation = "pop" | "bounce" | "fade" | "slide-up" | "typewriter" | "none";
export type HighlightMode = "color" | "box" | "scale" | "underline" | "none";

/** Stile completo di un reel: è ciò che si copia da una reference. Misure in px su canvas 1080x1920. */
export type ReelStyle = {
  id: string;
  name: string;
  description: string;
  captions: {
    enabled: boolean;
    fontFamily: string;
    fontWeight: number;
    fontSize: number;
    uppercase: boolean;
    letterSpacing: number;
    lineHeight: number;
    color: string;
    highlightColor: string;
    highlightMode: HighlightMode;
    keywordColor: string;
    strokeColor: string;
    strokeWidth: number;
    shadow: string;
    background: "none" | "box" | "pill";
    backgroundColor: string;
    /** Centro verticale (0 = alto, 1 = basso). */
    positionY: number;
    maxWordsPerCaption: number;
    maxCharsPerLine: number;
    animation: CaptionAnimation;
    /** Gradi di rotazione casuale dei blocchi. */
    tilt: number;
  };
  cuts: {
    /** dB per ffmpeg silencedetect; null = automatico dal rumore di fondo. */
    silenceDb: number | null;
    minSilence: number;
    paddingBefore: number;
    paddingAfter: number;
  };
  zoom: {
    enabled: boolean;
    /** Scala massima dei punch zoom. */
    intensity: number;
    /** Alterna largo/stretto a ogni jump cut. */
    alternateOnCuts: boolean;
    alternateScale: number;
    focusX: number;
    focusY: number;
    shake: boolean;
    /** Secondi medi tra zoom nel piano automatico. */
    every: number;
  };
  /** Movimenti di camera sul video (anche 3D) e transizioni sui tagli. */
  camera: {
    /** Prospettiva CSS in px per le rotazioni 3D (più basso = più marcato). */
    perspective: number;
    /** Push-in lento su ogni inquadratura: scala raggiunta a fine inquadratura (1 = fermo). */
    pushPerShot: number;
    /** Oscillazione "a mano" (px). */
    drift: number;
    /** Inclinazione 3D durante gli zoom (gradi su X/Y). */
    tilt3d: number;
    /** Transizione sui jump cut. */
    transition: "none" | "flash" | "whip" | "zoom-blur" | "shake" | "glitch" | "rotate-3d";
    transitionFrames: number;
  };
  motion: {
    fontFamily: string;
    accentColor: string;
    secondaryColor: string;
    textColor: string;
    /** Raggio angoli delle card (px). */
    radius: number;
    progressBar: "none" | "top" | "bottom";
    flashOnCut: boolean;
    /** Secondi medi tra grafiche nel piano automatico. */
    density: number;
    /** Stile icone: linea o piene. */
    iconStyle: "line" | "solid";
  };
  grade: {
    brightness: number;
    contrast: number;
    saturation: number;
    /** -1 freddo … +1 caldo */
    warmth: number;
    vignette: number;
  };
  audio: {
    sfx: boolean;
    sfxVolume: number;
    musicVolume: number;
    /** Loudness finale (Instagram/TikTok ≈ -14 LUFS). */
    targetLufs: number;
  };
};

export type IconName =
  | "money" | "euro" | "bulb" | "clock" | "house" | "fire" | "wrench" | "hammer" | "drill" | "warning"
  | "heart" | "check" | "cross" | "star" | "trophy" | "brain" | "rocket" | "chart" | "phone" | "camera"
  | "thumbs-up" | "eye" | "gift" | "lock" | "calendar" | "bell" | "spark" | "arrow-right" | "lightning"
  | "ruler" | "paint" | "screw" | "family" | "leaf" | "drop" | "plug";

export type Object3DName = "coin" | "star" | "heart" | "house" | "gem" | "bolt" | "arrow" | "gift";

export type BuiltinGraphicType = "keyword" | "stat" | "list" | "icon" | "object3d" | "arrow" | "cta";
/** Tipi base + tipi creati apposta per una reference (registrati nel suo style pack). */
export type GraphicType = BuiltinGraphicType | (string & {});

/** Grafica sul video. `at` è il tempo SORGENTE in cui compare (meglio se allineato all'inizio di una parola). */
export type Graphic = {
  type: GraphicType;
  at: number;
  duration: number;
  text?: string;
  icon?: IconName;
  object?: Object3DName;
  /** Posizione del centro (0..1). Default: metà opposta ai sottotitoli. */
  x?: number;
  y?: number;
  color?: string;
  /** Per "arrow": direzione in gradi (0 = destra). */
  angle?: number;
  sfx?: SfxName | "none";
  /** Dati extra per le grafiche personalizzate di uno style pack. */
  props?: Record<string, unknown>;
};

export type Zoom = { at: number; kind: "punch" | "smooth"; strength: number; duration?: number };

export type Cut = Range & { reason: "filler" | "retake" | "manual" | "off-topic" };

export type SfxName = "whoosh" | "pop" | "ding" | "click" | "riser" | "boom" | (string & {});

/** File di montaggio (projects/<nome>/edit.json): lo scrive l'ingest e lo rifinisce Claude Code. */
export type EditProject = {
  version: 1;
  name: string;
  source: { file: string; width: number; height: number; fps: number; duration: number };
  styleId: string;
  /** Override parziali sopra lo stile scelto. */
  styleOverrides?: DeepPartial<ReelStyle>;
  /** Parlato rilevato (con margini) = parti del video che si tengono. */
  keep: Range[];
  /** Tagli extra dentro al parlato: intercalari, frasi rifatte, tagli manuali. */
  cuts: Cut[];
  trim?: Range;
  words: Word[];
  /** Spostamento dei sottotitoli in secondi (sync). */
  captionOffset?: number;
  /** Indici delle parole da colorare come parole chiave. */
  emphasis: number[];
  hook: { text: string; duration: number; icon?: IconName } | null;
  zooms: Zoom[];
  graphics: Graphic[];
  cta?: { text: string; icon?: IconName } | null;
  music?: { file: string; volume?: number } | null;
  /** Inquadratura orizzontale se il sorgente non è 9:16 (0..1). */
  framingX?: number;
};

export type DeepPartial<T> = { [K in keyof T]?: T[K] extends object ? DeepPartial<T[K]> : T[K] };

/** Props della composizione Remotion. */
export type ReelProps = { project: EditProject; style: ReelStyle };
