-- Reel Studio da iPhone: lavori di montaggio + spazio file privato.
-- Esegui questo script nella SQL Editor di Supabase.

CREATE TABLE IF NOT EXISTS public.reel_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  title TEXT,
  style TEXT NOT NULL DEFAULT 'pulse',
  -- video caricato nel bucket "reels" oppure link Google Drive / Dropbox
  source_path TEXT,
  source_link TEXT,
  status TEXT NOT NULL DEFAULT 'uploading' CHECK (status IN ('uploading', 'queued', 'processing', 'done', 'error')),
  stage TEXT,
  progress INT NOT NULL DEFAULT 0,
  output_path TEXT,
  error TEXT,
  run_id TEXT
);

-- Nessuna policy: ci accedono solo le API dell'app e il worker, con la service role key.
ALTER TABLE public.reel_jobs ENABLE ROW LEVEL SECURITY;

-- Bucket privato per i video (originali e montati), fino a 1 GB a file.
-- Sul piano Free di Supabase il limite globale resta 50 MB: per video più grandi usa un link Drive.
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('reels', 'reels', false, 1073741824, ARRAY['video/*'])
ON CONFLICT (id) DO NOTHING;
