-- Service-only transactions: a claim and its entitlement must succeed together.
CREATE OR REPLACE FUNCTION public.claim_promo_reward(p_telegram_id bigint, p_code text, p_name text, p_days integer, p_max_uses integer DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SET search_path = '' AS $$
DECLARE u public.telegram_users%ROWTYPE; until_at timestamptz; sid text;
BEGIN
  IF p_days IS NULL OR p_code IS NULL OR p_days NOT BETWEEN 1 AND 3650 OR length(p_code) NOT BETWEEN 1 AND 100 THEN
    RETURN jsonb_build_object('ok',false,'reason','bad_code');
  END IF;
  PERFORM pg_advisory_xact_lock(hashtextextended('promo:' || p_code,0));
  INSERT INTO public.telegram_users(telegram_id) VALUES(p_telegram_id) ON CONFLICT(telegram_id) DO NOTHING;
  SELECT * INTO u FROM public.telegram_users WHERE telegram_id=p_telegram_id FOR UPDATE;
  IF u.subscription_id LIKE 'I-%' OR (u.is_premium AND u.premium_until IS NULL) THEN
    RETURN jsonb_build_object('ok',false,'reason','existing_subscription');
  END IF;
  IF u.is_premium AND u.premium_until > now() AND u.subscription_id LIKE 'PROMO_%' THEN
    RETURN jsonb_build_object('ok',false,'reason','already_has_promo');
  END IF;
  IF EXISTS(SELECT 1 FROM public.track_plays WHERE event_type='promo_claimed' AND bpm=p_code AND user_ref=p_telegram_id::text) THEN
    RETURN jsonb_build_object('ok',false,'reason','already_used');
  END IF;
  IF p_max_uses IS NOT NULL AND p_max_uses > 0 AND
    (SELECT count(*) FROM public.track_plays WHERE event_type='promo_claimed' AND bpm=p_code) >= p_max_uses THEN
    RETURN jsonb_build_object('ok',false,'reason','promo_limit_reached');
  END IF;
  until_at := greatest(now(),CASE WHEN u.is_premium THEN u.premium_until ELSE NULL END) + make_interval(days=>p_days);
  sid := 'PROMO_' || p_code || '_' || (extract(epoch from clock_timestamp())*1000)::bigint;
  UPDATE public.telegram_users SET is_premium=true,premium_until=until_at,subscription_id=sid WHERE telegram_id=p_telegram_id;
  INSERT INTO public.track_plays(track_id,event_type,style,bpm,user_ref,session_id)
    VALUES('promo_claim','promo_claimed',p_name,p_code,p_telegram_id::text,sid);
  RETURN jsonb_build_object('ok',true,'isPromo',true,'promoName',p_name,'days',p_days,'premiumUntil',until_at);
END $$;
REVOKE ALL ON FUNCTION public.claim_promo_reward(bigint,text,text,integer,integer) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.claim_promo_reward(bigint,text,text,integer,integer) TO service_role;

