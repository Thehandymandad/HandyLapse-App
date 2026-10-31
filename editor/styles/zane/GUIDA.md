# Guida: motion graphics "bouncy" con agenti AI (metodo Zane Hoyer)

> **Per chi legge (Claude in un'altra sessione):** questa guida riassume tutto ciò che si impara dal video
> "How to Automate Your ENTIRE Editing Job ($49,540/Mo)" di Zane Hoyer (https://youtu.be/RXN9ci0SvIo,
> 7:18, uscito il 24/10/2026), analizzato fotogramma per fotogramma il 31/10/2026.
> Serve per **riprodurre il suo metodo e la qualità delle sue motion graphics** nei video dell'utente.
> Rispondi all'utente sempre in **italiano**. I fotogrammi di riferimento sono in `fotogrammi/` accanto a questo file:
> guardali prima di iniziare (Read sulle immagini).

---

## 0. In una frase

Le sue grafiche sembrano fatte a mano invece che "da AI" per due ragioni: per ogni cliente ha **una cartella
ordinata di riferimenti** e soprattutto un **documento di regole di movimento con numeri precisi**
(overshoot, frame, gradi). Claude Code legge entrambi, fa prima un **piano delle inquadrature** e solo dopo anima.
Il segreto non è il prompt lungo ma il **brief scritto una volta sola e riusato**.

---

## 1. Il metodo (cosa fa lui, passo per passo)

### 1.1 Una cartella per cliente (o per stile)
Nomi chiari, perché è l'agente che deve capire cosa contiene ogni cartella:

```
<Nome cliente>/
├── raw footage/                      girato grezzo
├── subject assets/                   primi piani nitidi del volto, vestiti → per B-roll AI realistico del soggetto
├── motion graphic style references/  screenshot/clip di stili da imitare (li prende da Pinterest e Instagram)
├── brand kit/                        colori (screenshot con codici hex), logo, font
└── Read me for motion movement style.pdf   ← il documento di regole (sezione 3)
```

Lui dice che la qualità dipende da tre cose: **riferimenti di motion graphics**, **riprese nitide del soggetto**
(per il B-roll) e **brand kit solido** (colore principale, font, logo, color grade). Tutto il resto lo copre il prompt.

### 1.2 Come crea il documento di regole
Non lo scrive a mano: chiede a Claude (Opus 5.5, effort Extra/High) di scrivere "un prompt per il te stesso futuro".
Il prompt che usa (trascritto dal video):

> Generate me a prompt for your future self when animating motion graphics. I want all of the motion to be very
> bouncy. I want all of the text animations to have lots of motion and I also want you to analyze my timeline and
> take certain sections of my footage and integrate it within the actual motion graphics. This edit should not feel
> static in any way. There should always be some form of motion, whether that's a camera zoom or motion graphics,
> it should always feel very interactive. See my style references attached in the Motion graphic reference folder.

Poi copia la risposta in un documento, lo esporta in PDF e lo mette nella cartella.

### 1.3 Divisione dei compiti tra agenti
| Compito | Strumento usato da lui | Nota |
|---|---|---|
| Tagli delle pause, color grade, bilanciamento audio | ChatGPT "Astra" (Codex) dentro DaVinci Resolve (File → Set up AI assistants) | |
| B-roll realistico | Kling 4.0 tramite l'MCP di OpenArt collegato all'agente | anche oggetti 3D (TV retrò, robot) |
| **Motion graphics** | **Claude Code**, Opus 5.5, effort alto | quasi certamente **Remotion** (compare nella sua griglia degli strumenti) |

Con le cartelle pronte il prompt operativo è corto, ad esempio:
"Ho DaVinci aperto. Vai in Downloads/Zane, prendi il girato, taglia le pause, fai il color grade e bilancia l'audio,
genera B-roll realistico con Kling 4.0 su OpenArt e mettilo nel media pool."
Per le grafiche: stesso tipo di prompt, ma punta a `motion graphic style references/` e al README di movimento.

### 1.4 Distribuzione (parte business, per completezza)
- Pubblica motion graphics "virali" su Instagram con la formula "commenta CLAUDE per avere la guida"; un'automazione manda il prompt in DM e raccoglie l'email.
- Offerta a retainer con 100–200 video al mese e "viralità garantita". Per ogni reel fa generare 10–20 varianti (hook diversi) e le testa nei **trial reels** di Instagram; pubblica sul feed la vincente.
- ⚠️ I numeri di guadagno e la "viralità garantita" sono marketing, non verificati. Il link a OpenArt è un affiliato.

---

## 2. Lo stile visivo che produce (cosa si vede nel video)

Fotogrammi: `fotogrammi/01-intro-0-10s.jpg`, `02-…`, `03-reel-finale-…`, `06-…`, `07-…`.

### 2.1 Palette e materiali
- Sfondo quasi nero con sfumatura verde molto scura (vignetta radiale verde al centro).
- Accento verde lime/neon: `#CCFF00`, `#39FF14`, `#00FF66` (letti dal suo brand kit).
- Pillole bianche o verde menta, bordi arrotondati, **glow** (bagliore) attorno agli elementi accesi.
- Spesso sfondo = **lo stesso video, sfocato forte**, con la grafica al centro (formato 9:16 dentro un 16:9).

### 2.2 Tipografia (la sua firma)
- **Sans bianco molto pesante** (tipo Inter/SF Black) per la parola principale: "MOTION", "Advanced".
- **Serif corsivo verde** per la parola d'accento accanto: "graphics", "B-roll", "finally,", "walk away.", "yourself", "you".
- Mono piccolo per etichette tecniche ("B-ROLL 02 · EYES", header di capitolo).
- Nei sottotitoli parola per parola la **parola chiave cambia font** (passa al serif corsivo verde): "I'm about to / show *you*".

### 2.3 Catalogo delle scene (con tempi nel video)
| Tempo | Scena | Cosa c'è da imparare |
|---|---|---|
| 0:00 | Pillola "Coming up" che entra con overshoot davanti a lui | entrata a scala con rimbalzo |
| 0:01 | **TV retrò 3D** (render AI) con display LED: contatore 7 → 0 "EMPLOYEES", "$400K" | oggetto 3D generato + testo LED animato sopra |
| 0:04 | Due **robot-drone 3D** "Agent 5.1" e "Agent 5.5" che fluttuano ai lati di lui | B-roll AI in compositing, fluttuazione continua |
| 0:07 | **Tre pannelli 9:16 affiancati** che animano tre capitoli in parallelo | anteprima del reel, ritmo sincronizzato |
| 0:07–0:09 | "MOTION" lettera per lettera + "graphics" corsivo, curva di easing disegnata sotto | testo cinetico + grafico della curva come decorazione |
| 0:08–0:09 | Contatore "1 → 3 → 8 clients" con schede che si impilano (Podcast, Fitness, Real estate) | numero che conta + carte che entrano a cascata |
| 0:08–0:09 | Anello di progresso 91 → 98, pulsante "Claim offer" → "Offer accepted ✓" con cursore che clicca | **finta UI interattiva** con click simulato |
| 0:12 | Cartelle 3D verde menta con nomi clienti (Megan, Tyler, Judd, Mike) che entrano in sequenza | stagger (sfalsamento) |
| 0:15 | Widget "69% done" che spunta accanto alla mano | grafica "attaccata" al gesto |
| 0:18 | La TV retrò ora mostra "EDITING OFFER" con checklist (200 videos a month ✓, guaranteed virality ✓) | stesso oggetto riusato = coerenza |
| 0:39 | Pillole "Claude Code" / "Timeline editor" impilate, sincronizzate con le parole | testo che richiama ciò che dice |
| 0:42 | Lista di pagamenti (mascherati) con "Infinite" grande in grigio dietro | parola gigante come texture di sfondo |
| 0:48 | Griglia di loghi in schede bianche (OpenArt, Claude, ChatGPT, Remotion, Gemini, Amazon Nova) | griglia ordinata, entrata a cascata |
| 1:51 | **Contatore di soldi** $109K → $120.000 in pillola verde + **freccia disegnata a mano** e "NO EMPLOYEES" che segue il corpo | numero che rotola (split-flap) + scritta a mano attaccata al soggetto |
| 1:52 | Sottotitoli "I'm about to / show *you*" | parola chiave in altro font e colore |
| 1:54 | Clip di lui **dentro un telefono** inclinato, header "In this video" | footage dentro la grafica |
| 1:55 | Schede inclinate in 3D con primi piani in bianco e nero ("B-ROLL 02 · EYES") + "Advanced *B-roll*" | carosello 3D di footage |
| 1:57 | "MOTION *graphics*" sopra di lui con curva di easing sotto | testo sopra il soggetto |
| 1:58 | Pannello "Autopilot" con 3 interruttori iOS che si accendono uno alla volta | UI finta con stati che cambiano |
| 2:00 | Telefono con "• LIVE *updates*" e notifiche impilate (Client approved / Render finished / Edit complete) | notifiche che entrano a molla |
| 2:02 | "finally," corsivo con glow → anello 0 → 83 → 99 → 98, "Claim offer" → cursore clicca → "Offer accepted ✓" | sequenza a più tempi |
| 2:04 | Clip di lui in scheda + "*yourself*" corsivo sopra | chiusura |
| 6:45 | Grafico a barre verde con linea che sale e "$100,111" che rotola | grafico animato per un numero |

### 2.4 Come le produce (deduzioni)
- Codice React renderizzato in video con **Remotion**, generato da Claude Code: lo dimostrano il cursore che clicca, i contatori, le UI finte e il logo Remotion tra i suoi strumenti.
- Oggetti 3D fotorealistici (TV, robot, cartelle) = immagini/video **generati con AI** (OpenArt/Kling) e animati come livelli, non modellati.
- Riferimenti di stile presi da **Pinterest** (pin tipo "Recreating random edit style in DaVinci Resolve") e da Instagram.
- **Non mostra** il prompt completo per il reel finale né quanto tempo serve davvero: si vede solo il risultato.

---

## 3. Il documento di regole di movimento (il pezzo più prezioso)

Questo è il testo letto sullo schermo (pagina 1 di 3 del suo "Read me for motion movement style").
Le sezioni 1–3 sono **trascritte fedelmente**; la fine della 3 e le sezioni 4–5 **non si vedono nel video**:
qui sotto sono ricostruite e segnate come tali.

```
ROLE
You're animating motion graphics for my edit. The finished piece should feel bouncy, kinetic
and interactive. It should never look static. Read this whole brief before you touch the timeline.

1. ANALYZE THE TIMELINE FIRST
- Pull the full timeline: every clip, its in/out points, duration, and what happens in it. If a
  video-editing connector (e.g. InVideo) is available, read the timeline and grab filmstrips and
  audio waveforms for each clip. Otherwise, ask me to export or describe it.
- Read the dialogue/VO and mark key phrases, numbers and stats, names, lists, product or app
  moments, emotional peaks, and visual actions (gestures, reveals, product shots, looks to camera).
- Mark the audio beats: music transients, downbeats, drops, and pauses in speech. Motion hits land
  on these.
- Pick the strongest 1–3 second footage moments to pull INTO the graphics (see section 5).
  Favor clips with a clear subject, movement, and a clean background.
- Before animating, give me a shot plan with these columns: timecode → what's said/shown →
  graphic treatment → footage being integrated → key motion beats. Then build.

2. MOTION FEEL: BOUNCY BY DEFAULT
Everything moves on springs, never on linear or plain ease curves.
- Default spring: 15–25% overshoot, 1–3 decaying rebounds, settling in 0.4–0.7s. Use
  easeOutBack, an elastic curve, or a low-damping spring.
- Squash & stretch on landings: for 2–3 frames, scale about 1.12× along the direction of travel
  and 0.9× across it, then spring back.
- Rotation settles with a wobble, e.g. −8° → +4° → −1° → 0°.
- Secondary motion: when something lands, nearby elements get nudged and wobble back.
  Everything should feel physical and connected.
- Exits are springy too: a small anticipation pull-back, then launch out fast.
- One hero motion at a time, with everything else in support. Bouncy, not chaotic.
- Frame counts below assume 30fps. At 60fps, double them.

3. TEXT: LOTS OF MOTION, NEVER A PLAIN FADE
- Animate per character or per word, staggered: 1–2 frames per letter, 3–4 frames per word.
- Rotate entry styles across the piece:
  scale up from 0 with overshoot
  drop in from above with a bounce
  sticker slap-on (big → small, with squash and a slight tilt)
  mask/wipe reveals
  typewriter with a blinking cursor
  glowing LED/terminal type-on
  split-flap rolls
  vertical word-swap rolls
  [il resto della sezione 3 non si vede]

[RICOSTRUITO — non visibile nel video]
4. CAMERA & CONSTANT MOTION
- Never a static frame: if nothing else moves, the camera does (slow push-in, drift, zoom punch on beats).
- Punch zoom on key words/numbers; idle elements float or breathe (tiny scale/position loop).

5. FOOTAGE INSIDE THE GRAPHICS
- Put 1–3 s of the subject inside phones, cards, tilted 3D panels; blurred copy of the same clip as background.
- Keep subject and face readable; footage cards enter and exit with the same spring rules.
```

### 3.1 Traduzione dei numeri in parametri Remotion (calcolati)
`spring()` di Remotion usa massa 1. Lo smorzamento per un dato overshoot si ricava da
ζ = −ln(OS)/√(π² + ln²(OS)), damping = 2ζ√stiffness.

| Overshoot | stiffness 170 | stiffness 250 (più scattante) |
|---|---|---|
| 15% | damping 13.5 → si assesta in ~0.59 s | damping 16.3 → ~0.49 s |
| **20% (default consigliato)** | **damping 11.9 → ~0.67 s** | **damping 14.4 → ~0.55 s** |
| 25% | damping 10.5 → ~0.76 s (troppo lento) | damping 12.8 → ~0.63 s |

`easeOutBack(t) = 1 + (s+1)(t−1)³ + s(t−1)²`: con s = 1.70158 l'overshoot è del 10% (troppo poco per lui);
con **s = 2.5 è del 19%**, con **s = 3.0 del 25%**. Usa s tra 2.5 e 3.0.

Altri valori pronti, a 30fps (raddoppia a 60fps):
- squash & stretch: per 2–3 frame scala 1.12 nella direzione del moto e 0.9 di traverso, poi molla verso 1;
- rotazione: keyframe −8° → +4° → −1° → 0° (oppure una molla sulla rotazione con lo stesso damping);
- stagger: 1–2 frame per lettera, 3–4 frame per parola, 3–5 frame tra carte di una lista;
- uscita: 3–4 frame di anticipo all'indietro (~5–8% della distanza), poi 6–8 frame di accelerazione verso l'esterno;
- movimento secondario: quando un elemento atterra, gli elementi vicini si spostano di 4–10 px nella sua direzione e tornano indietro con la stessa molla.

---

## 4. Cosa fare in pratica (procedura per te, Claude)

### Passo 1: prepara la cartella dello stile
Crea (o chiedi all'utente dove metterla) la struttura della sezione 1.1. Nel `brand kit/` vanno colori, font e logo
**dell'utente**, non quelli di Zane (vedi sezione 5). Chiedi all'utente 3–4 riferimenti di stile reali
(screenshot o clip da Pinterest/Instagram) e salvali in `motion graphic style references/`.

### Passo 2: scrivi il README di movimento
Parti dal testo della sezione 3, mantieni **tutti i numeri**, cambia solo ciò che riguarda l'estetica (colori, font,
materiali). Completa le sezioni 4 e 5 e aggiungi una sezione "6. LOOK" con palette, font, raggi degli angoli,
ombre e glow. Salvalo come `README-movimento.md` nella cartella. È un documento da scrivere **una volta sola**.

### Passo 3: piano delle inquadrature PRIMA di animare
Dalla trascrizione con timestamp per parola produci una tabella:

| timecode | cosa si dice/vede | trattamento grafico | footage integrato | beat del movimento |
|---|---|---|---|---|
| 00:01.2–00:03.0 | "zero dipendenti" | TV/display con contatore 7→0 | — | atterraggio sul "zero", squash |

Regole per scegliere i momenti: numeri e statistiche → contatore o anello; liste → carte a cascata;
nomi di app/servizi → logo o UI finta di quel servizio; frasi chiave → testo cinetico sans + corsivo;
gesti o sguardi in camera → grafica che spunta vicino alla mano. **Un solo protagonista alla volta**.
Mostra il piano all'utente e fallo approvare prima di costruire.

### Passo 4: costruisci con Remotion
- Un componente per tipo di grafica, tutti con le stesse molle (sezione 3.1) importate da un file unico di costanti.
- Le animazioni si agganciano ai timestamp delle parole e ai beat audio (pause e transienti), mai a tempi messi a caso.
- Ricrea le grafiche di riferimento del catalogo 2.3: contatore che rotola, anello di progresso, pulsante con cursore che clicca, interruttori iOS, notifiche impilate, telefono o schede con il footage dentro, testo per lettera con stili d'entrata che si alternano, parola gigante come texture.
- Sotto ogni grafica serve uno sfondo che si muove sempre: video sfocato, deriva lenta e un leggero "respiro" continuo.

### Passo 5: controlla prima di consegnare
Renderizza dei fotogrammi fissi (`npx remotion still`) e un'anteprima corta, poi verifica:
- [ ] non c'è nessun fotogramma statico (qualcosa si muove sempre);
- [ ] nessuna curva lineare né dissolvenza semplice sul testo;
- [ ] l'overshoot si vede ma non è "gommoso" (si assesta entro 0,7 s);
- [ ] gli stili d'entrata del testo cambiano lungo il video (non sempre lo stesso);
- [ ] un solo movimento protagonista alla volta;
- [ ] i colpi cadono sulle parole e sui beat;
- [ ] il volto resta leggibile e le grafiche non lo coprono.
Confronta i fotogrammi con quelli di `fotogrammi/` e descrivi all'utente le differenze.

---

## 5. Adattamento allo stile dell'utente (importante)

L'utente **non** vuole il look di Zane (nero + neon lime). Le sue preferenze note sono queste:
stile **Apple** (keynote/spot: fluido, pulito, elegante), palette **bianco/argento**, box in **vetro chiaro
"liquid glass"**, font di default **SF Pro**, parole chiave in **blu elettrico `#1F6BFF`**, reel **9:16**,
interfacce che corrispondono al servizio nominato (Google, YouTube, Claude, ChatGPT…), grafiche solo quando
spiegano qualcosa. Il genere attuale è il **reverse engineering di app**.

Quindi:
- **Da prendere identico:** tutte le regole di movimento (sezioni 3 e 3.1), il piano delle inquadrature, il footage dentro le grafiche, gli stili d'entrata del testo che si alternano, le UI finte con click e stati.
- **Da tradurre:** glow neon → ombre morbide e riflesso sul vetro; nero e verde → bianco, argento e blu `#1F6BFF`; serif corsivo verde → serif corsivo blu (o grigio scuro su chiaro), sempre in coppia con il sans pesante.
- **Da evitare:** la "viralità garantita" come promessa e le grafiche messe "tanto per" (lui ne mette moltissime perché vende motion graphics, l'utente le vuole al servizio della spiegazione).
- Se il dubbio è stile contro movimento: il movimento segue Zane, l'estetica segue l'utente.

---

## 6. Come ritrovare il materiale originale

```bash
yt-dlp --js-runtimes node:~/.local/bin/node -f "bv*[height<=720][ext=mp4]" -o video.mp4 "https://youtu.be/RXN9ci0SvIo"
```
- I sottotitoli vanno spesso in errore 429: chiedili una lingua alla volta (`--sub-langs en-orig --sleep-subtitles 3`).
- Mosaico di fotogrammi con timestamp: `ffmpeg -i video.mp4 -vf "fps=2,scale=384:-2,drawtext=…:text='%{pts\:hms}',tile=4x5" s%d.jpg`.
- Momenti chiave: 0:00–0:20 (intro), 1:15 e 3:58 (documento di regole leggibile), 1:51–2:12 (reel finale), 6:45 (grafico).
- Scarica e analizza in una cartella temporanea e non lanciare nulla da lì.
