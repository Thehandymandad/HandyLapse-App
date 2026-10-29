# Motion review — video4

Video: `final.mp4` — 46,13 s (44,82 s di parlato a 1,1x + 1,3 s di fermo). Fogli: `review/sheet_*.jpg`, still in
`review/stills/`.

## Audio

Master −14,1 LUFS, true peak −2,9 dBFS. Voce −15,4 LUFS; musica −30,3 LUFS durante il parlato; 39 effetti.

## Difetti (tempo esatto → cosa → correzione)

| Tempo | Difetto | Correzione | Stato |
| --- | --- | --- | --- |
| montato | Ripresa «Niente programmi nuovi,» interrotta; pausa di 0,8 s tra «WhatsApp:» e «Lastre» | tolti nell'EDL | corretto |
| montato | «Lastre» spariva dai sottotitoli (centro della parola nella pausa tagliata) | `timeline.py` tiene la parola nel pezzo dove cade di più | corretto |
| tutto | Sfondo: parete bianca e letto a castello → studio da programmatore | `background.py` (RVM + immagine generata); resto di sfondo vecchio tra braccio e busto solo sotto y 1400, fuori dalla cornice | corretto |
| 2,3 | Contatore «× 4» sopra il primo fumetto | tolto | corretto |
| 19,6 | Timbro «0 gestionali da imparare» usciva dallo schermo | «0 gestionali» | corretto |
| 28,4–29,5 | 1,2 s senza grafica su «Così chiunque» | tessera CHIUNQUE | corretto |
| 33,4–37,2 | Tessere 3D laterali tagliate, etichette che si toccano | tessere più vicine e più piccole con 3–4 elementi, «TELEFONO» | corretto |
| fine | La scena finale finiva prima del fermo dopo l'accelerazione | `speed.py` non accelera il fermo finale | corretto |

## Checklist prima di pubblicare

- [x] Nessuna pausa o ripresa sbagliata rimasta
- [x] Nulla nelle zone coperte da Instagram (vista iPhone simulata)
- [x] Nessuna grafica dentro la cornice
- [x] Sottotitoli corretti («Lastre» ripristinato)
- [x] Ogni effetto si sente, ma la voce domina
- [x] Il primo secondo ferma lo scroll (domande in chat dal fotogramma 0)
