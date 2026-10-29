# Motion review — video3

Video: `final.mp4` — 33,9 s (32,6 s di montato + 1,3 s di fermo finale). Fogli: `review/sheet_01…09.jpg` (68 fotogrammi:
entrata, colpo e fine di ogni scena, prima/dopo ogni taglio, inizio e fine).

## Audio

- Master **-14.1 LUFS** (obiettivo −14), true peak **-1.4 dBTP** (≤ −1).
- Voce -15.7 LUFS dopo EQ + compressione; 36 effetti, tutti diversi, da -4.2 a -8.9 dB dalla voce
  (obiettivo ~−7: 22 su 36 esattamente a −7 ±0,5; gli scarti sono effetti che si sommano, es. il riser sotto le spunte).
- Non posso ascoltare: sono misure.

## Difetti (tempo esatto → cosa → correzione)

| Tempo | Difetto | Correzione | Stato |
| --- | --- | --- | --- |
| 0,00 | Primo fotogramma nero nel composto (il fondo del riquadro "telefono" partiva prima del footage) | `compose.py`: fondo ricavato dallo stesso flusso video | corretto |
| tutto | True peak −0,8 dBTP | limitatore dopo il loudnorm (TP −1,5 in normalizzazione) | corretto (−1,4) |
| tutto | Effetti da −1,5 a −13 dB dalla voce: normalizzati sulla loudness media del file (i colpi brevi uscivano forti) | normalizzazione sul picco di loudness a 400 ms | corretto |
| 25,15 | Riser "collegamento" muto: il riser di media-use culmina a ~4 s, non alla fine come dice il suo manifest | variante ricavata da 2,0–4,3 s, posizionata perché culmini su «insieme» | corretto |
| 5,55 | Pila: i pezzi partivano 900 px più in alto e passavano sul viso | partono 280 px sopra il loro posto | corretto prima del render |
| 6,1 / 8,4 | Cubo sospeso troppo vicino al mento | quota di attesa abbassata | corretto prima del render |
| sottotitoli | Gruppi spezzati male ("Questo video non / l'ho montato io") | gruppi scelti a mano per senso; parole chiave nella grafia detta ("DM", "Claude") | corretto |
| 3,87 · 5,70 | «LA PARTE FACILE» e «ore E ore» restano ~0,6 s (sotto la soglia di lettura di HyperFrames) | accettato: sono colpi sulla parola detta, la voce li dice insieme | resta |
| 16,9–17,1 | I timbri "0 TAGLI / 0 APP" restano 0,2 s sopra la frase successiva | accettato (allungati apposta perché si leggano) | resta |

## Checklist prima di pubblicare

- [x] Nessuna pausa o ripresa sbagliata rimasta
- [x] Nulla nelle zone coperte da Instagram (la scia dell'aeroplanino attraversa la zona a destra per 0,3 s, è solo movimento)
- [x] Nessuna sovrapposizione testo/oggetto, nulla sul viso
- [x] Sottotitoli corretti (verificati sulla trascrizione)
- [x] Ogni effetto si sente, ma la voce domina (misurato)
- [x] Primo secondo che ferma lo scroll (ciak già in volo al fotogramma 0)
