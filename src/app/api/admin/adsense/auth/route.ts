import { NextResponse } from 'next/server';
import { google } from 'googleapis';
import { getGoogleOAuthCredentials } from '@/lib/adsense-token';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
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

  const authUrl = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    prompt: 'consent',
    scope: ['https://www.googleapis.com/auth/adsense.readonly'],
  });

  return NextResponse.redirect(authUrl);
}
