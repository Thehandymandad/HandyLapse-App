# Reel Studio (Remotion)

Monta un reel da zero a partire dal girato grezzo: taglio delle pause e degli "ehm", sottotitoli animati parola per parola,
zoom, motion graphics (card, numeri che contano, liste, icone che si disegnano, oggetti 3D three.js, frecce, CTA),
effetti sonori e color grading — con lo stile copiato da una reference.

Il "cervello" è **Claude Code**: legge la trascrizione, decide il montaggio, guarda i fotogrammi delle reference e scrive
lo stile e le grafiche in codice. Nessuna AI esterna. Istruzioni complete per Claude in [CLAUDE.md](CLAUDE.md).

## Uso veloce

```bash
cd reel-studio
npm install

# tutto in automatico: ingest + piano automatico + render → out/<nome>.mp4
npm run make -- ~/Desktop/girato.mov --style hormozi

# oppure passo per passo
npm run ingest -- ~/Desktop/girato.mov --name trapano     # → projects/trapano/edit.json + transcript.txt
npm run render -- trapano --still 0,60,200               # fotogrammi di controllo in out/stills/
npm run render -- trapano                                # → out/trapano.mp4

# copiare lo stile di un reel
npm run reference -- ~/Desktop/reference.mp4 --name mio-stile   # → references/mio-stile/ (poi Claude scrive lo stile)

npm run matte -- trapano                                 # ritaglia la persona (grafiche dietro di te, sparizione)
npm run compare -- trapano --ref mio-stile --at 1,3,5    # reference e render affiancati

npm run studio    # anteprima interattiva (Remotion Studio)
```

Con Claude Code basta dire: *"montami ~/Desktop/girato.mov con lo stile della reference ~/Desktop/ref.mp4"*.

## Requisiti

- Node 18+ e ffmpeg nel PATH
- Per la trascrizione: `export ELEVENLABS_API_KEY=...` (ElevenLabs Scribe, consigliato). Senza chiave si usa whisper.cpp
  in locale: servono `git`, `make`, un compilatore C++ e la connessione per scaricare il modello
- Remotion scarica da solo il suo Chromium al primo render
- Per ritagliare la persona (grafiche dietro di te, effetto sparizione): Python 3 con `pip install ai-edge-litert numpy`

## Stili inclusi

`hormozi`, `cartoon`, `minimal`, `podcast`, `handylapse` (in `src/styles/presets.ts`). Gli stili copiati dalle reference
finiscono in `src/styles/references/`: il primo è `claude-reel`.
