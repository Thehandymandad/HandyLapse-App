/**
 * "Apple": bianco Apple, riquadri di vetro chiaro, un solo accento blu (#1F6BFF). Sans pesante (Inter, al posto di SF
 * Pro), movimenti da keynote: molle morbide senza rimbalzo e sfocatura che si scioglie entrando. Parlato a schermo pieno
 * con scene bianche ("stage") a schermo intero quando serve mostrare un oggetto.
 *
 * Grafiche: stage (fondo bianco), title (titolo parola per parola), hero (iPhone con clip o immagine), promise (pillola
 * della promessa), progress (barra fino al momento promesso), repo (pagina GitHub con le stelle), chip (chip che si
 * dissolve in un altro), fps (confronto di frame rate), burst (raffica di telefoni), grid (griglia con contatore),
 * needs (tessere "cosa serve"), cta (barra dei commenti).
 */
import { defineStyle } from "../../base";
import { definePack } from "../../pack";
import { pack as pulse } from "../pulse";
import { AppleCaptions } from "./Captions";
import { Burst, Chip, Cta, FpsCompare, Grid, Hero, Needs, Progress, Promise_, Repo, Stage, Title } from "./Graphics";

export const APPLE_BLUE = "#1F6BFF";

const style = defineStyle("apple", "Apple", "Bianco Apple, vetro chiaro, accento blu #1F6BFF, movimenti morbidi da keynote", {
  captions: {
    fontFamily: "Inter",
    fontWeight: 800,
    fontSize: 80,
    uppercase: false,
    color: "#FFFFFF",
    highlightColor: APPLE_BLUE,
    highlightMode: "color",
    keywordColor: APPLE_BLUE,
    strokeWidth: 0,
    positionY: 0.7,
    maxWordsPerCaption: 3,
    maxCharsPerLine: 14,
    animation: "pop",
    tilt: 0,
  },
  cuts: { minSilence: 0.25, paddingBefore: 0.05, paddingAfter: 0.08 },
  zoom: { enabled: true, intensity: 1.1, alternateOnCuts: true, alternateScale: 1.06, focusX: 0.5, focusY: 0.42, shake: false, every: 4 },
  camera: { perspective: 1600, pushPerShot: 1.025, drift: 3, tilt3d: 0, transition: "none", transitionFrames: 1 },
  motion: { fontFamily: "Inter", accentColor: APPLE_BLUE, secondaryColor: "#F5F5F7", textColor: "#0B0B0F", radius: 40, progressBar: "none", flashOnCut: false, density: 3, iconStyle: "line", theme: "light" },
  grade: { brightness: 1.0, contrast: 1.04, saturation: 1.0, warmth: 0, vignette: 0 },
  audio: { sfx: true, sfxVolume: 0.4, musicVolume: 0.08, targetLufs: -14 },
});

export const pack = definePack({
  style,
  Captions: AppleCaptions,
  camera: pulse.camera,
  graphics: {
    stage: Stage,
    title: Title,
    hero: Hero,
    promise: Promise_,
    progress: Progress,
    repo: Repo,
    chip: Chip,
    fps: FpsCompare,
    burst: Burst,
    grid: Grid,
    needs: Needs,
    cta: Cta,
  },
});
