-- Ad statistics: one row per ad step (requested / filled / not filled / Premium-card click).
-- Additive only: new table + a report function. Nothing existing is changed.

create table if not exists public.ad_events (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  session_id text,
  country_code text,
  placement text not null check (placement in ('list', 'strip')),
  event text not null check (event in ('requested', 'filled', 'unfilled', 'no_answer', 'promo_click'))
);
create index if not exists idx_ad_events_created_at on public.ad_events (created_at);

alter table public.ad_events enable row level security;
-- The site (public key) may only ADD events; reading is admin-only (service role).
drop policy if exists "Anyone can log ad events" on public.ad_events;
create policy "Anyone can log ad events" on public.ad_events
  for insert to anon, authenticated with check (true);
revoke all on public.ad_events from anon, authenticated;
grant insert on public.ad_events to anon, authenticated;

-- Report per country: page visits, people who played music, ad requests,
-- ads shown, ads not shown, Premium-card clicks.
create or replace function public.get_ad_stats(start_time timestamptz)
returns table(country text, visits bigint, listeners bigint, requested bigint, filled bigint, not_filled bigint, promo_clicks bigint)
language sql
security definer
set search_path = public, pg_temp
as $$
  with sess as (
    select distinct on (session_id) session_id, upper(coalesce(nullif(country_code, ''), 'Unknown')) as country
    from page_visits
    where created_at >= start_time - interval '1 day' and session_id is not null
    order by session_id, created_at desc
  ),
  v as (
    select upper(coalesce(nullif(country_code, ''), 'Unknown')) as country, count(*) as visits
    from page_visits where created_at >= start_time group by 1
  ),
  l as (
    select coalesce(s.country, 'UNKNOWN') as country, count(distinct tp.session_id) as listeners
    from track_plays tp left join sess s using (session_id)
    where tp.created_at >= start_time and tp.event_type is null
    group by 1
  ),
  a as (
    select upper(coalesce(nullif(ae.country_code, ''), s.country, 'Unknown')) as country,
      count(*) filter (where ae.event = 'requested') as requested,
      count(*) filter (where ae.event = 'filled') as filled,
      count(*) filter (where ae.event in ('unfilled', 'no_answer')) as not_filled,
      count(*) filter (where ae.event = 'promo_click') as promo_clicks
    from ad_events ae left join sess s using (session_id)
    where ae.created_at >= start_time
    group by 1
  )
  select country,
    coalesce(v.visits, 0), coalesce(l.listeners, 0), coalesce(a.requested, 0),
    coalesce(a.filled, 0), coalesce(a.not_filled, 0), coalesce(a.promo_clicks, 0)
  from v full join l using (country) full join a using (country)
  order by 2 desc, 3 desc;
$$;
revoke execute on function public.get_ad_stats(timestamptz) from public, anon, authenticated;
grant execute on function public.get_ad_stats(timestamptz) to service_role;

-- v2 (applied): approximate ad clicks
alter table public.ad_events drop constraint ad_events_event_check;
alter table public.ad_events add constraint ad_events_event_check
  check (event in ('requested', 'filled', 'unfilled', 'no_answer', 'promo_click', 'click'));
-- get_ad_stats() was recreated with an extra ad_clicks column (same query plus
-- count(*) filter (where event = 'click')), service_role only.
