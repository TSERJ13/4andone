import { resolveReadableTelegramId } from '@/lib/user-session';
import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin, serviceRoleMissing } from '@/lib/supabase-admin';
import { isPayPalConfigured, verifyPayPalSubscription } from '@/lib/paypal';

// Activates Premium after the PayPal subscription popup — but only after the
// subscription is VERIFIED with PayPal's API (status ACTIVE, our plan). The
// browser can no longer simply write is_premium=true.

export async function POST(request: NextRequest) {
  let body: Record<string, unknown>;
  try {
    body = await request.json();
    if (!body || typeof body !== 'object' || Array.isArray(body)) throw new Error('Invalid body');
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }
  const who = await resolveReadableTelegramId(body.telegramId == null ? null : String(body.telegramId));
  if ('status' in who) return NextResponse.json({ error: 'Sign in again' }, { status: who.status });
  const telegramId = who.telegramId;
  const subscriptionId = typeof body.subscriptionId === 'string' ? body.subscriptionId.trim() : '';
  if (!telegramId || !/^I-[A-Z0-9]{6,32}$/.test(subscriptionId)) {
    return NextResponse.json({ error: 'telegramId and a PayPal subscriptionId are required' }, { status: 400 });
  }
  if (!isPayPalConfigured()) {
    return NextResponse.json({ error: 'PAYPAL_CLIENT_SECRET is not configured on the server' }, { status: 503 });
  }
  const db = getSupabaseAdmin();
  if (!db) return serviceRoleMissing();

  let verified;
  try { verified = await verifyPayPalSubscription(subscriptionId); }
  catch { return NextResponse.json({ error: 'PayPal is unavailable. Please try again.' }, { status: 502 }); }
  if (!verified.ok) return NextResponse.json({ error: verified.error }, { status: 402 });
  // The ID alone is not proof of purchase ownership. New checkouts bind the
  // PayPal custom_id to the verified Telegram ID. Legacy subscriptions may
  // only be refreshed by the account they are already recorded against.
  const { data: owners, error: ownerError } = await db.from('telegram_users')
    .select('telegram_id').eq('subscription_id', subscriptionId);
  if (ownerError) return NextResponse.json({ error: 'Ownership lookup failed' }, { status: 502 });
  if ((owners || []).some(owner => Number(owner.telegram_id) !== telegramId)) {
    return NextResponse.json({ error: 'Subscription belongs to another account' }, { status: 409 });
  }
  const bound = verified.customId === `tg:${telegramId}`;
  const legacyOwner = !verified.customId && owners?.some(owner => Number(owner.telegram_id) === telegramId);
  if (!bound && !legacyOwner) return NextResponse.json({ error: 'Subscription account does not match' }, { status: 403 });
  const until = verified.paidUntil;

  const { error } = await db.from('telegram_users').upsert(
    {
      telegram_id: telegramId,
      is_premium: true,
      subscription_id: subscriptionId,
      premium_until: until.toISOString(),
      last_seen: new Date().toISOString(),
    },
    { onConflict: 'telegram_id' }
  );
  if (error) return NextResponse.json({ error: error.message }, { status: 502 });

  return NextResponse.json({ active: true, subscriptionId, premiumUntil: until.toISOString() });
}
