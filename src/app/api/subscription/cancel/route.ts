import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin, serviceRoleMissing } from '@/lib/supabase-admin';
import { parseTelegramId } from '@/lib/premium';

export async function POST(request: NextRequest) {
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }
  
  const telegramId = parseTelegramId(body.telegramId);
  if (!telegramId) {
    return NextResponse.json({ error: 'telegramId is required' }, { status: 400 });
  }

  const db = getSupabaseAdmin();
  if (!db) return serviceRoleMissing();

  const { error } = await db.from('telegram_users').update(
    {
      is_premium: false,
      subscription_id: null,
      premium_until: null,
      last_seen: new Date().toISOString(),
    }
  ).eq('telegram_id', telegramId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 502 });
  }

  return NextResponse.json({ ok: true, cancelled: true });
}
