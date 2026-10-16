import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin-auth';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { botTokenEntries } from '@/lib/user-session';
import { checkPayPalPlan } from '@/lib/paypal';

// Admin "System & Settings": is everything the site needs configured? Without ?live=1 only reads which
// environment variables are SET (never their values). With ?live=1 it also tests the connections.

type Check = { group: string; id: string; label: string; ok: boolean; required: boolean; detail?: string; hint?: string };
const has = (name: string) => !!(process.env[name] || '').trim();

const envChecks = (): Check[] => {
  const c = (group: string, name: string, label: string, required: boolean, hint: string): Check =>
    ({ group, id: name, label, ok: has(name), required, hint });
  return [
    c('Database', 'NEXT_PUBLIC_SUPABASE_URL', 'Database address', true, 'Without it nothing loads.'),
    c('Database', 'NEXT_PUBLIC_SUPABASE_ANON_KEY', 'Database public key', true, 'Without it nothing loads.'),
    c('Database', 'SUPABASE_SERVICE_ROLE_KEY', 'Database server key', true, 'Admin saves, Premium, play history and invites need it.'),
    c('Admin', 'ADMIN_PASSWORD', 'Admin password', true, 'Admin login is refused without it.'),
    c('Admin', 'ADMIN_SESSION_SECRET', 'Separate admin session secret', false, 'Optional: otherwise the admin password signs the session.'),
    c('Telegram', 'TELEGRAM_BOT_TOKEN', 'Login bot token', true, 'Verifies "Sign in with Telegram"; play history and profiles need it.'),
    c('Telegram', 'TELEGRAM_WEBAPP_BOT_TOKEN', 'Mini App bot token', false, 'Only if the Mini App opens from a different bot than the login bot.'),
    c('Payments', 'PAYPAL_CLIENT_SECRET', 'PayPal secret', true, 'Without it new PayPal payments cannot be verified and Premium is not activated.'),
    c('Music files', 'R2_ACCESS_KEY_ID', 'Storage access key', true, 'Needed to upload music.'),
    c('Music files', 'R2_SECRET_ACCESS_KEY', 'Storage secret key', true, 'Needed to upload music.'),
    c('Music files', 'R2_ENDPOINT', 'Storage endpoint', true, 'Needed to upload music.'),
    c('Music files', 'R2_BUCKET_NAME', 'Storage bucket', true, 'Needed to upload music.'),
    c('Music files', 'NEXT_PUBLIC_R2_PUBLIC_URL', 'Public music address', false, 'Where listeners download the audio from. Optional: the site already has a built-in address and works without this.'),
    c('Email & reports', 'GMAIL_APP_PASSWORD', 'Email password', false, 'Contact-form emails and the daily report.'),
    c('Email & reports', 'CRON_SECRET', 'Scheduled-job secret', false, 'Protects the automatic daily report.'),
    c('Ads', 'GOOGLE_ADSENSE_REFRESH_TOKEN', 'AdSense earnings access', false, 'Earnings figures in Earn & Statistics.'),
    c('Ads', 'NEXT_PUBLIC_ADSENSE_LIST_SLOT', 'Ad unit: track list', false, 'Ads inside lists.'),
    c('Ads', 'NEXT_PUBLIC_ADSENSE_BREAK_SLOT', 'Ad unit: full screen break', false, 'Ad break between songs.'),
  ];
};

const timed = async <T,>(fn: () => Promise<T>) => { const t = Date.now(); const value = await fn(); return { value, ms: Date.now() - t }; };

export async function GET(request: NextRequest) {
  const denied = await requireAdmin();
  if (denied) return denied;
  const checks = envChecks();
  const live = request.nextUrl.searchParams.get('live') === '1';
  const results: Check[] = [];

  if (live) {
    const db = getSupabaseAdmin();
    if (!db) {
      results.push({ group: 'Live tests', id: 'db', label: 'Database connection', ok: false, required: true, detail: 'Server key missing' });
    } else {
      const tables = ['tracks', 'telegram_users', 'track_plays', 'ad_events', 'referrals', 'albums'];
      await Promise.all(tables.map(async (table) => {
        try {
          const { value, ms } = await timed(async () => db.from(table).select('*', { count: 'exact', head: true }));
          results.push({ group: 'Live tests', id: `table_${table}`, label: `Table "${table}"`, ok: !value.error, required: table !== 'albums' && table !== 'referrals', detail: value.error ? value.error.message : `${value.count ?? 0} rows · ${ms} ms`, hint: value.error ? 'Table missing or not readable: a database migration may not have been run.' : undefined });
        } catch (e) {
          results.push({ group: 'Live tests', id: `table_${table}`, label: `Table "${table}"`, ok: false, required: true, detail: String((e as Error)?.message || e) });
        }
      }));
    }
    await Promise.all(botTokenEntries().map(async ({ env, token }) => {
      try {
        const res = await fetch(`https://api.telegram.org/bot${token}/getMe`, { cache: 'no-store', signal: AbortSignal.timeout(8000) });
        const json = await res.json().catch(() => null);
        results.push({ group: 'Live tests', id: `tg_${env}`, label: `${env}`, ok: !!json?.ok, required: env === 'TELEGRAM_BOT_TOKEN', detail: json?.ok ? `Bot @${json.result?.username}` : 'Telegram rejected this token', hint: json?.ok ? undefined : 'Copy the token again from @BotFather.' });
      } catch {
        results.push({ group: 'Live tests', id: `tg_${env}`, label: `${env}`, ok: false, required: false, detail: 'Could not reach Telegram' });
      }
    }));
    const pp = await checkPayPalPlan();
    results.push({
      group: 'Live tests', id: 'paypal', label: 'PayPal connection and plan', ok: pp.ok, required: true,
      detail: pp.plan ? `${pp.message} · plan "${pp.plan.name}" ${pp.plan.price ?? '?'} / ${pp.plan.interval ?? '?'}${pp.plan.trialDays ? ` · free trial ${pp.plan.trialDays} day(s)` : ' · no free trial'}` : pp.message,
      hint: pp.ok && pp.plan?.trialDays ? 'The plan has a free trial: the first payment only happens after it ends.' : undefined,
    });
  }

  const all = [...checks, ...results];
  return NextResponse.json({
    live,
    checks: all,
    issues: all.filter(c => !c.ok && c.required).length,
    warnings: all.filter(c => !c.ok && !c.required).length,
  }, { headers: { 'cache-control': 'no-store' } });
}
