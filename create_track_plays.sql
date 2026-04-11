-- ==========================================
-- Track Playback Analytics
-- ==========================================

CREATE TABLE IF NOT EXISTS public.track_plays (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  track_id TEXT NOT NULL,
  user_ref TEXT,              -- telegram_id if available
  session_id TEXT,            -- useful for grouping anonymous plays
  duration_seconds INTEGER DEFAULT 0,
  style TEXT,                 -- denormalized for easier reporting
  bpm TEXT
);

CREATE INDEX IF NOT EXISTS idx_track_plays_track_id ON public.track_plays(track_id);
CREATE INDEX IF NOT EXISTS idx_track_plays_created_at ON public.track_plays(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_track_plays_user_ref ON public.track_plays(user_ref);

-- RLS
ALTER TABLE public.track_plays ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow anonymous insert track_plays" ON public.track_plays;
DROP POLICY IF EXISTS "Allow read track_plays" ON public.track_plays;
CREATE POLICY "Allow anonymous insert track_plays" ON public.track_plays FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow read track_plays" ON public.track_plays FOR SELECT USING (true);
