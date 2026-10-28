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
- `edit/graphics.webm`: tutte le grafiche, trasparenti, 1080×1920, 30 fps, durata = montato.
- `edit/captions.webm`: i sottotitoli, trasparenti (ultimo livello).
- `edit/final.mp4`: il video composto (`scripts/compose.py`), poi da passare a motion-review.

## Regole dure

- **Timeline = timeline di uscita.** Ogni `data-start` viene dal piano; il colpo di ogni ricetta cade sul `payoff.t`.
  La durata del root è quella di `base.mp4` (ffprobe), mai di più.
- **Root trasparente.** Niente fondo sulla composizione delle grafiche: sotto c'è la persona che parla.
- **Contratto HyperFrames**: `class="clip"` + `data-start` + `data-duration` su ogni elemento a tempo, una timeline in
  pausa per composizione registrata in `window.__timelines`, `fromTo` nelle scene, niente `Math.random()` non seminato,
  niente `repeat: -1`, niente transform CSS su elementi animati da GSAP. `npx hyperframes check --json` senza errori.
- **Font verificati**: Instrument Serif con `@font-face` da `assets/fonts/` (copiato da `editor/assets/fonts/`), e prima
  della timeline un controllo `document.fonts.check('italic 400 80px "Instrument Serif"')` che lancia errore se manca.
- **Sottotitoli per ultimi** e sempre leggibili: composizione separata `captions`, renderizzata a parte e sovrapposta
  per ultima in `compose.py`. Testo corretto (nomi propri verificati sulla trascrizione).
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
3. **Effetti sonori**: `python .claude/skills/motion-hyperframes/scripts/sfx_library.py missing edit`; quelli che
   mancano si generano con `sfx_library.py generate <nome> "<prompt>"` (costano crediti ElevenLabs: chiedi prima di
   generarne molti) o si prendono con `/media-use`.
4. **Progetto**: `npx hyperframes init edit/hf --example blank --non-interactive --skip-skills`, canvas 1080×1920 30 fps,
   `data-duration` = durata di `base.mp4`. Una sotto-composizione per scena (`compositions/s01.html` …), host con
   `data-track-kind="graphics"`; una composizione `captions` (host `data-track-kind="captions"`) generata da
   `words_out.json` (gruppi di 2–3 parole, cambio sulle pause, parole chiave del piano in serif corsivo lime).
   Il footage NON va dentro HyperFrames: per vedere le grafiche sopra il parlato nell'anteprima usa un fotogramma di
   `base.mp4` come sfondo con `data-hidden` in render.
5. **Controllo**: `npx hyperframes check --json`, poi `npx hyperframes snapshot` ai payoff delle scene e guarda le
   immagini.
6. **Render** con alfa: `npx hyperframes render edit/hf --format webm -o edit/graphics.webm` (composizione delle
   grafiche) e lo stesso per i sottotitoli (`edit/captions.webm`). Verifica con ffprobe durata e `alpha_mode`.
7. **Composizione**:
   `python .claude/skills/motion-hyperframes/scripts/compose.py --edit edit --base edit/base.mp4 --overlay edit/graphics.webm --overlay edit/captions.webm`
   (la camera sul footage viene da `camera` nel piano; `--preview` per una 720p veloce).
8. Passa `edit/final.mp4` a **motion-review**. Non consegnare all'utente prima della revisione.
