-- ==========================================
-- Analytics Extras — safe to run now
-- ==========================================

-- 1. referrer column on page_visits (if not exists)
ALTER TABLE public.page_visits ADD COLUMN IF NOT EXISTS referrer TEXT DEFAULT NULL;


-- 2. Create track_plays (if not exists) + event_type column
CREATE TABLE IF NOT EXISTS public.track_plays (
  id               UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  track_id         TEXT NOT NULL,
  user_ref         TEXT,
  session_id       TEXT,
  duration_seconds INTEGER DEFAULT 0,
  style            TEXT,
  bpm              TEXT,
  event_type       TEXT DEFAULT 'play'
);

-- Add event_type in case table already existed without it
ALTER TABLE public.track_plays ADD COLUMN IF NOT EXISTS event_type TEXT DEFAULT 'play';
UPDATE public.track_plays SET event_type = 'play' WHERE event_type IS NULL;

CREATE INDEX IF NOT EXISTS idx_track_plays_track_id   ON public.track_plays(track_id);
CREATE INDEX IF NOT EXISTS idx_track_plays_created_at ON public.track_plays(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_track_plays_event_type ON public.track_plays(event_type);

ALTER TABLE public.track_plays ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow anonymous insert track_plays" ON public.track_plays;
DROP POLICY IF EXISTS "Allow read track_plays" ON public.track_plays;
CREATE POLICY "Allow anonymous insert track_plays" ON public.track_plays FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow read track_plays"             ON public.track_plays FOR SELECT USING (true);


-- 3. Update get_recent_activity to return referrer
DROP FUNCTION IF EXISTS public.get_recent_activity(integer);
CREATE OR REPLACE FUNCTION public.get_recent_activity(limit_val integer)
RETURNS TABLE (
  id uuid, created_at timestamptz, session_id text,
  user_ref text, duration_seconds integer,
  country_code text, country_name text, referrer text
) AS $$
BEGIN
  RETURN QUERY
  SELECT pv.id, pv.created_at, pv.session_id, pv.user_ref,
         pv.duration_seconds, pv.country_code, pv.country_name,
         pv.referrer
  FROM public.page_visits pv
  ORDER BY pv.created_at DESC
  LIMIT limit_val;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- 4. NEW: get_referrer_stats
CREATE OR REPLACE FUNCTION public.get_referrer_stats(start_time timestamptz)
RETURNS TABLE (source_label text, visit_count bigint) AS $$
BEGIN
  RETURN QUERY
  SELECT
    CASE
      WHEN referrer IS NULL OR referrer = '' THEN 'Direct'
      WHEN referrer ILIKE '%t.me%' OR referrer ILIKE '%telegram%' THEN 'Telegram'
      WHEN referrer ILIKE '%google%' OR referrer ILIKE '%bing%' OR referrer ILIKE '%yandex%' THEN 'Search'
      WHEN referrer ILIKE '%instagram%' OR referrer ILIKE '%facebook%' OR referrer ILIKE '%tiktok%' THEN 'Social'
      WHEN referrer ILIKE '%youtube%' THEN 'YouTube'
      ELSE 'Other'
    END as source_label,
    COUNT(*) as visit_count
  FROM public.page_visits
  WHERE created_at >= start_time
  GROUP BY source_label
  ORDER BY visit_count DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- 5. NEW: get_top_tracks_with_events
CREATE OR REPLACE FUNCTION public.get_top_tracks_with_events(start_time timestamptz, limit_val integer)
RETURNS TABLE (
  track_id text, style text,
  play_count bigint, share_count bigint, view_count bigint, total_duration bigint
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    tp.track_id,
    MAX(tp.style) as style,
    COUNT(*) FILTER (WHERE tp.event_type IS NULL OR tp.event_type = 'play') as play_count,
    COUNT(*) FILTER (WHERE tp.event_type = 'share') as share_count,
    COUNT(*) FILTER (WHERE tp.event_type = 'view')  as view_count,
    COALESCE(SUM(tp.duration_seconds), 0) as total_duration
  FROM public.track_plays tp
  WHERE tp.created_at >= start_time
  GROUP BY tp.track_id
  ORDER BY play_count DESC
  LIMIT limit_val;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- 6. NEW: get_style_chart_30d
CREATE OR REPLACE FUNCTION public.get_style_chart_30d(start_time timestamptz)
RETURNS TABLE (style text, play_count bigint) AS $$
BEGIN
  RETURN QUERY
  SELECT
    COALESCE(NULLIF(TRIM(tp.style), ''), 'Unknown') as style,
    COUNT(*) as play_count
  FROM public.track_plays tp
  WHERE tp.created_at >= start_time
    AND COALESCE(NULLIF(TRIM(tp.style), ''), 'Unknown') <> 'Unknown'
  GROUP BY 1
  ORDER BY play_count DESC
  LIMIT 10;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
