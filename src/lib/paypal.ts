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
    signal: AbortSignal.timeout(10000),
  });
  if (!res.ok) return null;
  const json = await res.json();
  return typeof json.access_token === 'string' ? (json.access_token as string) : null;
};

export type PayPalVerification =
  | { ok: true; paidUntil: Date; customId: string | null }
  | { ok: false; error: string };

/**
 * Confirms with PayPal that the subscription is ACTIVE on our plan and returns
 * the end of the current billing period without inventing a grace period.
 */
export const verifyPayPalSubscription = async (subscriptionId: string): Promise<PayPalVerification> => {
  if (!isPayPalConfigured()) return { ok: false, error: 'PayPal is not configured' };
  const token = await getToken();
  if (!token) return { ok: false, error: 'PayPal authentication failed' };

  const res = await fetch(`${PAYPAL_API}/v1/billing/subscriptions/${encodeURIComponent(subscriptionId)}`, {
    headers: { authorization: `Bearer ${token}` },
    cache: 'no-store',
    signal: AbortSignal.timeout(10000),
  });
  if (!res.ok) return { ok: false, error: 'Subscription not found at PayPal' };
  const sub = await res.json();

  const status = String(sub.status || '');
  if (status !== 'ACTIVE' || sub.plan_id !== PLAN_ID) {
    return { ok: false, error: `Subscription is not active (${status || 'unknown'})` };
  }
  const next = sub.billing_info?.next_billing_time ? new Date(sub.billing_info.next_billing_time) : null;
  if (!next || !Number.isFinite(next.getTime()) || next.getTime() <= Date.now()) {
    return { ok: false, error: 'PayPal has not confirmed the current billing period' };
  }
  return { ok: true, paidUntil: next, customId: typeof sub.custom_id === 'string' ? sub.custom_id : null };
};

/** Cancel recurring billing at PayPal, keeping the already paid access period. */
export const cancelPayPalSubscription = async (subscriptionId: string): Promise<boolean> => {
  const token = await getToken();
  if (!token) return false;
  const url = `${PAYPAL_API}/v1/billing/subscriptions/${encodeURIComponent(subscriptionId)}`;
  const headers = { authorization: `Bearer ${token}`, 'content-type': 'application/json' };
  const result = await fetch(`${url}/cancel`, {
    method: 'POST', headers, body: JSON.stringify({ reason: 'Cancelled by the account holder' }),
    cache: 'no-store', signal: AbortSignal.timeout(10000),
  });
  if (result.ok) return true;
  // Retrying an already cancelled subscription is safe and idempotent.
  const details = await fetch(url, { headers, cache: 'no-store', signal: AbortSignal.timeout(10000) });
  return details.ok && (await details.json()).status === 'CANCELLED';
};

export interface PayPalPlanCheck {
  ok: boolean;
  message: string;
  plan?: { id: string; name: string; status: string; price: string | null; trialDays: number | null; interval: string | null };
}

/** Admin status page: can the server sign in to PayPal, and is the subscription plan the one the site sells? */
export const checkPayPalPlan = async (): Promise<PayPalPlanCheck> => {
  if (!CLIENT_SECRET) return { ok: false, message: 'PAYPAL_CLIENT_SECRET is not set on the server' };
  let token: string | null = null;
  try { token = await getToken(); } catch { return { ok: false, message: 'Could not reach PayPal' }; }
  if (!token) return { ok: false, message: 'PayPal rejected the Client ID / Secret (wrong secret, or Sandbox vs Live mismatch)' };
  try {
    const res = await fetch(`${PAYPAL_API}/v1/billing/plans/${encodeURIComponent(PLAN_ID)}`, {
      headers: { authorization: `Bearer ${token}` }, cache: 'no-store', signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) return { ok: false, message: `Signed in, but plan ${PLAN_ID} was not found (${res.status})` };
    const plan = await res.json();
    const cycles: any[] = Array.isArray(plan.billing_cycles) ? plan.billing_cycles : [];
    const regular = cycles.find(c => c.tenure_type === 'REGULAR');
    const trial = cycles.find(c => c.tenure_type === 'TRIAL');
    const fixed = regular?.pricing_scheme?.fixed_price;
    const price = fixed ? `${fixed.value} ${fixed.currency_code}` : null;
    const interval = regular?.frequency ? `${regular.frequency.interval_count} ${String(regular.frequency.interval_unit).toLowerCase()}` : null;
    const status = String(plan.status || '');
    return {
      ok: status === 'ACTIVE',
      message: status === 'ACTIVE' ? 'Connected' : `Plan status is ${status || 'unknown'} (must be ACTIVE)`,
      plan: { id: PLAN_ID, name: String(plan.name || ''), status, price, trialDays: trial?.frequency?.interval_unit === 'DAY' ? Number(trial.frequency.interval_count) : (trial ? 1 : null), interval },
    };
  } catch {
    return { ok: false, message: 'Signed in, but the plan could not be read' };
  }
};
