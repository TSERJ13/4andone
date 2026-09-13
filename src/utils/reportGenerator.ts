import { supabase } from './supabase';

export interface TopTrackItem {
  id: string;
  title: string;
  artist: string;
  style: string;
  play_count: number;
}

export interface ReportStats {
  periodLabel: string;
  uniqueVisitors: number;
  totalVisits: number;
  newTelegramUsers: number;
  kofiClicks: number;
  totalMusicPlays: number;
  topTracks: TopTrackItem[];
}

export interface GeneratedReport {
  isMonthEnd: boolean;
  dateStr: string;
  daily: ReportStats;
  monthly?: ReportStats;
  html: string;
  text: string;
}

/**
 * Computes analytics stats for a given time window (daily or monthly)
 */
async function fetchPeriodStats(startTime: Date, endTime: Date, label: string): Promise<ReportStats> {
  const startIso = startTime.toISOString();
  const endIso = endTime.toISOString();

  // 1. Page visits (unique and total)
  const visitsQuery = await supabase
    .from('page_visits')
    .select('session_id')
    .gte('created_at', startIso)
    .lte('created_at', endIso);

  const rawVisits = visitsQuery.data || [];
  const totalVisits = rawVisits.length;
  const uniqueSessions = new Set(rawVisits.map((v: any) => v.session_id).filter(Boolean));
  const uniqueVisitors = uniqueSessions.size;

  // 2. New Telegram users added in this window
  const tgQuery = await supabase
    .from('telegram_users')
    .select('telegram_id', { count: 'exact', head: true })
    .gte('first_seen', startIso)
    .lte('first_seen', endIso);
  const newTelegramUsers = tgQuery.count || 0;

  // 3. Buy Me Coffee clicks in this window
  const kofiQuery = await supabase
    .from('track_plays')
    .select('id', { count: 'exact', head: true })
    .eq('event_type', 'kofi_click')
    .gte('created_at', startIso)
    .lte('created_at', endIso);
  const kofiClicks = kofiQuery.count || 0;

  // 4. Music plays in this window
  const playsQuery = await supabase
    .from('track_plays')
    .select('track_id')
    .or('event_type.eq.play,event_type.is.null')
    .gte('created_at', startIso)
    .lte('created_at', endIso);

  const rawPlays = playsQuery.data || [];
  const totalMusicPlays = rawPlays.length;

  // 5. Aggregate top tracks by play count
  const trackCounts: Record<string, number> = {};
  for (const play of rawPlays) {
    if (play.track_id && play.track_id !== 'kofi_button' && play.track_id !== 'contact_message') {
      trackCounts[play.track_id] = (trackCounts[play.track_id] || 0) + 1;
    }
  }

  const sortedTrackIds = Object.entries(trackCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10);

  const topTracks: TopTrackItem[] = [];
  if (sortedTrackIds.length > 0) {
    const ids = sortedTrackIds.map(([id]) => id);
    const { data: trackDetails } = await supabase
      .from('tracks')
      .select('id, title, artist, style')
      .in('id', ids);

    const detailMap = new Map<string, any>((trackDetails || []).map((t: any) => [t.id, t]));

    for (const [id, count] of sortedTrackIds) {
      const details = detailMap.get(id);
      topTracks.push({
        id,
        title: details?.title || 'Unknown Title',
        artist: details?.artist || 'Unknown Artist',
        style: details?.style || 'Dance',
        play_count: count,
      });
    }
  }

  return {
    periodLabel: label,
    uniqueVisitors,
    totalVisits,
    newTelegramUsers,
    kofiClicks,
    totalMusicPlays,
    topTracks,
  };
}

/**
 * Checks if a date is the last calendar day of its month
 */
function isLastDayOfMonth(date: Date): boolean {
  const tomorrow = new Date(date);
  tomorrow.setDate(date.getDate() + 1);
  return tomorrow.getDate() === 1;
}

/**
 * Generates the full Daily (and optional Monthly) report
 */
export async function generateAnalyticsReport(forcedDate?: Date): Promise<GeneratedReport> {
  const now = forcedDate || new Date();

  // Daily window: 00:00:00 to now
  const todayStart = new Date(now);
  todayStart.setHours(0, 0, 0, 0);

  const dailyStats = await fetchPeriodStats(todayStart, now, 'Today');

  // Month-end check
  const isMonthEnd = isLastDayOfMonth(now);
  let monthlyStats: ReportStats | undefined;

  if (isMonthEnd) {
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
    monthlyStats = await fetchPeriodStats(monthStart, now, 'Full Month');
  }

  const dateFormatted = now.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  // Render HTML
  const html = renderReportHtml(dateFormatted, dailyStats, monthlyStats);

  // Render Plain Text
  const text = renderReportText(dateFormatted, dailyStats, monthlyStats);

  return {
    isMonthEnd,
    dateStr: dateFormatted,
    daily: dailyStats,
    monthly: monthlyStats,
    html,
    text,
  };
}

