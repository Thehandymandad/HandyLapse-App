---
name: motion-design
description: Il direttore artistico. Definisce palette, tipografia, materiali, spazi e leggibilità di un video motion o di un reel prima di scrivere una riga di codice, partendo dal brief e dal piano di motion-director. Usare dopo motion-director e prima di motion-hyperframes; anche quando l'utente chiede di cambiare lo stile o di copiare quello di un riferimento.
---

# Motion Design

Trasformi il gusto in numeri. Chi anima non deve mai indovinare un colore, una misura o un font: li trova tutti qui.

## Cosa ricevi

`edit/MOTION-BRIEF.md` + `edit/motion-plan.json` (motion-director), i fotogrammi del montato e gli eventuali riferimenti.

## Cosa consegni

`edit/DESIGN.md`: i token come variabili CSS pronte da incollare, le regole di layout scena per scena (dove sta ogni
grafica rispetto al viso), i materiali, cosa NON fare. Se l'utente ha un riferimento, i valori vengono misurati da lì
(fotogrammi a piena risoluzione: colori con il contagocce, altezze del testo in px) e sostituiscono quelli della casa.

## Lo stile della casa (default)

```css
:root {
  --ink: #0B0B0C;        /* inchiostro: fondi, testo su chiaro */
  --paper: #F4F4EF;      /* bianco carta: card chiare */
  --white: #FFFFFF;
  --accent: #D4FF3A;     /* l'UNICA tinta d'accento */
  --muted: #8B8D93;      /* etichette secondarie */
  --glass: rgba(11, 11, 12, 0.78);
  --font-display: "Inter";            /* 900, tracking -0.045em, interlinea 0.92 */
  --font-key: "Instrument Serif";     /* corsivo, solo parole chiave */
  --font-mono: "JetBrains Mono";      /* tag e etichette piccole, maiuscolo, tracking +0.08em */
}
```

- Inter e JetBrains Mono sono nel bundle di HyperFrames. Instrument Serif è in `editor/assets/fonts/` (corsivo e
  normale, licenza OFL): copialo in `assets/fonts/` del progetto HyperFrames e dichiaralo con `@font-face`.

## Regole dure

- **Una sola tinta d'accento**: lime `#D4FF3A` su inchiostro e bianco. Niente blu, niente arcobaleni, niente gradienti
  colorati. Il rosso esiste solo per un "no" esplicito (errore, divieto), mai decorativo.
- **Il serif corsivo solo per le parole chiave** (quelle marcate `*così*` nel piano), mai per frasi intere.
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
- Gerarchia: 1 titolo (display 900) → 1 parola chiave (serif corsivo lime o pillola lime con testo ink) → etichette mono.

## Materiali

- **Vetro scuro**: `background: var(--glass); backdrop-filter: blur(22px); border: 1.5px solid rgba(255,255,255,.12);`
  ombra `0 40px 90px rgba(0,0,0,.5)`.
- **Card carta**: `var(--paper)`, testo ink, ombra morbida `0 30px 70px rgba(0,0,0,.35)`.
- **Pillola lime**: fondo `var(--accent)`, testo `var(--ink)` 900.
- **Luce**: riflessi che passano (gradiente bianco 12% a 110°), bagliori lime al 25–35% dietro gli oggetti protagonisti.

## Movimento (il carattere, i dettagli sono in motion-library)

- **Mai statico**: entrate con sfocatura di movimento (blur 10–18 px → 0), oggetti che fluttuano (±8 px, 2–3 s per
  ciclo), luci che passano. Ma il testo da leggere sta fermo almeno 0,6 s: lascia respirare.
- Easing: entrate `power3.out`/`expo.out`, uscite `power2.in`, rimbalzi `back.out(1.6)`; mai `linear` (tranne rotazioni continue).
- Durate: entrata 0,25–0,45 s, uscita 0,2–0,3 s, colpi 0,12–0,18 s.

## Libertà

Composizione, dimensioni dentro le regole, materiali delle scene speciali, gesti di camera. Se un riferimento dell'utente
contraddice lo stile della casa, vince il riferimento (tranne zone sicure e leggibilità).
