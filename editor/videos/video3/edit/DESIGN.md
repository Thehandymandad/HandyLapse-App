# DESIGN — video3

Stile della casa (motion-design), nessun riferimento esterno.

```css
:root {
  --ink: #0B0B0C; --paper: #F4F4EF; --white: #FFFFFF; --accent: #D4FF3A; --muted: #8B8D93;
  --no: #FF3B4E;                 /* solo per i due "no" espliciti: divieto su "toccato" e timbri "zero" */
  --claude: #D97757;             /* solo l'asterisco sul cubo di Claude Code */
  --glass: rgba(11, 11, 12, 0.80);
  --font-display: "Inter";       /* 900, tracking -0.045em */
  --font-key: "Instrument Serif"; /* corsivo, parole chiave dei sottotitoli e delle card */
  --font-mono: "JetBrains Mono";  /* etichette, maiuscolo, tracking +0.08em */
}
```

## Layout (1080×1920)
- Viso: y 560–1075, mai coperto.
- Sottotitoli: centro y 1150, larghezza max 720 (x 180–900), Inter 900 64 px bianco con ombra; parole chiave in
  Instrument Serif corsivo lime 80 px.
- Grafiche: fascia y 1230–1550, x 112–900 (centro x 506). Oggetti 3D in un canvas WebGL 1080×1920 trasparente, ma
  disegnati solo nella fascia.
- Eccezione: scena s09 (telefono) usa il rettangolo del footage rimpicciolito: 799×1421 centrato (x 140–939, y 250–1670).

## Materiali
- Card vetro scuro (raggio 40, bordo bianco 12%, ombra 0 40px 90px rgba(0,0,0,.5)).
- Pillole lime con testo ink 900. Timbri rossi bordo 11 px inclinati.
- Oggetti 3D: MeshStandardMaterial, rugosità 0,35–0,5, luce key calda + rim fredda + riempimento, ombra di contatto
  (ellisse sfocata in HTML sotto l'oggetto).

## Movimento
- Entrate 0,3–0,45 s power3.out / back.out(1.6) con blur 12→0; uscite 0,2 s power2.in con blur.
- Oggetti 3D: fluttuazione ±8 px dopo l'atterraggio, rotazione lenta.
- Testo da leggere fermo ≥ 0,6 s.
