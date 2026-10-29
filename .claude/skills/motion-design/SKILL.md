---
name: motion-design
description: Il direttore artistico. Definisce palette, tipografia, materiali, spazi e leggibilità di un video motion o di un reel prima di scrivere una riga di codice, partendo dal brief e dal piano di motion-director. Usare dopo motion-director e prima di motion-hyperframes; anche quando l'utente chiede di cambiare lo stile o di copiare quello di un riferimento.
---

# Motion Design

Trasformi il gusto in numeri. Chi anima non deve mai indovinare un colore, una misura o un font: li trova tutti qui.

## Cosa ricevi

`edit/MOTION-BRIEF.md` + `edit/motion-plan.json` (motion-director), i fotogrammi del montato e gli eventuali riferimenti.

## Cosa consegni

`edit/DESIGN.md`: i token pronti da usare nei componenti Remotion (oggetto palette TS / stili inline), le regole di layout scena per scena (dove sta ogni
grafica rispetto al viso), i materiali, cosa NON fare. Se l'utente ha un riferimento, i valori vengono misurati da lì
(fotogrammi a piena risoluzione: colori con il contagocce, altezze del testo in px) e sostituiscono quelli della casa.

## Lo stile della casa (default): Pulse

È lo style pack `pulse` (componenti React in `editor/remotion/src/styles/originals/pulse/`, palette `P` in
`shared.tsx`), disegnato da HyperFrames.

```ts
const P = {
  accent: "#FF6633",               // l'UNICA tinta d'accento: l'arancione del logo di Claude (#D97757) reso elettrico
  accentDim: "rgba(255,102,51,0.35)", // bagliori
  ink: "#0A0B0E",                  // inchiostro: testo su accento, fondi
  red: "#FF2E4D",                  // solo per un "no" esplicito (errore, divieto, timbro)
  white: "#FFFFFF",
  grey: "#8A8F98",                 // etichette secondarie
  glass: "rgba(12,13,17,0.80)",    // card vetro scuro
  line: "rgba(255,255,255,0.12)",  // bordi
  claude: "#D97757",               // solo per il logo di Claude
};
// Font (fontsource, locali): Anton 400 maiuscolo per sottotitoli, titoli e numeri; Inter 700–900 per UI ed etichette.
```

Un altro accento per un solo video: `styleOverrides.motion.accentColor` nel piano (tutti i componenti lo seguono).

### Layout della casa (dalla referenza dell'utente)

```
 y 0 ───────────────────────────────  fondo chiaro sfumato: in alto velatura d'accento → carta #F4F2EE
      (sopra y=280 lo copre Instagram)
 y 280–880  le grafiche: card bianche con ombra morbida, testo nero, dettagli in accento (centro y≈0,30, scala 0,8–1)
 y ≈946     i sottotitoli: Inter 900 nero, minuscolo, 88 px; la parola chiave in Instrument Serif corsivo
            dentro una pillola d'accento con testo ink
 y 1060 ┌─────────────────────────────┐  cornice: x 36–1044, y 1060–1880, angoli 56 px,
        │      il parlato (viso)       │  bordo 7 px al neon arancione elettrico (tubo netto, anima chiara,
        │                              │  alone stretto); footage con la camera solo qui dentro
 y 1880 └─────────────────────────────┘
```

- Tema chiaro (`motion.theme: "light"`): card bianche (`P.glass`), testo `P.fg` nero, ombre calde morbide; il resto
  della palette uguale. Il tema scuro (vetro nero, testo bianco, Anton maiuscolo) resta per lo schermo pieno.
- Le grafiche si vedono **solo fuori dalla cornice** (maschera); il mirino REC abbraccia la cornice (`props.box`).
- Schermo pieno solo se l'utente lo chiede (`"frame": null` nel piano).

## Regole dure

- **Una sola tinta d'accento**: arancione elettrico `#FF6633` su inchiostro e bianco. Niente blu, niente arcobaleni, niente gradienti
  colorati. Il rosso esiste solo per un "no" esplicito (errore, divieto), mai decorativo.
- **Parole chiave con parsimonia**: una ogni 2–3 s (`captions.emphasis`), mai frasi intere evidenziate.
- **Zone sicure di Instagram** su 1080×1920: niente di importante sopra **y=280**, sotto **y=1560**, né a destra di
  **x=900** nella metà bassa (y>960). Margini laterali ≥ 64 px.
- **Leggibilità**: testo minimo 44 px; sottotitoli 64–84 px; titoli 110–170 px. Contrasto sempre pieno: su footage
  chiaro il testo bianco ha uno scrim scuro o sta su una card; mai bianco su bianco.
- **Il viso è sacro**: nessuna grafica copre occhi e bocca. Scrivi per ogni scena la zona libera in px.
- **I sottotitoli stanno sopra a tutto** (ultimo livello) e non si sovrappongono alle grafiche: o cambiano posizione,
  o la grafica lascia libera la loro fascia.
- **Gli oggetti 3D** sono foto-realistici (Nano Banana Pro, scontornati) con ombra di contatto morbida sotto: mai
  oggetti piatti o clipart insieme a oggetti realistici nello stesso video.

## Scala e spazio

- Griglia 8 px. Raggi: card 36–44 px, pillole 999 px, tag 10 px.
- ~40% di spazio vuoto per scena; massimo 3 elementi di testo visibili insieme.
- Gerarchia: 1 titolo (Anton) → 1 parola chiave (pillola accento con testo ink) → etichette Inter 800–900 maiuscolo.

## Materiali

- **Vetro scuro** (componente `Glass`): `background: P.glass; backdropFilter: blur(22px) saturate(1.4); border: 2px solid P.line`,
  raggio 40, ombra `0 40px 90px rgba(0,0,0,.55)`; quando "si accende" bordo e bagliore accento.
- **Card carta**: `#F4F4EF`, testo ink, ombra morbida `0 30px 70px rgba(0,0,0,.35)`.
- **Pillola accento**: fondo `P.accento`, testo `P.ink` Inter 900.
- **Timbro rosso**: bordo e testo `P.red` Anton, ruotato −5°/+4°, sbatte da scala 2,5.
- **Luce**: riflessi che passano (gradiente bianco 12% a 110°), bagliori accento al 25–35% dietro gli oggetti protagonisti.

## Movimento (il carattere, i dettagli sono in motion-library)

- **Mai statico**: entrate con sfocatura di movimento (blur 10–18 px → 0), oggetti che fluttuano (±8 px, 2–3 s per
  ciclo), luci che passano. Ma il testo da leggere sta fermo almeno 0,6 s: lascia respirare.
- Easing: entrate a molla (`spring`, damping 12–13, stiffness 150–220) o `Easing.out(Easing.cubic)`, uscite sfocate
  negli ultimi 6–7 frame, colpi con molla stretta (damping 8, stiffness 320); mai lineare (tranne rotazioni continue).
- Durate: entrata 0,25–0,45 s, uscita 0,2–0,3 s, colpi 0,12–0,18 s.

## Libertà

Composizione, dimensioni dentro le regole, materiali delle scene speciali, gesti di camera. Se un riferimento dell'utente
contraddice lo stile della casa, vince il riferimento (tranne zone sicure e leggibilità).
