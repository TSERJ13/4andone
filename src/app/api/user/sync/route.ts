import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin, serviceRoleMissing } from '@/lib/supabase-admin';
import { parseTelegramId, readPremiumStatus } from '@/lib/premium';

const text = (v: unknown, max = 200) => (typeof v === 'string' && v.length > 0 ? v.slice(0, max) : null);

// Records a Telegram user's profile/visit for analytics. Only profile and
// visit columns can be written here — premium columns are set exclusively by
// /api/subscription/activate (verified with PayPal) or by the admin panel.
export async function POST(request: NextRequest) {
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }
  const telegramId = parseTelegramId(body.telegram_id);
  if (!telegramId) return NextResponse.json({ error: 'telegram_id required' }, { status: 400 });

  const db = getSupabaseAdmin();
  if (!db) return serviceRoleMissing();

  const profile: Record<string, unknown> = {
    telegram_id: telegramId,
    first_name: text(body.first_name) ?? 'Dancer',
    last_name: text(body.last_name),
    username: text(body.username, 64),
    photo_url: text(body.photo_url, 500),
    last_seen: new Date().toISOString(),
  };
  const countryCode = text(body.country_code, 8);
  const countryName = text(body.country_name, 100);
  if (countryCode) profile.country_code = countryCode;
  if (countryName) profile.country_name = countryName;

  const { error } = await db.from('telegram_users').upsert(profile, { onConflict: 'telegram_id' });
  if (error) return NextResponse.json({ error: error.message }, { status: 502 });

  if (body.countVisit !== false) {
    await db.rpc('increment_user_visit', { uid: telegramId });
  }

  const premium = await readPremiumStatus(db, telegramId);
  return NextResponse.json({ ok: true, premium });
}
