import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin, serviceRoleMissing } from '@/lib/supabase-admin';
import { readPremiumStatus } from '@/lib/premium';
import { resolveReadableTelegramId } from '@/lib/user-session';

// A signed-in user's profile: account, Premium and listening stats, plus the
// recently played tracks — read from the database, so they follow the
// Telegram account to every device (they used to live only in the browser).
// Only the signed-in account itself can read it (see lib/user-session).
export async function GET(request: NextRequest) {
  const who = await resolveReadableTelegramId(request.nextUrl.searchParams.get('tid'));
  if ('status' in who) {
    return NextResponse.json({ error: who.status === 400 ? 'tid required' : 'Sign in again' }, { status: who.status });
  }
  const { telegramId } = who;

  const db = getSupabaseAdmin();
  if (!db) return serviceRoleMissing();

  // Light mode for the "recently played" lists (Home, History, player)
  if (request.nextUrl.searchParams.get('only') === 'recent') {
    const { data, error } = await db.from('track_plays')
      .select('track_id, created_at')
      .eq('user_ref', String(telegramId))
      .or('event_type.is.null,event_type.eq.play')
      .order('created_at', { ascending: false })
      .limit(300);
    if (error) return NextResponse.json({ error: 'Lookup failed' }, { status: 502 });
    const seen = new Set<string>();
    const recent: { trackId: string; playedAt: string }[] = [];
    for (const p of data ?? []) {
      if (!p.track_id || seen.has(p.track_id)) continue;
      seen.add(p.track_id);
      recent.push({ trackId: p.track_id, playedAt: p.created_at });
      if (recent.length >= 50) break;
    }
    return NextResponse.json({ recent }, { headers: { 'cache-control': 'no-store' } });
  }

  const [{ data: account }, premium, { data: plays, error: playsError }, { count: likes }] = await Promise.all([
    db.from('telegram_users')
      .select('first_name, last_name, username, photo_url, created_at, last_seen')
      .eq('telegram_id', telegramId)
      .maybeSingle(),
    readPremiumStatus(db, telegramId),
    db.from('track_plays')
      .select('track_id, style, created_at')
      .eq('user_ref', String(telegramId))
      .or('event_type.is.null,event_type.eq.play')
      .order('created_at', { ascending: false })
      .limit(3000),
    db.from('user_favorites').select('track_id', { count: 'exact', head: true }).eq('telegram_id', telegramId),
  ]);
  if (playsError) return NextResponse.json({ error: 'Lookup failed' }, { status: 502 });

  const rows = plays ?? [];
  const weekAgo = Date.now() - 7 * 86400000;
  const styleCount = new Map<string, number>();
  const trackCount = new Map<string, number>();
  const recentTrackIds: string[] = [];
  const recent: { trackId: string; playedAt: string }[] = [];
  let last7Days = 0;
  for (const p of rows) {
    if (!p.track_id) continue;
    if (new Date(p.created_at).getTime() >= weekAgo) last7Days++;
    trackCount.set(p.track_id, (trackCount.get(p.track_id) ?? 0) + 1);
    const style = (p.style || '').trim();
    if (style && style.toLowerCase() !== 'unknown') styleCount.set(style, (styleCount.get(style) ?? 0) + 1);
    if (recentTrackIds.length < 50 && !recentTrackIds.includes(p.track_id)) {
      recentTrackIds.push(p.track_id);
      recent.push({ trackId: p.track_id, playedAt: p.created_at });
    }
  }
  const top = (m: Map<string, number>, n: number) =>
    [...m.entries()].sort((a, b) => b[1] - a[1]).slice(0, n);

  return NextResponse.json(
    {
      account: account ?? null,
      premium: premium ?? { active: false, subscriptionId: null, premiumUntil: null },
      stats: {
        totalPlays: rows.length,
        uniqueTracks: trackCount.size,
        last7Days,
        likedSongs: likes ?? 0,
        firstPlayAt: rows.length ? rows[rows.length - 1].created_at : null,
        topStyles: top(styleCount, 5).map(([style, count]) => ({ style, count })),
        topTracks: top(trackCount, 5).map(([trackId, count]) => ({ trackId, count })),
      },
      recentTrackIds,
      recent,
    },
    { headers: { 'cache-control': 'no-store' } }
  );
}
