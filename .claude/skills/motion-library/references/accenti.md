# Accenti (linee, segni, luci, particelle)

Piccoli gesti che sottolineano. Sempre in lime o bianco, tratto 8–12 px con estremità arrotondate.

### accenti/spunta-disegnata
- **Verbi**: sì, fatto, giusto, risolto.
- **Come**: path SVG con `strokeDasharray`/`strokeDashoffset` da 1 a 0 in 0,25 s `power2.out` (usa `pathLength="1"`);
  piccolo `scale 1.15→1` alla fine.
- **Suono**: tick brillante.
- **Difetti**: spunta disegnata al contrario (parte dal lato lungo).

### accenti/croce-disegnata
- **Verbi**: no, sbagliato, mai.
- **Come**: due tratti, il secondo parte quando il primo è a metà; rossa solo per un "no" esplicito, altrimenti bianca.
- **Suono**: due tratti di pennarello.
- **Difetti**: tratti simultanei.

### accenti/cerchiatura
- **Verbi**: guarda, questo, ecco il punto.
- **Come**: ellisse a mano libera (path non perfetto, si chiude oltre l'inizio) disegnata in 0,4 s intorno al punto.
- **Suono**: tratto di pennarello lungo.
- **Difetti**: ellisse geometrica perfetta (sembra un bottone).

### accenti/freccia-disegnata
- **Verbi**: là, guarda giù, da qui a lì.
- **Come**: corpo curvo che si disegna, poi la punta compare con un pop; punta sempre verso l'oggetto, mai verso il vuoto.
- **Suono**: tratto + pop.
- **Difetti**: freccia che punta il viso dall'alto (coperta dall'interfaccia).

### accenti/linea-che-collega
- **Verbi**: unire, collegare, insieme, sistema.
- **Come**: linea lime spessa che si disegna tra due o più elementi; poi 2–3 impulsi (cerchi bianchi) la percorrono in
  loop finito; gli elementi collegati si illuminano.
- **Suono**: riser elettrico + tocco a ogni nodo.
- **Difetti**: linea che passa sopra il testo degli elementi.

### accenti/aeroplanino-scia
- **Verbi**: inviare, mandare, partire.
- **Come**: aeroplanino di carta su curva di Bézier (dal basso a sinistra a fuori in alto a destra) in 0,8 s
  `power2.inOut`, ruotato lungo la tangente; scia lime tratteggiata che si disegna dietro; chip "INVIATO" che compare.
- **Suono**: swoosh di carta.
- **Difetti**: aeroplanino che vola all'indietro (orientamento sbagliato rispetto alla tangente).

### accenti/linee-di-velocita
- **Verbi**: veloce, subito, in un attimo.
- **Come**: 8–14 linee orizzontali sottili che attraversano lo schermo a velocità diverse (seminate) per 0,3 s.
- **Suono**: whoosh rapido.
- **Difetti**: linee sopra il viso troppo a lungo.

### accenti/burst-lime
- **Verbi**: fatto!, boom, successo.
- **Come**: 8–12 tratti radiali corti che partono dal centro dell'evento (`scaleX 0→1→0`, 0,35 s) + cerchio che si
  allarga e svanisce.
- **Suono**: pop brillante.
- **Difetti**: burst su ogni evento.

### accenti/luce-che-passa
- **Verbi**: nuovo, premium, rivelare, brillare.
- **Come**: banda bianca al 12–18% inclinata 110° che attraversa card o oggetto in 0,6 s `power2.inOut`, dentro un
  contenitore `overflow: hidden`.
- **Suono**: scintillio leggero (opzionale).
- **Difetti**: banda troppo opaca (sembra un bug).

### accenti/bollino-timbro
- **Verbi**: gratis, nuovo, offerta.
- **Come**: cerchio con testo (Inter 900) che sbatte da `scale 2.2→1` in 0,1 s `power4.in`, inclinato 12°, bordo
  tratteggiato.
- **Suono**: timbro.
- **Difetti**: bollino che copre il titolo dell'oggetto.

### accenti/scintille
- **Verbi**: magia, perfetto, pulito.
- **Come**: 3–5 stelline a quattro punte che compaiono e scompaiono sfalsate (`scale 0→1→0`, 0,5 s) intorno all'oggetto,
  posizioni seminate.
- **Suono**: campanellini leggerissimi.
- **Difetti**: scintille ovunque per tutta la scena.
