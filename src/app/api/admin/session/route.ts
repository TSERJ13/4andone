import { NextRequest, NextResponse } from 'next/server';
import {
  ADMIN_COOKIE,
  checkAdminCredentials,
  createAdminSessionValue,
  isAdminConfigured,
  isAdminRequest,
} from '@/lib/admin-auth';

/** GET: is the current browser logged in as admin? */
export async function GET() {
  return NextResponse.json({ admin: await isAdminRequest() });
}

/** POST: log in with email + password (checked against server env vars). */
export async function POST(request: NextRequest) {
  if (!isAdminConfigured()) {
    return NextResponse.json(
      { error: 'Admin login is not configured. Set ADMIN_PASSWORD in the server environment.' },
      { status: 503 }
    );
  }
  let email = '';
  let password = '';
  try {
    const body = await request.json();
    email = String(body?.email ?? '');
    password = String(body?.password ?? '');
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }

  if (!checkAdminCredentials(email, password)) {
    // Slow down password guessing a little.
    await new Promise((r) => setTimeout(r, 800));
    return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 });
  }

  const { value, maxAge } = createAdminSessionValue();
  const res = NextResponse.json({ admin: true });
  res.cookies.set(ADMIN_COOKIE, value, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/',
    maxAge,
  });
  return res;
}

/** DELETE: log out. */
export async function DELETE() {
  const res = NextResponse.json({ admin: false });
  res.cookies.set(ADMIN_COOKIE, '', { httpOnly: true, path: '/', maxAge: 0 });
  return res;
}
