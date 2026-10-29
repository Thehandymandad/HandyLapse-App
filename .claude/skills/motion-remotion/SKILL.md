---
name: motion-remotion
description: L'esecutore. Trasforma il piano di motion-director e il design di motion-design in un video Remotion (React, editor/remotion) sopra il montato di video-use, con camera 3D, grafiche dello style pack (Pulse di default), sottotitoli cinetici e oggetti three.js, poi compone il finale con voce trattata, effetti sonori e master a -14 LUFS. Usare dopo motion-director e motion-design, quando c'è da animare e consegnare il video.
---

# Motion Remotion

Esegui il piano, non lo reinventi. Se una scena del piano non funziona, lo dici e proponi la modifica a motion-director.
Il motore è il progetto Remotion in `editor/remotion/` (React → MP4 1080×1920 30 fps): leggi `src/types.ts` e lo style
pack in uso (`src/styles/originals/pulse/`) prima di toccare qualcosa.

## Cosa ricevi

- `edit/motion-plan.json` + `edit/MOTION-BRIEF.md` (motion-director), `edit/DESIGN.md` (motion-design),
  le ricette citate (motion-library, `references/remotion.md` per i componenti già pronti).
- Il montato di video-use: `edit/base.mp4` (render con `--no-subtitles`) + `edit/words_out.json` (`scripts/timeline.py`).

## Cosa consegni

- `edit/reel.json`: il progetto Remotion (da `scripts/plan_to_reel.py`, ritoccabile a mano).
- Componenti nuovi o modificati in `editor/remotion/src/` quando il piano chiede qualcosa che non esiste.
- `edit/remotion.mp4`: il video MUTO (footage + camera + grafiche + sottotitoli + fermo finale).
- `edit/final.mp4`: il video con il suono (`scripts/compose.py --video`), poi da passare a motion-review.

## Come funziona il motore

- **Il footage è il montato di video-use**: `source.file` = `base.mp4`, nessun taglio in Remotion (`keep` = tutto,
  `cuts` vuoto). Le giunte di video-use arrivano in `joins` e la camera le tratta come jump cut (Pulse: alternanza
  punch sfocato / whip 3D). Tutti i tempi sono quelli della timeline di uscita (`words_out.json`).
- **Camera** (`src/lib/camera.ts` + `camera` del pack): zoom `punch`/`smooth` dal piano, push-in per inquadratura,
  oscillazione a mano, transizioni sui tagli, tremori sui timbri, riquadro-telefono 3D. Il video sta in una prospettiva
  CSS: `rotateX/rotateY` sono movimenti 3D veri.
- **Sottotitoli**: quelli del pack (Pulse: 2–3 parole, Anton maiuscolo, ogni parola sale a fuoco quando è detta, attiva
  in lime, parole chiave da `captions.emphasis` su etichetta lime), sempre sopra le grafiche.
- **Grafiche**: componenti React del pack (`graphics` in `src/styles/originals/pulse/index.tsx`), uno per `type`.
  Props a tempo in **frame relativi** all'inizio della grafica (`plan_to_reel.py` li converte dai secondi assoluti).
  Ogni grafica accetta `y` (centro 0..1), `x` e `scale` per stare nello spazio libero.
- **Oggetti 3D**: three.js via `@remotion/three` (`src/three/objects.tsx`, `ThreeCanvas`) o PNG scontornati
  (`editor/assets/objects/`, copiati in `editor/remotion/public/`).
- **Fermo finale**: `hold` del piano → l'ultimo fotogramma resta fermo mentre le grafiche finiscono.

## Regole dure

- **Timeline = timeline di uscita.** Ogni grafica parte e finisce come la scena del piano; il colpo cade sul `payoff.t`.
- **Determinismo**: tutto dipende da `useCurrentFrame()`; niente `Math.random()` (usa `seeded()` di
  `src/lib/timeline.ts`), niente `setTimeout`, niente animazioni CSS/transition.
