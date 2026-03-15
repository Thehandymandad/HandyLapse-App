# Configurazione Variabili d'Ambiente

Lo stack usa **solo Google** (Gemini / Imagen / Veo). Nessuna chiamata a OpenAI o altre API esterne.

Aggiungi nel file `.env.local`:

```env
# Supabase (obbligatorio)
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Google Gen AI – testo (storyboard), immagini (Imagen), video (Veo)
GOOGLE_GENAI_API_KEY=your-google-ai-api-key
# Oppure: GEMINI_API_KEY=...
```

## Variabili opzionali

| Variabile | Default | Uso |
|-----------|--------|-----|
| `STORYBOARD_MODEL` | `gemini-2.5-flash` | Modello per generare lo storyboard (testo → JSON scene) |
| `GOOGLE_IMAGE_MODEL` | `gemini-2.5-flash-image` (Nano Banana); fallback `imagen-4.0-generate-001` se 404 | Modello per generare start/end image (9:16) |
| `VEO_MODEL` | `veo-3.1-generate-preview` | Modello video (keyframe start/end + prompt) |
| `EXTRACT_BRAND_MODEL` | `gemini-2.5-flash` | Modello per extract-brand (URL → 3 scene) |

## Dove impostare le variabili

### 1. In locale (`.env.local`)

Nella root del progetto Next.js, crea o modifica **`.env.local`** (non committarlo). Per il worker in locale (`npx trigger.dev@latest dev`) le variabili vengono lette da `.env.local` o `.env`.

### 2. Su Trigger.dev (worker in cloud)

Nel **dashboard Trigger.dev** → progetto → **Environment Variables** (per l’ambiente usato), imposta almeno:

- `NEXT_PUBLIC_SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `GOOGLE_GENAI_API_KEY` (o `GEMINI_API_KEY`)

Così il task `generate-single-video` può generare immagini (Imagen), salvarle su Supabase e generare il video con Veo.

## Supabase Storage

1. Supabase Dashboard → **Storage**
2. Crea un bucket pubblico **`assets`**
3. Policy: lettura pubblica per gli URL restituiti
