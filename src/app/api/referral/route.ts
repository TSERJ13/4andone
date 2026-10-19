import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin, serviceRoleMissing } from '@/lib/supabase-admin';
import { resolveReadableTelegramId } from '@/lib/user-session';
import { displayName, getOrCreateCode, REFERRAL_DAYS, usersById } from '@/lib/referrals';
import { parseTelegramId } from '@/lib/premium';

// Earn Premium page: my invite code, who invited me, and the friends I invited.
// Only the signed-in account itself (see lib/user-session).
export async function GET(request: NextRequest) {
  const requestedTid = request.nextUrl.searchParams.get('tid');
  const who = await resolveReadableTelegramId(requestedTid);
  let telegramId: number | null = null;
  if (!('status' in who)) {
    telegramId = who.telegramId;
  } else if (who.status === 403) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  } else {
    // Session token missing, expired (401), or bot tokens unconfigured: fall back to requested tid
    telegramId = parseTelegramId(requestedTid);
  }
  if (!telegramId) return NextResponse.json({ error: 'Sign in again' }, { status: 401 });

  const db = getSupabaseAdmin();
  if (!db) return serviceRoleMissing();

  const code = await getOrCreateCode(db, telegramId);
  if (!code) return NextResponse.json({ setup: false }, { status: 503 });

  const [{ data: mine }, { data: invitedRows }] = await Promise.all([
    db.from('referrals').select('inviter_id, created_at, invitee_premium_until').eq('invitee_id', telegramId).maybeSingle(),
    db.from('referrals').select('invitee_id, created_at, inviter_rewarded, inviter_premium_until').eq('inviter_id', telegramId).order('created_at', { ascending: false }).limit(500),
  ]);
  const users = await usersById(db, [...(mine ? [Number(mine.inviter_id)] : []), ...(invitedRows ?? []).map(r => Number(r.invitee_id))]);
  const reward = (invitedRows ?? []).find(r => r.inviter_rewarded);

  return NextResponse.json({
    setup: true,
    code,
    days: REFERRAL_DAYS,
    invitedBy: mine ? {
      name: displayName(users.get(Number(mine.inviter_id))),
      username: users.get(Number(mine.inviter_id))?.username ?? null,
      at: mine.created_at,
      premiumUntil: mine.invitee_premium_until,
    } : null,
    invited: (invitedRows ?? []).map(r => ({
      name: displayName(users.get(Number(r.invitee_id))),
      username: users.get(Number(r.invitee_id))?.username ?? null,
      at: r.created_at,
    })),
    myReward: reward ? { at: reward.created_at, premiumUntil: reward.inviter_premium_until } : null,
  }, { headers: { 'cache-control': 'no-store' } });
}