- **Niente rete nel render**: font da `@fontsource` (importati in `src/load-fonts.ts`), immagini in `public/`.
- **Zone sicure**: niente di importante sopra y=280, sotto y=1560, a destra di x=900 nella metà bassa. Le card Pulse
  sono grandi: regola `y` e `scale` nel piano e controlla gli still.
- **Sottotitoli corretti**: parole da `words_out.json`; se una parola è sbagliata correggi il testo in `reel.json`
  (i tempi restano), nomi propri e parole inglesi verificati.
- **Suono**: Remotion renderizza muto. Ogni evento visivo ha il suo effetto nel piano (`scenes[].sfx`), tutti diversi,
  ~7 dB sotto la voce; voce con EQ + compressione; master −14 LUFS, true peak −1 dBTP. Lo fa `compose.py`.
- **Mai statico, ma leggibile**: entrate a molla con sfocatura, oggetti che fluttuano; il testo da leggere fermo ≥ 0,6 s.
- **Nuovo componente** = nuovo file nel pack + registrazione in `graphics` + riga in motion-library
  `references/remotion.md`. Un tipo nuovo che funziona resta nella libreria per i video dopo.

## Libertà

Struttura dei componenti, micro-animazioni dentro le ricette, materiali dentro il design, nuovi style pack
(`src/styles/originals/<nome>/`, registrati in `src/styles/originals/index.ts`) quando l'utente vuole un altro stile
o porta un riferimento da copiare.

## Processo

1. **Tempi**: `python .claude/skills/motion-remotion/scripts/timeline.py edit` → `words_out.json`.
2. **Effetti sonori**: `python .claude/skills/motion-remotion/scripts/sfx_library.py missing edit`. Quelli che
   mancano, gratis: varianti dei 21 suoni inclusi in media-use (`sfx_library.py variant <nome> --from <suono>
   --pitch/--trim/--reverse/--layer/--seq`); a pagamento: `sfx_library.py generate` (ElevenLabs, chiedi prima).
   I WAV non vanno nel repo (licenza Pixabay): `sfx_library.py rebuild` li ricrea dal catalogo.
3. **Progetto**: `python .claude/skills/motion-remotion/scripts/plan_to_reel.py edit` → `edit/reel.json`.
   Nel piano ogni scena con grafica ha `"graphic": {"type", "props", "y", "scale", "text"}`; i tempi nelle props
   (chiavi che finiscono in `At`, `reveal`, `items[].at`) sono secondi assoluti. Se manca un componente, scrivilo.
4. **Controllo**: `cd editor/remotion && npx tsc --noEmit`, poi gli still sui colpi e sulle entrate:
   `npx tsx scripts/render.ts ../videos/<nome>/edit --still 0.3,1.4,5.2` → `edit/review/remotion/t_*.png`.
   Guarda le immagini (Read) con le zone di Instagram in mente; correggi `y`/`scale`/tempi e ripeti.
5. **Render**: `npx tsx scripts/render.ts ../videos/<nome>/edit` → `edit/remotion.mp4` (muto; ~7 min per 34 s
   in questo cloud, three.js in software). Anteprima di un tratto: `--frames 0-150`.
6. **Composizione**:
   `python .claude/skills/motion-remotion/scripts/compose.py --edit edit --base edit/base.mp4 --video edit/remotion.mp4`
   (voce da `base.mp4`, effetti dal piano, master; `--preview` per una 720p veloce).
7. Passa `edit/final.mp4` a **motion-review**. Non consegnare all'utente prima della revisione.

## In questo cloud

- Chromium di Remotion: `export REMOTION_BROWSER_EXECUTABLE=/opt/pw-browsers/chromium_headless_shell-1243/chrome-headless-shell-linux64/chrome-headless-shell`
  (WebGL in software con `swangle`, già impostato da `scripts/render.ts`).
- Dipendenze: `cd editor/remotion && npm install` (lo fa `editor/setup.sh`).
- Licenza Remotion: gratuita per singoli e aziende fino a 3 persone (remotion.dev/license).
