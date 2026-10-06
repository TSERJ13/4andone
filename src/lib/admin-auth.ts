import 'server-only';
import crypto from 'crypto';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

// Admin session — verified on the SERVER. The admin password lives only in the
// ADMIN_PASSWORD environment variable (never in the browser bundle). A signed,
// httpOnly cookie proves the login; localStorage is no longer trusted.

export const ADMIN_COOKIE = '4a_admin_session';
const SESSION_TTL_SECONDS = 7 * 24 * 60 * 60;

const getSecret = () =>
  process.env.ADMIN_SESSION_SECRET || process.env.ADMIN_PASSWORD || '';

const sign = (payload: string) =>
  crypto.createHmac('sha256', getSecret()).update(payload).digest('base64url');

const safeEqual = (a: string, b: string) => {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  return ab.length === bb.length && crypto.timingSafeEqual(ab, bb);
};

export const isAdminConfigured = () => !!process.env.ADMIN_PASSWORD;

export const checkAdminCredentials = (email: string, password: string) => {
  const expectedEmail = (process.env.ADMIN_EMAIL || '4andonestudio@gmail.com').toLowerCase();
  const expectedPassword = process.env.ADMIN_PASSWORD || '';
  if (!expectedPassword) return false;
  const emailOk = safeEqual(email.trim().toLowerCase(), expectedEmail);
  const passwordOk = safeEqual(password, expectedPassword);
  return emailOk && passwordOk;
};

export const createAdminSessionValue = () => {
  const expires = Math.floor(Date.now() / 1000) + SESSION_TTL_SECONDS;
  const payload = `admin.${expires}`;
  return { value: `${payload}.${sign(payload)}`, maxAge: SESSION_TTL_SECONDS };
};

const verifySessionValue = (value: string | undefined) => {
  if (!value || !getSecret()) return false;
  const lastDot = value.lastIndexOf('.');
  if (lastDot <= 0) return false;
  const payload = value.slice(0, lastDot);
  const signature = value.slice(lastDot + 1);
  if (!safeEqual(signature, sign(payload))) return false;
  const expires = Number(payload.split('.')[1]);
  return Number.isFinite(expires) && expires > Date.now() / 1000;
};

export const isAdminRequest = async () => {
  const store = await cookies();
  return verifySessionValue(store.get(ADMIN_COOKIE)?.value);
};

/** Returns a 401 response when the caller is not a logged-in admin, otherwise null. */
export const requireAdmin = async () => {
  if (await isAdminRequest()) return null;
  return NextResponse.json({ error: 'Admin login required' }, { status: 401 });
};
