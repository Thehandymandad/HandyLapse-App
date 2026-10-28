# Testo (tipografia cinetica)

Display Inter 900 (tracking −0.045em), parole chiave in Instrument Serif corsivo lime, etichette JetBrains Mono.
Il testo da leggere sta fermo ≥ 0,6 s. Tutto il resto si muove.

### testo/entrata-sfocata
- **Verbi**: (entrata di default di ogni titolo).
- **Come**: `opacity 0→1`, `y 40→0`, `filter: blur(14px)→blur(0)` in 0,35 s `power3.out`; se è una riga, sfalsa le
  parole di 0,05 s.
- **Suono**: nessuno o un soffio leggerissimo.
- **Difetti**: blur che resta a 1–2 px (testo "sporco"): l'ultimo valore deve essere 0.

### testo/slam
- **Verbi**: subito, attenzione, adesso, basta.
- **Come**: `scale 2.4 → 1` in 0,12 s `power4.in` con `opacity 0→1` nei primi 2 frame, poi `back.out(3)` 0,15 s;
  combinalo con `camera/shake-colpo`.
- **Suono**: colpo secco (cassa/pugno).
- **Difetti**: più di uno slam ogni 4 s (perde forza).

### testo/parola-chiave-serif
- **Verbi**: la parola che conta in una frase.
- **Come**: la frase entra in display bianco, la parola chiave arriva 0,1 s dopo in serif corsivo lime con
  `y 30→0` + `rotation -4→0`; sotto, una sottolineatura lime che si disegna (`scaleX 0→1`, origine sinistra, 0,25 s).
- **Suono**: tocco morbido (pluck).
- **Difetti**: più di una parola serif per riga.

### testo/parola-per-parola
- **Verbi**: costruire una frase, elencare a voce.
- **Come**: ogni parola compare sul suo timestamp (da `words_out.json`) con `entrata-sfocata` corta (0,18 s); la riga
  si ricentra solo a fine frase (non a ogni parola).
- **Suono**: nessuno (il ritmo è la voce).
- **Difetti**: testo centrato sulla parte già comparsa (scivola): centra sulla stringa intera.

### testo/maschera-dal-basso
- **Verbi**: rivelare un titolo, capitolo.
- **Come**: ogni riga dentro un contenitore `overflow: hidden`; il testo sale da `yPercent 110 → 0` in 0,45 s `expo.out`,
  righe sfalsate di 0,08 s.
- **Suono**: swish breve.
- **Difetti**: discendenti tagliati (aggiungi `padding-bottom` al contenitore).

### testo/cancellatura
- **Verbi**: sbagliato, non serve, eliminare, togliere.
- **Come**: una linea (lime o rossa per un "no") attraversa la parola in 0,2 s `power2.inOut`; la parola sotto scende
  a `opacity 0.35`; opzionale: la parola corretta arriva sopra in serif.
- **Suono**: tratto di pennarello.
- **Difetti**: linea che non copre tutta la parola.

### testo/timbro
- **Verbi**: no, bocciato, zero, mai, vietato.
- **Come**: box con bordo spesso (10–12 px) inclinato −6°; `scale 2.5→1` in 0,1 s `power4.in`, `opacity 0→1` nei
  primi 2 frame, poi micro rimbalzo; texture d'inchiostro (bordo leggermente irregolare via SVG). Più timbri: uno sotto
  l'altro, ognuno sulla sua parola.
- **Suono**: timbro di gomma che batte (diverso per ogni timbro: varia l'intonazione).
- **Difetti**: timbro in rosso usato per cose positive.

### testo/parole-che-si-fondono
- **Verbi**: unire, insieme, diventa.
- **Come**: due parole ai lati scivolano verso il centro, si sovrappongono con `mix-blend-mode` o con un morph di
  lettere (le lettere comuni restano, le altre sfumano) e diventano una terza parola.
- **Suono**: whoosh convergente + tocco.
- **Difetti**: sovrapposizione illeggibile tenuta troppo (max 0,2 s).

### testo/parola-spezzata
- **Verbi**: rompere, dividere, tagliare.
- **Come**: la parola è duplicata in due livelli con `clip-path` sopra/sotto una diagonale; il taglio arriva (linea lime)
  e le metà scivolano ±24 px.
- **Suono**: taglio.
- **Difetti**: metà disallineate prima del taglio.

### testo/tessere-che-si-girano
- **Verbi**: tre cose, segreto, rivelare uno per uno.
- **Come**: N tessere coperte ("?") in fila; ognuna si gira (`rotationY 180→0`, `transformPerspective 900`, 0,45 s
  `back.out(1.2)`) sulla parola che la nomina, cambiando faccia a metà rotazione.
- **Suono**: flip di carta, tono che sale per ogni tessera.
- **Difetti**: faccia sbagliata visibile per un frame a 90° (cambia il contenuto esattamente a 90°).

### testo/lista-che-si-spunta
- **Verbi**: elencare, passaggi, fatto uno dopo l'altro.
- **Come**: righe con quadratino; ogni riga si spunta (spunta che si disegna, quadratino che diventa lime) sulla parola
  che la nomina; le righe già fatte scendono a `opacity 0.7`.
- **Suono**: click/tick diverso per riga.
- **Difetti**: righe spuntate tutte alla fine invece che sulle parole.

### testo/ondata
- **Verbi**: energia, festa, vivo.
- **Come**: lettere divise; `y` a sinusoide sfalsata (0,04 s per lettera), ampiezza 18 px, 1 ciclo; poi ferme.
- **Suono**: nessuno.
- **Difetti**: ondata su testo lungo (illeggibile): max 2 parole.

### testo/titolo-impilato
- **Verbi**: titolo d'apertura, gancio.
- **Come**: 2–3 righe a dimensioni diverse (la parola chiave la più grande, in serif corsivo); entrano con
  `maschera-dal-basso`, poi l'insieme fa un `scale 1→1.03` lento per tutta la durata.
- **Suono**: swish + colpo sull'ultima riga.
- **Difetti**: superare le zone sicure (titolo sopra y=280).
