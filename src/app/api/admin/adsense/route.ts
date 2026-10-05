import { NextResponse } from 'next/server';
import { google } from 'googleapis';
import { getAdSenseRefreshToken, getGoogleOAuthCredentials } from '@/lib/adsense-token';

export const dynamic = 'force-dynamic';

async function getAuthClient() {
  const { clientId, clientSecret } = await getGoogleOAuthCredentials();
  const refreshToken = await getAdSenseRefreshToken();

  // 1. Primary: OAuth2 Refresh Token (Recommended by Google for AdSense Management API)
  if (clientId && clientSecret && refreshToken) {
    const oauth2Client = new google.auth.OAuth2(clientId, clientSecret);
    oauth2Client.setCredentials({ refresh_token: refreshToken });
    return oauth2Client;
  }

  // 2. Secondary: Service Account JWT fallback if configured
  const clientEmail = process.env.GOOGLE_ADSENSE_CLIENT_EMAIL;
  const privateKey = process.env.GOOGLE_ADSENSE_PRIVATE_KEY;

  if (clientEmail && privateKey) {
    const formattedKey = privateKey.includes('\\n')
      ? privateKey.replace(/\\n/g, '\n')
      : privateKey;
    return new google.auth.JWT({
      email: clientEmail,
      key: formattedKey,
      scopes: ['https://www.googleapis.com/auth/adsense.readonly'],
    });
  }

  return null;
}

export async function GET() {
  const auth = await getAuthClient();

  if (!auth) {
    return NextResponse.json({
      connected: false,
      hasOauthConfig: true,
      message: 'AdSense API not connected yet.',
    });
  }

  try {
    const adsense = google.adsense({ version: 'v2', auth });

    // 1. Discover account name
    const accountsRes = await adsense.accounts.list();
    const accounts = accountsRes.data.accounts || [];

    if (accounts.length === 0) {
      return NextResponse.json({
        connected: false,
        hasOauthConfig: true,
        message: 'No active AdSense account found. Please ensure you are logged into the correct Google account.',
      });
    }

    const targetAccount = accounts[0].name as string;
    const accountName = accounts[0].displayName || accounts[0].name || 'Google AdSense';

    // 2. Fetch reports concurrently
    const [todayReport, yesterdayReport, weekReport, monthReport, trendReport] = await Promise.all([
      adsense.accounts.reports.generate({
        account: targetAccount,
        dateRange: 'TODAY',
        metrics: ['ESTIMATED_EARNINGS', 'IMPRESSIONS', 'CLICKS', 'PAGE_VIEWS_CTR', 'PAGE_VIEWS_RPM'],
      }).catch(err => ({ data: null, error: err.message })),

      adsense.accounts.reports.generate({
        account: targetAccount,
        dateRange: 'YESTERDAY',
        metrics: ['ESTIMATED_EARNINGS', 'IMPRESSIONS', 'CLICKS', 'PAGE_VIEWS_CTR', 'PAGE_VIEWS_RPM'],
      }).catch(err => ({ data: null, error: err.message })),

      adsense.accounts.reports.generate({
        account: targetAccount,
        dateRange: 'LAST_7_DAYS',
        metrics: ['ESTIMATED_EARNINGS', 'IMPRESSIONS', 'CLICKS', 'PAGE_VIEWS_CTR', 'PAGE_VIEWS_RPM'],
      }).catch(err => ({ data: null, error: err.message })),

      adsense.accounts.reports.generate({
        account: targetAccount,
        dateRange: 'MONTH_TO_DATE',
        metrics: ['ESTIMATED_EARNINGS', 'IMPRESSIONS', 'CLICKS', 'PAGE_VIEWS_CTR', 'PAGE_VIEWS_RPM'],
      }).catch(err => ({ data: null, error: err.message })),

      adsense.accounts.reports.generate({
        account: targetAccount,
        dateRange: 'LAST_14_DAYS',
        dimensions: ['DATE'],
        metrics: ['ESTIMATED_EARNINGS', 'IMPRESSIONS', 'CLICKS'],
      }).catch(err => ({ data: null, error: err.message })),
    ]);

    const extractMetrics = (rep: any) => {
      if (!rep?.data?.totals?.cells) {
        return { earnings: '0.00', impressions: 0, clicks: 0, ctr: '0.0%', rpm: '0.00' };
      }
      const cells = rep.data.totals.cells;
      return {
        earnings: Number(cells[0]?.value || 0).toFixed(2),
        impressions: Number(cells[1]?.value || 0),
        clicks: Number(cells[2]?.value || 0),
        ctr: `${(Number(cells[3]?.value || 0) * 100).toFixed(2)}%`,
        rpm: Number(cells[4]?.value || 0).toFixed(2),
      };
    };

    const trendRows = ((trendReport as any)?.data?.rows || []).map((row: any) => {
      const cells = row.cells || [];
      return {
        date: cells[0]?.value,
        earnings: Number(cells[1]?.value || 0).toFixed(2),
        impressions: Number(cells[2]?.value || 0),
        clicks: Number(cells[3]?.value || 0),
      };
    });

    return NextResponse.json({
      connected: true,
      accountName,
      today: extractMetrics(todayReport),
      yesterday: extractMetrics(yesterdayReport),
      last7Days: extractMetrics(weekReport),
      thisMonth: extractMetrics(monthReport),
      dailyTrend: trendRows,
      updatedAt: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('AdSense API Error:', error);
    return NextResponse.json({
      connected: false,
      error: error?.message || 'Failed to fetch AdSense statistics',
    }, { status: 500 });
  }
}
