import { NextResponse } from 'next/server';
import { google } from 'googleapis';

export const dynamic = 'force-dynamic';

function getCredentials() {
  // Option 1: Full JSON string in single env var
  if (process.env.GOOGLE_ADSENSE_CREDENTIALS) {
    try {
      const parsed = JSON.parse(process.env.GOOGLE_ADSENSE_CREDENTIALS);
      return {
        clientEmail: parsed.client_email,
        privateKey: parsed.private_key,
      };
    } catch (e) {
      console.error('Failed to parse GOOGLE_ADSENSE_CREDENTIALS JSON', e);
    }
  }

  // Option 2: Separate env vars
  if (process.env.GOOGLE_ADSENSE_CLIENT_EMAIL && process.env.GOOGLE_ADSENSE_PRIVATE_KEY) {
    return {
      clientEmail: process.env.GOOGLE_ADSENSE_CLIENT_EMAIL,
      privateKey: process.env.GOOGLE_ADSENSE_PRIVATE_KEY,
    };
  }

  return null;
}

function formatDate(d: Date) {
  return {
    year: d.getFullYear(),
    month: d.getMonth() + 1,
    day: d.getDate(),
  };
}

export async function GET() {
  const creds = getCredentials();

  if (!creds || !creds.clientEmail || !creds.privateKey) {
    return NextResponse.json({
      connected: false,
      message: 'AdSense API credentials not configured yet.',
    });
  }

  try {
    const formattedKey = creds.privateKey.includes('\\n')
      ? creds.privateKey.replace(/\\n/g, '\n')
      : creds.privateKey;

    const auth = new google.auth.JWT({
      email: creds.clientEmail,
      key: formattedKey,
      scopes: ['https://www.googleapis.com/auth/adsense.readonly'],
    });

    const adsense = google.adsense({ version: 'v2', auth });

    // 1. Discover account name
    const accountsRes = await adsense.accounts.list();
    const accounts = accountsRes.data.accounts || [];

    if (accounts.length === 0) {
      return NextResponse.json({
        connected: false,
        message: 'No AdSense accounts found for this Service Account. Ensure user is added in AdSense -> User management.',
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
