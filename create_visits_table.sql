-- ==========================================
-- Run this ONCE in Supabase SQL Editor
-- ==========================================

-- Page visits table: tracks every session with country & duration
CREATE TABLE IF NOT EXISTS public.page_visits (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  session_id TEXT,
  user_ref TEXT,              -- telegram user id if authenticated
  duration_seconds INTEGER DEFAULT 0,
  country_code TEXT,          -- e.g. "GE", "US", "DE"
  country_name TEXT           -- e.g. "Georgia", "United States"
);

CREATE INDEX IF NOT EXISTS idx_page_visits_created_at 
  ON public.page_visits(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_page_visits_user_ref 
  ON public.page_visits(user_ref);
CREATE INDEX IF NOT EXISTS idx_page_visits_country 
  ON public.page_visits(country_code);

ALTER TABLE public.page_visits ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow anonymous insert" ON public.page_visits;
DROP POLICY IF EXISTS "Allow update own" ON public.page_visits;
DROP POLICY IF EXISTS "Allow read for all" ON public.page_visits;
CREATE POLICY "Allow anonymous insert" ON public.page_visits FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow update own"       ON public.page_visits FOR UPDATE USING (true);
CREATE POLICY "Allow read for all"     ON public.page_visits FOR SELECT USING (true);


-- Telegram users registry
CREATE TABLE IF NOT EXISTS public.telegram_users (
  telegram_id BIGINT PRIMARY KEY,
  first_name TEXT,
  last_name TEXT,
  username TEXT,
  photo_url TEXT,
  country_code TEXT,
  country_name TEXT,
  first_seen TIMESTAMPTZ DEFAULT NOW(),
  last_seen TIMESTAMPTZ DEFAULT NOW(),
  visit_count INTEGER DEFAULT 1
);

ALTER TABLE public.telegram_users ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow upsert" ON public.telegram_users;
DROP POLICY IF EXISTS "Allow update" ON public.telegram_users;
DROP POLICY IF EXISTS "Allow read"   ON public.telegram_users;
CREATE POLICY "Allow upsert" ON public.telegram_users FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow update" ON public.telegram_users FOR UPDATE USING (true);
CREATE POLICY "Allow read"   ON public.telegram_users FOR SELECT USING (true);


-- Helper: increment visit count automatically
CREATE OR REPLACE FUNCTION public.increment_user_visit(uid BIGINT)
RETURNS void LANGUAGE sql AS $$
  UPDATE public.telegram_users
  SET visit_count = visit_count + 1,
      last_seen = NOW()
  WHERE telegram_id = uid;
$$;
