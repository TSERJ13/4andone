import { NextResponse } from 'next/server';
import { google } from 'googleapis';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const clientId = process.env.GOOGLE_ADSENSE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_ADSENSE_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    return NextResponse.json(
      { error: 'Google OAuth Client ID and Secret not configured in environment.' },
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
