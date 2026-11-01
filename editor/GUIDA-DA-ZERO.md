# Editor video con l'AI — guida da zero

Questa guida spiega come costruirsi da soli, da zero, un editor che monta reel e video con Claude Code: tagli,
grafiche animate, sottotitoli, zoom, sfondo, effetti sonori, musica e revisione finale. Non serve saper programmare:
il codice lo scrive Claude. Tu gli dai le istruzioni giuste, nell'ordine giusto, e controlli il risultato a ogni fase.

Il percorso è diviso in 10 fasi. Ogni fase ha: cosa costruire, il messaggio da scrivere a Claude e come verificare
che funzioni. Fai **una sessione di Claude Code per fase**: costa meno e Claude lavora meglio.

---

## 1. Come funziona (in una figura)

```
girato ──► trascrizione + tagli ──► piano delle grafiche ──► grafiche (video trasparente)
                                          (lo approvi tu)              │
                         camera virtuale sul girato  ◄─────────────────┘
                                          │
                         suoni + musica + volume finale ──► revisione ──► video finito
```

- **Claude Code** è il cervello: legge le istruzioni, lancia i programmi, costruisce il video.
- Le **skill** sono le istruzioni: cartelle con un file `SKILL.md` che insegnano a Claude un mestiere.
- Le **grafiche** sono pagine web (componenti React) trasformate in video trasparente e messe sopra il girato.

---

## 2. Cosa ti serve

| Cosa | Perché | Costo |
|---|---|---|
| Account **Claude** con piano **Pro** o **Max** | Claude Code fa tutto il lavoro | abbonamento (Max se monti spesso) |
| Account **GitHub** | il progetto vive in un repository tuo, privato | gratis |
| Account **ElevenLabs** con una chiave API | trascrizione parola per parola (Scribe) | pochi centesimi a reel |
| **Google Drive** | per passare il girato a Claude | gratis |

Tutto il resto è gratuito e open source:

| Strumento | A cosa serve |
|---|---|
| **video-use** (github.com/browser-use/video-use) | skill pubblica: trascrive, decide i tagli, rende il montato |
| **ElevenLabs Scribe** | la trascrizione con il tempo esatto di ogni parola |
| **FFmpeg** | taglia, converte, mixa audio e video |
| **Remotion** | libreria per scrivere le grafiche come componenti React |
| **HyperFrames** (di HeyGen) | trasforma le grafiche in video trasparente, fotogramma per fotogramma |
| **Python + OpenCV** | la camera virtuale: zoom e movimenti sul girato |
| **RobustVideoMatting** | scontorna la persona per cambiare lo sfondo, senza green screen |

Tempo da mettere in conto: **2–4 giorni** di sessioni per arrivare al primo reel montato bene, poi ogni reel richiede
15–30 minuti di lavoro della macchina.

---

## 3. Fase 0 — Repository e ambiente

1. Su **github.com** crea un repository nuovo, **privato**, per esempio `editor-video`, con un README.
2. Vai su **claude.ai/code**, entra con il tuo account e collega GitHub, dando accesso a quel repository.
3. Crea un **ambiente** (environment). Nelle sue impostazioni:
    - **Network access:** scegli il livello limitato e aggiungi tra gli *Allowed domains*, lasciando attiva la
      casella dei package manager:
      `api.elevenlabs.io`, `github.com`, `raw.githubusercontent.com`, `objects.githubusercontent.com`,
      `registry.npmjs.org`, `pypi.org`, `files.pythonhosted.org`, `drive.google.com`,
      `drive.usercontent.google.com`, `fonts.googleapis.com`, `fonts.gstatic.com`.
      Se più avanti qualcosa viene bloccato, Claude ti dice il nome del dominio: aggiungilo qui.
    - **Chiave di ElevenLabs:** su elevenlabs.io → impostazioni → *API keys* crea una chiave con il permesso
      "speech to text". Aggiungila nelle impostazioni dell'ambiente, tra i *Network secrets* (o come variabile
      d'ambiente) con il nome **`ELEVENLABS_API_KEY`**. **Mai incollarla nella chat.**
4. Apri una sessione nuova sul repository: da qui in poi lavori lì.

Documentazione ufficiale sugli ambienti: https://code.claude.com/docs/en/cloud-environments

