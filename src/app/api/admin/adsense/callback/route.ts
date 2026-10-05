import { NextResponse } from 'next/server';
import { google } from 'googleapis';
import { saveAdSenseTokens, getGoogleOAuthCredentials } from '@/lib/adsense-token';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const error = searchParams.get('error');

  const redirectTarget = `${origin}/admin/dashboard`;

  if (error) {
    return NextResponse.redirect(`${redirectTarget}?adsense_error=${encodeURIComponent(error)}`);
  }

  if (!code) {
    return NextResponse.redirect(`${redirectTarget}?adsense_error=No_code_received`);
  }

  const { clientId, clientSecret } = getGoogleOAuthCredentials();

  if (!clientId || !clientSecret) {
    return NextResponse.redirect(`${redirectTarget}?adsense_error=Missing_client_credentials`);
  }

  const redirectUri = origin.includes('localhost')
    ? `${origin}/api/admin/adsense/callback`
    : `https://www.4and.one/api/admin/adsense/callback`;

  try {
    const oauth2Client = new google.auth.OAuth2(clientId, clientSecret, redirectUri);
    const { tokens } = await oauth2Client.getToken(code);

    if (tokens.refresh_token) {
      await saveAdSenseTokens(tokens);
    }

    return NextResponse.redirect(`${redirectTarget}?adsense_connected=true`);
  } catch (err: any) {
    console.error('Failed to exchange AdSense OAuth code:', err);
    return NextResponse.redirect(
      `${redirectTarget}?adsense_error=${encodeURIComponent(err.message || 'Token exchange failed')}`
    );
  }
}
