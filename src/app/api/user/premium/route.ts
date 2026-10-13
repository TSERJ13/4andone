import { resolveReadableTelegramId } from '@/lib/user-session';
import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin, serviceRoleMissing } from '@/lib/supabase-admin';
import { readPremiumStatus } from '@/lib/premium';
import { isPayPalConfigured, verifyPayPalSubscription } from '@/lib/paypal';

// Session-authenticated: return only the signed-in account’s Premium status.
// (telegram_users itself is
// no longer readable with the public key — it holds personal data.)
export async function GET(request: NextRequest) {
  const who = await resolveReadableTelegramId(request.nextUrl.searchParams.get('tid'));
  if ('status' in who) return NextResponse.json({ error: 'Sign in again' }, { status: who.status });
  const telegramId = who.telegramId;

  const db = getSupabaseAdmin();
  if (!db) return serviceRoleMissing();

  const status = await readPremiumStatus(db, telegramId);
  if (!status) return NextResponse.json({ error: 'Lookup failed' }, { status: 502 });

  // MONTHLY RENEWAL: a PayPal subscription past its paid period is re-checked
  // with PayPal; if it renewed, the paid period is extended automatically.
  if (!status.active && status.subscriptionId?.startsWith('I-') && status.premiumUntil && isPayPalConfigured()) {
    let verified;
    try { verified = await verifyPayPalSubscription(status.subscriptionId); }
    catch { return NextResponse.json({ error: 'PayPal is unavailable. Please retry.' }, { status: 502 }); }
    if (verified.ok) {
      if (verified.customId && verified.customId !== `tg:${telegramId}`) {
        return NextResponse.json({ error: 'Subscription account does not match' }, { status: 403 });
      }
      const premiumUntil = verified.paidUntil.toISOString();
      const { error } = await db.from('telegram_users').update({ is_premium: true, premium_until: premiumUntil }).eq('telegram_id', telegramId);
      if (error) return NextResponse.json({ error: 'Renewal could not be saved' }, { status: 502 });
      return NextResponse.json({ active: true, subscriptionId: status.subscriptionId, premiumUntil }, { headers: { 'cache-control': 'no-store' } });
    }
  }
  return NextResponse.json(status, { headers: { 'cache-control': 'no-store' } });
}
