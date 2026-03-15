ALTER TABLE public.projects
  ADD COLUMN IF NOT EXISTS start_image_url TEXT,
  ADD COLUMN IF NOT EXISTS end_image_url TEXT;
