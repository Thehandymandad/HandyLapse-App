# App pubblica e uso da iPhone

Per usare l’app da iPhone (o da qualsiasi dispositivo) serve metterla **online** e far girare il worker in cloud.

## 1. Database: colonna costo stimato

Su **Supabase** → SQL Editor esegui (se non l’hai già fatto con le migrazioni):

```sql
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS estimated_cost_usd NUMERIC(10, 4);
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS start_image_url TEXT, ADD COLUMN IF NOT EXISTS end_image_url TEXT;
```

Così ogni video completato può salvare il costo stimato e mostrarlo in pagina.

## 2. Deploy dell’app (Next.js)

- **Vercel** (consigliato per Next.js): collega il repo GitHub, imposta le variabili d’ambiente (come in `.env.local`), deploy. Ottieni un URL tipo `https://tuo-progetto.vercel.app`.
- In **Vercel** → Settings → Environment Variables aggiungi almeno:  
  `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `GOOGLE_GENAI_API_KEY` (e le altre che usi in build/runtime).

## 3. Worker in cloud (Trigger.dev)

Le generazioni video girano nel worker. In locale le fai con `npx trigger.dev@latest dev`; in produzione il worker deve essere deployato su **Trigger.dev**.

- Su [trigger.dev](https://trigger.dev) fai deploy del worker (da CI o da `npx trigger.dev@latest deploy`).
- Nella dashboard Trigger.dev imposta le **stesse** variabili d’ambiente (Supabase, `GOOGLE_GENAI_API_KEY`, ecc.) per l’ambiente Production.

Così quando usi l’app dall’iPhone e clicchi “Genera video”, la richiesta va alla tua app su Vercel, che chiama l’API e fa partire il task su Trigger.dev in cloud.

## 4. Uso da iPhone

- Apri **Safari** (o altro browser) sull’iPhone.
- Vai all’URL dell’app (es. `https://tuo-progetto.vercel.app`).
- Crea un progetto, avvia la generazione: vedrai lo stato e, a fine video, il **costo stimato** in USD per quel video.

Non serve installare nulla: l’app è una web app responsive.

## 5. Quanto vedi spendere

Dopo ogni video completato, nella pagina del progetto compare **“Costo stimato (questo video): ~$X.XX USD”**. È una stima (Gemini + 2 immagini + Veo 8s). I costi reali li controlli su Google AI Studio / Cloud Billing come descritto in `ENV_SETUP.md`.
