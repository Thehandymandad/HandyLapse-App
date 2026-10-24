/**
 * Style pack copiato dalla reference "Claude ha montato il 100% di questo video" (references/ref1).
 *
 * Misure (fotogrammi a 540 px → ×2):
 * - Sottotitoli: UNA parola alla volta, Montserrat bold ~44 px, bianco, minuscolo come parlato, nessun contorno,
 *   ombra leggera, centro a y≈52% (all'altezza del petto), nessuna animazione (taglio netto parola→parola).
 * - Badge fisso in alto per tutto il video (y≈17,5%): riquadro scuro 652×130, Poppins bold 40, "Claude" corallo, "100%" giallo.
 * - Ritmo: ~21 tagli/min, nessuna pausa lasciata, tagli netti con alternanza inquadratura stretta/larga.
 * - Grafiche: card timeline (0,6–3,8 s) che si trasforma nella card chat (3,8–6,3 s), logo 3D sopra la mano (12,9–15,5 s),
 *   persona che sparisce e ricompare (16,5–18,7 s), carosello 3D di reel dietro la persona (18,7–23,4 s), CTA guida (23,4 s→fine).
 * - Colore: luce calda arancione, contrasto leggero, vignettatura moderata. Loudness −14 LUFS.
 */
import { defineStyle } from "../../base";
import { definePack } from "../../pack";
import { Badge } from "./Badge";
import { Carousel3D } from "./Carousel3D";
import { ChatCard } from "./ChatCard";
import { GuideCard } from "./GuideCard";
import { Logo3D } from "./Logo3D";
import { C } from "./palette";
import { TimelineCard } from "./TimelineCard";

const style = defineStyle("claude-reel", "Claude Reel", "Copiato dalla reference: una parola alla volta, badge fisso, card UI che si trasformano, logo 3D, carosello 3D dietro la persona", {
  captions: {
    fontFamily: "Montserrat",
    fontWeight: 700,
    fontSize: 44,
    uppercase: false,
    color: "#FFFFFF",
    highlightMode: "none",
    strokeWidth: 0,
    shadow: "0 2px 10px rgba(0,0,0,0.45)",
    positionY: 0.522,
    maxWordsPerCaption: 1,
    maxCharsPerLine: 30,
    animation: "none",
    tilt: 0,
  },
  cuts: { minSilence: 0.25, paddingBefore: 0.05, paddingAfter: 0.08 },
  zoom: { enabled: true, intensity: 1.12, alternateOnCuts: true, alternateScale: 1.18, focusX: 0.5, focusY: 0.33, shake: false, every: 30 },
  camera: { perspective: 1400, pushPerShot: 1, drift: 0, tilt3d: 0, transition: "none", transitionFrames: 1 },
  motion: { fontFamily: "Poppins", accentColor: C.coral, secondaryColor: "#141414", textColor: "#FFFFFF", radius: 24, progressBar: "none", flashOnCut: false, density: 4, iconStyle: "solid" },
  grade: { brightness: 1, contrast: 1.05, saturation: 1.05, warmth: 0.08, vignette: 0.3 },
  audio: { sfx: true, sfxVolume: 0.35, musicVolume: 0.08, targetLufs: -14 },
});

export const pack = definePack({
  style,
  // Piano automatico fedele alla reference: solo badge fisso, sottotitoli, tagli e CTA guida finale.
  // Card timeline/chat, logo 3D, sparizione e carosello si mettono a mano dove il testo li chiama.
  plan: ({ duration, plan }) => ({
    hook: null,
    cta: null,
    zooms: [],
    emphasis: [],
    cuts: plan.cuts,
    graphics: [
      { type: "badge", at: 0, duration: duration + 1, text: "[c]Claude[/c] ha montato il [y]100%[/y]\ndi questo video", sfx: "none" },
      { type: "guide", at: Math.max(0, duration - 3), duration: 4, sfx: "pop" },
    ],
  }),
  graphics: {
    badge: Badge,
    timeline: TimelineCard,
    chat: ChatCard,
    logo3d: Logo3D,
    carousel3d: Carousel3D,
    guide: GuideCard,
  },
});
