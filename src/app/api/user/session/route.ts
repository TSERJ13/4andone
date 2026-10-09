import { NextRequest, NextResponse } from 'next/server';
import {
  USER_COOKIE,
  createUserSessionValue,
  getSessionTelegramId,
  isUserSessionConfigured,
  verifyTelegramInitData,
  verifyTelegramLogin,
} from '@/lib/user-session';

const cookieOptions = (maxAge: number) => ({
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
  path: '/',
  maxAge,
});

/** GET: which Telegram account this browser is signed in as (server-verified). */
export async function GET() {
  return NextResponse.json(
    { configured: isUserSessionConfigured(), telegramId: await getSessionTelegramId() },
    { headers: { 'cache-control': 'no-store' } }
  );
}

/**
 * POST: exchange a Telegram login for a session cookie. Body is either the
 * Login Widget user object ({ id, first_name, …, auth_date, hash }) or
 * { initData } from the Telegram Mini App. Both are checked with the bot token.
 */
export async function POST(request: NextRequest) {
  if (!isUserSessionConfigured()) {
    return NextResponse.json({ configured: false }, { status: 503 });
  }
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }
  const telegramId = typeof body.initData === 'string'
    ? verifyTelegramInitData(body.initData)
    : verifyTelegramLogin(body);
  if (!telegramId) {
    await new Promise((r) => setTimeout(r, 300));
    return NextResponse.json({ error: 'Telegram login could not be verified' }, { status: 401 });
  }
  const { value, maxAge } = createUserSessionValue(telegramId);
  const res = NextResponse.json({ telegramId });
  res.cookies.set(USER_COOKIE, value, cookieOptions(maxAge));
  return res;
}

/** DELETE: sign out. */
export async function DELETE() {
  const res = NextResponse.json({ telegramId: null });
  res.cookies.set(USER_COOKIE, '', cookieOptions(0));
  return res;
}
