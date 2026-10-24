# Reel Editor AI (`/reel`)

Monta un reel verticale da zero partendo dal girato grezzo:

1. **Taglio delle pause** – l'audio viene analizzato nel browser (volume ogni 10 ms), le pause più lunghe della soglia vengono tolte lasciando un piccolo margine. Soglia automatica o manuale.
2. **Trascrizione parola per parola** – l'audio viene diviso in blocchi da ~30 s (tagliati nelle pause) e trascritto da Gemini (`/api/reel/transcribe`). Senza chiave AI si può incollare il testo a mano.
3. **Piano di montaggio AI** (`/api/reel/plan`) – titolo hook, parole chiave, zoom (punch/lenti), motion graphics (card, numeri, liste, emoji) e tagli suggeriti (ehm, frasi rifatte). Se l'AI non risponde c'è un piano automatico locale.
4. **Editor** – anteprima live 9:16, testo cliccabile per tagliare/correggere/evidenziare parole, stile completamente modificabile, musica con ducking, effetti sonori sintetizzati (whoosh/pop).
5. **Export** – MP4 1080×1920 30 fps renderizzato nel browser con WebCodecs (`mediabunny`). Sui browser senza WebCodecs c'è il fallback in tempo reale con MediaRecorder.

Il video **non viene mai caricato sul server**: all'API va solo l'audio a blocchi (WAV 16 kHz, < 1 MB per richiesta, sotto il limite di Vercel).

## Copiare lo stile da una reference

Scheda **Stile → Carica reference e analizza**: il browser estrae 22 fotogrammi (sparsi + una raffica a 0,1 s per vedere le animazioni dei sottotitoli) e misura il ritmo dei tagli; Gemini (`/api/reel/analyze-style`) restituisce uno stile completo (font, colori, contorno, parola attiva, parole per volta, posizione, animazione, zoom, grafiche, color grading, effetti). Lo stile viene salvato nel browser e si può esportare/importare in JSON.

Per uno stile "fatto a mano" fedele a una reference specifica si aggiunge un preset in `src/lib/reel/presets.ts` (array `PRESETS`).

## File principali

- `src/lib/reel/types.ts` – `ReelStyle` (tutto ciò che definisce uno stile), piano, timeline
- `src/lib/reel/presets.ts` – preset + validazione di qualsiasi stile (`normalizeStyle`)
- `src/lib/reel/audio.ts` – decodifica, rilevamento pause, WAV
- `src/lib/reel/timeline.ts` – tagli → tempi di output, raggruppamento sottotitoli, zoom e grafiche
- `src/lib/reel/renderer.ts` – disegno su canvas di ogni frame (usato da anteprima ed export)
- `src/lib/reel/mix.ts` – mix audio finale (voce tagliata con micro-dissolvenze, effetti, musica)
- `src/lib/reel/export.ts` – export MP4
- `src/lib/reel/gemini.ts` – prompt e chiamate Gemini
- `src/components/reel/*` – interfaccia

## Variabili d'ambiente

Usa `GOOGLE_GENAI_API_KEY` (o `GEMINI_API_KEY`), già richiesta dal resto dell'app. Modelli opzionali: `REEL_TRANSCRIBE_MODEL`, `REEL_PLAN_MODEL`, `REEL_STYLE_MODEL`.

## Compatibilità

- Chrome / Edge desktop e Android: export veloce H.264 + AAC.
- Safari (Mac/iPhone): anteprima ok; l'export usa WebCodecs dove disponibile, altrimenti registra in tempo reale.
- I `.mov` HEVC dell'iPhone si aprono in Safari e nei Chrome con supporto HEVC hardware; in caso contrario esportali in H.264.
