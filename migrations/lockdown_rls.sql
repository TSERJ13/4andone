-- LOCKDOWN: run ONLY AFTER the new code is deployed and these Vercel env vars
-- are set: SUPABASE_SERVICE_ROLE_KEY, ADMIN_PASSWORD (and PAYPAL_CLIENT_SECRET).
-- Before that, the old site still writes with the public key and would break.
--
-- After this migration the public (anon) key can only READ the catalogue.
-- All admin writes go through /api/admin/db (admin session + service role).

-- 1. Catalogue tables: public read, no public writes ------------------------
DROP POLICY IF EXISTS "Enable all access for tracks" ON public.tracks;
DROP POLICY IF EXISTS "Public read tracks" ON public.tracks;
CREATE POLICY "Public read tracks" ON public.tracks FOR SELECT USING (true);

DROP POLICY IF EXISTS "Enable insert for all users" ON public.styles;
DROP POLICY IF EXISTS "Enable update for all users" ON public.styles;
DROP POLICY IF EXISTS "Enable delete for all users" ON public.styles;

DROP POLICY IF EXISTS "Enable insert for all users (tags)" ON public.tags;
DROP POLICY IF EXISTS "Enable update for all users (tags)" ON public.tags;
DROP POLICY IF EXISTS "Enable delete for all users (tags)" ON public.tags;

DROP POLICY IF EXISTS "Allow anonymous insert albums" ON public.albums;
DROP POLICY IF EXISTS "Allow anonymous update albums" ON public.albums;
DROP POLICY IF EXISTS "Allow anonymous delete albums" ON public.albums;

-- 2. telegram_users: personal data + premium flags → server only ------------
--    (/api/user/sync, /api/user/premium, /api/subscription/activate, admin)
DROP POLICY IF EXISTS "Allow upsert" ON public.telegram_users;
DROP POLICY IF EXISTS "Allow update" ON public.telegram_users;
DROP POLICY IF EXISTS "Allow read" ON public.telegram_users;
REVOKE EXECUTE ON FUNCTION public.increment_user_visit(bigint) FROM PUBLIC, anon, authenticated;

-- 3. Contact messages (stored in track_plays) are hidden from the public key
DROP POLICY IF EXISTS "Allow read track_plays" ON public.track_plays;
CREATE POLICY "Allow read track_plays" ON public.track_plays
  FOR SELECT USING (event_type IS DISTINCT FROM 'contact_message');

-- 4. Analytics functions: admin only (called via /api/admin/db rpc) ---------
DO $$
DECLARE f record;
BEGIN
  FOR f IN
    SELECT p.oid::regprocedure AS sig
    FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname IN ('get_recent_activity','get_platform_metrics','get_country_stats','get_traffic_buckets',
                        'get_referrer_stats','get_top_tracks_with_events','get_style_chart_30d')
  LOOP
    EXECUTE format('REVOKE EXECUTE ON FUNCTION %s FROM PUBLIC, anon, authenticated', f.sig);
    EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO service_role', f.sig);
  END LOOP;
END $$;
