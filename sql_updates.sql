ALTER TABLE public.tracks ADD COLUMN duration integer DEFAULT 0;
ALTER TABLE public.tracks ADD COLUMN global_order double precision DEFAULT 0.0;

CREATE TABLE IF NOT EXISTS public.final_folders (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  color text DEFAULT '#1db954',
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS public.final_folder_tracks (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  final_folder_id uuid REFERENCES public.final_folders(id) ON DELETE CASCADE,
  track_id uuid REFERENCES public.tracks(id) ON DELETE CASCADE,
  "order" double precision DEFAULT 0.0,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- RLS
ALTER TABLE public.final_folders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.final_folder_tracks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enable read access for all users" ON public.final_folders FOR SELECT USING (true);
CREATE POLICY "Enable insert for all users" ON public.final_folders FOR INSERT WITH CHECK (true);
CREATE POLICY "Enable update for all users" ON public.final_folders FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Enable delete for all users" ON public.final_folders FOR DELETE USING (true);

CREATE POLICY "Enable read access for all users" ON public.final_folder_tracks FOR SELECT USING (true);
CREATE POLICY "Enable insert for all users" ON public.final_folder_tracks FOR INSERT WITH CHECK (true);
CREATE POLICY "Enable update for all users" ON public.final_folder_tracks FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Enable delete for all users" ON public.final_folder_tracks FOR DELETE USING (true);
