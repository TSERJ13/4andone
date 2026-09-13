import { NextRequest, NextResponse } from 'next/server';
import { generateAnalyticsReport } from '@/utils/reportGenerator';
import { sendNotificationEmail } from '@/utils/mailer';

export const dynamic = 'force-dynamic';
export const maxDuration = 60; // 60 seconds timeout for report generation & email

export async function GET(request: NextRequest) {
  return handleReportTrigger(request);
}

export async function POST(request: NextRequest) {
  return handleReportTrigger(request);
}

async function handleReportTrigger(request: NextRequest) {
  try {
    // Optional Vercel Cron authorization check
    const authHeader = request.headers.get('authorization');
    if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      // Check query parameter for manual admin testing
      const { searchParams } = new URL(request.url);
      const secretParam = searchParams.get('secret');
      if (secretParam !== process.env.CRON_SECRET) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
    }

    // 1. Generate analytics report
    const report = await generateAnalyticsReport();

    // 2. Determine subject - exact user format
    const subject = report.isMonthEnd
      ? 'Monthly Statistic 4and.one'
      : 'Daily Statistic 4and.one';

    // 3. Dispatch email
    const topTracksSummary = report.daily.topTracks
      .slice(0, 10)
      .map((t, i) => `${i + 1}. ${t.title} (${t.artist}) - ${t.play_count} plays`)
      .join('\n');

    const mailResult = await sendNotificationEmail({
      subject,
      html: report.html,
      text: report.text,
      fields: {
        Report_Type: report.isMonthEnd ? 'Daily + Monthly Recap' : 'Daily Evening Report',
        Date: report.dateStr,
        Visitors_Today: `${report.daily.uniqueVisitors} unique (${report.daily.totalVisits} total)`,
        New_Telegram_Users_Today: report.daily.newTelegramUsers,
        Buy_Me_Coffee_Clicks_Today: report.daily.kofiClicks,
        Music_Plays_Today: report.daily.totalMusicPlays,
        Top_10_Tracks_Today: topTracksSummary,
        ...(report.monthly
          ? {
              Monthly_Unique_Visitors: report.monthly.uniqueVisitors,
              Monthly_Total_Plays: report.monthly.totalMusicPlays,
              Monthly_New_TG_Users: report.monthly.newTelegramUsers,
              Monthly_Coffee_Clicks: report.monthly.kofiClicks,
            }
          : {}),
      },
    });

    return NextResponse.json({
      success: true,
      isMonthEnd: report.isMonthEnd,
      date: report.dateStr,
      dailyStats: report.daily,
      monthlyStats: report.monthly ?? null,
      mailer: mailResult,
    });
  } catch (error: any) {
    console.error('[CRON_REPORT_API] Error generating report:', error);
    return NextResponse.json(
      {
        success: false,
        error: error?.message || 'Failed to generate analytics report',
      },
      { status: 500 }
    );
  }
}