---

## 4. Fase 1 — Le fondamenta

Scrivi a Claude:

> Voglio costruire in questo repository un editor video gestito da te, per reel verticali 9:16 a 1080×1920 e 30 fps.
> Crea questa struttura: `editor/` per tutto l'editor, `editor/videos/<nome>/` per ogni video con dentro `edit/` per
> i file di lavoro, `editor/assets/` per suoni, musica e font, `.claude/skills/` per le skill.
> Crea un `CLAUDE.md` alla radice che spiega il progetto e dice di rispondermi in italiano.
> Escludi dal repository con `.gitignore` tutti i video e gli audio (`mp4`, `mov`, `webm`, `wav`, `mp3`), le immagini
> generate dentro `editor/videos/` e `node_modules`.
> Poi scrivi `editor/setup.sh`, uno script da rilanciare senza danni, che controlla ffmpeg, Node.js 22+ e Python 3,
> e installa: la skill pubblica video-use da github.com/browser-use/video-use dentro `.claude/skills/video-use`
> con le sue librerie Python, e le skill di HyperFrames con `npx hyperframes skills update`.
> Chiedimi conferma prima di eseguire codice scaricato da internet. Poi eseguilo.

**Verifica:** in `.claude/skills/` c'è `video-use`, e Claude elenca le skill di HyperFrames installate.

---

## 5. Fase 2 — Il montatore (trascrizione e tagli)

Carica su Google Drive un video di prova da 30–60 secondi girato col telefono, condividilo con "Chiunque abbia il
link" e scrivi:

> Scarica questo video in `editor/videos/prova/`: [link Drive]. Se è HDR (iPhone) convertilo in SDR a 1080×1920.
> Usa la skill video-use: trascrivilo con ElevenLabs Scribe usando la chiave in `ELEVENLABS_API_KEY`, poi taglia via
> tutte le pause sopra 0,25 secondi e le riprese sbagliate (tieni sempre l'ultima buona), con un margine piccolo ai
> bordi e 30 ms di dissolvenza audio su ogni taglio. Rendi `edit/base.mp4` senza sottotitoli.
> Poi scrivi uno script `timeline.py` che crea `edit/words_out.json`: ogni parola con il suo tempo nel video tagliato.

**Verifica:** guarda `base.mp4`. Non devono esserci pause lunghe né errori, e i tagli non devono "schioccare".

---

## 6. Fase 3 — Le grafiche

È la fase più importante. Le grafiche si scrivono in React con Remotion e si rendono con HyperFrames su fondo
trasparente.

> Crea in `editor/remotion/` un progetto React con Remotion. Le grafiche e i sottotitoli devono essere componenti
> React che ricevono il fotogramma corrente e disegnano quel fotogramma, con animazioni a molla (spring).
> Crea il mio primo **style pack**: un insieme di colori, font e componenti con un'identità precisa. [Descrivi qui il
> tuo stile: colori, font, che aspetto devono avere sottotitoli e card. Meglio ancora, allega 2–3 screenshot o
> video di riferimento.]
> Componenti di partenza: sottotitoli animati parola per parola (2–3 parole alla volta, la parola chiave evidenziata),
> una card con titolo e testo, un contatore che sale, una chat di WhatsApp che si scrive da sola, un telefono 3D con
> dentro un'immagine.
> Poi scrivi `scripts/hf-project.ts`, che genera un progetto HyperFrames da un file `edit/reel.json` (le grafiche
> con i loro tempi e i sottotitoli da `words_out.json`), e rendi le grafiche in un video trasparente
> `edit/graphics.webm` a 1080×1920 e 30 fps con `npx hyperframes render`.

**Regole da dare subito a Claude** (sono quelle che costano di più se le scopri dopo):
- **Zone sicure di Instagram:** niente di importante sopra i 250 px in alto né sotto i 1720 px in basso, almeno 55 px
  dai lati e niente a destra oltre x 930 da y 1250 in giù (lì ci sono i pulsanti).
- Le immagini dentro le grafiche vanno **precaricate**: il primo fotogramma del video deve essere già completo,
  perché diventa la copertina nel feed.
