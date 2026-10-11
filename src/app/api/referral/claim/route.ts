import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin, serviceRoleMissing } from '@/lib/supabase-admin';
import { resolveReadableTelegramId } from '@/lib/user-session';
import { claimReferral, normalizeCode, REFERRAL_DAYS } from '@/lib/referrals';
import { getStoredPromoCodes } from '@/lib/promos';
import { supabase as fallbackSupabase } from '@/utils/supabase';

// Accept an invite or activate an official promo code.
// Rule: A user can only use ONE active promo at a time.
export async function POST(request: NextRequest) {
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }
  const who = await resolveReadableTelegramId(body.tid == null ? null : String(body.tid));
  if ('status' in who) return NextResponse.json({ error: 'Sign in again' }, { status: who.status });
  const rawCode = typeof body.code === 'string' ? body.code.trim().toUpperCase() : '';
  if (!rawCode) return NextResponse.json({ ok: false, reason: 'bad_code' }, { status: 400 });

  const db = getSupabaseAdmin() || fallbackSupabase;
  if (!db) return serviceRoleMissing();

  // 1. Check if this is a configured Promo Code (dynamic from DB + defaults)
  const { promos, claimsCount } = await getStoredPromoCodes(db);
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

    const promo = matchedPromo;

    // Check user data
    const { data: user, error: uErr } = await db
      .from('telegram_users')
      .select('telegram_id, is_premium, premium_until, subscription_id')
      .eq('telegram_id', who.telegramId)
      .maybeSingle();

    if (uErr) return NextResponse.json({ ok: false, reason: 'failed' }, { status: 500 });

    const now = Date.now();
    const subId = user?.subscription_id || '';
    const until = user?.premium_until ? new Date(user.premium_until).getTime() : null;
    const isCurrentlyActive = !!user?.is_premium && (until === null || until > now);

    // Rule: Cannot use multiple promos at the same time
    if (isCurrentlyActive && subId.startsWith('PROMO_')) {
      return NextResponse.json({
        ok: false,
        reason: 'already_has_promo',
        message: 'თქვენ უკვე გაქვთ აქტიური პრომო კოდი! ერთდროულად 2 პრომო აქციით სარგებლობა არ შეიძლება.'
      }, { status: 409 });
    }

    // Check if this specific user already used THIS promo code previously in track_plays / audit log
    const { data: alreadyUsed } = await db
      .from('track_plays')
      .select('id')
      .eq('event_type', 'promo_claimed')
      .eq('bpm', rawCode)
      .eq('user_ref', String(who.telegramId))
      .maybeSingle();

    if (alreadyUsed) {
      return NextResponse.json({
        ok: false,
        reason: 'already_used',
        message: 'ეს პრომო კოდი თქვენ მიერ უკვე გამოყენებულია (1 ადამიანს შეუძლია მხოლოდ 1-ჯერ გააქტიურება).'
      }, { status: 409 });
    }

    // Grant Premium for Promo Days
    const from = isCurrentlyActive && until ? until : now;
    const newPremiumUntil = new Date(from + promo.days * 86400000).toISOString();
    const newSubId = `PROMO_${rawCode}_${now}`;

    const { error: upErr } = await db
      .from('telegram_users')
      .upsert({
        telegram_id: who.telegramId,
        is_premium: true,
        premium_until: newPremiumUntil,
        subscription_id: newSubId,
      }, { onConflict: 'telegram_id' });

    if (upErr) return NextResponse.json({ ok: false, reason: 'failed' }, { status: 500 });

    // Record claim event in database so they can NEVER reuse this code
    await db.from('track_plays').insert({
      event_type: 'promo_claimed',
      style: promo.name,
      bpm: rawCode, // stores code
      user_ref: String(who.telegramId),
      session_id: newSubId,
    });

    return NextResponse.json({
      ok: true,
      isPromo: true,
      promoName: promo.name,
      days: promo.days,
      premiumUntil: newPremiumUntil,
    }, { headers: { 'cache-control': 'no-store' } });
  }

  // 2. Otherwise, treat as friend's Referral Code
  const code = normalizeCode(rawCode);
  if (!code) return NextResponse.json({ ok: false, reason: 'bad_code' }, { status: 400 });

  const result = await claimReferral(db, who.telegramId, code);
  const status = result.ok ? 200 : result.reason === 'not_setup' ? 503 : result.reason === 'failed' ? 502 : 409;
  return NextResponse.json(result, { status, headers: { 'cache-control': 'no-store' } });
}
