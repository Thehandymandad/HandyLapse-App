# Camera

Due tipi di camera:

- **Sul footage** (il parlato): la fa la camera di Remotion (`editor/remotion/src/lib/camera.ts` + `camera` dello style
  pack). Dal piano arrivano gli zoom: `{"type": "punch", "t": <parola>, "strength": 0–1}` (secco) e
  `{"type": "push", "t": …, "strength": …, "dur": …}` (lento). Whip 3D e punch sfocato sui tagli, tremori sui timbri,
  push sulle grafiche di tensione e riquadro-telefono li fa il pack da solo. (`compose.py --overlay` sa fare gli stessi
  tipi con ffmpeg — `punch`, `push`, `shake`, `whip`, `inset`, `desat` — quando le grafiche arrivano come overlay
  trasparente invece che da Remotion.)
- **Dentro una scena grafica**: trasformazioni sul contenitore del componente (parallasse, dolly, tilt).

### camera/punch-in
- **Verbi**: questo, attenzione, colpo, la frase che conta.
- **Come**: `{"type": "punch", "t": <parola>, "scale": 1.08–1.15, "in": 0.12, "hold": 0.6, "out": 0.35}` — sale in
  0,12 s sul colpo, tiene, torna morbido. Centro sul viso (`"cx": 0.5, "cy": 0.42`).
- **Suono**: nessuno in più (è già il colpo della grafica) o un soffio.
- **Difetti**: più di un punch ogni 3 s; scala > 1.2 (si vede la grana).

### camera/push-lento
- **Verbi**: tensione, pesare, ascoltami, confessione.
- **Come**: `{"type": "push", "start": a, "end": b, "from": 1.0, "to": 1.06}` per tutta la frase, `sine.inOut`.
- **Suono**: nessuno, o un drone basso.
- **Difetti**: push e punch insieme (si sommano: sceglie uno).

### camera/shake-colpo
- **Verbi**: impatto, no, crollo, timbro, slam.
- **Come**: `{"type": "shake", "t": <impatto>, "dur": 0.25, "amp": 16}` — oscillazione smorzata, mai casuale.
- **Suono**: è quello dell'impatto.
- **Difetti**: shake su ogni evento (diventa rumore).

### camera/whip
- **Verbi**: velocità, cambio di argomento, "e invece".
- **Come**: `{"type": "whip", "t": <taglio>, "dur": 0.18, "dir": 1}` sul taglio tra due segmenti: spostamento +
  sfocatura orizzontale che si risolve nel nuovo segmento.
- **Suono**: whoosh corto (diverso da quelli delle grafiche).
- **Difetti**: whip su tagli dentro la stessa frase.

### camera/zoom-out-schermo
- **Verbi**: il risultato, questo video, guarda cosa ne è uscito.
- **Come**: `{"type": "inset", "start": a, "end": b, "scale": 0.72, "radius": 64}` — il footage si rimpicciolisce al
  centro su fondo ink in 0,45 s; nella grafica, una cornice di telefono (vedi `ui/telefono-3d`) allineata allo stesso
  rettangolo; alla fine torna a pieno schermo.
- **Suono**: whoosh d'uscita + tocco all'arrivo.
- **Difetti**: cornice non allineata al rettangolo del footage (calcola: w = 1080·scale, h = 1920·scale, centrato).

### camera/desaturazione
- **Verbi**: falaccentonto, prima, passato, triste.
- **Come**: `{"type": "desat", "start": a, "end": b, "amount": 1}` — il footage perde colore in 0,1 s; con un velo
  rosso nella grafica per un "no".
- **Suono**: il colpo dell'evento.
- **Difetti**: tenerlo più di 1,5 s.

### camera/rack-focus (scena)
- **Verbi**: spostare l'attenzione.
- **Come**: due livelli; quello in primo piano passa da `blur(0)` a `blur(10px)` mentre lo sfondo fa il contrario,
  0,5 s `power2.inOut`.
- **Suono**: nessuno.
- **Difetti**: entrambi sfocati a metà per troppo tempo.

### camera/parallasse (scena)
- **Verbi**: profondità, mondo, spazio.
- **Come**: 3 livelli che scorrono a velocità 0.3 / 0.6 / 1 dello stesso movimento (x o y), `sine.inOut`.
- **Suono**: nessuno.
- **Difetti**: livello più vicino più lento (al contrario).

### camera/dolly-3d (scena)
- **Verbi**: entrare dentro, avvicinarsi.
- **Come**: contenitore con `perspective: 1200px`; la scena va da `z -400 → 0` e `rotationX 12° → 0` in 0,6 s `expo.out`.
- **Suono**: swoosh profondo.
- **Difetti**: testo che si sfoca per il ridimensionamento (anima il contenitore, non il testo).

### camera/freeze
- **Verbi**: fermati, aspetta, attenzione a questo.
- **Come**: nella composizione finale si congela un frame del footage (`compose.py` non lo fa: si fa nell'EDL di
  video-use ripetendo un fotogramma) e la grafica lo annota (cerchiatura, freccia).
- **Suono**: "record scratch" o stop secco.
- **Difetti**: freeze con l'audio che continua a parlare (taglia anche l'audio o metti il freeze in una pausa).
