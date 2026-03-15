# Deploy passo passo: Vercel + Trigger.dev + iPhone

Segui i passi in ordine. Serve avere il progetto su **GitHub** (o GitLab/Bitbucket) e account su **Vercel** e **Trigger.dev**.

---

## Parte 1 – Mettere il codice su GitHub (se non l’hai già)

1. Crea un repository su [github.com](https://github.com) (es. `creads-video`).
2. In locale, nella cartella del progetto:
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git remote add origin https://github.com/TUO_USERNAME/TUO_REPO.git
   git branch -M main
   git push -u origin main
   ```
   Sostituisci `TUO_USERNAME` e `TUO_REPO` con i tuoi.  
   **Importante:** non fare commit di `.env.local` (dovrebbe essere in `.gitignore`).

---

## Parte 2 – Deploy su Vercel

### Passo 2.1 – Collegare il repo

1. Vai su [vercel.com](https://vercel.com) e fai login.
2. Clicca **“Add New…”** → **“Project”**.
3. **Import Git Repository:** scegli “Import” accanto al tuo repo (es. GitHub). Se non vedi il repo, collega prima GitHub a Vercel (Authorize).
4. Seleziona il repository del progetto e clicca **Import**.

### Passo 2.2 – Configurare il progetto

1. **Project Name:** lascia quello proposto o scegline uno (es. `creads-video`).
2. **Framework Preset:** Vercel dovrebbe riconoscere **Next.js**; lascialo così.
3. **Root Directory:** lascia vuoto (root del repo).
4. **Build and Output Settings:** lascia i default (Next.js).

### Passo 2.3 – Variabili d’ambiente (obbligatorie)

Prima di fare Deploy, apri **“Environment Variables”** e aggiungi **una per una** queste (copia i valori dal tuo `.env.local`; non incollare qui i valori reali, usali solo nel pannello Vercel):

| Nome | Valore | Ambiente |
|------|--------|----------|
| `NEXT_PUBLIC_SUPABASE_URL` | `https://xxx.supabase.co` | Production, Preview, Development |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | la tua anon key Supabase | Production, Preview, Development |
| `SUPABASE_SERVICE_ROLE_KEY` | la tua service role key Supabase | Production, Preview, Development |
| `GOOGLE_GENAI_API_KEY` | la tua API key Google AI Studio | Production, Preview, Development |
| `TRIGGER_SECRET_KEY` | la tua secret key Trigger.dev (es. `tr_dev_...` o `tr_prod_...`) | Production, Preview, Development |

- Per ogni variabile: **Key** = nome, **Value** = valore, **Environment** = seleziona tutti e tre (Production, Preview, Development).
- Clicca **Save** dopo ogni variabile.

### Passo 2.4 – Deploy

1. Clicca **Deploy**.
2. Attendi 1–2 minuti. Se il build va a buon fine vedrai **“Congratulations!”** e un link tipo `https://creads-video.vercel.app`.
3. Apri quel link: dovresti vedere la landing dell’app (textarea “Descrivi la tua idea”).  
   Se qualcosa non funziona, controlla **Deployments** → ultimo deploy → **Logs** / **Functions** per errori.

---

## Parte 3 – Deploy del worker su Trigger.dev

Il worker è ciò che genera immagini e video. In locale gira con `npx trigger.dev dev`; in produzione deve essere deployato su Trigger.dev.

### Passo 3.1 – Login e progetto

1. Vai su [trigger.dev](https://trigger.dev) e fai login.
2. Seleziona il progetto (nel tuo caso è già configurato in `trigger.config.ts` con `proj_gjqzhpwuipjqsnfghkkw`).

### Passo 3.2 – Variabili d’ambiente del worker

1. Nel dashboard Trigger.dev apri **Settings** (o **Project Settings**) → **Environment Variables**.
2. Scegli l’ambiente **Production** (e se usi anche Development, ripeti per quello).
3. Aggiungi le stesse variabili che usa il worker (quelle che hai in `.env.local` quando lanci `npx trigger.dev dev`):

| Nome | A cosa serve |
|------|----------------------|
| `NEXT_PUBLIC_SUPABASE_URL` | URL Supabase |
| `SUPABASE_SERVICE_ROLE_KEY` | Upload immagini/video su Storage |
| `GOOGLE_GENAI_API_KEY` | Gemini, Imagen, Veo |

Non serve `NEXT_PUBLIC_SUPABASE_ANON_KEY` nel worker. Non serve `TRIGGER_SECRET_KEY` nel worker (è usata dall’app Next per chiamare Trigger.dev).

### Passo 3.3 – Deploy del worker

1. Sul tuo computer, nella cartella del progetto, apri il terminale.
2. Esegui:
   ```bash
   npx trigger.dev@latest deploy
   ```
3. Se richiesto, scegli l’ambiente **Production** (o quello che usi su Vercel).
4. Attendi che il deploy finisca. Nel dashboard Trigger.dev dovresti vedere la versione deployata (es. “Deployed successfully”).

Da questo momento, quando dall’app su Vercel clicchi “Genera video”, la richiesta va a Trigger.dev e il task gira in cloud con queste variabili.

---

## Parte 4 – Usare l’app dall’iPhone

1. Sul telefono apri **Safari** (o Chrome).
2. Vai all’URL dell’app su Vercel, es. `https://creads-video.vercel.app` (sostituisci con il tuo URL reale).
3. Scrivi un’idea nella textarea e invia: si crea il progetto e vieni reindirizzato alla pagina del progetto.
4. Clicca **“Genera video”**: lo stato passerà a “generating_assets” e dopo 1–2 minuti a “completed” con il video e il costo stimato.

Se lo stato resta “generating_assets” a lungo o va in errore, controlla i **run** nel dashboard Trigger.dev (Production) per vedere log ed eventuali errori (env mancanti, quota API, ecc.).

---

## Riepilogo checklist

- [ ] Codice su GitHub (senza `.env.local`)
- [ ] Progetto Vercel importato dal repo
- [ ] Su Vercel: 5 variabili d’ambiente impostate
- [ ] Deploy Vercel riuscito e URL aperto in browser
- [ ] Su Trigger.dev: variabili d’ambiente Production impostate
- [ ] `npx trigger.dev@latest deploy` eseguito con successo
- [ ] Da iPhone: aperto l’URL Vercel e provato “Genera video”

Se un passo non funziona, indica quale (es. “build Vercel fallisce” o “worker non parte”) e il messaggio di errore per il passo successivo.
