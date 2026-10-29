/**
 * "Pulse": stile originale (non copiato da una reference). Accento elettrico (arancione Claude) su nero vetro, Anton + Inter.
 *
 * - Sottotitoli cinetici a 2–3 parole: ogni parola sale a fuoco quando è detta, attiva in accento, parole chiave su etichetta accento.
 * - Camera: tagli alternati "punch" (zoom + sfocatura + rotazione) e "whip 3D" (scivolata con rotazione Y),
 *   oscillazione a mano leggera, tremore sui timbri, spinta in avanti sulle grafiche di tensione, riquadro-smartphone.
 * - Grafiche (type in edit.json): rec, tape, hours, nope, route, claude, phone, dm, pile, zero, send, trio, guidebook. Vedi i singoli file.
 */
import { seeded } from "../../../lib/timeline";
import { defineStyle } from "../../base";
import { definePack } from "../../pack";
import { ClaudeWorking } from "./ClaudeWorking";
import { PulseCaptions } from "./Captions";
import { DmSend } from "./DmSend";
import { HoursBurn } from "./HoursBurn";
import { NopeStamp } from "./NopeStamp";
import { Button3D } from "./Button3D";
import { Icon3D } from "./Icon3D";
import { IdCard } from "./IdCard";
import { RecHud } from "./RecHud";
import { ResultBurst } from "./ResultBurst";
import { PulseBackdrop, ResultPhone } from "./ResultPhone";
import { RouteMap } from "./RouteMap";
import { clamp01, P, phoneState } from "./shared";
import { TapeBand } from "./TapeBand";
import { GuideBook } from "./GuideBook";
import { PaperPlane } from "./PaperPlane";
import { pileImpacts, TaskPile } from "./TaskPile";
import { ToolTrio } from "./ToolTrio";
import { zeroImpacts, ZeroStamps } from "./ZeroStamps";

const style = defineStyle("pulse", "Pulse", "Originale: sottotitoli cinetici con accento elettrico (arancione Claude), tagli punch/whip 3D, grafiche UI in vetro scuro (REC, navigatore, progress, telefono, DM)", {
  captions: {
    fontFamily: "Anton",
    fontWeight: 400,
    fontSize: 98,
    uppercase: true,
    color: "#FFFFFF",
    highlightColor: P.accent,
    highlightMode: "color",
    keywordColor: P.accent,
    strokeWidth: 0,
    positionY: 0.585,
    maxWordsPerCaption: 3,
    maxCharsPerLine: 14,
    animation: "pop",
    tilt: 0,
  },
  cuts: { minSilence: 0.25, paddingBefore: 0.05, paddingAfter: 0.08 },
  zoom: { enabled: true, intensity: 1.16, alternateOnCuts: true, alternateScale: 1.08, focusX: 0.5, focusY: 0.4, shake: true, every: 4 },
  camera: { perspective: 1400, pushPerShot: 1.03, drift: 4, tilt3d: 0, transition: "none", transitionFrames: 1 },
  motion: { fontFamily: "Inter", accentColor: P.accent, secondaryColor: P.ink, textColor: "#FFFFFF", radius: 40, progressBar: "none", flashOnCut: false, density: 3, iconStyle: "solid" },
  grade: { brightness: 0.95, contrast: 1.12, saturation: 1.12, warmth: 0.05, vignette: 0.4 },
  audio: { sfx: true, sfxVolume: 0.4, musicVolume: 0.08, targetLufs: -14 },
});

const TRANSITION = 7;

export const pack = definePack({
  style,
  Captions: PulseCaptions,
  Underlay: PulseBackdrop,
  camera: (ctx, base) => {
    const { frame, tl, sinceCut } = ctx;
    const st = { ...base };
    // tagli: alternati punch-in sfocato e whip 3D
    if (sinceCut >= 0 && sinceCut < TRANSITION) {
      const cutFrame = frame - sinceCut;
      const idx = tl.cuts.indexOf(cutFrame);
      const left = Math.pow(1 - sinceCut / TRANSITION, 3);
      const dir = seeded(cutFrame) > 0.5 ? 1 : -1;
      if (idx % 2 === 0) {
        st.scale *= 1 + 0.2 * left;
        st.blur += 12 * left;
        st.rotateZ += 2.5 * left * dir;
      } else {
        st.x += 340 * left * dir;
        st.rotateY += 14 * left * dir;
        st.blur += 20 * left;
        st.scale *= 1 + 0.06 * left;
      }
    }
    for (const g of tl.graphics) {
      const f = frame - g.from;
      if (f < 0 || f >= g.frames) continue;
      if (g.type === "nope" && f < 12) {
        // il timbro sbatte: colpo secco + tremore che si smorza
        const k = f < 5 ? 0 : 1 - (f - 5) / 7;
        st.x += Math.sin(f * 2.9) * 26 * k;
        st.y += Math.cos(f * 2.3) * 18 * k;
        st.rotateZ += Math.sin(f * 1.7) * 1.4 * k;
        st.scale *= 1 + 0.04 * k;
      }
      if (g.type === "pile" || g.type === "zero") {
        // ogni pezzo che atterra / timbro che sbatte dà un colpo alla camera
        const hits = g.type === "pile" ? pileImpacts(g) : zeroImpacts(g);
        for (const h of hits) {
          const d = f - h;
          if (d < 0 || d > 7) continue;
          const k = (1 - d / 7) * (g.type === "zero" ? 1 : 0.6);
          st.x += Math.sin(d * 2.9 + h) * 22 * k;
          st.y += Math.cos(d * 2.3 + h) * 16 * k;
          st.rotateZ += Math.sin(d * 1.7 + h) * 1.2 * k;
          st.scale *= 1 + 0.03 * k;
        }
      }
      if (g.type === "hours") {
        // tensione: spinta lenta in avanti e inclinazione
        const p = clamp01(f / g.frames);
        st.scale *= 1 + 0.07 * p;
        st.rotateZ += -2 * p;
      }
      if (g.type === "phone") {
        const ph = phoneState(f, g.frames, tl.fps);
        st.inset = ph.inset;
        st.insetRadius = ph.radius;
        st.insetRotateX = ph.rotateX;
        st.insetRotateY = ph.rotateY;
      }
    }
    return st;
  },
  graphics: {
    rec: RecHud,
    tape: TapeBand,
    hours: HoursBurn,
    nope: NopeStamp,
    route: RouteMap,
    claude: ClaudeWorking,
    phone: ResultPhone,
    result: ResultBurst,
    idcard: IdCard,
    icon3d: Icon3D,
    button3d: Button3D,
    dm: DmSend,
    pile: TaskPile,
    zero: ZeroStamps,
    send: PaperPlane,
    trio: ToolTrio,
    guidebook: GuideBook,
  },
});
