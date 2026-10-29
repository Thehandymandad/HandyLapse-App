# Sfondi e atmosfere

Nelle grafiche trasparenti sopra il parlato lo sfondo è il footage; questi servono per scene a tutto schermo, per il
fondo dietro il footage rimpicciolito (`inset`) e per dare leggibilità.

### sfondi/scrim
- **Verbi**: (leggibilità su footage chiaro).
- **Come**: gradiente nero sotto la zona del testo: `linear-gradient(to top, rgba(0,0,0,.72), rgba(0,0,0,0) 45%)`,
  entra con la grafica (0,3 s) ed esce con lei.
- **Suono**: nessuno.
- **Difetti**: scrim fisso per tutto il video (spegne il footage).

### sfondi/pieno-ink
- **Verbi**: capitolo, pausa, concetto astratto.
- **Come**: fondo `#0B0B0C` a tutto schermo che entra con una maschera (wipe) e lascia il palco a un solo elemento.
- **Suono**: il suono della transizione.
- **Difetti**: tenerlo più di 2,5 s in un reel parlato (si perde la persona).

### sfondi/bagliore-lime
- **Verbi**: protagonista, importante, energia.
- **Come**: cerchio sfocato `radial-gradient(#D4FF3A 0%, transparent 65%)` al 25–35% dietro l'oggetto
  protagonista; respira (`scale 0.95↔1.05`, 2 s).
- **Suono**: nessuno.
- **Difetti**: bagliore dietro al testo bianco (cala il contrasto).

### sfondi/griglia-prospettiva
- **Verbi**: tecnologia, sistema, mondo digitale.
- **Come**: piano con linee lime al 30% ruotato `rotationX 72°`, sfumato verso l'orizzonte con `mask-image`; scorre
  verso la camera (`backgroundPosition` in funzione del tempo).
- **Suono**: drone leggero.
- **Difetti**: righe troppo fitte (sfarfallio/moire): passo ≥ 100 px.

### sfondi/carta
- **Verbi**: guida, appunti, metodo, scrivere.
- **Come**: fondo `#F4F4EF` con grana leggerissima (SVG feTurbulence statico, seme fisso) e ombra interna ai bordi.
- **Suono**: fruscio di carta all'entrata.
- **Difetti**: grana animata (pesa nel render e sfarfalla).

### sfondi/grana
- **Verbi**: cinematografico, ricordo.
- **Come**: grana e vignetta sul footage vanno nel grade di video-use (o `/media-use`) oppure in un livello
  `Overlay` dello style pack sotto le grafiche, mai sopra il testo.
- **Suono**: nessuno.
- **Difetti**: grana sopra le grafiche (sporca il testo).

### sfondi/desaturazione-con-velo
- **Verbi**: no, fallimento, il prima.
- **Come**: insieme a `camera/desaturazione` sul footage, la grafica mette un velo `radial-gradient` rosso al 25% ai
  bordi per la durata dell'evento.
- **Suono**: colpo cupo.
- **Difetti**: velo rosso per qualcosa di positivo.

### sfondi/vignetta-pulsante
- **Verbi**: battito, ansia, tensione.
- **Come**: vignetta nera ai bordi che pulsa al ritmo di 1 battito/0,8 s per 2–3 battiti.
- **Suono**: battito cardiaco sincronizzato.
- **Difetti**: più di 3 battiti.
