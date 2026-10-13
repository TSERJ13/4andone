-- Deploy the authenticated library/visits gateways before this access lockdown.
-- Public catalogue reads remain available; no user data is deleted.
DO $$
DECLARE t text; p record; f record;
BEGIN
  FOREACH t IN ARRAY ARRAY['tracks','styles','tags','albums','telegram_users','folders','folder_tracks','final_folders','final_folder_tracks','final_tracks','user_favorites','page_visits','track_plays','referrals'] LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
    FOR p IN SELECT policyname FROM pg_policies WHERE schemaname='public' AND tablename=t LOOP
      EXECUTE format('DROP POLICY %I ON public.%I',p.policyname,t);
    END LOOP;
    EXECUTE format('REVOKE ALL ON public.%I FROM PUBLIC, anon, authenticated',t);
    EXECUTE format('GRANT ALL ON public.%I TO service_role',t);
  END LOOP;
  FOREACH t IN ARRAY ARRAY['tracks','styles','tags','albums'] LOOP
    EXECUTE format('GRANT SELECT ON public.%I TO anon, authenticated',t);
    EXECUTE format('CREATE POLICY catalog_read ON public.%I FOR SELECT TO anon, authenticated USING (true)',t);
  END LOOP;
  -- Only nonprivileged event types may be logged with the public key.
  GRANT INSERT ON public.track_plays TO anon, authenticated;
  CREATE POLICY log_public_play ON public.track_plays FOR INSERT TO anon, authenticated
    WITH CHECK (event_type IN ('play','kofi_click'));
  FOR f IN SELECT p.oid::regprocedure AS sig FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
    WHERE n.nspname='public' AND (p.prosecdef OR p.proname='increment_user_visit') LOOP
    EXECUTE format('REVOKE EXECUTE ON FUNCTION %s FROM PUBLIC, anon, authenticated',f.sig);
    EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO service_role',f.sig);
  END LOOP;
END $$;
