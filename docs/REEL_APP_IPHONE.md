# Reel Studio sull'iPhone (icona nella schermata Home)

L'app è la pagina **`/reel`** della tua app HandyLapse su Vercel:
1. carichi il video (o incolli un link Google Drive);
2. scegli lo stile;
3. il montaggio gira su **Trigger.dev**: tagli, trascrizione ElevenLabs, sottotitoli, zoom, grafiche e render Remotion;
4. salvi il reel nel Rullino.

Tutti i passi si fanno dal telefono, nel browser. Si fanno **una volta sola**.

## 1. Supabase: tabella e spazio per i video

1. Apri [supabase.com/dashboard](https://supabase.com/dashboard) e poi il tuo progetto.
2. Vai su **SQL Editor** → **New query**.
3. Incolla il contenuto di `supabase/migrations/20261026000000_create_reel_jobs.sql`.
4. Premi **Run**.

Crea:
- la tabella `reel_jobs`;
- il bucket privato `reels`.

> Piano Free di Supabase: massimo **50 MB a file**. Per i video più pesanti usa il campo "link Google Drive"
> (file condiviso con "Chiunque abbia il link"), oppure alza il limite in Storage → Settings se hai il piano Pro.

## 2. Trigger.dev: chiavi del worker

Su [cloud.trigger.dev](https://cloud.trigger.dev) apri il progetto, poi **Environment Variables** → ambiente **Production**.
Devono esserci:

| Nome | Note |
|------|------|
| `NEXT_PUBLIC_SUPABASE_URL` | come su Vercel |
| `SUPABASE_SERVICE_ROLE_KEY` | come su Vercel |
| `ELEVENLABS_API_KEY` | la chiave ElevenLabs: serve per la trascrizione (sottotitoli e tagli sulle parole) |

## 3. Deploy del worker da GitHub, senza computer

1. Su Trigger.dev crea un token: **Account** (in basso a sinistra) → **Personal Access Tokens** → **Create**.
2. Su GitHub apri il repo, poi **Settings** → **Secrets and variables** → **Actions** → **New repository secret**.
   - Nome: `TRIGGER_ACCESS_TOKEN`
   - Valore: il token creato al punto 1.
3. Su GitHub apri **Actions** → **Deploy Trigger.dev worker** → **Run workflow** (branch `main`).
4. Aspetta che diventi verde. La prima volta ci vogliono circa 10 minuti, perché installa Chrome, ffmpeg e Remotion.

Da qui in poi il worker si aggiorna da solo a ogni modifica su `main` di `reel-studio/` o `src/trigger/`.

## 4. Vercel: codice d'accesso

1. Vai su Vercel → progetto → **Settings** → **Environment Variables**.
2. Aggiungi `REEL_ACCESS_CODE` con un codice a tua scelta. È la "password" dell'app: senza codice nessuno può far
   partire montaggi (che consumano crediti ElevenLabs e Trigger.dev).
3. Controlla che ci sia `TRIGGER_SECRET_KEY` di **Production** (inizia con `tr_prod_`).
4. Vai su **Deployments** → ultimo deploy → **Redeploy**, così prende la nuova variabile.

## 5. Installare l'icona sull'iPhone

1. Apri **Safari** e vai su `https://<la-tua-app>.vercel.app/reel`.
2. Tocca **Condividi** (il quadrato con la freccia) → **Aggiungi alla schermata Home** → **Aggiungi**.
3. Apri **Reel Studio** dalla schermata Home: si apre a tutto schermo, come un'app.
4. Al primo avvio inserisci il codice del passo 4.

## Uso

1. **Scegli il video**, oppure incolla un link Drive.
2. Scegli lo **stile**.
3. Tocca **Monta il reel**.
4. Aspetta qualche minuto. Puoi chiudere l'app: il reel resta nella lista **I tuoi reel**.
5. Apri il reel → **Salva nel Rullino** → **Salva video**.

Il montaggio dell'app è automatico. Per i reel "su misura", con grafiche legate a quello che dici come in `video2`,
mandami il video in chat su Claude Code.

## Se qualcosa non va

- **"REEL_ACCESS_CODE non configurato"**: manca la variabile su Vercel (passo 4), oppure non hai rifatto il deploy.
- **"Avvio non riuscito"**: `TRIGGER_SECRET_KEY` su Vercel manca o non è quella di Production, oppure il worker non è stato deployato (passo 3).
- **Reel pronto ma senza sottotitoli**: `ELEVENLABS_API_KEY` manca su Trigger.dev (passo 2).
- **Caricamento fallito per dimensione**: usa il link Google Drive.
- **Errori durante il montaggio**: su Trigger.dev → **Runs**, apri il run `reel-edit` e leggi i log.
