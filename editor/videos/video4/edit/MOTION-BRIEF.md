# Motion brief — video4 (inventario Excel collegato a WhatsApp)

**Intento**: far capire a chi ha una PMI che chiedere e aggiornare il magazzino da WhatsApp fa risparmiare tempo ogni
giorno. **Tono**: concreto, veloce. Layout della casa (cornice in basso, tema chiaro, accento arancione), sfondo dietro
la persona sostituito con uno studio da programmatore (immagine generata, `background.py`), velocità 1,1x, musica
originale 120 BPM. Tempi della tabella a velocità 1x (motion-plan_1x.json).

| Tempo (s) | Detto | Sullo schermo | Componente | Suono |
| --- | --- | --- | --- | --- |
| 0.00–3.45 | Quante volte al giorno in azienda qualcuno chiede: «Ce l'abbiamo questo pezzo?» | Le domande arrivano in chat una dopo l'altra, alternate, le vecchie salgono; l'ultima è proprio «Ce l'abbiamo questo pezzo?».  | `bubbles` | bolla-1, bolla-2, bolla-3, bolla-4 |
| 3.50–8.15 | E parte la caccia. Apri l'Excel del magazzino, scorri centinaia di righe, controlli la misura, | Il foglio Excel del magazzino entra; su «scorri» le righe volano (centinaia) e frenano; su «misura» si illumina la colonna Misura. | `sheet` | foglio-entra, righe-scorrono, colonna-misura |
| 8.18–9.42 | chiami chi sta in magazzino | Tessera 3D col telefono che atterra girando: CHIAMI IL MAGAZZINO. | `icon3d` | tessera-telefono-chiama, squillo |
| 9.45–11.00 | e intanto è passato un quarto d'ora. | Scheda stile referenza (pillola INTANTO, orologio, «Per una sola domanda», 15 minuti), barra che si riempie fino a «quarto». | `idcard` | scheda-entra-2, orologio |
| 11.03–19.18 | Ora immagina di scrivere su WhatsApp: «Lastre 3 millimetri trasparente, quanti ne abbiamo?» E in due secondi ti arriva la risposta, quanti pezzi hai e dove sono. | Chat WhatsApp col Magazzino: il messaggio si scrive mentre lo dici e parte su «abbiamo»; il bot «sta scrivendo» e su «risposta» arriva: 24 pezzi, scaffale B3; «24 pezzi» si evidenzia su «quanti pezzi», «scaffale B3» su «dove sono». | `whatsapp` | chat-entra, digita-messaggio, invio-messaggio, risposta-messaggio, evidenzia-pezzi, evidenzia-scaffale |
| 19.20–21.97 | Si può fare, si collega l'Excel che usi già a WhatsApp. | Due tessere 3D: EXCEL (verde foglio) su «l'Excel», WHATSAPP (verde chat) su «WhatsApp», poi una linea d'accento le collega con impulsi che corrono. | `icon3d` | tessera-excel, tessera-whatsapp, collega-ping |
| 22.00–24.20 | niente programmi nuovi, niente gestionali da imparare. | Due timbri rossi uno sotto l'altro: 0 PROGRAMMI NUOVI su «niente», 0 GESTIONALI su «gestionali». | `zero` | timbro-1, timbro-2 |
| 24.23–29.25 | E non serve solo a cercare. Arriva un pezzo nuovo, lo scrivi in chat, nome, misura, quantità, | La chat torna: su «lo scrivi» si scrive il pezzo nuovo, il nome, la misura e la quantità compaiono mentre li dici, poi il messaggio parte. | `whatsapp` | chat-entra-2, digita-nuovo, invio-nuovo |
| 29.27–34.09 | e viene aggiunto da solo nell'Excel. Hai preso delle lastre nuove? Lo scrivi e la quantità si aggiorna. | Il foglio: su «da solo» entra in cima la riga NUOVO (Lastra PMMA opale, 5 mm, 10); su «aggiorna» la quantità della lastra trasparente lampeggia e sale da 24 a 34. | `sheet` | foglio-entra-2, riga-aggiunta, quantita-sale |
| 34.12–41.12 | Così chiunque in azienda, dal magazzino al commerciale in giro dai clienti, sa in un attimo cosa c'è e cosa manca, direttamente dal telefono. | Quattro tessere 3D: CHIUNQUE su «chiunque», MAGAZZINO, COMMERCIALE (auto), poi su «sa in un attimo» la linea le collega e su «telefono» arriva TELEFONO. | `icon3d` | tessera-chiunque, tessera-magazzino, tessera-commerciale, collega-2, tessera-telefono |
| 41.14–44.21 | Se hai una piccola azienda è tempo che recuperi ogni singolo giorno. | Scheda: pillola PICCOLA AZIENDA, orologio, «Ogni singolo giorno», «Tempo perso» che su «recuperi» diventa «Tempo recuperato» (pillola d'accento), barra piena. | `idcard` | scheda-entra-3, tempo-recuperato |
| 44.24–51.00 | Qual è il lavoro che ti fa perdere più tempo in azienda? Scrivilo nei commenti, magari si può automatizzare. | Box commenti: su «Scrivilo» si scrive «L'INVENTARIO», parte su «commenti», su «automatizzare» arriva la risposta «Si può automatizzare ✓»; fermo finale. | `dm` | commenti-apre, digita-guida, pubblica, risposta-dm |

Componenti nuovi: `bubbles`, `sheet` (Excel), `whatsapp`. 3D: tessere telefono, Excel/WhatsApp collegate, chiunque/magazzino/commerciale/telefono.
