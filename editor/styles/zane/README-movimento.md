# README di movimento — stile zane

Il documento di regole che l'agente legge **prima di toccare la timeline** (metodo Zane Hoyer, `GUIDA.md` qui accanto).
Il movimento segue Zane, l'estetica è quella del suo brand kit (`brand-kit.md`). I numeri sono implementati una volta
sola in `editor/remotion/src/motion/bouncy.ts`: i componenti li importano, non inventano molle proprie.

## Ruolo
Animi le motion graphics del mio montaggio. Il risultato deve essere bouncy, cinetico e interattivo, mai statico.

## 1. Analizza la timeline prima
- Trascrizione con i tempi parola per parola (`words_out.json`), giunte dei tagli, durata.
- Segna: frasi chiave, numeri e statistiche, nomi, liste, momenti di app/prodotto, picchi emotivi, gesti e sguardi in camera.
- Segna i beat audio: pause del parlato, transienti della musica (`beats.py`). I colpi del movimento cadono lì.
- Scegli i momenti di girato da 1–3 s da portare DENTRO le grafiche (soggetto chiaro, movimento, fondo pulito).
- Prima di animare: **piano delle inquadrature** a 5 colonne (timecode → cosa si dice/vede → trattamento grafico →
  girato integrato → beat del movimento), approvato dall'utente. Poi si costruisce.

## 2. Movimento: bouncy di default
Tutto si muove su molle, mai curve lineari o ease semplici.
- Molla di default: 15–25% di overshoot, 1–3 rimbalzi che si smorzano, si assesta in 0,4–0,7 s
  → `BOUNCE` (20%, stiffness 250, damping 14.4, ~0,55 s); `BOUNCE_SOFT` per le card (20%, ~0,67 s); `BOUNCE_SNAP` per etichette (15%).
- Squash & stretch all'atterraggio: per 2–3 frame scala 1.12× nella direzione del moto e 0.9× di traverso → `squash()`.
- La rotazione si assesta oscillando: −8° → +4° → −1° → 0° → `wobble()`.
- Movimento secondario: quando qualcosa atterra, i vicini vengono spinti di 4–10 px e tornano → `nudge()`.
- Anche le uscite sono a molla: 3–4 frame di rincorsa all'indietro (~6%), poi 6–8 frame di accelerazione fuori → `exitPull()`.
- Un solo movimento protagonista alla volta, tutto il resto lo accompagna. Bouncy, non caotico.
- Frame a 30 fps (a 60 fps raddoppiano).

## 3. Testo: tanto movimento, mai una dissolvenza
- Per lettera o per parola, sfalsato: 1–2 frame per lettera, 3–4 per parola (`STAGGER`).
- Stili d'entrata a rotazione lungo il video (`ktext`, `entry`): `pop` (scala da 0 con overshoot), `drop` (cade
  dall'alto e rimbalza), `sticker` (adesivo sbattuto: grande → piccolo con squash e inclinazione), `wipe` (tendina),
  `type` (macchina da scrivere con cursore che lampeggia), `led` (display LED/terminale), `flap` (cartellini
  split-flap), `roll` (lettere che salgono da una maschera).
- Coppia fissa: sans bianco molto pesante per la parola principale + serif corsivo d'accento per quella accanto
  (`"MOTION *graphics*"`). Nei sottotitoli la parola chiave passa al serif corsivo d'accento.

## 4. Camera e movimento continuo
- Mai un fotogramma statico: se nient'altro si muove, si muove la camera (spinta lenta, deriva, punch sui beat).
- Punch zoom su parole chiave e numeri; gli elementi fermi respirano (`breathe()`).

## 5. Girato dentro le grafiche
- 1–3 s del soggetto dentro telefoni, schede, pannelli 3D inclinati; dietro, la copia sfocata dello stesso girato.
- Volto sempre leggibile; le schede entrano ed escono con le stesse molle.

## 6. Look
Vedi `brand-kit.md`.

## Controllo prima di consegnare
- [ ] nessun fotogramma statico
- [ ] nessuna curva lineare né dissolvenza semplice sul testo
- [ ] l'overshoot si vede ma si assesta entro 0,7 s (non gommoso)
- [ ] gli stili d'entrata del testo cambiano lungo il video
- [ ] un solo movimento protagonista alla volta
- [ ] i colpi cadono sulle parole e sui beat
- [ ] il volto resta leggibile, le grafiche non lo coprono
