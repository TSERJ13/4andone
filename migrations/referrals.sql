-- "Invite a friend — you both get 1 month Premium"
-- Additive only: one new table + one new nullable column. Safe to run once.

-- Each listener's personal invite code (created the first time they open Earn Premium)
alter table public.telegram_users add column if not exists referral_code text;
create unique index if not exists telegram_users_referral_code_key on public.telegram_users (referral_code);

create table if not exists public.referrals (
  id bigint generated always as identity primary key,
  inviter_id bigint not null references public.telegram_users (telegram_id) on delete cascade,
  -- unique: a person can accept an invite only once (one-time offer)
  invitee_id bigint not null unique references public.telegram_users (telegram_id) on delete cascade,
  created_at timestamptz not null default now(),
  -- Premium end dates given by this invite (null = they already had Premium, nothing changed)
  invitee_premium_until timestamptz,
  inviter_premium_until timestamptz,
  -- the inviter is rewarded for their FIRST successful invite only (invite many, 1 month total)
  inviter_rewarded boolean not null default false,
  constraint referrals_not_self check (inviter_id <> invitee_id)
);
create index if not exists referrals_inviter_idx on public.referrals (inviter_id, created_at desc);
-- guarantees the inviter reward is given once, even with two friends joining at the same moment
create unique index if not exists referrals_one_reward_per_inviter on public.referrals (inviter_id) where inviter_rewarded;

-- Personal data: no public access at all. Only the server (service role) reads/writes it.
alter table public.referrals enable row level security;
revoke all on public.referrals from anon, authenticated;
