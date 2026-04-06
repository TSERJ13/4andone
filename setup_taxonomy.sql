-- COMPLETE DATABASE INITIALIZATION FOR 4AND.ONE MUSIC

-- 1. Create Tracks Table
CREATE TABLE IF NOT EXISTS public.tracks (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  title text NOT NULL,
  artist text NOT NULL,
  album text,
  style text,
  bpm text,
  audio_url text,
  folder_id uuid,
  tags text[] DEFAULT '{}',
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Create Folders Table
CREATE TABLE IF NOT EXISTS public.folders (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  color text NOT NULL,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. Create Final Tracks Table
CREATE TABLE IF NOT EXISTS public.final_tracks (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  track_id uuid REFERENCES public.tracks(id) ON DELETE CASCADE,
  "order" integer DEFAULT 0,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 4. Create Styles (Categories) Table
CREATE TABLE IF NOT EXISTS public.styles (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  title text NOT NULL,
  color text NOT NULL DEFAULT '#1db954',
  program text NOT NULL DEFAULT 'Latin',
  "order" integer DEFAULT 0,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 5. Create Tags (Filters) Table
CREATE TABLE IF NOT EXISTS public.tags (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  color text NOT NULL DEFAULT '#ffffff',
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 6. Enable RLS and setup permissive policies for development
ALTER TABLE public.tracks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.folders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.final_tracks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.styles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tags ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enable all access for styles" ON public.styles FOR ALL USING (true);
CREATE POLICY "Enable all access for tags" ON public.tags FOR ALL USING (true);
CREATE POLICY "Enable all access for tracks" ON public.tracks FOR ALL USING (true);
CREATE POLICY "Enable all access for folders" ON public.folders FOR ALL USING (true);
CREATE POLICY "Enable all access for final_tracks" ON public.final_tracks FOR ALL USING (true);

-- 7. Insert Initial Styles
INSERT INTO public.styles (title, color, program, "order") VALUES
('Samba', '#ff4b2b', 'Latin', 1),
('Cha-cha-cha', '#f7971e', 'Latin', 2),
('Rumba', '#11998e', 'Latin', 3),
('Paso Doble', '#cb2d3e', 'Latin', 4),
('Jive', '#3f2b96', 'Latin', 5),
('Slow Waltz', '#2193b0', 'Standard', 6),
('Tango', '#1e293b', 'Standard', 7),
('Viennese Waltz', '#4f46e5', 'Standard', 8),
('Slow Foxtrot', '#0891b2', 'Standard', 9),
('Quickstep', '#059669', 'Standard', 10);

-- 8. Insert Initial Tags
INSERT INTO public.tags (name, color) VALUES
('Instrumental', '#1db954'),
('Pop', '#f7971e'),
('Vocal', '#ff4b2b'),
('Mix', '#4f46e5');
