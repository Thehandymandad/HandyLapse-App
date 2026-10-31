/**
 * "Zane": stile ripreso dal metodo di Zane Hoyer (editor/styles/zane/: brand kit e README di movimento).
 * Estetica: quasi nero con una punta di verde, accento lime acceso con bagliore, sans bianco molto pesante + serif
 * corsivo d'accento, mono per le etichette. Movimento: tutto a molla con il 20% di overshoot (src/motion/bouncy.ts).
 * Parlato a schermo pieno (niente cornice), con scene grafiche a schermo intero in mezzo.
 *
 * Grafiche proprie: ktext (testo cinetico con stili d'entrata a rotazione), chapter (barra del capitolo), scene
 * (scena a schermo intero), phoneclip / cards3d (il girato dentro le grafiche), counter, ring, toggles, chart (UI finte),
 * scribble (freccia e scritta a mano). Tutte le grafiche di Pulse restano disponibili, nel tema neon.
 */
import { defineStyle } from "../../base";
import { definePack } from "../../pack";
import { pack as pulse } from "../pulse";
import { ZaneCaptions } from "./Captions";
import { ChapterBar } from "./ChapterBar";
import { KineticText } from "./KineticText";
import { Cards3D, PhoneClip } from "./Footage";
import { Scene } from "./Scene";
import { Chart, Counter, Ring, Scribble, Toggles } from "./Widgets";

export const ZANE_ACCENT = "#CCFF00";

const style = defineStyle("zane", "Zane", "Metodo Zane Hoyer: nero-verde + lime con bagliore, sans pesante + serif corsivo, tutto a molla (20% overshoot)", {
  captions: {
    fontFamily: "Inter",
    fontWeight: 900,
    fontSize: 92,
    uppercase: false,
    color: "#FFFFFF",
    highlightColor: ZANE_ACCENT,
    highlightMode: "color",
    keywordColor: ZANE_ACCENT,
    strokeWidth: 0,
    positionY: 0.64,
    maxWordsPerCaption: 3,
    maxCharsPerLine: 12,
    animation: "pop",
    tilt: 0,
  },
  cuts: { minSilence: 0.25, paddingBefore: 0.05, paddingAfter: 0.08 },
  zoom: { enabled: true, intensity: 1.16, alternateOnCuts: true, alternateScale: 1.08, focusX: 0.5, focusY: 0.4, shake: true, every: 4 },
  camera: { perspective: 1400, pushPerShot: 1.035, drift: 5, tilt3d: 0, transition: "none", transitionFrames: 1 },
  motion: { fontFamily: "Inter", accentColor: ZANE_ACCENT, secondaryColor: "#050805", textColor: "#FFFFFF", radius: 32, progressBar: "none", flashOnCut: false, density: 3, iconStyle: "solid", theme: "neon" },
  grade: { brightness: 0.97, contrast: 1.1, saturation: 1.02, warmth: 0, vignette: 0.35 },
  audio: { sfx: true, sfxVolume: 0.4, musicVolume: 0.08, targetLufs: -14 },
});

export const pack = definePack({
  style,
  Captions: ZaneCaptions,
  camera: pulse.camera,
  graphics: {
    ...pulse.graphics,
    ktext: KineticText,
    chapter: ChapterBar,
    scene: Scene,
    phoneclip: PhoneClip,
    cards3d: Cards3D,
    counter: Counter,
    ring: Ring,
    toggles: Toggles,
    chart: Chart,
    scribble: Scribble,
  },
});