- Il girato dentro le grafiche (un pezzo del video in un telefono) va trasformato in un **foglio di fotogrammi**
  (sprite) e disegnato fotogramma per fotogramma, sennò nel render non si vede.

**Verifica:** chiedi a Claude delle anteprime (`npx hyperframes snapshot`) di 5–6 momenti e guardale.

---

## 7. Fase 4 — Il piano e il progetto del video

> Definisci il formato del piano di un video, `edit/motion-plan.json`: una lista di scene, ognuna con inizio, fine,
> la frase detta, la grafica (tipo, proprietà, posizione) e gli effetti sonori, con tutti i tempi in secondi del
> video tagliato. Accanto al piano scrivi sempre `MOTION-BRIEF.md`, una tabella leggibile da me con cinque colonne:
> tempo · cosa si dice · grafica · girato integrato · movimento.
> Scrivi `plan_to_reel.py`, che trasforma il piano in `reel.json` per le grafiche.

**Verifica:** su un video di prova Claude ti mostra il `MOTION-BRIEF.md`, e tu riesci a capirlo senza leggere codice.

---

## 8. Fase 5 — La camera virtuale

> Scrivi `camera.py` in Python con OpenCV e numpy: prende `base.mp4`, applica una camera fotogramma per fotogramma
> (zoom secco "punch" sulle parole chiave, una spinta lenta dentro ogni inquadratura, movimenti morbidi e precisi al
> sub-pixel, con prospettiva vera) e mette sopra `graphics.webm`, producendo `edit/video.mp4` muto.
> I momenti degli zoom li legge dal piano. Aggiungi un'opzione per fare solo dei fotogrammi di prova.

**Verifica:** `video.mp4` deve sembrare girato da un operatore, senza scatti né tremolii.

---

## 9. Fase 6 — Il suono

> Crea `editor/assets/sfx/` con una libreria di effetti sonori (`catalog.json` con nome e descrizione di ognuno):
> generali in locale con FFmpeg o sintesi in Python, uno per ogni tipo di animazione (clic, messaggio inviato, card
> che entra, contatore che sale, timbro, whoosh).
> Scrivi `music.py`, che compone in locale una base musicale originale della durata del video (niente licenze).
> Scrivi `compose.py`, che: tratta la voce (EQ e compressione), mette ogni effetto al suo tempo, tutti allo stesso
> livello circa 7 dB sotto la voce, mette la musica circa 9–10 dB sotto la voce e la abbassa da sola quando parlo,
> e porta il master a −14 LUFS. Risultato: `edit/final.mp4`.

**Verifica:** ascolta in cuffia. La voce è sempre chiara, la musica non copre mai le parole e gli effetti non
spaccano le orecchie.

---

## 10. Fase 7 — La squadra (le 5 skill)

Adesso trasformi tutto quello che hai costruito in **istruzioni permanenti**, così ogni video segue lo stesso metodo.