function renderSectionCards(stats: ReportStats): string {
  return `
    <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px; margin-bottom: 20px;">
      <div style="background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.08); border-radius: 10px; padding: 14px;">
        <div style="font-size: 11px; font-weight: 700; color: rgba(255,255,255,0.5); text-transform: uppercase;">Unique Visitors</div>
        <div style="font-size: 22px; font-weight: 800; color: #ffffff; margin-top: 4px;">${stats.uniqueVisitors.toLocaleString()} <span style="font-size: 12px; font-weight: 500; color: rgba(255,255,255,0.4);">(${stats.totalVisits.toLocaleString()} total)</span></div>
      </div>
      <div style="background: rgba(255,255,255,0.04); border: 1px solid rgba(0,136,204,0.25); border-radius: 10px; padding: 14px;">
        <div style="font-size: 11px; font-weight: 700; color: #29b6f6; text-transform: uppercase;">Telegram Users Added</div>
        <div style="font-size: 22px; font-weight: 800; color: #ffffff; margin-top: 4px;">${stats.newTelegramUsers.toLocaleString()}</div>
      </div>
      <div style="background: rgba(255,255,255,0.04); border: 1px solid rgba(29,185,84,0.25); border-radius: 10px; padding: 14px;">
        <div style="font-size: 11px; font-weight: 700; color: #1db954; text-transform: uppercase;">Buy Me Coffee Clicks</div>
        <div style="font-size: 22px; font-weight: 800; color: #ffffff; margin-top: 4px;">${stats.kofiClicks.toLocaleString()}</div>
      </div>
      <div style="background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.08); border-radius: 10px; padding: 14px;">
        <div style="font-size: 11px; font-weight: 700; color: #f59e0b; text-transform: uppercase;">Total Music Plays</div>
        <div style="font-size: 22px; font-weight: 800; color: #ffffff; margin-top: 4px;">${stats.totalMusicPlays.toLocaleString()}</div>
      </div>
    </div>
  `;
}

function renderTracksTable(tracks: TopTrackItem[]): string {
  if (!tracks || tracks.length === 0) {
    return `<p style="color: rgba(255,255,255,0.5); font-size: 13px; font-style: italic;">No tracks played during this period.</p>`;
  }

  const rows = tracks
    .map(
      (t, idx) => `
      <tr style="border-bottom: 1px solid rgba(255,255,255,0.06);">
        <td style="padding: 10px 8px; font-weight: 800; color: ${idx < 3 ? '#1db954' : 'rgba(255,255,255,0.5)'}; font-size: 13px; width: 28px;">#${idx + 1}</td>
        <td style="padding: 10px 8px;">
          <div style="font-weight: 700; font-size: 13.5px; color: #ffffff;">${t.title}</div>
          <div style="font-size: 11.5px; color: rgba(255,255,255,0.5); margin-top: 2px;">${t.artist}</div>
        </td>
        <td style="padding: 10px 8px; font-size: 11.5px; color: rgba(255,255,255,0.6);">${t.style}</td>
        <td style="padding: 10px 8px; text-align: right; font-weight: 700; font-size: 13px; color: #1db954;">${t.play_count} plays</td>
      </tr>
    `
    )
    .join('');

  return `
    <table style="width: 100%; border-collapse: collapse; margin-top: 8px;">
      <thead>
        <tr style="border-bottom: 1px solid rgba(255,255,255,0.12); text-align: left;">
          <th style="padding: 6px 8px; font-size: 11px; color: rgba(255,255,255,0.4); text-transform: uppercase;">#</th>
          <th style="padding: 6px 8px; font-size: 11px; color: rgba(255,255,255,0.4); text-transform: uppercase;">Track & Artist</th>
          <th style="padding: 6px 8px; font-size: 11px; color: rgba(255,255,255,0.4); text-transform: uppercase;">Style</th>
          <th style="padding: 6px 8px; font-size: 11px; color: rgba(255,255,255,0.4); text-transform: uppercase; text-align: right;">Plays</th>
        </tr>
      </thead>
      <tbody>
        ${rows}
      </tbody>
    </table>
  `;
}

