import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
import crypto from 'node:crypto';
vi.mock('server-only', () => ({}));
const state = vi.hoisted(() => ({ cookie: undefined as string | undefined, header: null as string | null, db: vi.fn(), paypal: vi.fn() }));
vi.mock('next/headers', () => ({ cookies: async () => ({ get: () => state.cookie ? { value: state.cookie } : undefined }), headers: async () => new Headers(state.header ? { 'x-4a-session': state.header } : {}) }));
vi.mock('@/lib/supabase-admin', () => ({ getSupabaseAdmin: () => state.db(), serviceRoleMissing: () => new Response('', { status: 503 }) }));
vi.mock('@/lib/paypal', () => ({ isPayPalConfigured: () => true, verifyPayPalSubscription: (...args: unknown[]) => state.paypal(...args), cancelPayPalSubscription: (...args: unknown[]) => state.paypal(...args) }));
import { createUserSessionValue, resolveReadableTelegramId, verifyTelegramLogin } from '../src/lib/user-session';
import { isPublicMediaKey } from '../src/lib/media-key';
import { telegramPreviewHtml } from '../src/utils/telegram-html';
import { POST as cancel } from '../src/app/api/subscription/cancel/route';
import { POST as activate } from '../src/app/api/subscription/activate/route';
import { POST as sync } from '../src/app/api/user/sync/route';
import { POST as library } from '../src/app/api/user/library/route';
import { GET as premium } from '../src/app/api/user/premium/route';
beforeEach(() => {
  vi.stubEnv('TELEGRAM_BOT_TOKEN', '123456:test-token'); vi.stubEnv('USER_SESSION_SECRET', 'test-secret');
  state.cookie = undefined; state.header = null; state.db.mockReset(); state.paypal.mockReset();
});
const request = (path: string, body: unknown) => new NextRequest(`http://localhost${path}`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
describe('session authorization', () => {
  it('rejects missing authentication and another account ID before accessing the database', async () => {
    for (const route of [cancel, activate, sync]) {
      const response = await route(request('/api/test', { telegramId: 22, telegram_id: 22, subscriptionId: 'I-ABCDEF123' }));
      expect(response.status).toBe(401);
    }
    expect((await premium(new NextRequest('http://localhost/api/user/premium?tid=22'))).status).toBe(401);
    expect((await library(request('/api/user/library', {}))).status).toBe(401);
    expect(state.db).not.toHaveBeenCalled();
    state.header = createUserSessionValue(11).value;
    expect((await cancel(request('/api/subscription/cancel', { telegramId: 22 }))).status).toBe(403);
    expect(state.paypal).not.toHaveBeenCalled();
  });
  it('fails closed when Telegram is unconfigured', async () => {
    vi.stubEnv('TELEGRAM_BOT_TOKEN', ''); vi.stubEnv('TELEGRAM_LOGIN_BOT_TOKEN', ''); vi.stubEnv('TELEGRAM_WEBAPP_BOT_TOKEN', '');
    expect(await resolveReadableTelegramId('22')).toEqual({ status: 401 });
  });
  it('rejects tampered and expired session receipts', async () => {
    state.header = createUserSessionValue(11).value + 'tampered';
    expect(await resolveReadableTelegramId('11')).toEqual({ status: 401 });
    vi.useFakeTimers(); state.header = createUserSessionValue(11).value;
    vi.advanceTimersByTime(181 * 86400000);
    expect(await resolveReadableTelegramId('11')).toEqual({ status: 401 });
    vi.useRealTimers();
  });
  it('verifies fresh Telegram widget signatures, not year-old reusable proofs', () => {
    const sign = (date: number) => {
      const data = { auth_date: date, first_name: 'Test', id: 11 };
      const secret = crypto.createHash('sha256').update('123456:test-token').digest();
      const check = Object.entries(data).map(([k,v]) => `${k}=${v}`).join('\n');
      return { ...data, hash: crypto.createHmac('sha256', secret).update(check).digest('hex') };
    };
    expect(verifyTelegramLogin(sign(Math.floor(Date.now()/1000)))).toBe(11);
    expect(verifyTelegramLogin(sign(Math.floor(Date.now()/1000)-172800))).toBeNull();
  });
});
describe('public media and admin preview', () => {
  it.each(['_system/adsense-tokens.json','_system/photo.png','../file.mp3','%5fsystem/key.mp3','a/%2e%2e/file.mp3','a\\b.mp3','image.svg','x.json'])('blocks private/untrusted key %s', key => expect(isPublicMediaKey(key)).toBe(false));
  it.each(['song.mp3','albums/曲.mp3','photo-123.webp'])('allows catalog media %s', key => expect(isPublicMediaKey(key)).toBe(true));
  it('renders formatting but escapes executable HTML and injected attributes', () => {
    const html = telegramPreviewHtml('<b>Dance</b><img src=x onerror=alert(1)><a href="javascript:alert(1)">Click</a><b onclick="x()">Name</b>');
    expect(html).toContain('<b>Dance</b>');
    expect(html).not.toMatch(/<img|<a|<b onclick/);
  });
});
