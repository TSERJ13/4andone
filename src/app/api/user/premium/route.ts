import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin, serviceRoleMissing } from '@/lib/supabase-admin';
import { parseTelegramId, readPremiumStatus } from '@/lib/premium';
import { isPayPalConfigured, verifyPayPalSubscription } from '@/lib/paypal';

// Public, read-only: is this Telegram user premium? (telegram_users itself is
// no longer readable with the public key — it holds personal data.)
export async function GET(request: NextRequest) {
  const telegramId = parseTelegramId(request.nextUrl.searchParams.get('tid'));
  if (!telegramId) return NextResponse.json({ error: 'tid required' }, { status: 400 });

  const db = getSupabaseAdmin();
  if (!db) return serviceRoleMissing();

  const status = await readPremiumStatus(db, telegramId);
  if (!status) return NextResponse.json({ error: 'Lookup failed' }, { status: 502 });

  // MONTHLY RENEWAL: a PayPal subscription past its paid period is re-checked
  // with PayPal; if it renewed, the paid period is extended automatically.
  if (!status.active && status.subscriptionId?.startsWith('I-') && status.premiumUntil && isPayPalConfigured()) {
    const verified = await verifyPayPalSubscription(status.subscriptionId);
    if (verified.ok) {
      const premiumUntil = verified.paidUntil.toISOString();
      await db.from('telegram_users').update({ is_premium: true, premium_until: premiumUntil }).eq('telegram_id', telegramId);
      return NextResponse.json({ active: true, subscriptionId: status.subscriptionId, premiumUntil }, { headers: { 'cache-control': 'no-store' } });
    }
  }
  return NextResponse.json(status, { headers: { 'cache-control': 'no-store' } });
}
