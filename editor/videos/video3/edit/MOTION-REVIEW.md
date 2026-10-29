# Motion review — video3 (HyperFrames + camera.py, layout della referenza: cornice in basso, tema chiaro, accento arancione)

Video: `final.mp4` — 33,93 s (32,63 s di montato + 1,3 s di fermo). Fogli: `review/sheet_01.jpg` … `sheet_09.jpg`,
still prima del render in `review/stills/sheet.jpg`.

Motore: grafiche e sottotitoli Pulse disegnati da HyperFrames (2 min), camera con `camera.py` (1 min), suono (40 s):
3 min 42 s in tutto, contro gli ~8 min del render Remotion. Confronto fotogramma per fotogramma con il render
Remotion dello stesso progetto: SSIM medio 0,987, minimo 0,977 (differenze di codifica e del vetro delle card, che
senza il footage dietro non sfoca lo sfondo).

## Audio

Master −14,0 LUFS, true peak −1,5 dBFS. Voce −15,7 LUFS; 27 effetti, tutti tra −5,8 e −9,2 dB dalla voce
(flip-1/2/3 più bassi, −8,3/−8,7/−9,2: clic corti, restano udibili).

## Difetti (tempo esatto → cosa → correzione)

| Tempo | Difetto | Correzione | Stato |
| --- | --- | --- | --- |
| 13,1–33,0 | Card (Claude, timbri, tessere, DM) e guida sotto y=1560 e oltre x=900 | `y`/`scale` per ogni grafica nel piano | corretto |
| 5,0–5,9 | Pila troppo alta (7 pezzi arrivavano al mento) | 4 pezzi + «ORE PERSE», base a y 0,80 | corretto |
| 16,3 | Primo timbro a contatto con i sottotitoli | timbri a y 0,728, scala 0,9 | corretto |
| 4,9–5,2 | I pezzi della pila attraversano il viso mentre cadono (0,3 s) | è il movimento dello stile Pulse: lasciato | accettato |
| tutto | Footage un fotogramma avanti rispetto alla voce (setpts azzerava i 21 ms di ritardo del video) | camera.py legge con i tempi assoluti (`fps=30:start_time=0`) | corretto |
| 6,0 · 13,1 · 14,8 · 25,5 · 29,5 | Fondo nero ai lati durante i whip sui tagli | `camera.py`: bordi del video allungati e sfocati in orizzontale (scia), il fondo Pulse resta solo dietro il telefono | corretto |
| tutto | Richiesta dell'utente: accento arancione Claude elettrico al posto del lime, parlato dentro una cornice con bordo arancione sfocato, grafiche solo fuori | palette `P.accent` #FF6633, `frame` nel piano, maschera `OutsideFrame`, `result` al posto del telefono | fatto |
| tutto | Richiesta dell'utente: come la referenza, cornice in basso, grafiche e sottotitoli sopra, fondo chiaro sfumato arancione | tema chiaro del pack (card bianche, testo nero), sottotitoli Inter + serif corsivo, fondo chiaro in camera.py, mirino REC attorno alla cornice | fatto |
| 1,7–4,6 · 6,2–7,6 · 13,1–14,8 · 16,8–17,8 | Richiesta dell'utente: fascia sopra la cornice vuota troppo a lungo, e alcune animazioni in 3D | bottone 3D REC premuto su «registrare», tessere 3D (martello, videocamera), scheda «Toccato da me» barrata: niente più vuoti | fatto |
| 28,9 | Copertina della guida con «CLAUDE CODE · REMOTION» | `footer` del componente, default «CLAUDE CODE · HYPERFRAMES» | corretto |

## Checklist prima di pubblicare

- [x] Nessuna pausa o ripresa sbagliata rimasta (tagli di video-use)
- [x] Nulla nelle zone coperte da Instagram (a riposo)
- [x] Nessuna sovrapposizione testo/oggetto a riposo
- [x] Sottotitoli corretti (Claude, Code, DM)
- [x] Ogni effetto si sente, ma la voce domina
- [x] Il primo secondo ferma lo scroll (mirino REC che si chiude dal fotogramma 0)
