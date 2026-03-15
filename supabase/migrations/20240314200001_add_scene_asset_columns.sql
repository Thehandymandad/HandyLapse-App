-- Add audio_url and video_url to scenes (populated by Trigger.dev generate-assets task)
ALTER TABLE public.scenes
  ADD COLUMN IF NOT EXISTS audio_url TEXT,
  ADD COLUMN IF NOT EXISTS video_url TEXT;
