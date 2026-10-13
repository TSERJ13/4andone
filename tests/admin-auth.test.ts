import { beforeAll, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
vi.mock('server-only', () => ({}));
vi.mock('next/headers', () => ({ cookies: async () => ({ get: () => undefined }), headers: async () => new Headers() }));
beforeAll(() => {
  vi.stubEnv('ADMIN_PASSWORD','test-only'); vi.stubEnv('ADMIN_SESSION_SECRET','test-only');
  vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL','https://example.supabase.co'); vi.stubEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY','local-public-test-key');
  vi.stubEnv('TELEGRAM_BOT_TOKEN','123456:test-only'); vi.stubEnv('CRON_SECRET','test-only');
});
const loaders = {
  'admin/db': () => import('../src/app/api/admin/db/route'),
  'admin/promos': () => import('../src/app/api/admin/promos/route'),
  'admin/referrals': () => import('../src/app/api/admin/referrals/route'),
  'admin/referrals/grant': () => import('../src/app/api/admin/referrals/grant/route'),
  'admin/telegram/send': () => import('../src/app/api/admin/telegram/send/route'),
  'admin/telegram/check-status': () => import('../src/app/api/admin/telegram/check-status/route'),
  'admin/adsense': () => import('../src/app/api/admin/adsense/route'),
  'admin/adsense/auth': () => import('../src/app/api/admin/adsense/auth/route'),
  'admin/adsense/callback': () => import('../src/app/api/admin/adsense/callback/route'),
  'albums': () => import('../src/app/api/albums/route'),
  'albums/reorder': () => import('../src/app/api/albums/reorder/route'),
  'contact': () => import('../src/app/api/contact/route'),
  'upload': () => import('../src/app/api/upload/route'),
  'cron/daily-report': () => import('../src/app/api/cron/daily-report/route'),
};
const routes = [
  ['admin/db','POST'], ['admin/promos','GET'], ['admin/promos','POST'], ['admin/promos','DELETE'],
  ['admin/referrals','GET'], ['admin/referrals/grant','POST'],
  ['admin/telegram/send','POST'], ['admin/telegram/check-status','POST'],
  ['admin/adsense','GET'], ['admin/adsense/auth','GET'], ['admin/adsense/callback','GET'],
  ['albums','POST'], ['albums','PUT'], ['albums','DELETE'], ['albums/reorder','POST'],
  ['contact','GET'], ['contact','DELETE'], ['upload','POST'],
  ['cron/daily-report','GET'], ['cron/daily-report','POST'],
] as const;
describe('real admin route authorization', () => {
  it.each(routes)('%s %s denies unauthenticated access', async (path, method) => {
    const route = await loaders[path]() as Record<string, (req: NextRequest) => Promise<Response>>;
    expect(typeof route[method]).toBe('function');
    const response = await route[method](new NextRequest(`http://localhost/api/${path}`, {method,...(method==='GET'?{}:{headers:{'content-type':'application/json'},body:'{}'})}));
    expect(response.status).toBe(401);
  });
});
