# Interfacce

Interfacce generiche disegnate in HTML (mai screenshot di app reali con loghi, a meno che l'utente li fornisca).
Vetro scuro o carta, raggi 36–44 px, testo ≥ 30 px.

### ui/notifica-scende
- **Verbi**: arriva, ecco, novità.
- **Come**: banner che scende dall'alto **sotto y=280** con `back.out(1.4)` 0,4 s, tiene, risale.
- **Suono**: suono di notifica breve (non quello di un'app reale).
- **Difetti**: banner sopra y=280 (coperto dall'interfaccia di Instagram).

### ui/digitazione
- **Verbi**: scrivere, chiedere, cercare.
- **Come**: campo di testo; le lettere compaiono ogni 2 frame con cursore lampeggiante (ciclo 0,5 s); la parola
  finisce sul suo timestamp nel parlato.
- **Suono**: tasti (raffica lunga quanto la digitazione).
- **Difetti**: testo centrato sulla parte già scritta (scivola): allinea a sinistra.

### ui/messaggio-inviato
- **Verbi**: mandare, inviare, rispondere.
- **Come**: dopo la digitazione il pulsante invio si preme (`scale 0.85→1`), la bolla sale nella chat con
  `back.out(1.6)`, compare "Inviato" piccolo.
- **Suono**: swoosh di invio.
- **Difetti**: bolla che compare senza venire dal campo di testo.

### ui/commento-scritto
- **Verbi**: commenta, scrivi nei commenti, CTA.
- **Come**: box commenti generico; la parola CTA si scrive da sola nel campo, si pubblica, compare la risposta
  ("Guida inviata in DM") dopo i tre puntini di digitazione.
- **Suono**: tasti → pubblica → notifica risposta (tre suoni diversi).
- **Difetti**: parola CTA diversa da quella detta.

### ui/chat-bolla
- **Verbi**: dialogo, ha risposto, conversazione.
- **Come**: bolle alternate sinistra/destra che entrano una alla volta, la precedente sale per fare spazio.
- **Suono**: pop diverso per lato.
- **Difetti**: più di 3 bolle visibili.

### ui/pulsante-premuto
- **Verbi**: fatto, clicca, conferma, via.
- **Come**: un cursore arriva (curva, non retta) sul pulsante, `scale 0.9→1` del pulsante, onda circolare lime che si
  allarga e svanisce.
- **Suono**: click.
- **Difetti**: cursore che si muove in linea retta a velocità costante.

### ui/telefono-3d
- **Verbi**: il risultato, questo video, pubblicato.
- **Come**: cornice di smartphone (bordo 26 px, isola, riflesso) allineata al rettangolo del footage rimpicciolito da
  `camera/zoom-out-schermo`; inclinazione ±6° `rotationY` che oscilla piano; cuori/reazioni che salgono a lato.
- **Suono**: whoosh + tocco.
- **Difetti**: cornice non allineata; reazioni con numeri inventati.

### ui/cursore-click
- **Verbi**: scegliere, selezionare, questo.
- **Come**: freccia del cursore che arriva con easing `power3.inOut` su una traiettoria curva, click con onda.
- **Suono**: click secco.
- **Difetti**: cursore enorme (max 64 px).

### ui/finestra-app
- **Verbi**: programma, strumento, si apre.
- **Come**: finestra con barra superiore (tre puntini) che si apre da `scale 0.85`, `opacity 0` con `back.out(1.2)`;
  contenuto che entra dopo.
- **Suono**: pop morbido.
- **Difetti**: nomi o loghi di software reali non forniti.

### ui/toggle
- **Verbi**: attivare, accendere, da così a così.
- **Come**: interruttore grande; il pallino scorre (0,25 s `power3.inOut`) e il binario passa da grigio a lime.
- **Suono**: click di interruttore.
- **Difetti**: toggle troppo piccolo (min 200 px di larghezza).
