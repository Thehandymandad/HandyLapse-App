# Creads Studio SaaS

SaaS AI-driven per la generazione di video pubblicitari. Stack: Next.js 14, TypeScript, Tailwind CSS, Shadcn/UI, Supabase.

## Setup

### 1. Variabili d'ambiente

Copia il file di esempio e compila le credenziali Supabase:

```bash
cp .env.local.example .env.local
```

Modifica `.env.local`:

```
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

### 2. Database Supabase

Esegui la migration per creare la tabella `projects`:

```sql
-- In Supabase SQL Editor, oppure via CLI: supabase db push
-- Vedi: supabase/migrations/20240314000000_create_projects.sql
```

### 3. Avvio

```bash
npm install
npm run dev
```

Apri [http://localhost:3000](http://localhost:3000).

## Struttura

- `src/app/page.tsx` — Landing page con input URL e CTA
- `src/app/actions.ts` — Server Action per creare progetti
- `src/app/project/[id]/page.tsx` — Pagina dettaglio progetto
- `src/lib/supabase/` — Client Supabase (server, client, middleware)
- `src/components/ui/` — Componenti Shadcn (Button, Input)
