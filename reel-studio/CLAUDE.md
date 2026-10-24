# Reel Studio — istruzioni per Claude Code

Qui si montano i reel dell'utente. **Il regista sei tu (Claude Code)**: decidi tagli, hook, grafiche e copi lo stile
dalle reference guardando i fotogrammi. Non si usano Gemini né altre AI esterne. Gli strumenti sono:

- **Remotion** (`src/`) per comporre e renderizzare il video (React → MP4 1080×1920 30 fps)
- **ffmpeg** (`scripts/`) per normalizzare il video, trovare le pause, analizzare le reference, sintetizzare gli effetti sonori e fare il loudnorm finale
- **ElevenLabs Speech-to-Text (Scribe)** per la trascrizione parola per parola (chiave in `ELEVENLABS_API_KEY`);
  senza chiave si usa **whisper.cpp** in locale (`@remotion/install-whisper-cpp`)
- **SVG scritto a mano** (`src/icons/index.tsx`) per le icone e **three.js** (`src/three/objects.tsx`, via `@remotion/three`) per gli oggetti 3D

Rispondi all'utente in italiano.

## Flusso: "montami questo video"

Trascrizione di un progetto già importato (senza toccare tagli e grafiche): `npm run transcribe -- <nome>`.

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

Regola: **dalla reference si copia tutto** — font, colori, dimensioni, animazioni dei sottotitoli, movimenti di camera
(anche 3D), transizioni, ogni motion graphic, effetti sonori, colore. Gli stili e i componenti di base sono solo un punto
di partenza: se qualcosa nella reference è diverso, si scrive codice nuovo finché il risultato non è uguale.

1. `npm run reference -- <reel> --name <stile> [--whisper]` → `references/<stile>/`:
   - `sheets/motion-XX.jpg`: **tutto il video a 10 fps** (6×5 = 3 s per foglio, si legge riga per riga): è la fonte principale per animazioni, camera e transizioni
   - `frames/f-NNNN.jpg`: fotogramma al secondo N/10 a 540 px, per misurare font, spessori e colori esatti
   - `cuts/`: fotogramma prima/dopo ogni taglio → tipo di transizione
   - `camera.json`: zoom e spostamento stimati per inquadratura + curva a 10 campioni/s (stima 2D: le rotazioni 3D si vedono nei fogli)
   - `colors.json` (dominanti e accesi), `audio.json` (loudness, pause, picchi = effetti sonori, se cadono sui tagli), `stats.json`, `report.md`
2. **Guarda tu le immagini** (Read) seguendo la checklist del report. Per ogni elemento annota: aspetto, entrata, permanenza, uscita, durata in frame, posizione.
3. Crea lo style pack: copia `src/styles/references/_modello/` in `src/styles/references/<stile>/` e registralo in
   `src/styles/references/index.ts` (`export { pack as <stile> } from "./<stile>";`). Un pack contiene:
   - `style` (`defineStyle`): tutti i parametri misurati (font da `src/lib/fonts.ts`, se manca installa `@fontsource/<font>` e aggiungilo in `src/load-fonts.ts` e `FONTS`)
   - `camera(ctx, base)`: movimenti di camera su misura (push-in, pan, orbite e rotazioni 3D con `rotateX/rotateY`, shake, curve di `camera.json`), transizioni (whip, zoom blur, glitch, flash, rotazione 3D o nuove: `blur`, `flash`, `glitch`, trasformazioni)
   - `Captions`: componente sottotitoli su misura quando l'animazione non è identica a una di quelle base
   - `Hook`, `Cta`: titolo iniziale e chiusura su misura
   - `graphics`: grafiche su misura (stesso nome di una base = la sostituisce; nome nuovo = nuovo `type` in edit.json). Usa i mattoni di `src/components/Graphics.tsx` (`useInOut`, `Positioned`, `IconBadge`, `cardText`), le icone SVG di `src/icons/` (aggiungine di nuove, griglia 24×24) e gli oggetti three.js di `src/three/objects.tsx` (aggiungine di nuovi con geometrie da codice, `ThreeCanvas` di `@remotion/three`, anche con camera 3D animata)
   - `Overlay`/`Underlay`: grana, light leak, cornici, sfondi
   - `plan`: piano automatico dello stile (quali grafiche mettere in automatico), così l'ingest non aggiunge grafiche che la reference non ha
   - effetti sonori nuovi: sintesi ffmpeg in `scripts/sfx.ts` (poi `npm run sfx`)
