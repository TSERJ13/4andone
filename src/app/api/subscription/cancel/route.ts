import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin, serviceRoleMissing } from '@/lib/supabase-admin';
import { resolveReadableTelegramId } from '@/lib/user-session';
import { readPremiumStatus } from '@/lib/premium';
import { cancelPayPalSubscription, isPayPalConfigured } from '@/lib/paypal';

export async function POST(request: NextRequest) {
  let body: Record<string, unknown>;
  try {
    body = await request.json();
    if (!body || typeof body !== 'object' || Array.isArray(body)) throw new Error('Invalid body');
  } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }); }
  const who = await resolveReadableTelegramId(body.telegramId == null ? null : String(body.telegramId));
  if ('status' in who) return NextResponse.json({ error: 'Sign in again' }, { status: who.status });
  const db = getSupabaseAdmin();
  if (!db) return serviceRoleMissing();
  const status = await readPremiumStatus(db, who.telegramId);
  if (!status) return NextResponse.json({ error: 'Lookup failed' }, { status: 502 });
  if (!status.subscriptionId?.startsWith('I-')) {
    return NextResponse.json({ error: 'No recurring PayPal subscription to cancel' }, { status: 400 });
  }
  if (!isPayPalConfigured()) return NextResponse.json({ error: 'PayPal is not configured' }, { status: 503 });
  try {
    if (!(await cancelPayPalSubscription(status.subscriptionId))) {
      return NextResponse.json({ error: 'PayPal cancellation failed; your subscription was not changed' }, { status: 502 });
    }
    // Keep the stored ID and paid-until timestamp. Deleting them previously
    // removed paid access without cancelling the actual PayPal billing.
    return NextResponse.json({ ok: true, cancelled: true, ...status });
  } catch { return NextResponse.json({ error: 'PayPal is unavailable. Please retry.' }, { status: 502 }); }
}
