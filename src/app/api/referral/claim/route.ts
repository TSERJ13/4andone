import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin, serviceRoleMissing } from '@/lib/supabase-admin';
import { resolveReadableTelegramId } from '@/lib/user-session';
import { claimReferral, normalizeCode } from '@/lib/referrals';

// Accept an invite: the signed-in (new) listener and the inviter get Premium.
export async function POST(request: NextRequest) {
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }
  const who = await resolveReadableTelegramId(body.tid == null ? null : String(body.tid));
  if ('status' in who) return NextResponse.json({ error: 'Sign in again' }, { status: who.status });
  const code = normalizeCode(body.code);
  if (!code) return NextResponse.json({ ok: false, reason: 'bad_code' }, { status: 400 });

  const db = getSupabaseAdmin();
  if (!db) return serviceRoleMissing();

  const result = await claimReferral(db, who.telegramId, code);
  const status = result.ok ? 200 : result.reason === 'not_setup' ? 503 : result.reason === 'failed' ? 502 : 409;
  return NextResponse.json(result, { status, headers: { 'cache-control': 'no-store' } });
}
