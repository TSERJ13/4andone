-- ==========================================
-- PART 1: Tables only — run this FIRST
-- ==========================================

-- page_visits
CREATE TABLE IF NOT EXISTS public.page_visits (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  session_id TEXT,
  user_ref TEXT,
  duration_seconds INTEGER DEFAULT 0,
  country_code TEXT,
  country_name TEXT
);

ALTER TABLE public.page_visits ADD COLUMN IF NOT EXISTS referrer TEXT DEFAULT NULL;

CREATE INDEX IF NOT EXISTS idx_page_visits_created_at ON public.page_visits(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_page_visits_user_ref   ON public.page_visits(user_ref);
CREATE INDEX IF NOT EXISTS idx_page_visits_country    ON public.page_visits(country_code);
CREATE INDEX IF NOT EXISTS idx_page_visits_referrer   ON public.page_visits(referrer);

ALTER TABLE public.page_visits ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow anonymous insert" ON public.page_visits;
DROP POLICY IF EXISTS "Allow update own"       ON public.page_visits;
DROP POLICY IF EXISTS "Allow read for all"     ON public.page_visits;
CREATE POLICY "Allow anonymous insert" ON public.page_visits FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow update own"       ON public.page_visits FOR UPDATE USING (true);
CREATE POLICY "Allow read for all"     ON public.page_visits FOR SELECT USING (true);


-- telegram_users
CREATE TABLE IF NOT EXISTS public.telegram_users (
  telegram_id BIGINT PRIMARY KEY,
  first_name TEXT,
  last_name TEXT,
  username TEXT,
  photo_url TEXT,
  country_code TEXT,
  country_name TEXT,
  first_seen TIMESTAMPTZ DEFAULT NOW(),
  last_seen  TIMESTAMPTZ DEFAULT NOW(),
  visit_count INTEGER DEFAULT 1
);

ALTER TABLE public.telegram_users ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow upsert" ON public.telegram_users;
DROP POLICY IF EXISTS "Allow update" ON public.telegram_users;
DROP POLICY IF EXISTS "Allow read"   ON public.telegram_users;
CREATE POLICY "Allow upsert" ON public.telegram_users FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow update" ON public.telegram_users FOR UPDATE USING (true);
CREATE POLICY "Allow read"   ON public.telegram_users FOR SELECT USING (true);


-- track_plays
CREATE TABLE IF NOT EXISTS public.track_plays (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  track_id TEXT NOT NULL,
  user_ref TEXT,
  session_id TEXT,
  duration_seconds INTEGER DEFAULT 0,
  style TEXT,
  bpm TEXT
);

ALTER TABLE public.track_plays ADD COLUMN IF NOT EXISTS event_type TEXT DEFAULT 'play';

UPDATE public.track_plays SET event_type = 'play' WHERE event_type IS NULL;

CREATE INDEX IF NOT EXISTS idx_track_plays_track_id   ON public.track_plays(track_id);
CREATE INDEX IF NOT EXISTS idx_track_plays_created_at ON public.track_plays(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_track_plays_user_ref   ON public.track_plays(user_ref);
CREATE INDEX IF NOT EXISTS idx_track_plays_event_type ON public.track_plays(event_type);

ALTER TABLE public.track_plays ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow anonymous insert track_plays" ON public.track_plays;
DROP POLICY IF EXISTS "Allow read track_plays"             ON public.track_plays;
CREATE POLICY "Allow anonymous insert track_plays" ON public.track_plays FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow read track_plays"             ON public.track_plays FOR SELECT USING (true);
