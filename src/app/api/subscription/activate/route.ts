import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin, serviceRoleMissing } from '@/lib/supabase-admin';
import { parseTelegramId } from '@/lib/premium';
import { isPayPalConfigured, verifyPayPalSubscription } from '@/lib/paypal';

// Activates Premium after the PayPal subscription popup — but only after the
// subscription is VERIFIED with PayPal's API (status ACTIVE, our plan). The
// browser can no longer simply write is_premium=true.

export async function POST(request: NextRequest) {
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }
  const telegramId = parseTelegramId(body.telegramId);
  const subscriptionId = typeof body.subscriptionId === 'string' ? body.subscriptionId.trim() : '';
  if (!telegramId || !/^I-[A-Z0-9]{6,32}$/.test(subscriptionId)) {
    return NextResponse.json({ error: 'telegramId and a PayPal subscriptionId are required' }, { status: 400 });
  }
  if (!isPayPalConfigured()) {
    return NextResponse.json({ error: 'PAYPAL_CLIENT_SECRET is not configured on the server' }, { status: 503 });
  }
  const db = getSupabaseAdmin();
  if (!db) return serviceRoleMissing();

  const verified = await verifyPayPalSubscription(subscriptionId);
  if (!verified.ok) return NextResponse.json({ error: verified.error }, { status: 402 });
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
