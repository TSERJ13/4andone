import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

let existing: { is_premium: boolean; subscription_id: string | null } | null = null;
let upsertError: { message: string } | null = null;
const sent: any[] = [];

const db = {
  from: () => {
    const q: any = {
      select: () => q, eq: () => q,
      maybeSingle: async () => ({ data: existing, error: null }),
      upsert: async () => ({ error: upsertError }),
      then: (a: any) => Promise.resolve({ data: [], error: null }).then(a),
    };
    return q;
  },
};
vi.mock('server-only', () => ({}));
vi.mock('next/headers', () => ({ cookies: async () => ({ get: () => undefined }), headers: async () => new Headers() }));
vi.mock('@/lib/supabase-admin', () => ({ getSupabaseAdmin: () => db, serviceRoleMissing: () => Response.json({}, { status: 503 }) }));
vi.mock('@/lib/user-session', () => ({
  resolveReadableTelegramId: async () => ({ telegramId: 42 }),
  botTokenEntries: () => [{ env: 'TELEGRAM_BOT_TOKEN', token: 'A:one' }, { env: 'TELEGRAM_WEBAPP_BOT_TOKEN', token: 'B:two' }],
}));
vi.mock('@/lib/paypal', () => ({
  isPayPalConfigured: () => true,
  verifyPayPalSubscription: async () => ({ ok: true, paidUntil: new Date('2027-01-01'), customId: 'tg:42' }),
}));

const activate = async () => {
  const { POST } = await import('../src/app/api/subscription/activate/route');
  const res = await POST(new NextRequest('http://x/api/subscription/activate', { method: 'POST', body: JSON.stringify({ subscriptionId: 'I-ABC12345' }) }));
  return { status: res.status, json: await res.json() };
};

beforeEach(() => {
  existing = null; upsertError = null; sent.length = 0;
  vi.stubGlobal('fetch', vi.fn(async (url: string, init: any) => {
    sent.push({ url, body: JSON.parse(init.body) });
    // the first bot can't reach this person; the second can
    const ok = String(url).includes('B:two');
    return new Response(JSON.stringify({ ok }), { status: ok ? 200 : 403 });
  }));
});

describe('thank-you message for a new subscriber', () => {
  it('sends once on first activation, trying the next bot when the first cannot reach the person', async () => {
    const r = await activate();
    expect(r.status).toBe(200);
    expect(sent.map(s => s.url.includes('A:one') ? 'A' : 'B')).toEqual(['A', 'B']);
    expect(sent[1].body.chat_id).toBe(42);
    expect(sent[1].body.text).toMatch(/გმადლობთ/);
  });
  it('does not send again when the same subscription is already active', async () => {
    existing = { is_premium: true, subscription_id: 'I-ABC12345' };
    expect((await activate()).status).toBe(200);
    expect(sent).toHaveLength(0);
  });
  it('does not send if saving the subscription failed', async () => {
    upsertError = { message: 'db down' };
    expect((await activate()).status).toBe(502);
    expect(sent).toHaveLength(0);
  });
  it('a Telegram failure never breaks the activation', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => { throw new Error('network'); }));
    const r = await activate();
    expect(r.status).toBe(200);
    expect(r.json.active).toBe(true);
  });
});
