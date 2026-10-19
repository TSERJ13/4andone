import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin, serviceRoleMissing } from '@/lib/supabase-admin';
import { resolveReadableTelegramId } from '@/lib/user-session';
import { claimReferral, normalizeCode } from '@/lib/referrals';
import { getStoredPromoCodes } from '@/lib/promos';
import { parseTelegramId } from '@/lib/premium';

// Accept an invite or activate an official promo code.
// Rule: A user can only use ONE active promo at a time.
export async function POST(request: NextRequest) {
  let body: Record<string, unknown>;
  try {
    body = await request.json();
    if (!body || typeof body !== 'object' || Array.isArray(body)) throw new Error('Invalid body');
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }
  const requestedTid = body.tid == null ? null : String(body.tid);
  const who = await resolveReadableTelegramId(requestedTid);
  let telegramId: number | null = null;
  if (!('status' in who)) {
    telegramId = who.telegramId;
  } else if (who.status === 403) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  } else {
    telegramId = parseTelegramId(requestedTid);
  }
  if (!telegramId) return NextResponse.json({ error: 'Sign in again' }, { status: 401 });
  const rawCode = typeof body.code === 'string' ? body.code.trim().toUpperCase() : '';
  if (!rawCode) return NextResponse.json({ ok: false, reason: 'bad_code' }, { status: 400 });

  const db = getSupabaseAdmin();
  if (!db) return serviceRoleMissing();

  // 1. Check if this is a configured Promo Code (dynamic from DB + defaults)
  let stored;
  try { stored = await getStoredPromoCodes(db); }
  catch { return NextResponse.json({ ok: false, reason: 'failed' }, { status: 502 }); }
  const { promos, claimsCount } = stored;
  const matchedPromo = promos.find(p => p.code === rawCode);

  if (matchedPromo) {
    if (!matchedPromo.active) {
      return NextResponse.json({
        ok: false,
        reason: 'promo_inactive',
        message: 'ეს პრომო კოდი დეაქტივირებულია ან ვადაგასულია.'
      }, { status: 400 });
    }

    if (matchedPromo.maxUses && (claimsCount[matchedPromo.code] || 0) >= matchedPromo.maxUses) {
      return NextResponse.json({
        ok: false,
        reason: 'promo_limit_reached',
        message: 'ამ პრომო კოდის გამოყენების მაქსიმალური რაოდენობა ამოიწურა.'
      }, { status: 400 });
    }

    const { data, error } = await db.rpc('claim_promo_reward', {
      p_telegram_id: telegramId, p_code: matchedPromo.code, p_name: matchedPromo.name,
      p_days: matchedPromo.days, p_max_uses: matchedPromo.maxUses || null,
    });
    if (error) return NextResponse.json({ ok: false, reason: 'failed' }, { status: 502 });
    return NextResponse.json(data, { status: data?.ok ? 200 : 409, headers: { 'cache-control': 'no-store' } });
  }

  // 2. Otherwise, treat as friend's Referral Code
  const code = normalizeCode(rawCode);
  if (!code) return NextResponse.json({ ok: false, reason: 'bad_code' }, { status: 400 });

  const result = await claimReferral(db, telegramId, code);
  const status = result.ok ? 200 : result.reason === 'not_setup' ? 503 : result.reason === 'failed' ? 502 : 409;
  return NextResponse.json(result, { status, headers: { 'cache-control': 'no-store' } });
}
