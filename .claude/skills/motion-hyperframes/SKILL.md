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
  `useState`/`useEffect` per animare, niente timer né transizioni CSS. Il 3D si fa con `useThreeStage`
  (`src/three/stage.ts`: three.js disegnato in modo sincrono a ogni fotogramma, `preserveDrawingBuffer`), non con
  `@remotion/three`, che in HyperFrames non si vede. Canvas grandi solo quanto l'oggetto: il WebGL è in software.
- **Cornice** (default della casa, `frame` in `reel.json` da `plan_to_reel.py`): `camera.py` mette il footage con la
  camera dentro il rettangolo arrotondato su fondo chiaro sfumato (tema chiaro) o scuro con bagliore d'accento; in HyperFrames il bordo al neon arancione (`FrameBorder`: tubo netto,
  anima chiara, alone stretto) e la maschera che tiene le grafiche **fuori** dalla cornice (`OutsideFrame`). Il render
  Remotion (`render.ts`) la cornice non la fa.
- **Il footage non entra in HyperFrames** e i componenti non devono contare su `backdrop-filter` per un effetto
  visibile (sotto c'è il trasparente): un effetto sul footage va in `camera-track.ts` + `camera.py` (come `gray`).
- **Zone sicure** (iPhone): niente di importante sopra y=250, sotto y=1720, a meno di 70 px dai lati, a destra di
  x=930 da y=1250. Le card Pulse
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
   media-use (`sfx_library.py variant <nome> --from <suono> --pitch/--trim/--reverse/--layer/--seq`) o sintetizzati in
   locale (`sfx_library.py synth <nome> --kind riser|ding --duration <s>`: le ricette del primo editor, barra che si carica e 100%); a pagamento:
   `sfx_library.py generate` (ElevenLabs, chiedi prima). I WAV non vanno nel repo: `sfx_library.py rebuild`.
2a. **Sfondo nuovo** (se l'utente vuole un'altra stanza dietro di sé): un'immagine verticale della stanza vuota (generata
   con Higgsfield `generate_image`, modello `gpt_image_2_5`, 9:16, ~0,25 crediti: si chiede o si dice il costo), poi
   `python $S/background.py --edit $E --image <stanza.png>`: scontorno video stabile con RobustVideoMatting
   (`editor/assets/models/rvm_mobilenetv3_fp32.onnx`, da scaricare dalle release di GitHub se manca), colori dei
   capelli ripuliti, luce dello sfondo avvicinata al girato, leggero light wrap; l'originale resta in `base_wall.mp4`,
   lo scontorno in `matte.mp4`. ~1 fotogramma al secondo in questo cloud: va lanciato in background. Prima di speed.py.
2a-bis. **Color da una referenza** (se l'utente manda uno screen di un video con una color che gli piace):
   `python $S/color_match.py --edit $E --ref <screen.png> --crop x,y,w,h` (il crop toglie l'interfaccia dell'app;
   prima `--stills 3,12,30` per la prova in `review/color/`). Persona e sfondo separati con lo scontorno (`matte.mp4`, o
   RVM veloce se manca): temperatura della luce dalla referenza, luce della pelle verso quella della referenza (la
   tinta della pelle no: è della persona), sfondo scurito fino al rapporto sfondo/viso della referenza (`--relight`,
   stop massimi) con la tinta della referenza alla stessa luminosità, alone di luce dietro la testa e corpo in ombra
   (`--light`). Due LUT 3D applicate da ffmpeg: niente sfarfallio. Copia la color e l'atmosfera, non la direzione
   della luce: si dice così all'utente. Rende di più quando la stanza ha già luci (es. dopo background.py). L'originale
   resta in `base_nocolor.mp4`. Dopo background.py, prima di speed.py.
2b. **Ritmo** (se l'utente lo vuole più veloce): `python $S/speed.py $E --factor 1.1` → `base.mp4` accelerato senza
   cambiare il tono della voce, parole e piano riallineati (gli originali restano in `*_1x.*`: per cambiare il piano
   dopo, si modifica `motion-plan_1x.json` e si rilancia `speed.py`). 1,1x è "un po' più veloce".
2c. **Musica di sottofondo** (di default, a meno che l'utente non la voglia aggiungere su Instagram): un brano
   originale composto in locale, gratis e senza licenze: `python $S/music.py -o editor/assets/music/<nome>.wav
   --duration <durata finale> --bpm 120 --end <fine del parlato>` (elettronica tech allegra; si ferma dopo l'ultima
   parola), poi nel piano `"music": {"file": "editor/assets/music/<nome>.wav", "gap": 9}`: `compose.py` la mette 9 dB
   sotto la voce e la abbassa da sola quando parli (sidechain), circa 15 dB sotto durante il parlato.
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