4. Verifica: monta un progetto con `"styleId": "<stile>"` e confronta: `npm run compare -- <progetto> --ref <stile> --at 0.5,2,4`
   → `out/compare/<progetto>/*.png` (reference a sinistra, render a destra). Controlla anche il movimento con più still ravvicinati
   (`npm run render -- <progetto> --still 30,32,34,36,38`). Ripeti finché non è uguale.

## Persona ritagliata: grafiche dietro la persona e "sparizione"

- `npm run matte -- <progetto>` ritaglia la persona in locale (modello MediaPipe selfie multiclass eseguito con LiteRT,
  `pip install ai-edge-litert numpy`; il modello si scarica in `models/` al primo uso) → `public/projects/<nome>/person.webm`
  (VP9 con alpha) e `source.matte` in edit.json. Ricostruisce anche uno sfondo senza persona (`source.plate`):
  meglio passare un'inquadratura vuota vera (`--plate foto.jpg` o `--plate-at <secondi>`), oppure limitare la
  ricostruzione alla stessa inquadratura (`--plate-window 10-14`).
- Grafica con `"behind": true` → disegnata tra il video e la persona (es. carosello 3D che gira dietro la testa).
- Grafica `{"type": "vanish", "at": …, "duration": …}` → la persona sparisce con un glitch (resta un "fantasma",
  `props.ghost`) sopra lo sfondo vuoto e ricompare con un lampo orizzontale.

## Stili copiati finora

- `claude-reel` (reference "Claude ha montato il 100% di questo video", analisi in `references/ref1/` in locale):
  sottotitoli a una parola, badge fisso, grafiche `badge`, `timeline` (props: title, time, exitFrames), `chat` (text = prompt,
  props: morph, sendAt), `logo3d` (x, y), `vanish`, `carousel3d` (behind: true, props.images = copertine dei reel in public/,
  radius, speed), `guide` (props: tag, title, subtitle, cta). Testi con markup `[c]corallo[/c] [y]giallo[/y] [b]evidenziato[/b]`.
  Il piano automatico mette solo badge e guida finale: le altre grafiche vanno messe dove il parlato le chiama
  (es. "timeline" quando si parla di montaggio, "chat" quando si dice cosa si è chiesto a Claude).
  Per replicarla del tutto servono dall'utente: le copertine dei suoi reel (carosello), qualche secondo di inquadratura
  vuota (sparizione), e l'inquadratura della mano aperta per il logo 3D.

## Note tecniche

- Tempi in `edit.json` = secondi del video **sorgente**; `src/lib/timeline.ts` li converte in frame di output dopo i tagli.
- `styleOverrides` in `edit.json` permette ritocchi a un solo progetto senza toccare lo stile.
- La camera di base (`src/lib/camera.ts`) combina zoom, alternanza sui tagli, push-in per inquadratura, oscillazione, inclinazione 3D, shake e transizioni (`style.camera`); il video sta dentro una prospettiva CSS, quindi `rotateX/rotateY` danno movimenti 3D veri.
- Negli script Node non importare CSS: i font si caricano solo da `src/load-fonts.ts` (entry Remotion).
- `npm run studio` apre Remotion Studio con un'anteprima per ogni progetto (`reel-<nome>`) e la composizione `Gallery` (tutte le icone e gli oggetti 3D).
- Render senza GPU: three.js usa `swangle`. Se Remotion non riesce a scaricare il suo Chromium, imposta
  `REMOTION_BROWSER_EXECUTABLE` (in questo cloud: `/opt/pw-browsers/chromium_headless_shell-1243/chrome-headless-shell-linux64/chrome-headless-shell`).
- whisper.cpp viene compilato in `whisper.cpp/` al primo uso e scarica il modello da HuggingFace (`--model small` di default; `base` è più veloce, `medium` più preciso).
- I video (`public/projects/`, `out/`) non vanno nel repo; i file `edit.json`, gli stili e i componenti sì.
- Licenza Remotion: gratuita per singoli e aziende fino a 3 persone (remotion.dev/license).
