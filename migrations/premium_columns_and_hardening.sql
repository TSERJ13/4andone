-- Safe, additive migration (does not change any access rules the app relies on).
-- Run in Supabase → SQL Editor for project "4andonestudio@gmail.com's Project".

-- 1. Subscription columns used by the app (login, PayPal activation, admin
--    SubscriptionManager). They were missing, so subscriptions were never saved.
ALTER TABLE public.telegram_users
  ADD COLUMN IF NOT EXISTS is_premium boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS subscription_id text,
  ADD COLUMN IF NOT EXISTS premium_until timestamptz;

-- 2. Pin search_path on public functions (Supabase linter 0011).
DO $$
DECLARE f record;
BEGIN
  FOR f IN
    SELECT p.oid::regprocedure AS sig
    FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname IN ('increment_user_visit','get_recent_activity','get_platform_metrics','get_country_stats',
                        'get_traffic_buckets','get_referrer_stats','get_top_tracks_with_events','get_style_chart_30d')
  LOOP
    EXECUTE format('ALTER FUNCTION %s SET search_path = public, pg_temp', f.sig);
  END LOOP;
END $$;

-- 3. Event-trigger helper must not be exposed through the REST API.
REVOKE EXECUTE ON FUNCTION public.rls_auto_enable() FROM PUBLIC, anon, authenticated;

-- 4. Covering indexes for foreign keys (Supabase linter 0001).
CREATE INDEX IF NOT EXISTS idx_final_folder_tracks_final_folder_id ON public.final_folder_tracks (final_folder_id);
CREATE INDEX IF NOT EXISTS idx_final_folder_tracks_track_id ON public.final_folder_tracks (track_id);
CREATE INDEX IF NOT EXISTS idx_final_folders_user_id ON public.final_folders (user_id);
CREATE INDEX IF NOT EXISTS idx_final_tracks_track_id ON public.final_tracks (track_id);
CREATE INDEX IF NOT EXISTS idx_final_tracks_user_id ON public.final_tracks (user_id);
