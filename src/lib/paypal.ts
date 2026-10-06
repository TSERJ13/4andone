import 'server-only';

const PAYPAL_API = process.env.PAYPAL_API_BASE || 'https://api-m.paypal.com';
const PLAN_ID = process.env.NEXT_PUBLIC_PAYPAL_PLAN_ID || 'P-2P321243C53094157NLCL5WI';
// Same public Client ID the subscribe button uses (SubscriptionModal), so only
// PAYPAL_CLIENT_SECRET has to be added to the server environment.
const CLIENT_ID = process.env.PAYPAL_CLIENT_ID || process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID
  || 'AR7DFDs4W3LqJNeFTELaFs06b8vuc3tcE6FZSmloQgAmtM05ZaR2_cRJosyOFGWF5ZEsXRAGNQVlFkDn';
const CLIENT_SECRET = process.env.PAYPAL_CLIENT_SECRET || '';

export const isPayPalConfigured = () => !!(CLIENT_ID && CLIENT_SECRET);

const getToken = async () => {
  const res = await fetch(`${PAYPAL_API}/v1/oauth2/token`, {
    method: 'POST',
    headers: {
      authorization: `Basic ${Buffer.from(`${CLIENT_ID}:${CLIENT_SECRET}`).toString('base64')}`,
      'content-type': 'application/x-www-form-urlencoded',
    },
    body: 'grant_type=client_credentials',
    cache: 'no-store',
  });
  if (!res.ok) return null;
  const json = await res.json();
  return typeof json.access_token === 'string' ? (json.access_token as string) : null;
};

export type PayPalVerification =
  | { ok: true; paidUntil: Date }
  | { ok: false; error: string };

/**
 * Confirms with PayPal that the subscription is ACTIVE on our plan and returns
 * until when it is paid (next billing date + 3 days grace).
 */
export const verifyPayPalSubscription = async (subscriptionId: string): Promise<PayPalVerification> => {
  if (!isPayPalConfigured()) return { ok: false, error: 'PayPal is not configured' };
  const token = await getToken();
  if (!token) return { ok: false, error: 'PayPal authentication failed' };

  const res = await fetch(`${PAYPAL_API}/v1/billing/subscriptions/${encodeURIComponent(subscriptionId)}`, {
    headers: { authorization: `Bearer ${token}` },
    cache: 'no-store',
  });
  if (!res.ok) return { ok: false, error: 'Subscription not found at PayPal' };
  const sub = await res.json();

  const status = String(sub.status || '');
  if (!['ACTIVE', 'APPROVED'].includes(status) || sub.plan_id !== PLAN_ID) {
    return { ok: false, error: `Subscription is not active (${status || 'unknown'})` };
  }
  const next = sub.billing_info?.next_billing_time ? new Date(sub.billing_info.next_billing_time) : null;
  const paidUntil = next && !Number.isNaN(next.getTime()) ? next : new Date(Date.now() + 31 * 86400000);
  paidUntil.setDate(paidUntil.getDate() + 3);
  return { ok: true, paidUntil };
};
