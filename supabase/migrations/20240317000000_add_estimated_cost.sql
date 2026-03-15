-- Costo stimato per video (USD) per trasparenza spesa
ALTER TABLE public.projects
  ADD COLUMN IF NOT EXISTS estimated_cost_usd NUMERIC(10, 4);
