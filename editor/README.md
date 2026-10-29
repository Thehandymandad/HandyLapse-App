# Editor video con l'AI

Il montaggio lo fa Claude Code con delle **skill**: cartelle di istruzioni che gli insegnano un mestiere.
Niente programmi di montaggio: si gira il video, lo si dà a Claude e si descrive il risultato come a un montatore.

## Le skill

Pubbliche (installate da `bash editor/setup.sh` in `.claude/skills/`, non sono nel repo):

| Skill | Cosa fa |
| --- | --- |
| `video-use` ([browser-use/video-use](https://github.com/browser-use/video-use)) | il montatore: trascrive con ElevenLabs Scribe, taglia sulle parole (tiene l'ultima ripresa buona, fade audio di 30 ms), rende il montato |
| `media-use` (arriva con le skill di [HyperFrames](https://hyperframes.heygen.com)) | i suoni gratuiti di base per gli effetti, e asset: musica, immagini, voce, rimozione sfondo |

Il motore delle animazioni è **Remotion** (`editor/remotion/`, React → MP4): camera 3D sul footage, sottotitoli
cinetici, grafiche dello style pack **Pulse** (REC, pila di lavori, card di Claude, timbri, aeroplanino, telefono 3D,
tessere, guida 3D, DM…) e oggetti three.js.

Le 5 custom, con il gusto della casa (in `.claude/skills/`, nel repo):

| Skill | Riceve → consegna |
| --- | --- |
| `motion-director` | idea, script, riferimenti, trascrizione → `MOTION-BRIEF.md` + `motion-plan.json` |
| `motion-design` | brief + piano → `DESIGN.md` |
| `motion-library` | un verbo ("perdere", "unire") → il componente Remotion pronto o la ricetta di movimento giusta (92 ricette) |
| `motion-remotion` | piano + design → progetto Remotion (`reel.json`) → `final.mp4` (con camera, suono e master) |
| `motion-review` | il render → `MOTION-REVIEW.md` + correzioni |

`idea → director → design → library → remotion → review → video`

## I sei passi

1. **Trascrizione** — ogni parola col suo tempo (ElevenLabs Scribe, video-use).
2. **Tagli** — via le riprese sbagliate (si tiene l'ultima buona), via ogni pausa sopra ~0,25 s, piccolo margine ai bordi, 30 ms di dissolvenza audio.
3. **Grafiche animate** — Remotion sopra il montato: ogni frase diventa un'azione visiva (componente Pulse o ricetta nuova), con camera 3D e sottotitoli cinetici.
4. **Oggetti 3D** — three.js dentro Remotion, oppure generati su Google Flow con Nano Banana Pro ("render 3D iper-realistico di … su fondo bianco, nient'altro nel frame", 2K), scontornati e animati (caduta, rotazione, ombre, scintille).
5. **Suono** — voce con più corpo (EQ + compressione), un effetto diverso per ogni evento visivo, tutti allo stesso livello ~7 dB sotto la voce, master −14 LUFS.
6. **Composizione e verifica** — video di Remotion + voce + effetti + master, poi si guardano i fotogrammi chiave: testo, sovrapposizioni, zone sicure di Instagram.

## Come si usa

1. Metti il girato in `editor/videos/<nome>/` (video grandi: link Google Drive "Chiunque abbia il link", Claude lo scarica lì).
2. Scrivi a Claude, per esempio:

   > Edita il video che trovi in `editor/videos/<nome>`. Trascrivilo parola per parola, togli pause, esitazioni e
   > riprese sbagliate (tieni sempre l'ultima buona). Aggiungi grafiche animate sopra il parlato, una per ogni concetto
   > chiave, nello stile del video di riferimento che ti allego: colori, font e ritmo uguali. Inserisci oggetti 3D
   > realistici dove servono e un effetto sonoro per ogni animazione, a volume pulito sotto la voce. Alla fine controlla
   > i fotogrammi e dimmi cosa hai sistemato.

3. Il trucco: allega sempre **riferimenti visivi** (video che ti piacciono) invece di descrivere l'effetto a parole.

Tutti i file di lavoro finiscono in `editor/videos/<nome>/edit/` (piano, `reel.json`, design, review, render). Nel repo
restano solo i testi (piani, progetti, review); i video no. Per vedere e ritoccare un progetto dal vivo:
`cd editor/remotion && npm run studio`.

## Librerie che crescono

- `editor/assets/objects/` — oggetti 3D scontornati (PNG), riusabili; i generati grezzi in `objects/raw/`.
- `editor/assets/sfx/` — effetti sonori, uno per evento, con `catalog.json` (prompt usati).
- `editor/assets/fonts/` — Instrument Serif (corsivo per le parole chiave, licenza OFL).

## Installazione

`bash editor/setup.sh` — servono ffmpeg, Node.js 22+, Python 3 e git. Scarica ed esegue codice di terze parti
(video-use da GitHub, le skill di HyperFrames/media-use e Remotion da npm). Licenza Remotion: gratuita per singoli e
aziende fino a 3 persone. La chiave ElevenLabs va in `ELEVENLABS_API_KEY`. In questo cloud la chiave vera la mette il proxy di rete
(secret dell'ambiente): basta `export ELEVENLABS_API_KEY=proxy`, il proxy sostituisce il valore.
