import crypto from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin, serviceRoleMissing } from '@/lib/supabase-admin';

// This scoped receipt allows only a duration update for one newly created visit.
// It never grants read access to visitors' IPs, locations, or listening history.
function sign(payload: string) {
  const secret = process.env.USER_SESSION_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!secret) throw new Error('Visit signing unavailable');
  return crypto.createHmac('sha256', secret).update(`visit:${payload}`).digest('base64url');
}
export async function POST(request: NextRequest) {
  const db = getSupabaseAdmin();
  if (!db) return serviceRoleMissing();
  let body;
  try { body = await request.json(); } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }); }
  if (!body || typeof body !== 'object') return NextResponse.json({ error: 'Invalid body' }, { status: 400 });
  const text = (value: unknown, max: number) => typeof value === 'string' ? value.slice(0, max) : null;
  const id = crypto.randomUUID();
  const issued = Math.floor(Date.now() / 1000);
  const payload = `${id}.${issued}`;
  const { error } = await db.from('page_visits').insert({ id, session_id: text(body.session_id, 200),
    user_ref: text(body.user_ref, 200), country_code: text(body.country_code, 8),
    country_name: text(body.country_name, 100), referrer: text(body.referrer, 2000), duration_seconds: 0 });
  if (error) return NextResponse.json({ error: 'Visit could not be recorded' }, { status: 502 });
  return NextResponse.json({ token: `${payload}.${sign(payload)}` }, { headers: { 'cache-control': 'no-store' } });
}
export async function PATCH(request: NextRequest) {
  const token = request.headers.get('authorization')?.replace(/^Bearer /, '') || '';
  const [id, issued, signature, extra] = token.split('.');
  if (extra || !/^[0-9a-f-]{36}$/.test(id || '') || !/^\d+$/.test(issued || '') || !/^[A-Za-z0-9_-]{43}$/.test(signature || '')) return new NextResponse(null, { status: 401 });
  const age = Math.floor(Date.now() / 1000) - Number(issued);
  if (age < 0 || age > 86400) return new NextResponse(null, { status: 401 });
  let expected;
  try { expected = sign(`${id}.${issued}`); } catch { return new NextResponse(null, { status: 503 }); }
  if (signature.length !== expected.length || !crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) return new NextResponse(null, { status: 401 });
  const db = getSupabaseAdmin();
  if (!db) return serviceRoleMissing();
  const { error } = await db.from('page_visits').update({ duration_seconds: age }).eq('id', id);
  return new NextResponse(null, { status: error ? 502 : 204 });
}
