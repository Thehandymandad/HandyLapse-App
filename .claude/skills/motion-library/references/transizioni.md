# Transizioni (tra scene grafiche)

Nei reel parlati le transizioni sono tra **scene grafiche**, non tra inquadrature (quelle sono i tagli di video-use,
eventualmente con `camera/whip`). Durata 0,25–0,45 s. La scena che esce e quella che entra si sovrappongono: mai un
fotogramma vuoto in mezzo, a meno che sia voluto.

### transizioni/morph-card
- **Verbi**: diventa, si trasforma, il passo dopo.
- **Come**: la card della scena A cambia dimensione e contenuto fino a diventare la card della scena B (stessa
  posizione di ancoraggio); il contenuto vecchio sfuma in 0,15 s, la forma si adatta in 0,35 s `power3.inOut`, il nuovo
  contenuto entra negli ultimi 0,2 s.
- **Suono**: swish morbido.
- **Difetti**: contenuti vecchio e nuovo visibili insieme a piena opacità.

### transizioni/wipe-accento
- **Verbi**: nuovo capitolo, "e poi".
- **Come**: una banda d'accento diagonale attraversa lo schermo in 0,35 s `power3.inOut` e lascia dietro la nuova scena
  (maschera che segue la banda).
- **Suono**: whoosh con coda.
- **Difetti**: banda che copre il viso per più di 4 frame.

### transizioni/maschera-cerchio
- **Verbi**: rivelare, zoom dentro, scoprire.
- **Come**: `clip-path: circle(0% at X Y) → circle(150%)` dal punto d'interesse in 0,45 s `expo.out`.
- **Suono**: swoosh che si apre.
- **Difetti**: centro del cerchio che non coincide con l'oggetto che lo ha "aperto".

### transizioni/split
- **Verbi**: dividere, confrontare, prima/dopo.
- **Come**: lo schermo si apre in due metà (o il riquadro grafico si divide) che scorrono in direzioni opposte e
  lasciano spazio al confronto.
- **Suono**: due swish sfalsati.
- **Difetti**: metà disuguali senza motivo.

### transizioni/push-scena
- **Verbi**: avanti, prossimo.
- **Come**: la scena A esce a sinistra (`xPercent -100`) mentre B entra da destra, 0,4 s `power3.inOut`, con 8 px di
  motion blur orizzontale durante il movimento.
- **Suono**: whoosh direzionale.
- **Difetti**: push su ogni cambio (usalo al massimo 2 volte per video).

### transizioni/flash
- **Verbi**: shock, colpo, rivelazione improvvisa.
- **Come**: bianco a tutto schermo `opacity 0 → 0.85 → 0` in 0,2 s (picco al secondo frame).
- **Suono**: hit + coda riverberata.
- **Difetti**: più di un flash per video; flash su footage già sovraesposto.

### transizioni/zoom-attraverso
- **Verbi**: entrare dentro, approfondire.
- **Come**: la camera della scena "entra" in un elemento (`scale 1 → 8` `expo.in` 0,35 s) e dall'interno compare la
  scena nuova (`scale 0.6 → 1` `expo.out`).
- **Suono**: whoosh crescente + arrivo.
- **Difetti**: elemento sgranato a scala 8 (usa SVG o testo, non PNG piccoli).

### transizioni/slice
- **Verbi**: tagliare, montare, editing.
- **Come**: la scena viene tagliata in 5 strisce orizzontali che escono alternate a sinistra/destra, sfalsate di 0,03 s.
- **Suono**: raffica di tagli.
- **Difetti**: strisce che lasciano buchi di fondo nero visibili troppo a lungo.

### transizioni/match-cut
- **Verbi**: (continuità: stessa forma in due scene).
- **Come**: un elemento della scena A (cerchio, card, oggetto) ha la stessa posizione e forma di uno della scena B:
  taglio secco, l'occhio lo segue.
- **Suono**: nessuno o un tocco.
- **Difetti**: forme non allineate al pixel.

### transizioni/iris-chiusura
- **Verbi**: fine, chiudere, call to action finale.
- **Come**: `clip-path: circle()` che si chiude sull'elemento finale (il bottone della CTA), poi tiene 0,5 s.
- **Suono**: chiusura morbida.
- **Difetti**: chiudere sul vuoto invece che sull'elemento.
