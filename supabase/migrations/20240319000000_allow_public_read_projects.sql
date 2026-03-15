-- Consenti a tutti (anon + auth) di leggere e inserire in projects.
-- Esegui questo script nella SQL Editor di Supabase se la pagina /project/[id] va in 404.

-- Rimuovi policy esistenti che potrebbero bloccare la lettura
DROP POLICY IF EXISTS "Allow public read and insert on projects" ON public.projects;
DROP POLICY IF EXISTS "Allow anon read projects" ON public.projects;
DROP POLICY IF EXISTS "Enable read access for all users" ON public.projects;

-- RLS deve essere attivo
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;

-- Policy: chiunque può leggere e inserire (pagina progetto pubblica per id)
CREATE POLICY "Allow public read and insert on projects"
  ON public.projects
  FOR ALL
  USING (true)
  WITH CHECK (true);
