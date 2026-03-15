-- Modalità "solo prompt": utente scrive cosa vuole vedere, un solo video, nessun audio/URL
ALTER TABLE public.projects
  ADD COLUMN IF NOT EXISTS user_prompt TEXT,
  ADD COLUMN IF NOT EXISTS video_url TEXT;

-- Assicura che target_url esista (per insert da app) e sia nullable
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'projects' AND column_name = 'target_url') THEN
    ALTER TABLE public.projects ADD COLUMN target_url TEXT;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'projects' AND column_name = 'target_url') THEN
    ALTER TABLE public.projects ALTER COLUMN target_url DROP NOT NULL;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'projects' AND column_name = 'url') THEN
    ALTER TABLE public.projects ALTER COLUMN url DROP NOT NULL;
  END IF;
END $$;
