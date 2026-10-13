import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
vi.mock('server-only', () => ({}));
let payments: typeof import('../src/lib/paypal');
const request = vi.fn();
beforeEach(async () => {
  vi.resetModules(); vi.stubEnv('PAYPAL_CLIENT_SECRET','local-test'); vi.stubEnv('NEXT_PUBLIC_PAYPAL_PLAN_ID','P-TEST');
  vi.stubGlobal('fetch', request); request.mockReset();
  payments = await import('../src/lib/paypal');
});
afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs(); });
const reply = (value: unknown, status = 200) => new Response(JSON.stringify(value), { status });
const subscription = (extra: Record<string, unknown> = {}) => ({status:'ACTIVE',plan_id:'P-TEST',custom_id:'tg:11',billing_info:{next_billing_time:new Date(Date.now()+86400000).toISOString()},...extra});
describe('PayPal provider verification', () => {
  it.each([{status:'APPROVED'},{plan_id:'P-FOREIGN'},{billing_info:{}},{billing_info:{next_billing_time:'invalid'}},{billing_info:{next_billing_time:'2000-01-01'}}])('rejects unconfirmed entitlement %j', async extra => {
    request.mockResolvedValueOnce(reply({access_token:'test'})).mockResolvedValueOnce(reply(subscription(extra)));
    expect((await payments.verifyPayPalSubscription('I-TEST123')).ok).toBe(false);
  });
  it('uses the confirmed billing date and exposes the purchase owner for server checking', async () => {
    const sub = subscription(); request.mockResolvedValueOnce(reply({access_token:'test'})).mockResolvedValueOnce(reply(sub));
    const result=await payments.verifyPayPalSubscription('I-TEST123');
    expect(result).toEqual({ok:true,customId:'tg:11',paidUntil:new Date(sub.billing_info.next_billing_time)});
  });
  it('cancels recurring billing at PayPal, and supports retry after cancellation', async () => {
    request.mockResolvedValueOnce(reply({access_token:'test'})).mockResolvedValueOnce(new Response(null,{status:204}));
    expect(await payments.cancelPayPalSubscription('I-TEST123')).toBe(true);
    expect(request.mock.calls[1][0]).toMatch(/I-TEST123\/cancel$/);
    expect(request.mock.calls[1][1].method).toBe('POST');
    request.mockResolvedValueOnce(reply({access_token:'test'})).mockResolvedValueOnce(reply({},422)).mockResolvedValueOnce(reply({status:'CANCELLED'}));
    expect(await payments.cancelPayPalSubscription('I-TEST123')).toBe(true);
  });
});
