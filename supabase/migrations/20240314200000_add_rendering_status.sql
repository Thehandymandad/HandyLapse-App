-- Add 'rendering' to projects status (used by Trigger.dev generate-assets task)
ALTER TABLE public.projects DROP CONSTRAINT IF EXISTS projects_status_check;

ALTER TABLE public.projects
  ADD CONSTRAINT projects_status_check CHECK (
    status IN (
      'pending',
      'analyzing',
      'generating',
      'generating_assets',
      'rendering',
      'completed',
      'failed'
    )
  );
