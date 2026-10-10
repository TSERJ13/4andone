import 'server-only';
import crypto from 'crypto';
import { cookies, headers } from 'next/headers';
import { parseTelegramId } from '@/lib/premium';

// Listener session — proves on the SERVER which Telegram account is calling,
// so one person can't read another person's listening history by guessing a
// Telegram ID. The Telegram login (widget or Mini App) is verified with the
// bot token, then a signed, httpOnly cookie carries the Telegram ID.
//
// Needs TELEGRAM_BOT_TOKEN (server-only env var, from @BotFather for the login
// bot). Until it is set, the old "?tid=" lookups keep working so nothing breaks.

export const USER_COOKIE = '4a_user_session';
/** Same signed value, sent by the app as a header — works where cookies don't (Telegram in-app views, iframes). */
export const USER_HEADER = 'x-4a-session';
const SESSION_TTL_SECONDS = 180 * 24 * 60 * 60;
// A saved Telegram login older than this must sign in again.
const MAX_LOGIN_AGE_SECONDS = 365 * 24 * 60 * 60;

// The login-widget bot and the Mini App bot can be different bots: every
// token listed is accepted (comma-separated, or the two optional variables).
const botTokens = () =>
  [process.env.TELEGRAM_BOT_TOKEN, process.env.TELEGRAM_LOGIN_BOT_TOKEN, process.env.TELEGRAM_WEBAPP_BOT_TOKEN]
    .flatMap(v => (v || '').split(','))
    .map(v => v.trim())
    .filter(Boolean);

export const isUserSessionConfigured = () => botTokens().length > 0;

const sessionKey = () =>
  crypto.createHash('sha256').update(`4andone-user-session:${process.env.USER_SESSION_SECRET || botTokens()[0] || ''}`).digest();

const safeEqual = (a: string, b: string) => {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  return ab.length === bb.length && crypto.timingSafeEqual(ab, bb);
};

const isFresh = (authDate: unknown) => {
  const t = Number(authDate);
  const now = Date.now() / 1000;
  return Number.isFinite(t) && t <= now + 300 && now - t <= MAX_LOGIN_AGE_SECONDS;
};

/** Telegram Login Widget data — https://core.telegram.org/widgets/login#checking-authorization */
export const verifyTelegramLogin = (data: Record<string, unknown>): number | null => {
  const hash = typeof data.hash === 'string' ? data.hash : '';
  if (!/^[0-9a-f]{64}$/.test(hash) || !isFresh(data.auth_date)) return null;
  const fields = ['auth_date', 'first_name', 'id', 'last_name', 'photo_url', 'username'];
  const checkString = fields
    .filter(k => data[k] !== undefined && data[k] !== null && data[k] !== '')
    .map(k => `${k}=${data[k]}`)
    .join('\n');
  const ok = botTokens().some(token => {
    const secret = crypto.createHash('sha256').update(token).digest();
    return safeEqual(hash, crypto.createHmac('sha256', secret).update(checkString).digest('hex'));
  });
  return ok ? parseTelegramId(data.id) : null;
};

/** Telegram Mini App initData — https://core.telegram.org/bots/webapps#validating-data-received-via-the-mini-app */
export const verifyTelegramInitData = (initData: string): number | null => {
  if (!initData) return null;
  const params = new URLSearchParams(initData);
  const hash = params.get('hash') || '';
  if (!/^[0-9a-f]{64}$/.test(hash) || !isFresh(params.get('auth_date'))) return null;
  params.delete('hash');
  const checkString = [...params.entries()]
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
    .map(([k, v]) => `${k}=${v}`)
    .join('\n');
  const ok = botTokens().some(token => {
    const secret = crypto.createHmac('sha256', 'WebAppData').update(token).digest();
    return safeEqual(hash, crypto.createHmac('sha256', secret).update(checkString).digest('hex'));
  });
  if (!ok) return null;
  try {
    return parseTelegramId(JSON.parse(params.get('user') || '{}').id);
  } catch {
    return null;
  }
};

const sign = (payload: string) => crypto.createHmac('sha256', sessionKey()).update(payload).digest('base64url');

export const createUserSessionValue = (telegramId: number) => {
  const expires = Math.floor(Date.now() / 1000) + SESSION_TTL_SECONDS;
  const payload = `u.${telegramId}.${expires}`;
  return { value: `${payload}.${sign(payload)}`, maxAge: SESSION_TTL_SECONDS };
};

const readSessionValue = (value: string | undefined): number | null => {
  if (!value || !isUserSessionConfigured()) return null;
  const lastDot = value.lastIndexOf('.');
  if (lastDot <= 0) return null;
  const payload = value.slice(0, lastDot);
  if (!safeEqual(value.slice(lastDot + 1), sign(payload))) return null;
  const [kind, id, expires] = payload.split('.');
  if (kind !== 'u' || !(Number(expires) > Date.now() / 1000)) return null;
  return parseTelegramId(id);
};

/** The Telegram ID proven by the session (header from the app, or the cookie), or null. */
export const getSessionTelegramId = async () => {
  const fromHeader = readSessionValue((await headers()).get(USER_HEADER) ?? undefined);
  if (fromHeader) return fromHeader;
  const store = await cookies();
  return readSessionValue(store.get(USER_COOKIE)?.value);
};

/**
 * Which account a request may read. With the bot token set, ONLY the session
 * cookie counts (a "?tid=" for anyone else is refused). Without it, the
 * requested tid is used as before.
 */
export const resolveReadableTelegramId = async (requestedTid: string | null):
  Promise<{ telegramId: number } | { status: 400 | 401 | 403 }> => {
  const requested = parseTelegramId(requestedTid);
  if (!isUserSessionConfigured()) return requested ? { telegramId: requested } : { status: 400 };
  const sessionId = await getSessionTelegramId();
  if (!sessionId) return { status: 401 };
  if (requested && requested !== sessionId) return { status: 403 };
  return { telegramId: sessionId };
};
