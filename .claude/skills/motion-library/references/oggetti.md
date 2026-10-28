# Oggetti (PNG 3D scontornati)

Gli oggetti sono render foto-realistici (Nano Banana Pro su Google Flow, fondo bianco) scontornati in PNG con
`motion-hyperframes/scripts/cutout.py`. Ogni oggetto ha sempre: un wrapper che si muove, l'immagine dentro, un'ombra di
contatto (ellisse nera sfocata, `blur(18px)`, opacità 0.35–0.5) che segue il wrapper sull'asse X e si stringe quando
l'oggetto si alza. La "rotazione 3D" di un PNG si finge: `rotationY` ±25° con `transformPerspective: 900`, più un leggero
`scaleX` e un riflesso che scorre.

### oggetto/caduta-rimbalzo
- **Verbi**: arrivare, ecco, presentare, atterrare.
- **Come**: `y: -1300 → 0` in 0,38 s `power2.in`; all'impatto `scaleY 0.84 / scaleX 1.1` per 0,07 s, poi
  `back.out(2.2)` 0,3 s; ombra `scale 0.2→1`, `opacity 0→0.45` negli stessi 0,38 s. Leggera rotazione `-8°→0`.
- **Suono**: impatto del materiale dell'oggetto (legno, metallo, plastica, carta) — mai un boom generico.
- **Difetti**: impatto dopo la parola; ombra che non c'è (l'oggetto galleggia); più di due rimbalzi.

