---
name: motion-review
description: Il revisore. Guarda il video renderizzato fotogramma per fotogramma, misura l'audio, annota i difetti con il tempo esatto in MOTION-REVIEW.md e li fa correggere prima di consegnare. Usare sempre dopo motion-hyperframes (o dopo qualsiasi render) e prima di mandare un video all'utente.
---

# Motion Review

Guardi il video come lo guarderà qualcuno su Instagram, non come lo ha pensato chi l'ha fatto. **Guarda i fotogrammi,
non fidarti del codice.** Se non lo pubblicheresti, non si consegna.

## Cosa ricevi

`edit/final.mp4` (o `preview.mp4`), `edit/motion-plan.json`, `edit/words_out.json`, `edit/stems/` (da `compose.py`)
e gli eventuali riferimenti dell'utente.

## Cosa consegni

`edit/MOTION-REVIEW.md` con: misure audio, tabella dei difetti `tempo esatto → difetto → correzione → stato`,
checklist spuntata. Poi le correzioni fatte (piano, HTML o composizione) e un nuovo render rivisto.

## Processo

0. Prima del render completo, sugli still con footage, camera e grafiche (istantanee di HyperFrames passate a
   `camera.py --stills`, vedi motion-hyperframes): `python .claude/skills/motion-review/scripts/stills.py edit/review/stills`
   → fogli con le zone di Instagram segnate. Costano secondi, un render minuti: correggi qui posizioni e tempi.

1. `python .claude/skills/motion-review/scripts/review.py --edit edit` → fotogrammi in `edit/review/frames/`, fogli
   di contatto `edit/review/sheet_NN.jpg` con le zone coperte da Instagram in rosso, `edit/review/audio.json`.
   Per i movimenti veloci aggiungi `--every 0.5` o estrai una sequenza ravvicinata attorno al momento
   (`ffmpeg -ss T -t 1 -i final.mp4 -vf fps=10,scale=270:-2,tile=5x2 seq.jpg`).
2. **Leggi ogni foglio** (Read) e per ogni fotogramma controlla la checklist sotto. Ingrandisci il fotogramma intero
   quando un testo è piccolo o vicino a un bordo.
3. Controlla le parole dei sottotitoli contro la trascrizione (nomi propri, numeri, parole inglesi come "editing" che
   la trascrizione può sbagliare).
4. Leggi `audio.json`: master −14 LUFS ±0,5, true peak ≤ −1; ogni effetto tra −11 e −3 dB dalla voce (obiettivo −7).
   Non puoi ascoltare: riporta i numeri, non dire "suona bene".
5. Scrivi i difetti con il **tempo esatto** e la correzione concreta; correggi; ri-renderizza; ripeti dal punto 1.
   **Massimo 3 giri**: se dopo il terzo resta qualcosa, consegna dicendo esattamente cosa resta e perché.
6. Per un video da pubblicare (lancio, promo, CTA) lancia anche un sotto-agente critico con video, piano e riferimenti:
   deve stroncare, non lodare — verdetto, problemi in ordine con tempi e prove, le 5 correzioni da fare prima.

## Regole dure (difetti che bloccano la consegna)

- Pause, esitazioni o riprese sbagliate rimaste nel montato.
- Qualcosa di importante nelle zone coperte (misurate su iPhone): sopra y=250, sotto y=1720, a meno di 70 px dai lati
  (Instagram riempie gli schermi alti tagliando ~55 px per lato), a destra di x=930 da y=1250 (icone).
- Testo sovrapposto a un altro testo o a un oggetto; grafiche sul viso (occhi, bocca).
- Sottotitoli sbagliati, coperti da una grafica o fuori sincrono di più di 2 frame.
- Animazione che arriva dopo la parola che la chiama; due elementi nuovi che entrano insieme.
- Un evento visivo senza suono, o un effetto senza evento; effetti più forti della voce.
- Il primo secondo che non ferma lo scroll (fotogramma 0 statico o vuoto).
- Font di ripiego (il serif corsivo che esce come Times o come sans).
- Ritagli degli oggetti con aloni bianchi o bordi seghettati.

## Checklist prima di pubblicare

- [ ] Nessuna pausa o ripresa sbagliata rimasta
- [ ] Nulla nelle zone coperte da Instagram
- [ ] Nessuna sovrapposizione testo/oggetto
- [ ] Sottotitoli corretti (nomi propri!)
- [ ] Ogni effetto si sente, ma la voce domina
- [ ] Primo secondo che ferma lo scroll
- [ ] Stile zane (README di movimento): nessun fotogramma statico; nessuna curva lineare né dissolvenza sul testo;
      overshoot visibile ma assestato entro 0,7 s; stili d'entrata del testo che cambiano; un solo protagonista alla
      volta; colpi sulle parole e sui beat; volto leggibile

## Quando trovi un errore che si ripete

Non correggere solo il video: aggiungi la regola alla skill giusta (motion-director, motion-design, motion-library o
motion-hyperframes), così non si ripresenta. È così che il gusto si accumula.
