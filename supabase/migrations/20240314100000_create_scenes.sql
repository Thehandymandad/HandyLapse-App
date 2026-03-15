-- Add generating_assets to projects status
ALTER TABLE public.projects
  DROP CONSTRAINT IF EXISTS projects_status_check;

ALTER TABLE public.projects
  ADD CONSTRAINT projects_status_check CHECK (
    status IN (
      'pending',
      'analyzing',
      'generating',
      'generating_assets',
      'completed',
      'failed'
    )
  );

-- Create scenes table
CREATE TABLE IF NOT EXISTS public.scenes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  scene_type TEXT NOT NULL CHECK (scene_type IN ('hook', 'main_product', 'call_to_action')),
  sequence_order INTEGER NOT NULL CHECK (sequence_order >= 1 AND sequence_order <= 3),
  narrator_script TEXT NOT NULL,
  visual_prompt TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(project_id, sequence_order)
);

-- Enable RLS
ALTER TABLE public.scenes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read and insert on scenes"
  ON public.scenes
  FOR ALL
  USING (true)
  WITH CHECK (true);