### oggetto/fluttuazione
- **Verbi**: (stato di riposo di ogni oggetto in scena).
- **Come**: `y ±8 px` e `rotation ±2°` sinusoidali, ciclo 2,4 s, `sine.inOut`, `yoyo`, `repeat` calcolato dalla
  durata della scena. Ombra in controfase (più piccola quando l'oggetto sale).
- **Suono**: nessuno.
- **Difetti**: fluttuare il testo che va letto; cicli diversi tra oggetti vicini che "ballano" fuori tempo (sfalsali di ¼).

### oggetto/rotazione-turntable
- **Verbi**: mostrare, guardare da vicino, prodotto.
- **Come**: `rotationY -25° → 25°` in 2–3 s `sine.inOut` con `transformPerspective: 900`; riflesso bianco 12% che
  scorre in senso opposto; ombra che si allarga al centro.
- **Suono**: fruscio leggero (opzionale).
- **Difetti**: oltre ±35° il PNG si "appiattisce" e si vede che è un'immagine.

### oggetto/chiusura-scatto
- **Verbi**: chiudere, fatto, ciak, deciso.
- **Come**: per oggetti a due parti (ciak, libro, scatola) due PNG o due metà: la parte mobile ruota `-35° → 0` in
  0,14 s `power4.in` sul colpo, poi micro-rimbalzo `back.out(3)` 0,12 s; flash bianco 8% di 2 frame.
- **Suono**: scatto secco del materiale.
- **Difetti**: il perno sbagliato (`transformOrigin` al centro invece che sulla cerniera).

### oggetto/dissolvenza-polvere
- **Verbi**: perdere, sprecare, svanire, sparire.
- **Come**: l'oggetto si sgretola: 30–60 frammenti (copie ritagliate a `clip-path` o particelle colorate col colore
  medio dell'oggetto) che derivano verso destra/alto con velocità seminata, `opacity → 0` in 0,9 s; l'oggetto originale
  sfuma in 0,3 s mentre i frammenti partono.
- **Suono**: sabbia/fruscio che si allontana.
- **Difetti**: frammenti tutti uguali o simmetrici; random non seminato (render diversi).

### oggetto/clessidra-svuota
- **Verbi**: tempo che passa, aspettare, perdere ore.
- **Come**: clessidra 3D; sopra una maschera che scende (sabbia che cala) e sotto una che sale, durata = frase; a metà
  frase la clessidra si ribalta (`rotation 0→180` 0,4 s `back.inOut`).
- **Suono**: ticchettio accelerato o sabbia continua.
- **Difetti**: sabbia che scende al contrario dopo il ribaltamento.

### oggetto/incastro
- **Verbi**: unire, collegare, insieme, funziona.
- **Come**: due pezzi (puzzle, mattoncini) entrano dai lati opposti, si fermano a 40 px, pausa 0,15 s, poi si
  incastrano in 0,12 s `power4.in`; impatto `scale 1.06→1`, burst lime dal punto di contatto.
- **Suono**: click di plastica pieno.
- **Difetti**: incastro senza la pausa prima (manca la tensione).

### oggetto/taglio-netto
- **Verbi**: tagliare, eliminare, separare.
- **Come**: l'oggetto è diviso da un `clip-path` lungo una diagonale; una lama/linea lime attraversa in 0,12 s; le due
  metà scivolano ±40 px e ruotano ±6° in 0,35 s `power3.out`.
- **Suono**: taglio metallico (swish + tick).
- **Difetti**: linea di taglio che non coincide con la separazione.

### oggetto/crescita-scala
- **Verbi**: crescere, diventare grande, scalare.
- **Come**: `scale 0.3 → 1.15 → 1` in 0,6 s con `back.out(1.4)`; l'ombra cresce insieme; in sottofondo linee radiali.
- **Suono**: riser corto che culmina sull'arrivo.
- **Difetti**: crescere oltre la zona sicura.

### oggetto/scatola-si-apre
- **Verbi**: rivelare, regalo, scoprire, dentro c'è.
- **Come**: scatola chiusa trema (±3° per 0,4 s, 3 scatti), coperchio salta `y -220` e ruota 25° `power3.out`, da dentro
  luce lime (cono, gradiente) e l'oggetto rivelato sale con `back.out`.
- **Suono**: tremolio + pop del coperchio + scintilla.
- **Difetti**: rivelare prima che venga detta la parola.

### oggetto/assemblaggio
- **Verbi**: costruire, montare, creare, mettere insieme.
- **Come**: 3–5 pezzi arrivano uno alla volta (0,25 s di distanza) da direzioni diverse e si posano nella loro posizione
  finale con `power3.out`; all'ultimo pezzo tutto fa un piccolo `scale 1.04→1`.
- **Suono**: un click diverso per pezzo (tono crescente).
- **Difetti**: pezzi che arrivano insieme (vedi "una cosa alla volta").

### oggetto/lapide-cade
- **Verbi**: morire, uccidere, è finita, addio.
- **Come**: lapide 3D cade come `caduta-rimbalzo` ma senza rimbalzo (pesante): `power3.in` 0,45 s, impatto con
  `camera/shake-colpo` e polvere ai lati (particelle grigie che si allargano).
- **Suono**: pietra pesante che batte + polvere.
- **Difetti**: rimbalzi (un oggetto pesante non rimbalza).

### oggetto/rottura-vetro
- **Verbi**: rompere, distruggere, crollare un mito.
- **Come**: l'oggetto (o una card) si spezza in 8–14 poligoni (`clip-path` precalcolati) che cadono con gravità e
  rotazioni seminate; un flash bianco di 1 frame sull'impatto.
- **Suono**: vetro che si rompe.
- **Difetti**: poligoni che si sovrappongono prima di cadere.

### oggetto/pila-che-crolla
- **Verbi**: accumulare, troppo, pesare, tutto quello che viene dopo.
- **Come**: oggetti o etichette cadono uno sopra l'altro (ogni 0,13 s) con schiacciamento all'impatto; l'ultimo è il
  più importante (accento); alla fine la pila crolla verso il basso con gravità e rotazioni.
- **Suono**: un tonfo diverso per pezzo, crollo finale.
- **Difetti**: pila che copre il viso; pezzi che si compenetrano.

### oggetto/pioggia-oggetti
- **Verbi**: tanti, abbondanza, valanga.
- **Come**: 12–20 copie a scale diverse (0,4–1) cadono da posizioni seminate con ritardi seminati, ruotando; le più
  piccole sono più sfocate (profondità).
- **Suono**: pioggia di impatti leggeri, poi coda.
- **Difetti**: densità uniforme (sembra una texture), copie tutte alla stessa scala.

### oggetto/monete-pioggia
- **Verbi**: soldi, guadagnare, costare, pagare.
- **Come**: come `pioggia-oggetti` con monete 3D; le monete ruotano su Y (scaleX che oscilla) mentre cadono; si
  ammucchiano in basso.
- **Suono**: monete che tintinnano.
- **Difetti**: cifre inventate stampate sopra.

### oggetto/libro-3d-fluttua
- **Verbi**: guida, regalo, scaricare, gratis.
- **Come**: copertina (HTML) con spessore pagine finto (secondo livello dietro, `translateZ`), inclinata
  `rotationY -22°`; entra cadendo e ruotando, poi fluttua; riflesso che scorre ogni 1,5 s; bollino "GRATIS" che sbatte.
- **Suono**: fruscio di pagine all'arrivo, timbro sul bollino.
- **Difetti**: titolo della copertina illeggibile per la prospettiva (testo ≥ 70 px).

### oggetto/lancio-arco
- **Verbi**: lanciare, mandare, dare a qualcuno.
- **Come**: l'oggetto parte da un lato e percorre un arco (`motionPath` o x lineare + y con `power2.out`/`power2.in`)
  ruotando, si posa con mini rimbalzo.
- **Suono**: swish d'aria + impatto.
- **Difetti**: arco simmetrico perfetto (meccanico): fai la discesa più ripida della salita.

### oggetto/in-mano
- **Verbi**: tenere, questo, mostrare (quando il presentatore apre la mano).
- **Come**: posizione dell'oggetto agganciata al palmo, tracciato fotogramma per fotogramma (scripts di
  tracciamento o keyframe manuali ogni 3–5 frame); l'oggetto sta sopra la mano con la sua ombra sul palmo.
- **Suono**: pop leggero all'apparizione.
- **Difetti**: oggetto che "nuota" rispetto alla mano (controlla i fotogrammi).
