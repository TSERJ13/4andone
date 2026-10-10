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
  // Either proof is enough: Mini App initData and/or the Login Widget data
  // ({ user } — or the widget object itself, as older app versions send it).
  const widget = (body.user && typeof body.user === 'object' ? body.user : body) as Record<string, unknown>;
  const fromInitData = typeof body.initData === 'string' ? verifyTelegramInitData(body.initData) : null;
  const telegramId = fromInitData ?? verifyTelegramLogin(widget);
  if (!telegramId) {
    // Shown in Vercel → Logs: tells which proof failed (no personal data)
    console.warn('[user-session] verification failed', JSON.stringify({
      initData: typeof body.initData === 'string' ? (body.initData.includes('hash=') ? 'present-but-invalid' : 'no-hash') : 'none',
      widgetHash: typeof widget.hash === 'string' ? (/^[0-9a-f]{64}$/.test(widget.hash) ? 'present-but-invalid' : `not-a-widget-hash`) : 'none',
      authDateAgeDays: widget.auth_date ? Math.round((Date.now() / 1000 - Number(widget.auth_date)) / 86400) : null,
    }));
    await new Promise((r) => setTimeout(r, 300));
    return NextResponse.json({ error: 'Telegram login could not be verified' }, { status: 401 });
  }
  const { value, maxAge } = createUserSessionValue(telegramId);
  // token: the app sends it back as a header (cookies are unreliable inside Telegram)
  const res = NextResponse.json({ telegramId, token: value });
  res.cookies.set(USER_COOKIE, value, cookieOptions(maxAge));
  return res;
}

/** DELETE: sign out. */
export async function DELETE() {
  const res = NextResponse.json({ telegramId: null });
  res.cookies.set(USER_COOKIE, '', cookieOptions(0));
  return res;
}
