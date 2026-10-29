---
name: motion-hyperframes
description: L'esecutore. Trasforma il piano di motion-director e il design di motion-design nel video finale - grafiche e sottotitoli dello style pack (Pulse di default, componenti React in editor/remotion) disegnati e renderizzati da HyperFrames su fondo trasparente, camera fluida sul montato di video-use (camera.py), voce trattata, effetti sonori e master a -14 LUFS. Usare dopo motion-director e motion-design, quando c'è da animare e consegnare il video.
---

# Motion HyperFrames

Esegui il piano, non lo reinventi. Se una scena del piano non funziona, lo dici e proponi la modifica a motion-director.

## Come è fatto il motore (e perché)

Tre livelli, ognuno fatto dallo strumento che lo fa meglio:

1. **Grafiche + sottotitoli → HyperFrames.** I componenti sono React (`editor/remotion/src/`, style pack Pulse) e
   HyperFrames li disegna a ogni `hf-seek` (livello "Hosted" di `/remotion-to-hyperframes`): stesso codice, stesse
   molle (`spring` di Remotion, identica al 1e-16), stesso fotogramma. **Mai tradurli a mano in GSAP**: la traduzione
   `spring → back.out` è approssimata ed è quello che faceva partire male e scattare le animazioni. Fondo trasparente,
   niente footage dentro: il render resta leggero.
2. **Camera sul footage → `camera.py`.** La camera di ogni fotogramma la calcola lo stesso codice di Remotion
   (`camera-track.ts` → `edit/camera.json`: punch sfocato / whip 3D sulle giunte, zoom del piano, push per inquadratura,
   oscillazione a mano, tremori sui timbri, telefono 3D); `camera.py` la applica come il browser: omografia con
   prospettiva vera, sub-pixel (niente scalini dello `scale`+`crop` di ffmpeg), fondo Pulse dove il footage non copre,
   vignetta, desaturazione del "nope", fermo finale; poi mette sopra le grafiche.
3. **Suono → `compose.py --video`.**

## Cosa ricevi

- `edit/motion-plan.json` + `edit/MOTION-BRIEF.md` (motion-director), `edit/DESIGN.md` (motion-design), le ricette
  (motion-library; `references/remotion.md` per i componenti pronti).
- Il montato di video-use: `edit/base.mp4` (render con `--no-subtitles`) + `edit/words_out.json`.

## Cosa consegni

- `edit/reel.json` (progetto: grafiche, zoom, giunte, parole, fermo), `edit/camera.json`, `edit/hf/` (progetto
  HyperFrames generato), `edit/graphics.webm` (trasparente), `edit/video.mp4` (muto), `edit/final.mp4` → motion-review.
- Componenti nuovi o modificati in `editor/remotion/src/` quando il piano chiede qualcosa che non esiste.

## Regole dure

- **Timeline = timeline di uscita.** Ogni grafica parte e finisce come la scena del piano; il colpo cade sul `payoff.t`.
- **Si cambia `reel.json` o il piano, mai `edit/hf/index.html`**: lo rigenera `hf-project.ts`.
- **Componenti deterministici**: tutto da `useCurrentFrame()`; niente `Math.random()` (usa `seeded()`), niente
  `useState`/`useEffect` per animare, niente timer né transizioni CSS. Gli oggetti three.js (`@remotion/three`) in
  HyperFrames non si vedono: vanno fatti con il protocollo `hf-seek` (`/hyperframes`, `references/types/3d.md`) o come PNG.
- **Il footage non entra in HyperFrames** e i componenti non devono contare su `backdrop-filter` per un effetto
  visibile (sotto c'è il trasparente): un effetto sul footage va in `camera-track.ts` + `camera.py` (come `gray`).
- **Zone sicure**: niente di importante sopra y=280, sotto y=1560, a destra di x=900 nella metà bassa. Le card Pulse
  sono grandi: regola `y` e `scale` nel piano e guarda gli still.
- **Sottotitoli corretti**: parole da `words_out.json`; una parola sbagliata si corregge in `reel.json` (i tempi restano).
- **Suono**: ogni evento visivo ha il suo effetto nel piano (`scenes[].sfx`), tutti diversi, ~7 dB sotto la voce; voce
  con EQ + compressione; master −14 LUFS, true peak −1 dBTP.
- **Mai statico, ma leggibile**: entrate a molla con sfocatura, il testo da leggere fermo ≥ 0,6 s.
- **Nuovo componente** = nuovo file nel pack + registrazione in `graphics` + riga in motion-library
  `references/remotion.md`.

## Processo

`R=editor/remotion`, `S=.claude/skills/motion-hyperframes/scripts`, `E=editor/videos/<nome>/edit`.

1. **Tempi**: `python $S/timeline.py $E` → `words_out.json`.
2. **Effetti sonori**: `python $S/sfx_library.py missing $E`. Quelli che mancano, gratis: varianti dei 21 suoni di
   media-use (`sfx_library.py variant <nome> --from <suono> --pitch/--trim/--reverse/--layer/--seq`); a pagamento:
   `sfx_library.py generate` (ElevenLabs, chiedi prima). I WAV non vanno nel repo: `sfx_library.py rebuild`.
3. **Progetto**: `python $S/plan_to_reel.py $E` → `reel.json` (nel piano `"graphic": {"type", "props", "y", "scale",
   "text"}`; i tempi nelle props — chiavi in `At`, `reveal`, `items[].at` — sono secondi assoluti).
   Poi `cd $R && npx tsx scripts/hf-project.ts ../videos/<nome>/edit && npx tsx scripts/camera-track.ts ../videos/<nome>/edit`.
4. **Controllo** (in `$E/hf`, con `NODE_USE_ENV_PROXY=1 NODE_EXTRA_CA_CERTS=/root/.ccr/ca-bundle.crt`):
   `npx hyperframes check --json` (nessun errore; gli avvisi `line_unread` dei sottotitoli parola per parola e dei
   testi piccoli delle card si accettano), poi gli still con footage e camera:
   `npx hyperframes snapshot . --at 0.3,5.2,… --no-end -o ../review/snap` e
   `python $S/camera.py --edit $E --stills 0.3,5.2,… --snap-dir $E/review/snap` → `review/stills/`, foglio con
   `python .claude/skills/motion-review/scripts/stills.py $E/review/stills`. Guarda le immagini, correggi, ripeti.
5. **Render grafiche**: `npx hyperframes render . --format webm --quality delivery -o ../graphics.webm`
   (trasparente; verifica con ffprobe durata e `alpha_mode=1`).
6. **Camera + grafiche**: `python $S/camera.py --edit $E` → `video.mp4` (muto; `--frames a-b` per un tratto).
7. **Suono**: `python $S/compose.py --edit $E --base $E/base.mp4 --video $E/video.mp4` → `final.mp4`.
8. Passa `final.mp4` a **motion-review**. Non consegnare all'utente prima della revisione.

## In questo cloud

- `npx hyperframes …` vuole `NODE_USE_ENV_PROXY=1 NODE_EXTRA_CA_CERTS=/root/.ccr/ca-bundle.crt`.
- Dipendenze dei componenti: `cd editor/remotion && npm ci` (lo fa `editor/setup.sh`); `camera.py` usa numpy + OpenCV.
- Remotion resta come anteprima e render alternativo dello stesso progetto (`npm run studio`,
  `npx tsx scripts/render.ts <edit>`: più lento, tutto in un passaggio).
