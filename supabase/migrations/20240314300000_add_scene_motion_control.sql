-- Add motion_control to scenes: when true, use Veo for video generation; else use Banana
ALTER TABLE public.scenes
  ADD COLUMN IF NOT EXISTS motion_control BOOLEAN NOT NULL DEFAULT false;
