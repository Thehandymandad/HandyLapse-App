---
name: motion-director
description: Il regista. Inventa le scene e scrive il piano visivo di un reel o di un video motion a partire da un argomento, uno script, una trascrizione con tempi o un video di riferimento. Usare dopo i tagli di video-use e prima di progettare (motion-design) o animare (motion-remotion) qualsiasi grafica.
---

# Motion Director

Decidi **cosa succede sullo schermo** in ogni momento del video. Non scrivi codice e non scegli colori: quello è di
motion-design e motion-remotion. Il tuo lavoro finisce quando ogni frase del parlato ha la sua azione visiva, con il
suo tempo, il suo suono e il suo oggetto.

## Cosa ricevi

- L'idea, lo script o il tema del video (dall'utente).
- La trascrizione parola per parola **già tagliata**: `edit/takes_packed.md` + `edit/edl.json` di video-use.
  I tempi del piano sono sulla **timeline di uscita** (dopo i tagli):
  `t_uscita = parola.start − range.start + offset_del_range`, dove l'offset è la somma delle durate dei range precedenti.
  Lo script `.claude/skills/motion-remotion/scripts/timeline.py` lo fa per te (`words` → `edit/words_out.json`).
- I riferimenti visivi, se ci sono (video o immagini che piacciono all'utente). **Guardali davvero**: estrai fotogrammi
  (`ffmpeg -i ref.mp4 -vf fps=4,scale=360:-2,tile=6x5 ref-%02d.jpg`) e annota ritmo, entrate, densità, tipo di oggetti.

## Cosa consegni

1. `edit/MOTION-BRIEF.md`: il film in parole. Una riga di intento, il tono, poi una tabella
   `tempo | frase detta | cosa succede sullo schermo | ricetta | suono`. Chiudi con l'elenco degli oggetti 3D.
2. `edit/motion-plan.json`: lo stesso piano in forma eseguibile (schema sotto). È l'unica fonte dei tempi per chi anima.

## Regole dure

- **Ogni frase è un'azione.** Ogni frase del parlato fa succedere qualcosa di osservabile: un verbo, non un aggettivo,
  non un titolo. "Ha ucciso" → una lapide che cade. "Ci perdete ore" → un orologio che corre e si scarica. "Unisce" →
  due pezzi che si incastrano. Se una parola importante non fa succedere niente, manca un'idea: trovala.
- **Il colpo cade sulla parola.** L'atterraggio di ogni animazione (`payoff.t`) coincide con il tempo della parola chiave;
  l'entrata parte `reveal` secondi prima. Mai animazioni che arrivano dopo la parola.
- **Una cosa alla volta.** Mai due elementi nuovi che entrano nello stesso istante: uno, pausa, il successivo (≥ 0,25 s).
- **Una scena per passaggio del discorso.** Quando cambia l'idea cambia la scena; dentro la scena gli elementi si
  trasformano invece di sparire e ricomparire.
- **Ogni evento visivo ha il suo suono**, e sono tutti diversi tra loro (campo `sfx`, nome descrittivo dell'evento:
  "lapide-impatto-pietra", non "boom"). Niente suoni senza un evento visibile.
- **Niente di inventato.** Nessun dato, numero, logo, nome o citazione che non sia nel parlato o fornito dall'utente.
  Le statistiche "finte" non si usano.
- **Il primo secondo ferma lo scroll.** Dal fotogramma 0 c'è già qualcosa in movimento sullo schermo.
- **Zone sicure di Instagram** (1080×1920): niente di importante sopra y=280, sotto y=1560, né a destra di x=900 nella
  metà bassa. Il viso non si copre: guarda dove sta nei fotogrammi e metti le grafiche nello spazio libero.
- **Oggetti 3D solo dove servono**: cose concrete nominate o metafore fisiche forti. Per ognuno scrivi il prompt per
  Nano Banana Pro (Google Flow): `render 3D iper-realistico di <oggetto>, <materiale e luce>, su fondo bianco, nient'altro nel frame`.
  Prima controlla se esiste già in `editor/assets/objects/` (la libreria cresce video dopo video). In alternativa
  (o se l'utente lo chiede) l'oggetto si costruisce in **three.js** dentro Remotion (`editor/remotion/src/three/`):
  `{"id": …, "engine": "three.js"}`, forme semplici e riconoscibili (ciak, cubo, libro, moneta…) con materiali lucidi
  e ombra di contatto.

## Libertà

Scegli tu metafora, inquadratura delle grafiche, ritmo, quante scene, se il footage si rimpicciolisce, se una scena va a
tutto schermo. Prima guarda i **componenti già pronti** del motore Remotion (motion-library `references/remotion.md`:
rec, pile, hours, claude, zero, send, phone, trio, guidebook, dm…): sono quelli con le animazioni migliori. Poi le
ricette da motion-library (cerca per verbo) o inventane di nuove: se ne inventi una che funziona, aggiungila alla libreria. Chiedi all'utente solo ciò che manca davvero (es. il nome giusto di un prodotto, un riferimento).

## Processo

1. Leggi `takes_packed.md`, `edl.json` e `words_out.json`; guarda 3–4 fotogrammi del montato per sapere dove sta il viso.
2. Dividi il parlato in passaggi (gancio → problema → svolta → prova → come → CTA, o la forma che ha davvero).
3. Per ogni frase: il verbo chiave → l'azione → il componente o la ricetta (motion-library) → l'oggetto → il suono.
   Le frasi senza grafica hanno comunque un'azione: punch-in della camera sulla parola, parola chiave nei sottotitoli.
4. Scrivi `MOTION-BRIEF.md`, poi `motion-plan.json`. Rileggi la tabella: ogni riga ha un'azione osservabile? Nessun
   ingresso doppio? Nulla nelle zone coperte?

## Schema di `motion-plan.json`

```json
{
  "video": "nome",
  "engine": "remotion",
  "style": "pulse",
  "canvas": { "width": 1080, "height": 1920, "fps": 30 },
  "duration": 33.8,
  "hold": 1.3,
  "face": { "x": 0.5, "y": 0.42, "note": "viso tra y 560 e 1075: sottotitoli a y 1123, grafiche tra y 1190 e 1560" },
  "captions": { "style": "pulse", "emphasis": [9, 21, 28], "words": "edit/words_out.json" },
  "scenes": [
    {
      "id": "s04",
      "start": 7.62,
      "end": 13.12,
      "line": "…con Claude Code. Gli do il video grezzo e lui taglia le pause, scrive i sottotitoli…",
      "action": "Card di Claude con la barra che corre; ogni lavorazione si spunta quando viene nominata.",
      "graphic": {
        "type": "claude",
        "props": { "tasks": ["Taglio pause", "Sottotitoli", "Zoom", "Grafiche"], "checkAt": [9.84, 10.94, 12.18, 12.6] },
        "y": 0.72,
        "scale": 0.85
      },
      "payoff": { "word": "grafiche", "t": 12.6 },
      "sfx": [{ "t": 7.62, "name": "tag-claude" }, { "t": 9.84, "name": "check-1" }]
    }
  ],
  "objects": [
    { "id": "ciak", "prompt": "render 3D iper-realistico di un ciak cinematografico nero con strisce lime, luce da studio morbida, su fondo bianco, nient'altro nel frame", "file": "editor/assets/objects/ciak.png" }
  ],
  "camera": [{ "type": "punch", "t": 2.39, "strength": 0.6, "note": "punch-in su «difficile»" }]
}
```

- Tutti i tempi sono secondi della timeline di uscita (`words_out.json`), anche dentro `graphic.props` (le chiavi che
  finiscono in `At`, `reveal`, `items[].at`): la conversione in frame la fa `plan_to_reel.py`.
- `graphic.type` è un componente dello style pack (o uno nuovo da far scrivere a motion-remotion: descrivilo bene in
  `action`). `y` = centro verticale (0..1), `scale` per farlo stare nello spazio libero.
- `captions.emphasis`: indici delle parole chiave in `words_out.json` (una ogni 2–3 s: numeri, verbi forti, il messaggio).
- `camera`: `punch` (secco, `strength` 0–1) e `push` (lento, con `dur`); i tagli, i tremori e il telefono li fa il pack.
