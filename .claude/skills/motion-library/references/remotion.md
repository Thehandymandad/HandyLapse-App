# Componenti pronti (React, disegnati da HyperFrames) e traduzione delle ricette

I componenti stanno in `editor/remotion/` (React, API di Remotion); HyperFrames li disegna fotogramma per fotogramma
(motion-hyperframes), quindi si scrivono come componenti Remotion. Prima di scrivere una ricetta da zero guarda se c'è già un componente: si usa
dal piano con `"graphic": {"type": …, "props": …, "y": …, "scale": …}`. Nel piano i tempi delle props sono secondi
assoluti della timeline di uscita (`plan_to_reel.py` li converte in frame relativi).

## Style pack `pulse` (default) — `src/styles/originals/pulse/`

Accento arancione elettrico `#FF6633` (o `motion.accentColor`). Tema chiaro (`motion.theme: "light"`, default con la
cornice): card bianche e testo nero su fondo chiaro sfumato, sottotitoli Inter + Instrument Serif. Tema scuro: vetro
nero, testo bianco, Anton. Nei componenti si usano `P.fg`/`fg(a)` per testo e dettagli e `P.glass`, `P.cardShadow`,
`P.textShadow` per le card: così vanno bene in tutti e due i temi. Camera: tagli alternati punch sfocato / whip 3D, oscillazione a mano.

| type | Verbi | Cosa fa | Props (tempi in secondi assoluti) | Suono |
| --- | --- | --- | --- | --- |
| `rec` | registrare, girare, inizio | mirino REC che si chiude sul viso, timecode, fuoco che aggancia, scatto finale con lampo | `shutterAt`, `focusX`, `focusY`, `box` [l,t,r,b] (attorno alla cornice), `labelY` | bip REC + scatto |
| `pile` | accumulare, troppo, tutto quello che… | lavori che cadono e si impilano (la camera trema a ogni impatto), l'ultimo rosso, poi crollano | `items[]`, `last`, `every` (frame tra i pezzi), `center` (y = centro della pila, pezzi bilanciati: per la fascia sopra la cornice) | tonfi in sequenza + crollo |
| `hours` | tempo, ore, perdere | orologio con lancette impazzite e contatore ore che vola, colpo sulla parola | `hitAt`, `hours`, `label` | ticchettio + colpo |
| `claude` | fare, lavorare, montare | card di Claude con logo che gira, barra a 100%, lavorazioni che si spuntano quando sono nominate | `tasks[]`, `checkAt[]` (o `doneAt`) | pop + clic per spunta + completato |
| `nope` | no, sbagliato, risultato brutto | footage in bianco e nero + timbro rosso che sbatte, camera che trema | `text`, `kicker` | errore / timbro |
| `zero` | zero, niente, mai | timbri rossi che sbattono uno sotto l'altro, ognuno sulla sua parola | `items[{at, text}]` | un timbro diverso per colpo |
| `tape` | attenzione, vietato, cantiere | nastri incrociati con testo che scorre | `text` | strappo nastro |
| `route` | arrivare, strada, obiettivo | navigatore con percorso e arrivo | `arriveAt`, `to` | ping d'arrivo |
| `send` | mandare, inviare | aeroplanino in curva con scia tratteggiata + pillola INVIATO | `flyFrames` (frame), `label` | whoosh + notifica |
| `idcard` | chi, cosa, quanto, "questo", "non l'ho…" | scheda della referenza: pillola grigia sopra (tipo PRIMA), cerchio d'accento con icona che si disegna, etichetta spaziata, titolo grande, barra a segmenti; il titolo si può barrare o cambiare | `tag`, `icon`, `kicker`, `title`, `bar` + `barAt`, `strikeAt`, `title2` + `swapAt`, `tag2` | entrata scheda + barra / cambio |
| `icon3d` | costruire, oggetto, strumento, "ho fatto…" | **3D three.js**: 1–3 tessere lucide d'accento con l'icona in chiaro, entrano girando una per parola e ondeggiano; etichetta sotto | `items[{icon, label, at}]` (1–4 tessere) | un pop 3D per tessera |
| `button3d` | premere, avviare, facile, "basta un click" | **3D three.js**: tasto lucido su base vista dall'alto con la scritta, il cursore arriva e lo preme (affonda e risale), onda di luce, pillola sopra | `label`, `dot` (pallino colorato), `color`, `pressAt`, `tag` | entrata + clic del tasto |
| `result` | risultato, ecco, così, pronto (con la cornice) | pillola PRONTO che scatta nella fascia alta con un'onda di luce, cuori e fiamme che salgono nei margini laterali | `burstAt`, `label`, `sides[2]`, `rise[2]` (da/a in altezza), `plane` (l'aeroplanino torna e consegna la pillola: dopo un `send`, per "me l'ha rimandato") | scintilla + colpo |
| `phone` | risultato, ecco, così, questo video (solo schermo pieno) | il video entra in uno smartphone 3D che ondeggia, cuori che salgono, statistiche | `statsAt`, `stats[]` | whoosh + scintilla |
| `trio` | tre cose, segreto, insieme | tre tessere «?» che si girano una per parola, lucchetto IL SEGRETO, scia che le collega | `reveal[3]`, `labels[3]`, `secretAt`, `connectAt`, `secretLabel` | comparsa + tre flip + lucchetto + ping |
| `guidebook` | guida, gratis, regalo | copertina della guida in 3D che cade e fluttua, bollino GRATIS | `freeAt`, `tag`, `title` (`\n`), `subtitle`, `footer` | atterraggio libro + timbro |
| `dm` | commenta, scrivi, DM | chat/commenti: la parola si scrive da sola, parte, arriva la risposta | `text`, `typeAt`, `sendAt`, `replyAt`, `reply`, `name`, `placeholder`, `sentLabel` | apertura + digitazione + invio + risposta |

