import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

let rpcResult: { data: any; error: any } = { data: null, error: null };
let lookupFails = false;
const calls: any[] = [];
const db = {
  rpc: async (fn: string, args: any) => { calls.push([fn, args]); return rpcResult; },
  from: () => {
    const q: any = { select: () => q, eq: () => q, order: () => q, then: (a: any) => Promise.resolve({ data: [], error: lookupFails ? { message: 'down' } : null }).then(a) };
    return q;
  },
};
vi.mock('server-only', () => ({}));
vi.mock('next/headers', () => ({ cookies: async () => ({ get: () => undefined }), headers: async () => new Headers() }));
vi.mock('@/lib/supabase-admin', () => ({ getSupabaseAdmin: () => db, serviceRoleMissing: () => Response.json({ error: 'x' }, { status: 503 }) }));
vi.mock('@/utils/supabase', () => ({ supabase: db }));
vi.mock('@/lib/user-session', () => ({ resolveReadableTelegramId: async () => ({ telegramId: 42 }) }));
vi.mock('@/lib/referrals', () => ({ normalizeCode: (c: string) => c, claimReferral: async () => ({ ok: false, reason: 'bad_code' }) }));

const post = async (code: string) => {
  const { POST } = await import('../src/app/api/referral/claim/route');
  const res = await POST(new NextRequest('http://x/api/referral/claim', { method: 'POST', body: JSON.stringify({ code }) }));
  return { status: res.status, json: await res.json() };
};
beforeEach(() => { rpcResult = { data: null, error: null }; lookupFails = false; calls.length = 0; });

describe('promo claim route', () => {
  it('a valid built-in code is sent to the database function for the signed-in user', async () => {
    rpcResult = { data: { ok: true, days: 30, premiumUntil: 'x' }, error: null };
    const r = await post('free30');
    expect(r.status).toBe(200);
    expect(calls[0][1]).toMatchObject({ p_telegram_id: 42, p_code: 'FREE30', p_days: 30 });
  });
  it('a missing/broken database function is a 502 "failed", never "invalid code"', async () => {
    rpcResult = { data: null, error: { message: 'function claim_promo_reward does not exist' } };
    const r = await post('FREE30');
    expect(r.status).toBe(502);
    expect(r.json.reason).toBe('failed');
  });
  it('a database that cannot be read is a 502 too', async () => {
    lookupFails = true;
    expect((await post('FREE30')).status).toBe(502);
  });
  it('already-used and existing-subscription answers pass through with their reason', async () => {
    rpcResult = { data: { ok: false, reason: 'existing_subscription' }, error: null };
    const r = await post('FREE30');
    expect(r.status).toBe(409);
    expect(r.json.reason).toBe('existing_subscription');
  });
});
