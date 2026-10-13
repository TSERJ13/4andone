import { randomBytes } from 'node:crypto';
import { requireAdmin } from '@/lib/admin-auth';
import { NextResponse } from 'next/server';
import { google } from 'googleapis';
import { getGoogleOAuthCredentials } from '@/lib/adsense-token';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  // Only a logged-in admin may connect (or replace) the AdSense account.
  const denied = await requireAdmin();
  if (denied) return denied;
  const { clientId, clientSecret } = await getGoogleOAuthCredentials();

  if (!clientId || !clientSecret) {
    return NextResponse.json(
      { error: 'Google OAuth Client ID and Secret not configured.' },
      { status: 400 }
    );
  }

  const url = new URL(request.url);
  const redirectUri = url.origin.includes('localhost')
    ? `${url.origin}/api/admin/adsense/callback`
    : `https://www.4and.one/api/admin/adsense/callback`;

  const oauth2Client = new google.auth.OAuth2(clientId, clientSecret, redirectUri);

  const state = randomBytes(32).toString('hex');
  const authUrl = oauth2Client.generateAuthUrl({
    state,
    access_type: 'offline',
    prompt: 'consent',
    scope: ['https://www.googleapis.com/auth/adsense.readonly'],
  });

  const response = NextResponse.redirect(authUrl);
  response.cookies.set('4a_adsense_state', state, { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', maxAge: 600, path: '/api/admin/adsense' });
  return response;
}