> Scrivi cinque skill in `.claude/skills/`, ognuna con il suo `SKILL.md` in italiano:
> 1. **motion-director** (il regista): dalla trascrizione scrive il piano a 5 colonne e `motion-plan.json`. Regole:
>    tutto ciò che appare è inerente a ciò che si dice; mai grafiche sul viso; nei primi 0,5 secondi si vede subito
>    la cosa di cui si parla; il piano va **sempre** mostrato e approvato prima di costruire.
> 2. **motion-design** (il direttore artistico): colori, font, spazi e leggibilità dello stile, prima del codice.
> 3. **motion-library** (il vocabolario del movimento): ricette di animazione indicizzate per verbo ("perdere",
>    "unire", "crescere", "sbagliare"…), ognuna con cosa comunica, come si fa, il suono adatto e gli errori da evitare.
> 4. **motion-hyperframes** (l'esecutore): i passaggi in ordine, con i comandi esatti, dal piano a `final.mp4`.
> 5. **motion-review** (il revisore): guarda il video fotogramma per fotogramma, misura l'audio, segna i difetti con
>    il tempo esatto in `MOTION-REVIEW.md` e li fa correggere prima della consegna.
> Aggiorna `CLAUDE.md`: per qualsiasi richiesta di montare un video, segui l'ordine video-use → motion-director →
> motion-design → motion-library → motion-hyperframes → motion-review.

**Verifica:** in una sessione nuova scrivi solo "monta questo video" con un link, e Claude deve seguire da solo tutto
il processo, fermandosi a mostrarti il piano.

---

## 11. Fase 8 — Gli extra (quando il resto funziona)

**Sfondo diverso dietro di te**
> Scarica il modello `rvm_mobilenetv3_fp32.onnx` dalle release di github.com/PeterL1n/RobustVideoMatting in
> `editor/assets/models/` e scrivi `background.py`: scontorna la persona da `base.mp4` fotogramma per fotogramma
> (stabile, senza aloni sui capelli) e mette dietro un'immagine che scelgo io. Salva anche la maschera.

**Testo dietro la persona**, come nei video più curati:
> Usa la maschera dello scontorno per mettere certe grafiche dietro la persona: rendile a parte e incollale nel
> fondo, bucate dove c'è la persona.

**Stili in più:** dai a Claude un video di riferimento e chiedigli di analizzarlo (colori, font, ritmo, animazioni)
e di **proporti** lo stile prima di costruirlo come nuovo style pack.

---

## 12. Fase 9 — Il primo reel vero

1. Gira bene (vedi sotto), carica su Drive con "Chiunque abbia il link".
2. **Sessione nuova** e scrivi:

> Monta questo video come reel: [link Drive]. Si chiama `reel1`. Parla di [argomento].
> L'hook deve mostrare subito [cosa]. Mostrami il piano prima di costruire.

3. Correggi il **piano**, non il video: costa molto meno.
4. Dopo il video, ogni difetto diventa una regola: *"Scrivi nella skill giusta che non deve più succedere."*

**Come girare**
- Verticale 9:16, inquadratura fissa, tu al centro dalla vita in su, **spazio sopra la testa** per le grafiche.
- Con webcam come la Insta360 Link: tracking e zoom automatico **spenti**, esposizione e bilanciamento bloccati.
- Luce davanti, microfono vero. Sbagli una frase? **Ripetila da capo**: si tiene l'ultima buona.

---

## 13. Le regole d'oro

1. **Tutto ciò che appare è inerente a ciò che si dice.** Se parli di WhatsApp, nel telefono c'è quella chat.
2. **Mai grafiche sulla testa o sul viso.**
3. **Hook:** nei primi 0,5 secondi la cosa di cui parli, a schermo.
4. **Piano approvato prima di costruire**, sempre.
5. **Numeri e nomi verificati alla fonte** prima di montarli.
6. **Ogni errore diventa una regola scritta** nella skill giusta.
7. **Una sessione per fase, poi una sessione per video.**
8. **Niente materiale di altri** (trailer, video di riferimento, loghi) nel repository.

---

## 14. Costi e consumo

- **Render** di grafiche, camera e audio: gira nel cloud, **non consuma token**.
- **Token di Claude:** costruire l'editor è la parte pesante (più sessioni lunghe). Dopo, un reel con uno stile già
  pronto, in una sessione nuova, sta intorno a 20–30 passaggi; ogni giro di correzioni aggiunge il 30–50%.
  Con l'abbonamento non paghi a token, ma consumi i limiti del piano.
- **ElevenLabs:** centesimi a reel.

---

## 15. Problemi comuni

| Problema | Soluzione |
|---|---|
| Download bloccato, "host non consentito" | aggiungi il dominio indicato agli *Allowed domains* dell'ambiente |
| Trascrizione non parte (errore 401) | chiave ElevenLabs mancante o senza "speech to text": rimettila nell'ambiente e apri una sessione nuova |
| Link di YouTube non scaricabile | YouTube blocca i server: scaricalo tu e passalo da Drive |
| Colori slavati dal video dell'iPhone | è HDR: va convertito in SDR prima di montare |
| Primo fotogramma nero o grafica vuota | le immagini non erano precaricate: chiedi di precaricarle e di disegnare i clip come sprite |
| "No space left on device" | fai cancellare render e file intermedi dei video vecchi |
| Render lento | normale: 3–5 minuti di grafiche per 30–40 secondi; lo scontorno dello sfondo è il passaggio più lento |
| Il risultato non ti piace | non correggere a mano: spiega a Claude cosa non va e fallo scrivere nelle regole |
