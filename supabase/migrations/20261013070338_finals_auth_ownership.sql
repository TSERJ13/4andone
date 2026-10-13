-- Additive preparation; safe before the matching application is deployed.
ALTER TABLE public.final_folders ADD COLUMN IF NOT EXISTS telegram_id bigint;
ALTER TABLE public.final_tracks ADD COLUMN IF NOT EXISTS telegram_id bigint;
-- Preserve historical collections created by the retired tg_<id> bridge.
UPDATE public.final_folders f SET telegram_id = split_part(substring(u.email from 4), '@', 1)::bigint
FROM auth.users u WHERE f.user_id=u.id AND f.telegram_id IS NULL AND u.email ~ '^tg_[0-9]{1,15}@4and[.]one$';
UPDATE public.final_tracks f SET telegram_id = split_part(substring(u.email from 4), '@', 1)::bigint
FROM auth.users u WHERE f.user_id=u.id AND f.telegram_id IS NULL AND u.email ~ '^tg_[0-9]{1,15}@4and[.]one$';
UPDATE public.folders SET telegram_id=user_id::bigint WHERE telegram_id IS NULL AND user_id ~ '^[0-9]{1,15}$';
CREATE INDEX IF NOT EXISTS final_folders_telegram_id_idx ON public.final_folders(telegram_id);
CREATE INDEX IF NOT EXISTS final_tracks_telegram_id_idx ON public.final_tracks(telegram_id);
CREATE UNIQUE INDEX IF NOT EXISTS telegram_users_paypal_owner_idx ON public.telegram_users(subscription_id) WHERE subscription_id LIKE 'I-%';