## Style pack `claude-reel` (copiato da una reference) — `src/styles/references/claude-reel/`

`badge`, `timeline` (card timeline di montaggio), `chat` (prompt a Claude che si scrive e si invia), `logo3d`
(logo Claude/OpenAI 3D, anche agganciato alla mano con `props.track`), `carousel3d` (anello di icone o copertine
attorno/dietro la persona), `vanish` (la persona sparisce con un glitch), `guide`. Carosello dietro la testa e
sparizione vogliono la persona ritagliata (`source.matte`, WebM con alfa, + `source.plate`): lo script di ritaglio
era `reel-studio/scripts/matte.ts` (nella cronologia di git), da riportare se servono.

## Componenti di base — `src/components/Graphics.tsx`

`keyword` (card testo + icona), `stat` (numero che conta), `list`, `icon` (icona SVG che si disegna, `src/icons/`),
`object3d` (three.js: coin, star, heart, house, gem, bolt, arrow, gift — `src/three/objects.tsx`), `arrow`, `cta`.
`object3d`, `logo3d` e `carousel3d` usano `@remotion/three`: in HyperFrames non si vedono (solo nel render Remotion).
Per il 3D nel video si usa `useThreeStage` (`src/three/stage.ts`): three.js puro disegnato a ogni fotogramma, funziona
sia in HyperFrames sia in Remotion (`icon3d` e `button3d` sono l'esempio: geometrie `RoundedBoxGeometry`, materiale
fisico lucido col colore d'accento, luce d'ambiente `RoomEnvironment`, scritte e icone come texture da canvas).

## Tradurre una ricetta GSAP in Remotion

| GSAP (nelle ricette) | Remotion |
| --- | --- |
| `fromTo(x, {a}, {b, duration: d})` a tempo `t` | `interpolate(frame, [t*fps, (t+d)*fps], [a, b], clamp)` |
| `power3.out` / `expo.out` | `easing: Easing.out(Easing.cubic)` / `Easing.out(Easing.exp)` |
| `back.out(1.6)`, rimbalzi | `spring({ frame, fps, config: { damping: 8–13, stiffness: 190–320 } })` |
| `repeat`, fluttuazione | `Math.sin(frame / k)`: è già deterministica |
| `Math.random()` seminato | `seeded(n)` di `src/lib/timeline.ts` |
| tremore camera, punch, whip | `camera` del pack (`src/styles/originals/pulse/index.tsx`) o `zooms` nel piano |
| timeline della scena | `<Sequence from durationInFrames>`: dentro, `useCurrentFrame()` parte da 0 |

Mattoni utili: `flipIn` (entrata a ribalta 3D + uscita sfocata), `Glass` (card vetro), `At` (posiziona al centro
x/y), `Check` (spunta che si disegna), palette `P` — tutti in `pulse/shared.tsx`.