function renderReportHtml(dateFormatted: string, daily: ReportStats, monthly?: ReportStats): string {
  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      </head>
      <body style="margin: 0; padding: 20px; background-color: #050505; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #ffffff;">
        <div style="max-width: 650px; margin: 0 auto; background: #0e0e0e; border: 1px solid rgba(255,255,255,0.1); border-radius: 16px; padding: 24px; box-shadow: 0 10px 40px rgba(0,0,0,0.8);">
          
          <!-- Header -->
          <div style="border-bottom: 1px solid rgba(255,255,255,0.1); padding-bottom: 16px; margin-bottom: 24px; display: flex; align-items: center; justify-content: space-between;">
            <div>
              <h1 style="margin: 0; font-size: 22px; font-weight: 900; color: #1db954; letter-spacing: -0.5px;">4and.one Analytics</h1>
              <p style="margin: 4px 0 0 0; font-size: 13px; color: rgba(255,255,255,0.5);">${dateFormatted} • Evening Report (23:30)</p>
            </div>
            ${monthly ? '<span style="background: rgba(234, 179, 8, 0.15); color: #eab308; border: 1px solid rgba(234, 179, 8, 0.3); padding: 4px 10px; border-radius: 9999px; font-size: 11px; font-weight: 800;">MONTH-END RECAP</span>' : ''}
          </div>

          <!-- Section: Daily Stats -->
          <div style="margin-bottom: 30px;">
            <h2 style="font-size: 16px; font-weight: 800; color: #ffffff; margin: 0 0 14px 0; display: flex; align-items: center; gap: 8px;">
              📊 Today's Statistics
            </h2>
            ${renderSectionCards(daily)}

            <div style="margin-top: 20px;">
              <h3 style="font-size: 14px; font-weight: 800; color: rgba(255,255,255,0.9); margin: 0 0 10px 0;">
                🔥 Top 10 Most Played Tracks Today
              </h3>
              ${renderTracksTable(daily.topTracks)}
            </div>
          </div>

          ${
            monthly
              ? `
            <!-- Section: Monthly Recap -->
            <div style="border-top: 2px solid rgba(234, 179, 8, 0.3); padding-top: 24px; margin-top: 30px;">
              <h2 style="font-size: 17px; font-weight: 800; color: #eab308; margin: 0 0 14px 0;">
                🏆 Full Month Summary & Top 10 Tracks
              </h2>
              ${renderSectionCards(monthly)}

              <div style="margin-top: 20px;">
                <h3 style="font-size: 14px; font-weight: 800; color: rgba(255,255,255,0.9); margin: 0 0 10px 0;">
                  ⭐ Top 10 Tracks of the Month
                </h3>
                ${renderTracksTable(monthly.topTracks)}
              </div>
            </div>
          `
              : ''
          }

          <!-- Footer -->
          <div style="border-top: 1px solid rgba(255,255,255,0.08); margin-top: 30px; padding-top: 16px; text-align: center; font-size: 11.5px; color: rgba(255,255,255,0.4);">
            Automatically dispatched by 4and.one Cloud Engine • <a href="https://4and.one/admin/analytics" style="color: #1db954; text-decoration: none;">View Live Analytics Dashboard</a>
          </div>

        </div>
      </body>
    </html>
  `;
}

function renderReportText(dateFormatted: string, daily: ReportStats, monthly?: ReportStats): string {
  let text = `4AND.ONE ANALYTICS REPORT\n${dateFormatted} (23:30)\n\n`;
  text += `--- TODAY'S STATS ---\n`;
  text += `Unique Visitors: ${daily.uniqueVisitors} (${daily.totalVisits} total visits)\n`;
  text += `New Telegram Users: ${daily.newTelegramUsers}\n`;
  text += `Buy Me Coffee Clicks: ${daily.kofiClicks}\n`;
  text += `Total Music Plays: ${daily.totalMusicPlays}\n\n`;

  text += `TOP 10 TRACKS TODAY:\n`;
  if (daily.topTracks.length === 0) {
    text += `No tracks recorded today.\n`;
  } else {
    daily.topTracks.forEach((t, i) => {
      text += `${i + 1}. ${t.title} - ${t.artist} (${t.style}): ${t.play_count} plays\n`;
    });
  }

  if (monthly) {
    text += `\n==============================\n`;
    text += `--- FULL MONTH RECAP ---\n`;
    text += `Unique Visitors: ${monthly.uniqueVisitors} (${monthly.totalVisits} total visits)\n`;
    text += `New Telegram Users: ${monthly.newTelegramUsers}\n`;
    text += `Buy Me Coffee Clicks: ${monthly.kofiClicks}\n`;
    text += `Total Music Plays: ${monthly.totalMusicPlays}\n\n`;
    text += `TOP 10 TRACKS OF THE MONTH:\n`;
    monthly.topTracks.forEach((t, i) => {
      text += `${i + 1}. ${t.title} - ${t.artist} (${t.style}): ${t.play_count} plays\n`;
    });
  }

  return text;
}
