---
name: motion-library
description: Il vocabolario del movimento. Ricette di animazione (oggetti, testo, camera, sfondi, transizioni, dati, interfacce, accenti) indicizzate per verbo ("perdere", "unire", "crescere", "sbagliare"…), ognuna con cosa comunica, come si fa (in GSAP, con la traduzione in Remotion e i componenti già pronti dello style pack Pulse), il suono adatto e i difetti da evitare. Usare quando si deve trasformare una frase in un'azione visiva o scegliere come animare un elemento.
---

# Motion Library

Ricevi un **verbo** (o un'intenzione: "perdere tempo", "unire due cose", "rivelare un segreto") e restituisci la
ricetta giusta, con i parametri. Le ricette sono in `references/`, una categoria per file:

| File | Contenuto |
| --- | --- |
| `references/oggetti.md` | oggetti 3D scontornati: cadute, rotazioni, ombre, scintille, rotture, incastri |
| `references/testo.md` | tipografia cinetica: entrate, parole chiave, contatori, cancellature, timbri |
| `references/camera.md` | movimenti sul footage e sulla scena: punch-in, whip, shake, rack focus, parallasse |
| `references/sfondi.md` | fondi e atmosfere: griglie, bagliori, scrim, carta, rumore |
| `references/transizioni.md` | passaggi tra scene: wipe, match cut, morph, flash, maschere |
| `references/dati.md` | numeri e confronti: contatori, barre, prima/dopo, timeline, classifiche |
| `references/ui.md` | interfacce: chat, notifiche, cursori, finestre, commenti, pulsanti |
| `references/accenti.md` | particelle, linee, frecce, cerchiature, luci, scintille |
| `references/remotion.md` | **componenti già pronti** (React, disegnati da HyperFrames) (Pulse: rec, pile, hours, claude, zero, send, phone, trio, guidebook, dm…) e come tradurre le ricette GSAP in Remotion |

## Come scegliere

1. Prendi il **verbo** della frase (non il sostantivo). "Ci perdete ore" → *perdere* (tempo).
2. Guarda prima i **componenti pronti** in `references/remotion.md` (colonna Verbi): se uno va bene, usalo.
   Altrimenti cerca il verbo nell'indice qui sotto → 1–3 ricette candidate, da scrivere come componente React dello style pack.
3. Scegli quella che il materiale regge (c'è un oggetto? c'è spazio sotto il viso? la frase dura 0,8 s o 3 s?).
4. Consegna: id della ricetta + parametri adattati (tempi sulla parola, dimensioni nella zona libera, suono).

## Indice per verbo

| Verbo / intenzione | Ricette |
| --- | --- |
| arrivare, ecco, presentare | `oggetto/caduta-rimbalzo`, `testo/slam`, `ui/notifica-scende` |
| perdere, sprecare, svanire | `oggetto/dissolvenza-polvere`, `dati/contatore-che-scende`, `oggetto/clessidra-svuota`, `testo/cancellatura` |
| tempo, ore, aspettare | `dati/orologio-veloce`, `oggetto/clessidra-svuota`, `dati/barra-caricamento-lenta` |
| unire, collegare, insieme | `oggetto/incastro`, `accenti/linea-che-collega`, `testo/parole-che-si-fondono` |
| separare, dividere, tagliare | `oggetto/taglio-netto`, `transizioni/split`, `testo/parola-spezzata` |
| crescere, aumentare, scalare | `dati/barra-che-sale`, `dati/contatore-che-sale`, `oggetto/crescita-scala` |
| sbagliare, no, rifiutare | `testo/timbro`, `accenti/croce-disegnata`, `camera/shake-colpo`, `camera/desaturazione` |
| sì, fatto, risolto | `accenti/spunta-disegnata`, `ui/pulsante-premuto`, `accenti/burst-lime` |
| rivelare, segreto, scoprire | `oggetto/scatola-si-apre`, `testo/tessere-che-si-girano`, `transizioni/maschera-cerchio`, `accenti/luce-che-passa` |
| scegliere, confrontare | `dati/prima-dopo`, `transizioni/split`, `testo/lista-che-si-spunta` |
| inviare, mandare, condividere | `accenti/aeroplanino-scia`, `ui/messaggio-inviato`, `ui/commento-scritto` |
| scrivere, chiedere, commentare | `ui/digitazione`, `ui/commento-scritto`, `ui/chat-bolla` |
| costruire, creare, montare | `oggetto/assemblaggio`, `dati/progress-checklist`, `testo/parola-per-parola` |
| distruggere, uccidere, fine | `oggetto/lapide-cade`, `oggetto/rottura-vetro`, `camera/shake-colpo` |
| velocità, subito, veloce | `camera/whip`, `accenti/linee-di-velocita`, `testo/slam` |
| pesare, troppo, accumulare | `oggetto/pila-che-crolla`, `oggetto/pioggia-oggetti`, `camera/push-lento` |
| guardare, attenzione, questo | `accenti/cerchiatura`, `accenti/freccia-disegnata`, `camera/punch-in` |
| soldi, guadagnare, costare | `oggetto/monete-pioggia`, `dati/contatore-valuta`, `oggetto/caduta-rimbalzo` |
| tre/quattro cose, lista | `testo/lista-che-si-spunta`, `testo/tessere-che-si-girano`, `dati/griglia-icone` |
| io, me, risultato, questo video | `camera/zoom-out-schermo`, `ui/telefono-3d`, `camera/punch-in` |
| regalo, gratis, guida | `oggetto/libro-3d-fluttua`, `oggetto/scatola-si-apre`, `accenti/bollino-timbro` |

## Regole dure (valgono per tutte le ricette)

- **Deterministico**: tutto è funzione del fotogramma (`useCurrentFrame()`), niente `Math.random()` non seminato
  (`seeded()`), niente timer né animazioni CSS. Cicli = funzioni periodiche del frame. Rumore = funzione seminata del tempo.
- Le ricette sono scritte in GSAP (`fromTo`, easing): traducile con la tabella di `references/remotion.md`.
  Si animano le trasformazioni, mai `left/top/width/height` frame per frame.
- Nessun easing `linear`, tranne rotazioni continue e scorrimenti.
- Il colpo (atterraggio, scatto, timbro) cade sul tempo della parola chiave: l'entrata parte prima.
- Ogni ricetta che produce un evento visibile ha un suono suo, diverso dagli altri del video.

## Quando inventi

Se nessuna ricetta va bene, inventala e, se funziona nel video, aggiungila al file della sua categoria con lo stesso
formato (verbi, come, suono, difetti) e nell'indice. È così che il vocabolario cresce.
