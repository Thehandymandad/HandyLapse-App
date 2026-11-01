# Editor video con l'AI — guida da zero

Questa guida spiega come rifare da zero l'editor che monta reel e video con Claude Code: tagli, grafiche animate,
sottotitoli, zoom, sfondo, effetti sonori, musica e controllo finale. Non serve saper programmare: il codice lo
scrive e lo usa Claude. A te servono gli account giusti, un po' di configurazione iniziale e il girato.

---

## 1. Cosa ottieni

Carichi un video girato col telefono o con la webcam, scrivi a Claude cosa vuoi, e ricevi il video finito:

- **tagli** sulle parole: via pause, errori e ripetizioni (tiene sempre l'ultima ripresa buona)
- **grafiche animate** inerenti a quello che dici: chat di WhatsApp, fogli Excel, telefoni 3D, contatori, card
- **sottotitoli** animati con le parole chiave evidenziate
- **camera virtuale**: zoom e movimenti sul girato
- **sfondo** sostituito (ti scontorna e ti mette in un'altra stanza), se vuoi
- **effetti sonori e musica** generati in locale, senza licenze, volume finale −14 LUFS
- **revisione** fotogramma per fotogramma prima della consegna

Un reel di 30–45 secondi richiede in tutto 15–30 minuti, quasi tutti di render, più il tempo per approvare il piano.

---

## 2. Cosa ti serve

| Cosa | Perché | Costo |
|---|---|---|
| Account **Claude** con piano **Pro** o **Max** | Claude Code fa tutto il lavoro | abbonamento (consigliato Max se monti spesso) |
| Account **GitHub** | il progetto vive in un repository | gratis |
| Account **ElevenLabs** con una chiave API | trascrizione parola per parola (Scribe) | pochi centesimi a reel |
| **Google Drive** | per caricare il girato e passarlo a Claude | gratis |
| (facoltativo) **Higgsfield** | immagini o B-roll generati con l'AI | a crediti, solo se li usi |

Tutto il resto è gratuito e open source: FFmpeg, Node.js, Python, Remotion, HyperFrames, OpenCV, RobustVideoMatting.

---

## 3. Gli strumenti, in breve (così sai cosa fa ogni pezzo)

| Strumento | Ruolo |
|---|---|
| **Claude Code** (versione web, claude.ai/code) | il cervello: legge le istruzioni, lancia i programmi, costruisce il video. Gira nel cloud, quindi non serve un computer potente |
| **Skill** | cartelle di istruzioni che insegnano a Claude un mestiere (vedi sezione 7) |
| **video-use** (github.com/browser-use/video-use) | skill pubblica: trascrive, decide i tagli, rende il montato |
| **ElevenLabs Scribe** | la trascrizione con il tempo esatto di ogni parola |
| **FFmpeg** | taglia, converte, mixa audio e video |
| **Remotion** | libreria per scrivere le grafiche come componenti React (le animazioni sono codice) |
| **HyperFrames** (di HeyGen) | trasforma quelle grafiche in video trasparente, fotogramma per fotogramma, molto veloce |
| **Python + OpenCV** (`camera.py`) | la camera virtuale: zoom e movimenti sul girato, poi mette le grafiche sopra |
| **RobustVideoMatting** | scontorna la persona dal video per cambiare lo sfondo, senza green screen |
| **GitHub** | salva tutto: istruzioni, grafiche, piani dei video |

---

## 4. Due strade

- **Strada A — copia il progetto (consigliata).** Parti dal progetto già pronto: skill, stili e script ci sono già. In
  un'ora sei operativo. È quella descritta nelle sezioni 5–9.
- **Strada B — costruiscilo con Claude da zero.** Per capire ogni pezzo o fare una versione tutta tua. Richiede giorni
  di prove. I prompt per partire sono nella sezione 13.

---

## 5. Passo 1 — Il progetto su GitHub

1. Crea un account su **github.com** (se non ce l'hai).
2. Apri il repository dell'editor che ti ha condiviso il tuo amico e premi **Fork** (in alto a destra): ne ottieni
   una copia tua. Se il repository è privato, chiedigli prima di aggiungerti come collaboratore.
   - Il lavoro sull'editor si trova sul branch `claude/reel-editor-app-oyzp71`. Durante il fork **togli la spunta**
     "Copy the main branch only", oppure chiedi a chi te lo passa di unire quel branch nel `main` prima.
3. Le parti che contano sono la cartella `editor/` e la cartella `.claude/skills/`. Il resto del repository (un'app
   Next.js per i timelapse) puoi ignorarlo.

> I video, i trailer di terzi e i file generati non sono nel repository (sono esclusi apposta): ognuno usa i propri.

---

## 6. Passo 2 — Claude Code nel cloud

1. Vai su **claude.ai/code** ed entra con il tuo account Claude (Pro o Max).
2. Collega GitHub quando te lo chiede, e dai accesso al repository che hai appena copiato.
3. Crea un **ambiente** (environment). Nelle impostazioni dell'ambiente:
   - **Network access (accesso alla rete).** Scegli il livello limitato e aggiungi tra gli *Allowed domains* questi
     domini, lasciando attiva la casella che consente i package manager:
     - `api.elevenlabs.io` (trascrizione)
     - `github.com`, `raw.githubusercontent.com`, `objects.githubusercontent.com` (skill e modelli)
     - `registry.npmjs.org` (componenti delle grafiche e HyperFrames)
     - `pypi.org`, `files.pythonhosted.org` (librerie Python)
     - `drive.google.com`, `drive.usercontent.google.com` (per scaricare il girato da Drive)
     - se più avanti un download viene bloccato, Claude ti dice il nome del dominio: aggiungilo qui.
   - **La chiave di ElevenLabs.** Su elevenlabs.io → impostazioni → *API keys* crea una chiave (basta il permesso di
     trascrizione, "speech to text"). Poi aggiungila nelle impostazioni dell'ambiente, tra i *Network secrets* (o
     come variabile d'ambiente) con il nome **`ELEVENLABS_API_KEY`**.
   - **Non incollare mai la chiave nella chat.** Va solo nelle impostazioni dell'ambiente.
4. Apri una nuova sessione sull'ambiente: la chiave vale dalle sessioni nuove in poi.

Documentazione ufficiale sugli ambienti: https://code.claude.com/docs/en/cloud-environments

---

## 7. Passo 3 — Installazione (una volta sola)

Nella prima sessione scrivi a Claude:

> Esegui `bash editor/setup.sh` per installare l'editor.

Lo script è sicuro da rilanciare e fa quattro cose:

1. scarica la skill **video-use** da GitHub e le sue librerie Python
2. installa le skill di **HyperFrames** (`hyperframes`, `hyperframes-cli`, `hyperframes-registry`, `media-use`,
   `remotion-to-hyperframes`)
3. installa i componenti delle grafiche (`npm ci` in `editor/remotion`: React, Remotion, font)
4. installa **OpenCV** e **numpy** per la camera

Claude ti chiederà conferma prima di eseguirlo, perché scarica ed esegue codice di terze parti: è normale.

**Il modello per lo sfondo** (serve solo se vuoi cambiare la stanza dietro di te). Chiedi a Claude:

> Scarica `rvm_mobilenetv3_fp32.onnx` dalle release di github.com/PeterL1n/RobustVideoMatting e mettilo in
> `editor/assets/models/`.

### Come è organizzato il progetto

| Cartella | Cosa contiene |
|---|---|
| `.claude/skills/` | le skill: le 5 dell'editor (`motion-*`) più quelle pubbliche installate |
| `editor/remotion/src/styles/originals/` | gli **stili** (style pack): `pulse`, `zane`, `apple` — colori, grafiche, sottotitoli |
| `editor/assets/sfx/` | la libreria degli effetti sonori (`catalog.json`) |
| `editor/assets/music/` | la musica generata |
| `editor/styles/` | brand kit e regole di movimento (es. `editor/styles/zane/`) |
| `editor/videos/<nome>/` | un video: il girato, e in `edit/` tutto il lavoro (piano, progetto, render, revisione) |
| `editor/README.md` | descrizione tecnica dell'editor |

---

## 8. Le skill: la squadra

Una **skill** è una cartella con un file `SKILL.md`: istruzioni scritte in linguaggio normale che Claude legge prima
di fare un lavoro. L'editor ne usa due pubbliche e cinque proprie, come i ruoli di una casa di produzione:

| Skill | Ruolo | Cosa produce |
|---|---|---|
| `video-use` | il montatore | trascrizione, tagli, `base.mp4` |
| `motion-director` | il regista | `MOTION-BRIEF.md` (piano a 5 colonne) e `motion-plan.json` |
| `motion-design` | il direttore artistico | colori, font, spazi (`DESIGN.md`) |
| `motion-library` | il vocabolario del movimento | 90+ ricette di animazione indicizzate per verbo |
| `motion-hyperframes` | l'esecutore | grafiche, camera, suono → `final.mp4` |
| `motion-review` | il revisore | controllo fotogramma per fotogramma, `MOTION-REVIEW.md` |

Ordine di lavoro: **video-use → motion-director → motion-design → motion-library → motion-hyperframes → motion-review**.
Il file `CLAUDE.md` alla radice del progetto lo ricorda a Claude in ogni sessione.

---

## 9. Passo 4 — Girare bene (cambia tutto)

- **Formato:** verticale 9:16 per i reel, 4K se puoi (si lavora su una copia leggera e si rende in alta qualità).
- **Inquadratura fissa**, tu al centro dalla vita in su, **spazio sopra la testa** (lì vanno le grafiche).
  Con webcam tipo Insta360 Link: tracking e zoom automatico **spenti**, esposizione e bilanciamento del bianco bloccati.
- **Luce** davanti a te, uniforme. **Audio** con un microfono, non quello della camera.
- **Sbagli una frase? Ripetila da capo.** Il montatore tiene l'ultima ripresa buona.
- Se mostri un programma o un sito, **registra anche lo schermo**.
- Video HDR dell'iPhone vanno bene: vengono convertiti in automatico.

---

## 10. Passo 5 — Montare il primo reel

1. **Carica il girato su Google Drive**, condividilo con "Chiunque abbia il link" e copia il link.
2. **Apri una sessione nuova** su Claude Code (una per video: costa molto meno, vedi sezione 12).
3. Scrivi, per esempio:

> Monta questo video come reel in stile **Pulse**: [link Drive]. Si chiama `video5`.
> Parla di [argomento]. L'hook è [cosa deve vedersi nei primi secondi].
> Prima di costruire mostrami il piano delle grafiche.

4. Claude scarica il video, lo trascrive, taglia, e ti mostra il **piano**: tempo per tempo, cosa dici e che grafica
   compare. **Leggilo bene e correggilo adesso**: cambiare il piano costa poco, rifare il video costa molto.
5. Dopo il tuo ok costruisce: grafiche (3–5 minuti di render per 30–40 secondi), camera, suono, revisione.
6. Ti manda `final.mp4`. Per le modifiche, scrivi cosa non va in modo preciso ("la card copre la testa al
   secondo 12", "l'hook è debole, voglio vedere subito il prodotto").

**Stili pronti**

| Stile | Look |
|---|---|
| `pulse` (default) | fondo chiaro color pesca, tu dentro una cornice arancione in basso, grafiche bianche sopra |
| `zane` | metodo Zane Hoyer: nero-verde con accento lime, movimenti a molla, testo cinetico, capitoli |
| `apple` | bianco Apple, vetro chiaro, accento blu, movimenti morbidi |

Per uno stile nuovo: dai a Claude dei **video di riferimento** (meglio del descrivere a parole) e chiedigli di
analizzarli e proporti lo stile **prima** di costruirlo.

---

## 11. Le regole d'oro (imparate sbagliando)

1. **Tutto ciò che appare è inerente a ciò che si dice.** Se parli di WhatsApp, nel telefono c'è la chat con quel
   messaggio, non la tua faccia.
2. **Mai grafiche sulla testa o sul viso.** Stanno nello spazio libero o dietro la persona.
3. **Hook:** nei primi 0,5 secondi deve vedersi subito la cosa di cui parli.
4. **Piano approvato prima di costruire**, sempre.
5. **Dati verificati:** numeri e nomi detti nel video si controllano alla fonte prima di montare.
6. **Ogni errore diventa una regola:** quando qualcosa non va, chiedi a Claude di scriverlo nelle istruzioni della
   skill giusta. Così non si ripete.
7. **Niente materiale di altri nel repository** se è pubblico: trailer, loghi, video di riferimento restano fuori.

---

## 12. Costi e consumo

- **Render** (grafiche, camera, audio): gira nel cloud, **non consuma token**.
- **Token di Claude:** un reel con uno stile già pronto, in una **sessione nuova**, sta intorno a 20–30 passaggi
  (2–4 milioni di token letti, quasi tutti in cache, e 20–30 mila scritti). Ogni giro di correzioni aggiunge il 30–50%.
  Con l'abbonamento non paghi a token, ma consumi i limiti del piano.
- **Per risparmiare:** una sessione per video · stile già pronto · piano corretto al primo colpo · richieste di
  modifica precise.
- **ElevenLabs:** centesimi a reel. **Higgsfield:** solo se generi immagini o B-roll, a crediti (Claude ti dice il
  costo prima).

---

## 13. Strada B — costruirlo da zero con Claude

Se vuoi rifare tutto da capo, in un repository vuoto, procedi per tappe e fai una sessione per tappa:

1. *"Voglio un editor video gestito da te. Installa la skill pubblica video-use (github.com/browser-use/video-use) e
   le skill di HyperFrames. Collega la trascrizione di ElevenLabs con la chiave in `ELEVENLABS_API_KEY`. Fai una prova
   su questo video: trascrivi e taglia pause ed errori."*
2. *"Creiamo uno style pack di grafiche in React con Remotion, renderizzate da HyperFrames su fondo trasparente:
   sottotitoli animati con parola chiave evidenziata, card, contatori, telefono 3D. Ecco i miei riferimenti: […]"*
3. *"Scrivi una camera virtuale in Python con OpenCV: zoom sulle parole chiave e movimenti morbidi sul girato, poi
   metti sopra le grafiche."*
4. *"Aggiungi il suono: libreria di effetti, uno per ogni animazione, musica generata in locale, voce trattata,
   master a −14 LUFS."*
5. *"Scrivi le skill della squadra: regista (piano a 5 colonne da approvare), direttore artistico, libreria di
   ricette di movimento, esecutore, revisore che controlla fotogramma per fotogramma."*
6. *"Fai uno script di installazione che rimette in piedi tutto in un ambiente nuovo."*

Dopo ogni tappa: prova su un video vero, guarda il risultato, e trasforma ogni difetto in una regola scritta.

---

## 14. Problemi comuni

| Problema | Soluzione |
|---|---|
| "Host non consentito" o download bloccato | aggiungi il dominio indicato agli *Allowed domains* dell'ambiente (sezione 6) |
| Trascrizione non parte (errore 401) | chiave ElevenLabs mancante o senza permesso "speech to text"; rimettila nelle impostazioni dell'ambiente e apri una sessione nuova |
| Link di YouTube non scaricabile | YouTube blocca i server: scarica il video tu, caricalo su Drive e passa il link di Drive |
| Colori strani o slavati da iPhone | è HDR: chiedi a Claude di convertirlo in SDR prima di montare (lo fa da solo di solito) |
| "No space left on device" | chiedi a Claude di cancellare render e file intermedi dei video vecchi |
| Render lento | normale: 3–5 minuti di grafiche per 30–40 secondi; lo scontorno dello sfondo è il passaggio più lento |
| Il risultato non ti piace | non correggere a mano: spiega a Claude cosa non va e chiedigli di scriverlo nelle regole |

---

*Domande? Il file `editor/README.md` descrive il motore in dettaglio, e ogni skill ha il suo `SKILL.md` in
`.claude/skills/`.*
