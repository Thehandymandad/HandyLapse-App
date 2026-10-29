---
name: motion-hyperframes
description: L'esecutore. Trasforma il piano di motion-director e il design di motion-design in una composizione HyperFrames (HTML + GSAP, timeline deterministica), la renderizza come video trasparente sopra il parlato e compone il video finale con camera, voce trattata, effetti sonori e master a -14 LUFS. Usare dopo motion-director e motion-design, quando c'è da animare e consegnare il video.
---

# Motion HyperFrames

Esegui il piano, non lo reinventi. Se una scena del piano non funziona, lo dici e proponi la modifica a motion-director.
Prima di scrivere HTML leggi la skill pubblica `/hyperframes` (contratto, formato, lint) e, per ogni effetto con un nome,
cerca nel registry (`/hyperframes-registry`) prima di costruirlo a mano.

## Cosa ricevi

- `edit/motion-plan.json` + `edit/MOTION-BRIEF.md` (motion-director), `edit/DESIGN.md` (motion-design),
  le ricette citate (motion-library), `edit/words_out.json` (`scripts/timeline.py`).
- Il montato di video-use: `edit/base.mp4` (render con `--no-subtitles`).

## Cosa consegni

- `edit/hf/`: il progetto HyperFrames (sorgenti modificabili).
- `edit/graphics.webm`: tutte le grafiche e, sopra a tutto, i sottotitoli; trasparente, 1080×1920, 30 fps,
  durata = montato + `hold` (fermo finale).
- `edit/final.mp4`: il video composto (`scripts/compose.py`), poi da passare a motion-review.

## Regole dure

- **Timeline = timeline di uscita.** Ogni `data-start` viene dal piano; il colpo di ogni ricetta cade sul `payoff.t`.
  La durata del root è quella di `base.mp4` (ffprobe) più l'eventuale `hold` del piano (fermo sull'ultimo
  fotogramma, ≥ 1 s se il video chiude con una CTA da leggere), mai di più.
- **Root trasparente.** Niente fondo sulla composizione delle grafiche: sotto c'è la persona che parla.
- **Contratto HyperFrames**: `class="clip"` + `data-start` + `data-duration` su ogni elemento a tempo, una timeline in
  pausa per composizione registrata in `window.__timelines`, `fromTo` nelle scene, niente `Math.random()` non seminato,
  niente `repeat: -1`, niente transform CSS su elementi animati da GSAP. `npx hyperframes check --json` senza errori.
- **Font verificati**: Instrument Serif con `@font-face` da `assets/fonts/` (copiato da `editor/assets/fonts/`), e prima
  della timeline un controllo `document.fonts.check('italic 400 80px "Instrument Serif"')` che lancia errore se manca.
- **Sottotitoli per ultimi** e sempre leggibili: composizione `captions` con lo `z-index` più alto (o renderizzata a
  parte e passata per ultima a `compose.py`). Gruppi scelti **a mano per senso** (mai una riga che finisce su
  articolo, preposizione o "non"), parole chiave nella grafia in cui sono dette ("DM", "Claude"). Testo corretto
  (nomi propri e parole inglesi verificati sulla trascrizione).
- **3D con three.js** (oggetti procedurali, quando non ci sono PNG generati): ogni scena 3D carica
  `assets/lib/three.min.js` e `assets/lib/hf3d.js` DENTRO il suo `<template>` (lint `missing_three_script`), disegna ogni
  fotogramma da `tl.time()` della scena dentro `hf-seek` (il tempo di `hf-seek` è GLOBALE, la timeline della scena è già
  posizionata sul tempo locale), costruzione asincrona registrata in `window.__hf.buildReady` (`HF3D.mount`), canvas
  grande solo quanto la zona dell'oggetto (il render è in software: canvas piccoli = render veloci).
- **Niente rete nel render**: GSAP e three.js copiati in `assets/lib/` (da npm), font in `assets/fonts/`.
- **Zone sicure**: niente di importante sopra y=280, sotto y=1560, a destra di x=900 nella metà bassa.
- **Suono**: ogni evento visivo ha il suo effetto, tutti diversi; stesso livello per tutti, circa **7 dB sotto la
  voce**; voce con più corpo (EQ + compressione); master **−14 LUFS**, true peak −1 dBTP. Lo fa `compose.py`: non
  alzare a mano un singolo effetto oltre ±3 dB (`"gain"` nell'evento).
- **Mai statico, ma leggibile**: entrate con sfocatura di movimento, oggetti che fluttuano, luci che passano; il testo
  da leggere fermo almeno 0,6 s.

## Libertà

Struttura delle scene, uso del registry, micro-animazioni dentro le ricette, materiali dentro il design.

## Processo

1. **Tempi**: `python .claude/skills/motion-hyperframes/scripts/timeline.py edit` → `words_out.json`.
2. **Oggetti 3D** (`objects` nel piano): se manca il PNG in `editor/assets/objects/`, va generato su Google Flow con
   Nano Banana Pro col prompt del piano (fondo bianco, 2K) e messo in `editor/assets/objects/raw/`; poi
   `python .claude/skills/motion-hyperframes/scripts/cutout.py raw/x.png editor/assets/objects/x.png` e controlla il
   ritaglio su fondo scuro e chiaro.
3. **Effetti sonori**: `python .claude/skills/motion-hyperframes/scripts/sfx_library.py missing edit`. Quelli che
   mancano, gratis: varianti dei 21 suoni inclusi in media-use (`sfx_library.py variant <nome> --from <suono>
   --pitch/--trim/--reverse/--layer/--seq`) o Openverse con `/media-use`; a pagamento: `sfx_library.py generate`
   (ElevenLabs, chiedi prima). I WAV non vanno nel repo (licenza Pixabay): `sfx_library.py rebuild` li ricrea dal catalogo.
4. **Progetto**: `npx hyperframes init edit/hf --example blank --non-interactive --skip-skills`, canvas 1080×1920 30 fps,
   root trasparente (`html, body { background: transparent }`), `data-duration` = montato + hold. Una
   sotto-composizione per scena (`compositions/s01.html` …), host con `data-track-kind="graphics"`; una composizione
   `captions` (host `data-track-kind="captions"`, `z-index` più alto) generata da `words_out.json`.
   Il footage NON va dentro HyperFrames.
   In questo cloud `npx hyperframes …` vuole `NODE_USE_ENV_PROXY=1 NODE_EXTRA_CA_CERTS=/root/.ccr/ca-bundle.crt`.
5. **Controllo**: `npx hyperframes check --json` (`ok: true`, nessun errore; gli avvisi `line_unread` si accettano solo
   per colpi sincronizzati con la parola detta), poi `npx hyperframes snapshot . --at <payoff…> --no-end -o <dir>` e
   `python .claude/skills/motion-review/scripts/over.py <dir> --base edit/base.mp4`: le istantanee sopra il footage
   vero, con le zone di Instagram. Guarda le immagini.
6. **Render** con alfa: `npx hyperframes render edit/hf --format webm --quality delivery -o edit/graphics.webm`.
   Verifica con ffprobe durata e `alpha_mode=1`.
7. **Composizione**:
   `python .claude/skills/motion-hyperframes/scripts/compose.py --edit edit --base edit/base.mp4 --overlay edit/graphics.webm`
   (camera sul footage e fermo finale dal piano; `--preview` per una 720p veloce).
8. Passa `edit/final.mp4` a **motion-review**. Non consegnare all'utente prima della revisione.
