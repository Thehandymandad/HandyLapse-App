# Reel Studio — istruzioni per Claude Code

Qui si montano i reel dell'utente. **Il regista sei tu (Claude Code)**: decidi tagli, hook, grafiche e copi lo stile
dalle reference guardando i fotogrammi. Non si usano Gemini né altre AI esterne. Gli strumenti sono:

- **Remotion** (`src/`) per comporre e renderizzare il video (React → MP4 1080×1920 30 fps)
- **ffmpeg** (`scripts/`) per normalizzare il video, trovare le pause, analizzare le reference, sintetizzare gli effetti sonori e fare il loudnorm finale
- **whisper.cpp** in locale (`@remotion/install-whisper-cpp`) per la trascrizione parola per parola
- **SVG scritto a mano** (`src/icons/index.tsx`) per le icone e **three.js** (`src/three/objects.tsx`, via `@remotion/three`) per gli oggetti 3D

Rispondi all'utente in italiano.

## Flusso: "montami questo video"

1. `npm run ingest -- <video> --name <nome> --style <stile>` → crea `projects/<nome>/edit.json` + `transcript.txt`
   (video normalizzato in `public/projects/<nome>/source.mp4`, pause trovate con silencedetect, trascrizione whisper, piano automatico).
   Se whisper non è disponibile: scrivi tu il testo detto nel video in un file e passa `--text testo.txt`.
2. **Leggi `projects/<nome>/transcript.txt`** e rifinisci `edit.json` a mano, da montatore vero:
   - `hook`: titolo forte per i primi 2–3 s (max ~6 parole, maiuscolo), con `icon` se aiuta.
   - `cuts`: togli intercalari (`filler`), frasi ripetute o rifatte (`retake`: tieni l'ultima versione buona), divagazioni (`off-topic`). Tempi in secondi del sorgente, presi dalla trascrizione.
   - `emphasis`: indici delle parole chiave da colorare (numeri, verbi forti, parole del messaggio), circa una ogni 2–3 s.
   - `zooms`: `punch` sulle frasi d'impatto, `smooth` sui momenti narrativi; ogni 3–5 s secondo lo stile.
   - `graphics`: una ogni ~`motion.density` secondi, mai sopra l'hook. Tipi:
     `keyword` (card con testo + icona), `stat` (numero che conta: "100€", "3X", "50%"), `list` (passaggi/consigli),
     `icon` (icona grande che si disegna + etichetta), `object3d` (oggetto three.js: coin, star, heart, house, gem, bolt, arrow, gift),
     `arrow` (freccia disegnata che indica un punto: `x`, `y`, `angle`), `cta`.
     `at` = inizio della parola a cui si aggancia. `duration` 1,5–2,5 s.
   - `cta`: chiusura ("SEGUIMI PER ALTRI TRUCCHI").
   - `music`: `{ "file": "music/traccia.mp3", "volume": 0.12 }` con il file in `public/music/`.
3. Controlla il risultato **guardando i fotogrammi**: `npm run render -- <nome> --still 0,45,120,300` → `out/stills/<nome>/*.png`
   (leggili con Read). Sistema quello che non va (testi troppo lunghi, grafiche sovrapposte, zoom sul punto sbagliato → `zoom.focusY`).
4. `npm run render -- <nome>` → `out/<nome>.mp4` (render Remotion + loudnorm ffmpeg). Mandalo all'utente.

## Flusso: "copia lo stile di questa reference"

1. `npm run reference -- <reel> --name <stile>` → `references/<stile>/` con `report.md`, `stats.json`,
   `sheets/sheet-XX.jpg` (fogli provino, 2 fotogrammi al secondo), `sheets/burst.jpg` (15 fps: animazione dei sottotitoli),
   `cuts/` (fotogramma dopo ogni taglio), `frames/`.
2. **Guarda tu le immagini** (Read su fogli provino, burst e tagli) e ricava tutto quello che dice la checklist del report:
   font (il più simile tra quelli in `src/lib/fonts.ts`; se nessuno va bene, installa il pacchetto `@fontsource/<font>` e aggiungilo lì),
   dimensioni (i fotogrammi sono 540 px di larghezza → ×2 per i px su 1080), colori esatti, contorno, ombra, parola attiva,
   parole per volta, posizione, animazione, ritmo dei tagli, zoom, tipo di grafiche e colori, color grading, effetti sonori.
3. Scrivi `src/styles/references/<stile>.ts` con `defineStyle("<stile>", "Nome", "descrizione", { ... })` ed esportalo da
   `src/styles/references/index.ts`. Usa `stats.json` per il ritmo (`cutsPerMinute` → `zoom.every`, pause rimaste → `cuts.minSilence`).
4. Se la reference ha grafiche che non esistono ancora (un tipo di card, un'icona, un oggetto 3D, una transizione),
   **creale**: nuove icone SVG in `src/icons/index.tsx` (griglia 24×24, solo tracciati), nuovi oggetti in `src/three/objects.tsx`
   (geometrie three.js da codice, niente modelli scaricati), nuovi componenti in `src/components/Graphics.tsx`
   (registrali in `RENDERERS` e aggiungi il tipo a `GraphicType` in `src/types.ts`). Nuovi effetti sonori: aggiungili in `scripts/sfx.ts` (sintesi ffmpeg) e in `SfxName`.
5. Verifica: applica lo stile a un progetto (`"styleId": "<stile>"` in edit.json), renderizza degli still e confrontali
   con i fotogrammi della reference, finché non sono uguali.

## Note tecniche

- Tempi in `edit.json` = secondi del video **sorgente**; `src/lib/timeline.ts` li converte in frame di output dopo i tagli.
- `styleOverrides` in `edit.json` permette ritocchi a un solo progetto senza toccare lo stile.
- `npm run studio` apre Remotion Studio con un'anteprima per ogni progetto (`reel-<nome>`) e la composizione `Gallery` (tutte le icone e gli oggetti 3D).
- Render senza GPU: three.js usa `swangle`. Se Remotion non riesce a scaricare il suo Chromium, imposta
  `REMOTION_BROWSER_EXECUTABLE` (in questo cloud: `/opt/pw-browsers/chromium_headless_shell-1243/chrome-headless-shell-linux64/chrome-headless-shell`).
- whisper.cpp viene compilato in `whisper.cpp/` al primo uso e scarica il modello da HuggingFace (`--model small` di default; `base` è più veloce, `medium` più preciso).
- I video (`public/projects/`, `out/`) non vanno nel repo; i file `edit.json`, gli stili e i componenti sì.
- Licenza Remotion: gratuita per singoli e aziende fino a 3 persone (remotion.dev/license).
