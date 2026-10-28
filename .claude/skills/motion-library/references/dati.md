# Dati e numeri

Solo numeri detti nel parlato o forniti dall'utente: mai inventati. Le cifre usano `font-variant-numeric: tabular-nums`
(non ballano mentre contano).

### dati/contatore-che-sale
- **Verbi**: crescere, aumentare, arrivare a.
- **Come**: il numero conta da 0 al valore in 0,8–1,2 s `power2.out` (veloce all'inizio, rallenta), poi un
  `scale 1.08→1` all'arrivo; unità in serif corsivo accanto.
- **Suono**: tick che accelerano + tocco all'arrivo.
- **Difetti**: arrivo che non coincide con la parola del numero.

### dati/contatore-che-scende
- **Verbi**: perdere, calare, sprecare.
- **Come**: come sopra ma verso il basso, colore che passa da bianco a grigio; all'arrivo la cifra "cade" di 6 px.
- **Suono**: tick decrescenti, tonfo sordo.
- **Difetti**: usarlo per numeri non detti.

### dati/contatore-valuta
- **Verbi**: soldi, prezzo, costo.
- **Come**: contatore con separatori italiani (`1.250 €`), simbolo che entra per ultimo con un pop.
- **Suono**: cassa/moneta all'arrivo.
- **Difetti**: formati sbagliati (punto/virgola).

### dati/orologio-veloce
- **Verbi**: ore, tempo perso, giornate.
- **Come**: quadrante con lancette; la lancetta dei minuti accelera (`Math.pow(t, 1.6)`) con scia (2–3 copie a opacità
  decrescente); accanto il tempo in ore e minuti che corre.
- **Suono**: ticchettio che accelera.
- **Difetti**: ore inventate presentate come dato reale (usa "ore" generico o il numero detto).

### dati/barra-caricamento-lenta
- **Verbi**: aspettare, lentezza, frustrazione.
- **Come**: barra che avanza a scatti (pause seminate), si blocca al 99% e trema.
- **Suono**: bip ripetuto smorzato.
- **Difetti**: barra che finisce (rovina la battuta).

### dati/barra-che-sale
- **Verbi**: crescere, confronto tra quantità.
- **Come**: barre verticali che crescono dal basso (`scaleY 0→1`, origine in basso) sfalsate di 0,12 s, la barra
  protagonista lime e le altre grigie; etichette mono sotto.
- **Suono**: riser per barra.
- **Difetti**: assi e griglie inutili (togli tutto ciò che non serve).

### dati/prima-dopo
- **Verbi**: prima/dopo, confrontare, differenza.
- **Come**: due colonne o due card; "prima" desaturata e piccola, "dopo" lime e più grande che entra 0,3 s dopo;
  freccia o linea che le collega.
- **Suono**: due toni (basso → alto).
- **Difetti**: dare lo stesso peso visivo a prima e dopo.

### dati/griglia-icone
- **Verbi**: tanti, quanti, uno su dieci.
- **Come**: griglia di icone uguali che compaiono a ondata (diagonale); quelle che contano si accendono di lime.
- **Suono**: raffica di tick leggeri.
- **Difetti**: più di 30 icone (illeggibile su telefono).

### dati/progress-checklist
- **Verbi**: lavora per te, fa tutto, sta facendo.
- **Come**: card vetro con titolo, percentuale grande, barra che avanza e 3–4 voci che si spuntano **sulle parole che
  le nominano** (la percentuale salta a ogni spunta).
- **Suono**: click per voce, ding a 100%.
- **Difetti**: avanzamento regolare scollegato dalle parole.

### dati/timeline-tagli
- **Verbi**: montare, tagliare, editing.
- **Come**: timeline orizzontale con forma d'onda; le pause (blocchi grigi) vengono tagliate e i blocchi lime si
  ricompattano verso sinistra (`x` sfalsato), la durata totale si accorcia (contatore).
- **Suono**: forbici/tagli in raffica.
- **Difetti**: forma d'onda finta che non somiglia al parlato (usa l'inviluppo audio reale se puoi).

### dati/classifica
- **Verbi**: il migliore, primo, top.
- **Come**: righe che entrano dal basso in ordine inverso (dal 3° al 1°), il primo arriva per ultimo più grande e lime.
- **Suono**: tick per riga, colpo per il primo.
- **Difetti**: classifiche inventate.
