-- =========================================================
-- CREATE TABLE: public.albums
-- Run this in Supabase SQL Editor to enable dynamic Album Builder.
-- =========================================================

CREATE TABLE IF NOT EXISTS public.albums (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  slug TEXT UNIQUE NOT NULL,
  title TEXT NOT NULL,
  artist TEXT,
  subtitle TEXT,
  description TEXT,
  badge TEXT DEFAULT 'LIVE SOUNDS COLLECTION',
  cover_url TEXT,
  theme_color TEXT DEFAULT '#e11d48',
  secondary_color TEXT DEFAULT '#be123c',
  gradient TEXT DEFAULT 'linear-gradient(90deg, #e11d48, #be123c)',
  program TEXT DEFAULT 'Both', -- 'Latin', 'Standard', 'Both'
  allowed_styles TEXT[] DEFAULT ARRAY['Samba', 'Cha-Cha-Cha', 'Rumba', 'Paso Doble', 'Jive', 'Slow Waltz', 'Tango', 'Viennese Waltz', 'Slow Foxtrot', 'Quickstep'],
  tags TEXT[] DEFAULT ARRAY[]::TEXT[],
  order_index INTEGER DEFAULT 0,
  is_published BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_albums_slug ON public.albums(slug);
CREATE INDEX IF NOT EXISTS idx_albums_order_index ON public.albums(order_index ASC);

ALTER TABLE public.albums ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow anonymous read albums" ON public.albums;
DROP POLICY IF EXISTS "Allow anonymous insert albums" ON public.albums;
DROP POLICY IF EXISTS "Allow anonymous update albums" ON public.albums;
DROP POLICY IF EXISTS "Allow anonymous delete albums" ON public.albums;

CREATE POLICY "Allow anonymous read albums" ON public.albums FOR SELECT USING (true);
CREATE POLICY "Allow anonymous insert albums" ON public.albums FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow anonymous update albums" ON public.albums FOR UPDATE USING (true);
CREATE POLICY "Allow anonymous delete albums" ON public.albums FOR DELETE USING (true);

-- Insert Initial 5 Default Albums
INSERT INTO public.albums (slug, title, artist, subtitle, badge, cover_url, theme_color, secondary_color, gradient, program, allowed_styles, tags, order_index)
VALUES 
  (
    'georgie-musheev',
    'Georgie Musheev & 7 Winds',
    'Georgie Musheev & 7 Winds',
    'Exclusive Live Latin Dance Music. Dedicated Latin Final Mode practice with live band sounds.',
    'LIVE SOUNDS COLLECTION',
    '/georgie-musheev.jpg',
    '#e11d48',
    '#be123c',
    'linear-gradient(90deg, #e11d48, #be123c)',
    'Latin',
    ARRAY['Samba', 'Cha-Cha-Cha', 'Rumba', 'Paso Doble', 'Jive'],
    ARRAY['musheev', '7 winds', 'seven winds', 'georgie musheev'],
    0
  ),
  (
    'boris-myagkov',
    'Boris Myagkov Big Band',
    'Boris Myagkov Big Band',
    'Legendary Big Band Dance Music. Isolated collection with dedicated Latin & Standard Final Mode practice.',
    'LIVE SOUNDS COLLECTION',
    '/boris-myagkov-big-band.jpg',
    '#f59e0b',
    '#d97706',
    'linear-gradient(90deg, #f59e0b, #d97706)',
    'Both',
    ARRAY['Samba', 'Cha-Cha-Cha', 'Rumba', 'Paso Doble', 'Jive', 'Slow Waltz', 'Tango', 'Viennese Waltz', 'Slow Foxtrot', 'Quickstep'],
    ARRAY['boris myagkov', 'myagkov'],
    1
  ),
  (
    'roses-band',
    'Rose''s Band',
    'Rose''s Band',
    'Exclusive Live Dance Band Sounds. Isolated collection with dedicated Latin & Standard Final Mode practice.',
    'LIVE SOUNDS COLLECTION',
    '/rosesband.jpg',
    '#22c55e',
    '#10b981',
    'linear-gradient(90deg, #22c55e, #10b981)',
    'Both',
    ARRAY['Samba', 'Cha-Cha-Cha', 'Rumba', 'Paso Doble', 'Jive', 'Slow Waltz', 'Tango', 'Viennese Waltz', 'Slow Foxtrot', 'Quickstep'],
    ARRAY['rose''s band', 'roses band', 'rosesband'],
    2
  ),
  (
    'dance-star-band',
    'Dance Star Band',
    'Dance Star Band',
    'Exclusive Live Dance Band Sounds. Isolated collection with dedicated Latin & Standard Final Mode practice.',
    'LIVE SOUNDS COLLECTION',
    '/dancestar.jpg',
    '#d946ef',
    '#8b5cf6',
    'linear-gradient(90deg, #d946ef, #8b5cf6)',
    'Both',
    ARRAY['Samba', 'Cha-Cha-Cha', 'Rumba', 'Paso Doble', 'Jive', 'Slow Waltz', 'Tango', 'Viennese Waltz', 'Slow Foxtrot', 'Quickstep'],
    ARRAY['dance star band', 'dance star', 'dancestar'],
    3
  ),
  (
    'goc-2026',
    'GOC Final 2026 Music',
    'German Open Championship',
    'Exclusive German Open Championship finals music. Isolated collection with dedicated Latin & Standard Final Mode practice.',
    'SPECIAL COLLECTION',
    '/goc2026.png',
    '#eab308',
    '#ca8a04',
    'linear-gradient(90deg, #eab308, #ca8a04)',
    'Both',
    ARRAY['Samba', 'Cha-Cha-Cha', 'Rumba', 'Paso Doble', 'Jive', 'Slow Waltz', 'Tango', 'Viennese Waltz', 'Slow Foxtrot', 'Quickstep'],
    ARRAY['goc 2026', 'goc', 'stuttgart'],
    4
  )
ON CONFLICT (slug) DO NOTHING;
