"use client";

import React, { useState, useEffect, useCallback } from 'react';
import {
  BarChart3, TrendingUp, Users, Music, Folder, Flag, Calendar,
  RefreshCw, Globe, Clock, Radio, Share2, Eye, ExternalLink, Wifi
} from 'lucide-react';
import { useStudio } from '@/components/admin/StudioProvider';
import { supabase } from '@/utils/supabase';

type Period = 'day' | 'week' | 'month' | 'year';

interface VisitBucket { label: string; count: number; }
interface CountryStat { country_code: string; country_name: string; count: number; }
interface TelegramUser {
  telegram_id: number;
  first_name: string;
  last_name?: string;
  username?: string;
  last_seen: string;
  visit_count: number;
  country_name?: string;
}
interface RecentActivity {
  id: string;
  created_at: string;
  session_id: string;
  user_ref: string | null;
  duration_seconds: number;
  country_code: string;
  country_name: string;
  referrer?: string | null;
}
interface TopTrack {
  id: string;
  title: string;
  artist: string;
  style: string;
  play_count: number;
  share_count: number;
  view_count: number;
  total_duration: number;
}
interface ReferrerStat { source_label: string; visit_count: number; }

function getDateRange(period: Period) {
  const now = new Date();
  const start = new Date(now);
  if (period === 'day') { start.setHours(0,0,0,0); }
  else if (period === 'week') { start.setDate(now.getDate() - now.getDay()); start.setHours(0,0,0,0); }
  else if (period === 'month') { start.setDate(1); start.setHours(0,0,0,0); }
  else { start.setMonth(0,1); start.setHours(0,0,0,0); }
  return { start, end: now };
}

// Comprehensive country flags — 150+ countries
const COUNTRY_FLAGS: Record<string, string> = {
  // Europe
  GE:'🇬🇪', DE:'🇩🇪', FR:'🇫🇷', GB:'🇬🇧', IT:'🇮🇹', ES:'🇪🇸', PL:'🇵🇱',
  NL:'🇳🇱', BE:'🇧🇪', SE:'🇸🇪', NO:'🇳🇴', DK:'🇩🇰', FI:'🇫🇮', CH:'🇨🇭',
  AT:'🇦🇹', PT:'🇵🇹', GR:'🇬🇷', CZ:'🇨🇿', SK:'🇸🇰', HU:'🇭🇺', RO:'🇷🇴',
  BG:'🇧🇬', HR:'🇭🇷', SI:'🇸🇮', RS:'🇷🇸', BA:'🇧🇦', MK:'🇲🇰', AL:'🇦🇱',
  LT:'🇱🇹', LV:'🇱🇻', EE:'🇪🇪', IE:'🇮🇪', LU:'🇱🇺', MT:'🇲🇹', CY:'🇨🇾',
  MD:'🇲🇩', ME:'🇲🇪', IS:'🇮🇸', LI:'🇱🇮', MC:'🇲🇨', SM:'🇸🇲', VA:'🇻🇦',
  XK:'🇽🇰', AD:'🇦🇩', FO:'🇫🇴', GI:'🇬🇮', IM:'🇮🇲', JE:'🇯🇪', GG:'🇬🇬',
  // CIS / Eastern Europe
  RU:'🇷🇺', UA:'🇺🇦', BY:'🇧🇾', KZ:'🇰🇿', UZ:'🇺🇿', TM:'🇹🇲', KG:'🇰🇬',
  TJ:'🇹🇯', AZ:'🇦🇿', AM:'🇦🇲', GE2:'🇬🇪',
  // Middle East
  TR:'🇹🇷', IL:'🇮🇱', SA:'🇸🇦', AE:'🇦🇪', QA:'🇶🇦', KW:'🇰🇼', BH:'🇧🇭',
  OM:'🇴🇲', JO:'🇯🇴', LB:'🇱🇧', IQ:'🇮🇶', IR:'🇮🇷', YE:'🇾🇪', SY:'🇸🇾',
  PS:'🇵🇸', AF:'🇦🇫',
  // Americas
  US:'🇺🇸', CA:'🇨🇦', MX:'🇲🇽', BR:'🇧🇷', AR:'🇦🇷', CO:'🇨🇴', CL:'🇨🇱',
  PE:'🇵🇪', VE:'🇻🇪', EC:'🇪🇨', BO:'🇧🇴', PY:'🇵🇾', UY:'🇺🇾', CR:'🇨🇷',
  PA:'🇵🇦', GT:'🇬🇹', HN:'🇭🇳', SV:'🇸🇻', NI:'🇳🇮', CU:'🇨🇺', DO:'🇩🇴',
  JM:'🇯🇲', TT:'🇹🇹', HT:'🇭🇹', PR:'🇵🇷', BB:'🇧🇧', GY:'🇬🇾', SR:'🇸🇷',
  BZ:'🇧🇿', LC:'🇱🇨', VC:'🇻🇨', GD:'🇬🇩', AG:'🇦🇬', DM:'🇩🇲', KN:'🇰🇳',
  // Asia-Pacific
  JP:'🇯🇵', KR:'🇰🇷', CN:'🇨🇳', IN:'🇮🇳', PK:'🇵🇰', BD:'🇧🇩', LK:'🇱🇰',
  TH:'🇹🇭', VN:'🇻🇳', ID:'🇮🇩', PH:'🇵🇭', MY:'🇲🇾', SG:'🇸🇬', HK:'🇭🇰',
  TW:'🇹🇼', NZ:'🇳🇿', AU:'🇦🇺', MN:'🇲🇳', MM:'🇲🇲', KH:'🇰🇭', LA:'🇱🇦',
  NP:'🇳🇵', BT:'🇧🇹', MV:'🇲🇻', TL:'🇹🇱', BN:'🇧🇳', FJ:'🇫🇯', PG:'🇵🇬',
  SB:'🇸🇧', VU:'🇻🇺', WS:'🇼🇸', KI:'🇰🇮', FM:'🇫🇲', PW:'🇵🇼', MH:'🇲🇭',
  // Africa
  ZA:'🇿🇦', EG:'🇪🇬', NG:'🇳🇬', KE:'🇰🇪', ET:'🇪🇹', GH:'🇬🇭', MA:'🇲🇦',
  TN:'🇹🇳', DZ:'🇩🇿', SN:'🇸🇳', TZ:'🇹🇿', UG:'🇺🇬', RW:'🇷🇼', ZM:'🇿🇲',
  ZW:'🇿🇼', BW:'🇧🇼', NA:'🇳🇦', MZ:'🇲🇿', AO:'🇦🇴', MG:'🇲🇬', CI:'🇨🇮',
  CM:'🇨🇲', SN2:'🇸🇳', ML:'🇲🇱', BF:'🇧🇫', NE:'🇳🇪', TD:'🇹🇩', SD:'🇸🇩',
  SS:'🇸🇸', SO:'🇸🇴', DJ:'🇩🇯', ER:'🇪🇷', LY:'🇱🇾', MR:'🇲🇷', GM:'🇬🇲',
  GN:'🇬🇳', GW:'🇬🇼', SL:'🇸🇱', LR:'🇱🇷', TG:'🇹🇬', BJ:'🇧🇯', GQ:'🇬🇶',
  CF:'🇨🇫', CG:'🇨🇬', CD:'🇨🇩', GA:'🇬🇦', ST:'🇸🇹', CV:'🇨🇻', KM:'🇰🇲',
  SC:'🇸🇨', MU:'🇲🇺', LS:'🇱🇸', SZ:'🇸🇿', MW:'🇲🇼',
  // French overseas / island territories
  RE:'🇷🇪', GP:'🇬🇵', MQ:'🇲🇶', GF:'🇬🇫', YT:'🇾🇹', PM:'🇵🇲', NC:'🇳🇨',
  PF:'🇵🇫', WF:'🇼🇫', TF:'🇹🇫', MF:'🇲🇫', BL:'🇧🇱',
};

function getFlag(code: string): string {
  if (!code || code.toLowerCase() === 'unknown') return '🌍';
  return COUNTRY_FLAGS[code.toUpperCase()] || '🏳️';
}

const STYLE_COLORS: Record<string, string> = {
  'Cha Cha': '#f59e0b', 'Cha-Cha': '#f59e0b', 'ChaCha': '#f59e0b',
  'Samba': '#f97316', 'Rumba': '#ef4444', 'Jive': '#22c55e',
  'Paso Doble': '#8b5cf6', 'Waltz': '#3b82f6', 'Slow Waltz': '#3b82f6',
  'Viennese Waltz': '#06b6d4', 'Tango': '#dc2626', 'Foxtrot': '#d97706',
  'Quickstep': '#10b981', 'Fitness': '#ec4899', 'Unknown': '#52525b',
};

const REFERRER_ICONS: Record<string, string> = {
  'Telegram': '✈️', 'Direct': '🔗', 'Search': '🔍',
  'Social': '📲', 'YouTube': '▶️', 'Other': '🌐',
};
const REFERRER_COLORS: Record<string, string> = {
  'Telegram': '#0088cc', 'Direct': '#6366f1', 'Search': '#f59e0b',
  'Social': '#ec4899', 'YouTube': '#ef4444', 'Other': '#71717a',
};

function fmtDuration(s: number): string {
  if (!s) return '—';
  const m = Math.floor(s / 60), sec = s % 60;
  return m > 0 ? `${m}m ${sec}s` : `${sec}s`;
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const m = Math.floor(diff / 60000);
  const h = Math.floor(m / 60);
  const d = Math.floor(h / 24);
  if (d > 0) return `${d}d ago`;
  if (h > 0) return `${h}h ago`;
  if (m > 0) return `${m}m ago`;
  return 'just now';
}

function fmtDate(d: string): string {
  return new Date(d).toLocaleDateString('en', { month: 'short', day: 'numeric' });
}

function getReferrerLabel(ref: string | null | undefined): string {
  if (!ref) return 'Direct';
  if (ref.includes('t.me') || ref.includes('telegram')) return 'Telegram';
  if (ref.includes('google') || ref.includes('bing') || ref.includes('yandex')) return 'Search';
  if (ref.includes('instagram') || ref.includes('facebook') || ref.includes('tiktok')) return 'Social';
  if (ref.includes('youtube')) return 'YouTube';
  return 'Web';
}

const periodLabel: Record<Period, string> = {
  day: 'Today (hourly)', week: 'This Week', month: 'This Month', year: 'This Year'
};

export default function AdminAnalytics() {
  const { tracks, folders, finalFolders, styles } = useStudio();
  const [period, setPeriod] = useState<Period>('week');
  const [topTrackPeriod, setTopTrackPeriod] = useState<'24h' | '7d' | '30d' | 'all'>('30d');
  const [onlineExpanded, setOnlineExpanded] = useState(false);
  const [buckets, setBuckets] = useState<VisitBucket[]>([]);
  const [totals, setTotals] = useState({ today: 0, week: 0, month: 0, year: 0 });
  const [uniqueTotals, setUniqueTotals] = useState({ today: 0, week: 0, month: 0, year: 0 });
  const [avgDuration, setAvgDuration] = useState(0);
  const [countries, setCountries] = useState<CountryStat[]>([]);
  const [tgUsers, setTgUsers] = useState<TelegramUser[]>([]);
  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([]);
  const [topTracks, setTopTracks] = useState<TopTrack[]>([]);
  const [styleStats, setStyleStats] = useState<{ style: string; count: number }[]>([]);
  const [referrerStats, setReferrerStats] = useState<ReferrerStat[]>([]);
  const [liveUsers, setLiveUsers] = useState<{ session_id: string; name: string | null; is_telegram: boolean }[]>([]);
  const [loading, setLoading] = useState(true);
  const [tracksLoading, setTracksLoading] = useState(false);

  const tracksRef = React.useRef(tracks);
  React.useEffect(() => { tracksRef.current = tracks; }, [tracks]);

  const fetch_ = useCallback(async () => {
    setLoading(true);
    try {
      const now = new Date();
      const todayStart = new Date(now); todayStart.setHours(0, 0, 0, 0);
      // Use last 7 days for week (avoids UTC vs local timezone mismatch)
      const weekStart = new Date(now); weekStart.setDate(now.getDate() - 6); weekStart.setHours(0, 0, 0, 0);
      const monthStart = new Date(now); monthStart.setDate(1); monthStart.setHours(0, 0, 0, 0);
      const yearStart = new Date(now); yearStart.setMonth(0, 1); yearStart.setHours(0, 0, 0, 0);

      // For period chart: use 7 days back for week, otherwise normal range
      let chartStart: Date;
      if (period === 'day') { chartStart = todayStart; }
      else if (period === 'week') { chartStart = weekStart; }
      else if (period === 'month') { chartStart = monthStart; }
      else { chartStart = yearStart; }

      const [
        metricsRes, countryRes, recentRes, tgData,
        topTracksRes, styleRes, referrerRes,
      ] = await Promise.all([
        supabase.rpc('get_platform_metrics', {
          today_start: todayStart.toISOString(),
          week_start: weekStart.toISOString(),
          month_start: monthStart.toISOString(),
          year_start: yearStart.toISOString(),
        }),
        supabase.rpc('get_country_stats', { start_time: yearStart.toISOString() }),
        supabase.rpc('get_recent_activity', { limit_val: 15 }),
        supabase.from('telegram_users').select('*').order('visit_count', { ascending: false }),
        Promise.resolve(supabase.rpc('get_top_tracks_with_events', {
          start_time: monthStart.toISOString(),
          limit_val: 10,
        })).catch(() => ({ data: null })),
        Promise.resolve(supabase.rpc('get_style_chart_30d', {
          start_time: monthStart.toISOString(),
        })).catch(() => ({ data: null })),
        Promise.resolve(supabase.rpc('get_referrer_stats', {
          start_time: monthStart.toISOString(),
        })).catch(() => ({ data: null })),
      ]);

      // --- Client-side traffic chart (avoids UTC timezone issues) ---
      const { data: rawVisits } = await supabase
        .from('page_visits')
        .select('created_at')
        .gte('created_at', chartStart.toISOString());

      const visits = (rawVisits || []) as { created_at: string }[];
      let resolvedBuckets: VisitBucket[] = [];

      if (period === 'day') {
        const b: Record<number, number> = {};
        for (let h = 0; h < 24; h++) b[h] = 0;
        visits.forEach(r => { b[new Date(r.created_at).getHours()]++; });
        resolvedBuckets = Array.from({ length: 24 }, (_, h) => ({
          label: `${h.toString().padStart(2, '0')}h`,
          count: b[h] || 0,
        }));
      } else if (period === 'week') {
        // Last 7 days, using local date
        const dayLabels: string[] = [];
        const dayCounts: Record<string, number> = {};
        for (let i = 6; i >= 0; i--) {
          const d = new Date(now);
          d.setDate(now.getDate() - i);
          const key = d.toLocaleDateString('en', { weekday: 'short' });
          dayLabels.push(key);
          dayCounts[key] = 0;
        }
        visits.forEach(r => {
          const key = new Date(r.created_at).toLocaleDateString('en', { weekday: 'short' });
          if (key in dayCounts) dayCounts[key]++;
        });
        resolvedBuckets = dayLabels.map(l => ({ label: l, count: dayCounts[l] || 0 }));
      } else if (period === 'month') {
        const dim = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
        const b: Record<number, number> = {};
        for (let d = 1; d <= dim; d++) b[d] = 0;
        visits.forEach(r => { b[new Date(r.created_at).getDate()]++; });
        resolvedBuckets = Array.from({ length: dim }, (_, i) => ({ label: (i + 1).toString(), count: b[i + 1] || 0 }));
      } else {
        const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
        const b: Record<number, number> = {};
        for (let m = 0; m < 12; m++) b[m] = 0;
        visits.forEach(r => { b[new Date(r.created_at).getMonth()]++; });
        resolvedBuckets = months.map((l, i) => ({ label: l, count: b[i] || 0 }));
      }
      setBuckets(resolvedBuckets);

      // --- Metrics ---
      if (metricsRes.data?.length > 0) {
        const m = metricsRes.data[0];
        setTotals({ today: Number(m.visits_today)||0, week: Number(m.visits_week)||0, month: Number(m.visits_month)||0, year: Number(m.visits_year)||0 });
        setUniqueTotals({ today: Number(m.unique_today)||0, week: Number(m.unique_week)||0, month: Number(m.unique_month)||0, year: Number(m.unique_year)||0 });
        setAvgDuration(Math.round(m.avg_duration_seconds || 0));
      }

      // --- Countries ---
      setCountries((countryRes.data || []) as CountryStat[]);

      // --- Recent Activity ---
      setRecentActivity((recentRes.data || []) as RecentActivity[]);


      // --- Top Tracks — always fetch track details directly from Supabase ---
      const rawTopTracks = (topTracksRes?.data || []) as { track_id: string; style: string; play_count: number; share_count: number; view_count: number; total_duration: number }[];
      await enrichAndSetTopTracks(rawTopTracks, monthStart);

      // --- Style Chart (new RPC, fallback to track_plays client-side) ---
      if (styleRes?.data && styleRes.data.length > 0) {
        setStyleStats((styleRes.data as { style: string; play_count: number }[]).map(r => ({ style: r.style, count: Number(r.play_count) })));
      } else {
        // Fallback: enrich from track info
        const { data: playsForStyle } = await supabase
          .from('track_plays')
          .select('track_id, style')
          .gte('created_at', monthStart.toISOString());
        const styleCounts: Record<string, number> = {};
        (playsForStyle || []).forEach((p: { track_id: string; style: string | null }) => {
          let s = (p.style || '').trim();
          if (!s || s.toLowerCase() === 'unknown') {
            s = 'Unknown';
          }
          if (!s) s = 'Unknown';
          styleCounts[s] = (styleCounts[s] || 0) + 1;
        });
        const sorted = Object.entries(styleCounts)
          .filter(([s]) => s.toLowerCase() !== 'unknown')
          .sort((a, b) => b[1] - a[1])
          .slice(0, 10)
          .map(([style, count]) => ({ style, count }));
        setStyleStats(sorted);
      }

      // --- Referrer Stats ---
      if (referrerRes?.data && referrerRes.data.length > 0) {
        setReferrerStats(referrerRes.data as ReferrerStat[]);
      } else {
        // Fallback: synthetic referrer from recent activity
        setReferrerStats([
          { source_label: 'Telegram', visit_count: tgData.data?.length || 0 },
          { source_label: 'Direct', visit_count: Math.max(0, (totals.month || 0) - (tgData.data?.length || 0)) },
        ].filter(r => r.visit_count > 0));
      }

      setTgUsers((tgData.data || []) as TelegramUser[]);
    } catch (e) {
      console.error('Analytics error:', e);
    } finally {
      setLoading(false);
    }
  }, [period, totals.month]);

  // --- Separate Top Tracks fetcher (called on period tab change) ---
  const enrichAndSetTopTracks = useCallback(async (
    rawData: { track_id: string; style: string; play_count: number; share_count: number; view_count: number; total_duration: number }[],
    fallbackStart: Date
  ) => {
    let playsData = rawData;
    if (!playsData.length) {
      const { data: fallbackPlays } = await supabase
        .from('track_plays')
        .select('track_id, style')
        .gte('created_at', fallbackStart.toISOString());
      const counts: Record<string, number> = {};
      (fallbackPlays || []).forEach((p: { track_id: string }) => {
        counts[p.track_id] = (counts[p.track_id] || 0) + 1;
      });
      playsData = Object.entries(counts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .map(([track_id, play_count]) => ({ track_id, style: '', play_count, share_count: 0, view_count: 0, total_duration: 0 }));
    }
    const trackIds = playsData.map(r => r.track_id);
    const { data: dbTracks } = trackIds.length
      ? await supabase.from('tracks').select('id, title, artist, style').in('id', trackIds)
      : { data: [] };
    const dbMap: Record<string, { title: string; artist: string; style: string }> = {};
    (dbTracks || []).forEach((t: { id: string; title: string; artist: string; style: string }) => { dbMap[t.id] = t; });
    setTopTracks(playsData.map(row => {
      const t = dbMap[row.track_id];
      return { id: row.track_id, title: t?.title || '—', artist: t?.artist || '—', style: t?.style || row.style || '', play_count: Number(row.play_count) || 0, share_count: Number(row.share_count) || 0, view_count: Number(row.view_count) || 0, total_duration: Number(row.total_duration) || 0 };
    }));
  }, []);

  const fetchTopTracksForPeriod = useCallback(async (tp: '24h' | '7d' | '30d' | 'all') => {
    setTracksLoading(true);
    try {
      const now = new Date();
      let start: Date | null = new Date(now);
      if (tp === '24h') { start.setHours(start.getHours() - 24); }
      else if (tp === '7d') { start.setDate(start.getDate() - 7); }
      else if (tp === '30d') { start.setDate(start.getDate() - 30); }
      else { start = null; } // all time

      const query = supabase.rpc('get_top_tracks_with_events', {
        start_time: (start || new Date('2020-01-01')).toISOString(),
        limit_val: 10,
      });
      const { data } = await Promise.resolve(query).catch(() => ({ data: null }));
      await enrichAndSetTopTracks(
        (data || []) as { track_id: string; style: string; play_count: number; share_count: number; view_count: number; total_duration: number }[],
        start || new Date('2020-01-01')
      );
    } finally {
      setTracksLoading(false);
    }
  }, [enrichAndSetTopTracks]);

  useEffect(() => { fetch_(); }, [fetch_]);

  // Live Presence
  useEffect(() => {
    let mounted = true;
    let channel: ReturnType<typeof supabase.channel> | undefined;

    const syncLive = () => {
      if (!channel || !mounted) return;
      try {
        type PresenceEntry = { session_id?: string; name?: string | null; is_telegram?: boolean };
        const state = channel.presenceState() as Record<string, PresenceEntry[]>;
        const seen = new Set<string>();
        const users: { session_id: string; name: string | null; is_telegram: boolean }[] = [];
        Object.values(state).forEach(entries => {
          entries.forEach((e: PresenceEntry) => {
            if (!e?.session_id || e.session_id.startsWith('admin-')) return;
            if (seen.has(e.session_id)) return;
            seen.add(e.session_id);
            users.push({ session_id: e.session_id, name: e.name ?? null, is_telegram: !!e.is_telegram });
          });
        });
        setLiveUsers(users);
      } catch (err) {
        console.warn('[ANALYTICS] presence sync failed:', err);
      }
    };

    try {
      channel = supabase.channel('4andone-live', {
        config: { presence: { key: 'admin-dashboard-' + Math.random().toString(36).substring(2, 7) } }
      });
      channel
        .on('presence', { event: 'sync' }, syncLive)
        .on('presence', { event: 'join' }, syncLive)
        .on('presence', { event: 'leave' }, syncLive);
      channel.subscribe((status) => { if (status === 'SUBSCRIBED') syncLive(); });
    } catch (err) {
      console.warn('[ANALYTICS] presence init failed:', err);
    }

    return () => {
      mounted = false;
      if (channel) supabase.removeChannel(channel);
    };
  }, []);

  const maxBucket = Math.max(...buckets.map(b => b.count), 1);
  const maxCountry = Math.max(...countries.map(c => c.count), 1);
  const maxReferrer = Math.max(...referrerStats.map(r => r.visit_count), 1);
  const maxStyle = Math.max(...styleStats.map(s => s.count), 1);

  return (
    <div className="admin-analytics animate-in">

      {/* Header */}
      <div className="a-header">
        <div>
          <h2>Platform Insights</h2>
          <p className="text-muted">Live visitor stats, audience & library data.</p>
        </div>
        <button className="btn-refresh glass" onClick={fetch_}>
          <RefreshCw size={15} className={loading ? 'spin' : ''} /> Refresh
        </button>
      </div>

      {/* Online Now Panel — collapsible */}
      <div className="online-now-panel glass">
        <button className="online-now-header" onClick={() => setOnlineExpanded(e => !e)}>
          <span className="live-dot" />
          <Wifi size={16} />
          <span className="online-now-title">
            Online Now — <strong style={{ color: '#fff' }}>{liveUsers.length}</strong>
            {' '}{liveUsers.length === 1 ? 'person' : 'people'}
          </span>
          <div className="online-now-pills">
            {liveUsers.filter(u => u.is_telegram && u.name).slice(0, 4).map(u => (
              <span key={u.session_id} className="mini-chip tg">{u.name}</span>
            ))}
            {liveUsers.filter(u => !u.is_telegram).length > 0 && (
              <span className="mini-chip anon">{liveUsers.filter(u => !u.is_telegram).length} anon</span>
            )}
          </div>
          <span className="online-chevron">{onlineExpanded ? '▲' : '▼'}</span>
        </button>
        {onlineExpanded && (
          <div className="online-now-list">
            {liveUsers.length === 0 ? (
              <span className="online-now-empty">No one online right now</span>
            ) : (
              liveUsers.map(u => (
                <div key={u.session_id} className={`online-user-chip ${u.is_telegram ? 'tg' : 'anon'}`}>
                  <div className="online-user-avatar">
                    {u.name ? u.name.charAt(0).toUpperCase() : '?'}
                  </div>
                  <div className="online-user-info">
                    <span className="online-user-name">{u.name || 'Anonymous'}</span>
                    <span className="online-user-type">{u.is_telegram ? '✈️ Telegram' : '🌐 Web'}</span>
                  </div>
                  <span className="online-pulse" />
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {/* Summary Strip */}
      <div className="summary-strip">
        {([
          { label: 'Visits Today', value: totals.today, sub: `${uniqueTotals.today} unique`, icon: <Calendar size={16}/> },
          { label: 'This Week', value: totals.week, sub: `${uniqueTotals.week} unique`, icon: <TrendingUp size={16}/> },
          { label: 'This Month', value: totals.month, sub: `${uniqueTotals.month} unique`, icon: <Users size={16}/> },
          { label: 'This Year', value: totals.year, sub: `${uniqueTotals.year} unique`, icon: <BarChart3 size={16}/> },
          { label: 'Avg Session', value: fmtDuration(avgDuration), icon: <Clock size={16}/>, isStr: true },
          { label: 'TG Users', value: tgUsers.length, icon: <Users size={16}/> },
        ] as { label: string; value: string | number; sub?: string; icon: React.ReactNode; isStr?: boolean }[]).map(item => (
          <div key={item.label} className="sum-card glass">
            <div className="sum-icon">{item.icon}</div>
            <div className="sum-val">{loading ? '—' : item.isStr ? item.value : Number(item.value).toLocaleString()}</div>
            <div className="sum-label">{item.label}</div>
            {item.sub && <div className="sum-sub">{item.sub}</div>}
          </div>
        ))}
      </div>

      {/* Traffic Chart */}
      <div className="chart-card glass">
        <div className="chart-head">
          <div className="chart-title-row">
            <BarChart3 size={18} className="text-primary" />
            <h3>Visitor Traffic — {periodLabel[period]}</h3>
          </div>
          <div className="period-tabs">
            {(['day', 'week', 'month', 'year'] as Period[]).map(p => (
              <button key={p} className={`ptab ${period === p ? 'active' : ''}`} onClick={() => setPeriod(p)}>
                {p === 'day' ? '24h' : p === 'week' ? '7D' : p === 'month' ? '30D' : '1Y'}
              </button>
            ))}
          </div>
        </div>
        {loading ? (
          <div className="chart-empty"><div className="spinner"/><span>Loading...</span></div>
        ) : (
          <div className="bars-scroll">
            <div className="bars-row">
              {buckets.map((b, i) => (
                <div key={i} className="bar-col">
                  <div className="bar-num">{b.count > 0 ? b.count : ''}</div>
                  <div className="bar-fill" style={{ height: `${Math.round((b.count / maxBucket) * 100)}%` }}/>
                  <div className="bar-lbl">{period === 'month' ? (Number(b.label) % 5 === 1 ? b.label : '') : b.label}</div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Recent Visitor Activity + Telegram Users */}
      <div className="two-col">

        {/* Recent Visitor Activity — Rich Feed */}
        <div className="panel glass">
          <div className="panel-head">
            <Clock size={18} className="text-primary"/>
            <h3>Recent Visitor Activity</h3>
            <span className="panel-badge">{recentActivity.length}</span>
          </div>
          {loading ? <div className="panel-empty">Loading...</div> :
           recentActivity.length === 0 ? <div className="panel-empty">No activity logged yet</div> : (
            <div className="scroll-list">
              {recentActivity.map((r) => {
                const tgUser = tgUsers.find(u => u.telegram_id.toString() === r.user_ref);
                const isOnline = liveUsers.some(lu => lu.session_id === r.session_id);
                const isTelegram = !!tgUser;
                const refLabel = getReferrerLabel(r.referrer);
                return (
                  <div key={r.id} className={`activity-card ${isOnline ? 'is-online' : ''}`}>
                    <div className="activity-left">
                      <div className="act-avatar" style={{ background: isTelegram ? '#1db954' : '#3b82f6' }}>
                        {isTelegram
                          ? (tgUser!.first_name?.charAt(0) || 'T')
                          : getFlag(r.country_code)}
                      </div>
                      {isOnline && <span className="online-dot" title="Active now"/>}
                    </div>
                    <div className="activity-body">
                      <div className="act-name">
                        {isTelegram ? (
                          <>
                            <span>{tgUser!.first_name}{tgUser!.last_name ? ' ' + tgUser!.last_name : ''}</span>
                            {tgUser!.username && <span className="act-handle">@{tgUser!.username}</span>}
                          </>
                        ) : (
                          <span className="act-anon">Anonymous Visitor</span>
                        )}
                        {isOnline && <span className="badge-online">● Online</span>}
                      </div>
                      <div className="act-meta">
                        <span className="act-flag">{getFlag(r.country_code)}</span>
                        <span>{r.country_name || r.country_code || 'Unknown'}</span>
                        <span className="act-dot">·</span>
                        <span>{timeAgo(r.created_at)}</span>
                        {isTelegram && tgUser!.visit_count > 1 && (
                          <>
                            <span className="act-dot">·</span>
                            <span className="act-visits">{tgUser!.visit_count}x visited</span>
                          </>
                        )}
                      </div>
                      <div className="act-tags">
                        <span className="act-tag" style={{ background: isTelegram ? 'rgba(29,185,84,0.12)' : 'rgba(59,130,246,0.12)', color: isTelegram ? '#1db954' : '#3b82f6' }}>
                          {isTelegram ? '✈️ Telegram' : '🌐 Web'}
                        </span>
                        <span className="act-tag" style={{ background: 'rgba(255,255,255,0.05)', color: '#a1a1aa' }}>
                          {refLabel}
                        </span>
                        {r.duration_seconds > 0 && (
                          <span className="act-tag" style={{ background: 'rgba(255,255,255,0.05)', color: '#a1a1aa' }}>
                            ⏱ {fmtDuration(r.duration_seconds)}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Telegram Users */}
        <div className="panel glass">
          <div className="panel-head">
            <Users size={18} className="text-primary"/>
            <h3>Telegram Users</h3>
            <span className="panel-badge">{tgUsers.length}</span>
          </div>
          {loading ? <div className="panel-empty">Loading...</div> :
           tgUsers.length === 0 ? <div className="panel-empty">No auth users yet</div> : (
            <div className="scroll-list">
              {tgUsers.map((u, i) => {
                const isOnline = liveUsers.some(lu => lu.name === u.first_name || lu.session_id === u.telegram_id.toString());
                return (
                  <div key={u.telegram_id} className="tg-row">
                    <span className="rank-num">{i + 1}</span>
                    <div className="tg-avatar" style={{ background: isOnline ? '#1db954' : undefined }}>
                      {u.first_name?.charAt(0) || '?'}
                    </div>
                    <div className="tg-info">
                      <div className="tg-name">
                        {u.first_name}{u.last_name ? ' ' + u.last_name : ''}
                        {isOnline && <span className="badge-online">● Online</span>}
                      </div>
                      <div className="tg-meta">
                        {u.username ? `@${u.username} · ` : ''}
                        {getFlag(u.country_name || '')} {u.country_name || 'Unknown'} · {fmtDate(u.last_seen)}
                      </div>
                    </div>
                    <div className="tg-visits">{u.visit_count}x</div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Countries + Traffic Sources */}
      <div className="two-col">

        {/* Top Countries */}
        <div className="panel glass">
          <div className="panel-head">
            <Globe size={18} className="text-primary"/>
            <h3>Top Countries</h3>
          </div>
          {loading ? <div className="panel-empty">Loading...</div> :
           countries.length === 0 ? <div className="panel-empty">No geodata yet</div> :
           countries.map(c => (
            <div key={c.country_code} className="country-row">
              <div className="country-left">
                <span className="flag-large">{getFlag(c.country_code)}</span>
                <span className="country-name">{c.country_name || c.country_code}</span>
              </div>
              <div className="country-bar-wrap">
                <div className="country-bar" style={{ width: `${Math.round((c.count / maxCountry) * 100)}%` }}/>
              </div>
              <span className="country-count">{c.count}</span>
            </div>
          ))}
        </div>

        {/* Traffic Sources / Referrer */}
        <div className="panel glass">
          <div className="panel-head">
            <ExternalLink size={18} className="text-primary"/>
            <h3>Traffic Sources</h3>
            <span className="panel-sub">Last 30 days</span>
          </div>
          {loading ? <div className="panel-empty">Loading...</div> :
           referrerStats.length === 0 ? <div className="panel-empty">No referrer data yet</div> : (
            <div className="referrer-list">
              {referrerStats.map(r => {
                const color = REFERRER_COLORS[r.source_label] || '#71717a';
                const icon = REFERRER_ICONS[r.source_label] || '🌐';
                const pct = Math.round((r.visit_count / maxReferrer) * 100);
                return (
                  <div key={r.source_label} className="ref-row">
                    <div className="ref-left">
                      <span className="ref-icon">{icon}</span>
                      <span className="ref-label">{r.source_label}</span>
                    </div>
                    <div className="ref-bar-wrap">
                      <div className="ref-bar" style={{ width: `${pct}%`, background: color }}/>
                    </div>
                    <span className="ref-count" style={{ color }}>{r.visit_count}</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Style Popularity + Top Tracks */}
      <div className="two-col">

        {/* Style Popularity (30D Top Charts) */}
        <div className="panel glass">
          <div className="panel-head">
            <TrendingUp size={18} className="text-primary"/>
            <h3>Top Dance Styles</h3>
            <span className="panel-sub">30D plays</span>
          </div>
          {loading ? <div className="panel-empty">Loading...</div> :
           styleStats.length === 0 ? <div className="panel-empty">No play data yet</div> : (
            <div className="style-bars">
              {styleStats.map((s, i) => {
                const color = STYLE_COLORS[s.style] || '#1db954';
                const pct = Math.max(4, (s.count / maxStyle) * 100);
                const totalPlays = styleStats.reduce((acc, x) => acc + x.count, 0);
                const percent = totalPlays > 0 ? Math.round((s.count / totalPlays) * 100) : 0;
                return (
                  <div key={s.style} className="style-bar-row">
                    <div className="style-rank">{i + 1}</div>
                    <span className="style-name">{s.style}</span>
                    <div className="s-bar-wrap">
                      <div className="s-bar" style={{ width: `${pct}%`, background: color }}/>
                    </div>
                    <div className="style-stats">
                      <span className="style-count">{s.count}</span>
                      <span className="style-pct">{percent}%</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Most Played Tracks */}
        <div className="panel glass">
          <div className="panel-head">
            <Music size={18} className="text-primary"/>
            <h3>Top Tracks</h3>
            <div className="period-tabs small-tabs">
              {(['24h', '7d', '30d', 'all'] as const).map(tp => (
                <button
                  key={tp}
                  className={`ptab ${topTrackPeriod === tp ? 'active' : ''}`}
                  onClick={() => {
                    setTopTrackPeriod(tp);
                    fetchTopTracksForPeriod(tp);
                  }}
                >
                  {tp === 'all' ? 'All' : tp.toUpperCase()}
                </button>
              ))}
            </div>
            {tracksLoading && <div className="mini-spinner"/>}
          </div>
          {loading ? <div className="panel-empty">Loading...</div> :
           topTracks.length === 0 ? <div className="panel-empty">No play data yet</div> : (
            <div className="scroll-list">
              {topTracks.map((t, i) => {
                const styleColor = STYLE_COLORS[t.style] || '#1db954';
                return (
                  <div key={t.id} className="track-row">
                    <span className="rank-num">{i + 1}</span>
                    <div className="track-avatar" style={{ background: `${styleColor}22`, border: `1px solid ${styleColor}44` }}>
                      <Music size={12} style={{ color: styleColor }}/>
                    </div>
                    <div className="tg-info">
                      <div className="tg-name">{t.title}</div>
                      <div className="tg-meta">{t.artist}{t.style ? ` · ${t.style}` : ''}</div>
                    </div>
                    <div className="track-stats">
                      <div className="track-stat">
                        <Radio size={10}/> {t.play_count}
                      </div>
                      {t.share_count > 0 && (
                        <div className="track-stat share">
                          <Share2 size={10}/> {t.share_count}
                        </div>
                      )}
                      {t.view_count > 0 && (
                        <div className="track-stat view">
                          <Eye size={10}/> {t.view_count}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Library Stats */}
      <div className="lib-row">
        {[
          { label: 'Total Tracks', value: tracks.length, sub: `${tracks.filter(t => t.style?.toLowerCase() === 'fitness').length} in Fitness`, icon: <Music size={18}/> },
          { label: 'Dance Styles', value: folders.length, sub: `${styles.length} style types`, icon: <Folder size={18}/> },
          { label: 'Finals Queues', value: finalFolders.length, sub: `${tracks.filter(t => t.isFavorite).length} Liked Songs`, icon: <Flag size={18}/> },
        ].map(s => (
          <div key={s.label} className="lib-card glass">
            <div className="lib-icon text-primary">{s.icon}</div>
            <div>
              <div className="lib-val">{s.value}</div>
              <div className="lib-label">{s.label}</div>
              <div className="lib-sub">{s.sub}</div>
            </div>
          </div>
        ))}
      </div>

      <style jsx>{`
        .admin-analytics { display:flex; flex-direction:column; gap:24px; padding-bottom:100px; }

        /* Header */
        .a-header { display:flex; align-items:center; justify-content:space-between; flex-wrap:wrap; gap:12px; }
        .a-header h2 { font-size:22px; font-weight:800; margin-bottom:4px; }
        .text-muted { font-size:13px; color:#71717a; }
        .btn-refresh { display:flex; align-items:center; gap:8px; padding:9px 18px; border-radius:12px; font-size:13px; font-weight:700; color:white; border:1px solid rgba(255,255,255,0.1); cursor:pointer; transition:background 0.2s; background:transparent; }
        .btn-refresh:hover { background:rgba(255,255,255,0.06); }
        .spin { animation:spinA 0.8s linear infinite; }
        @keyframes spinA { to { transform:rotate(360deg); } }

        /* Online Now Panel */
        .online-now-panel { padding:16px 20px; border-radius:16px; background:linear-gradient(135deg, rgba(29,185,84,0.1), rgba(29,185,84,0.02)); border:1px solid rgba(29,185,84,0.2); }
        .online-now-header { display:flex; align-items:center; gap:8px; color:#1db954; width:100%; background:none; border:none; cursor:pointer; padding:0; text-align:left; }
        .online-now-pills { display:flex; gap:5px; flex-wrap:nowrap; overflow:hidden; flex:1; }
        .mini-chip { font-size:10px; font-weight:700; padding:2px 8px; border-radius:20px; white-space:nowrap; }
        .mini-chip.tg { background:rgba(29,185,84,0.15); color:#1db954; }
        .mini-chip.anon { background:rgba(255,255,255,0.07); color:#71717a; }
        .online-chevron { font-size:10px; color:#52525b; flex-shrink:0; margin-left:auto; }
        .mini-spinner { width:14px; height:14px; border:2px solid rgba(255,255,255,0.1); border-top-color:#1db954; border-radius:50%; animation:spinA 0.7s linear infinite; flex-shrink:0; }
        .small-tabs { gap:2px; background:rgba(255,255,255,0.04); padding:3px; border-radius:8px; }
        .small-tabs .ptab { padding:3px 8px; font-size:10px; border-radius:6px; }
        .online-now-title { font-size:13px; font-weight:700; color:#a1a1aa; }
        .online-now-title strong { color:#fff; }
        .live-dot { width:8px; height:8px; border-radius:50%; background:#1db954; flex-shrink:0; animation:livePulse 2s infinite; }
        @keyframes livePulse { 0%{box-shadow:0 0 0 0 rgba(29,185,84,0.6)} 70%{box-shadow:0 0 0 8px rgba(29,185,84,0)} 100%{box-shadow:0 0 0 0 rgba(29,185,84,0)} }
        .online-now-list { display:flex; gap:8px; flex-wrap:wrap; align-items:center; }
        .online-now-empty { font-size:12px; color:#52525b; font-style:italic; }
        .online-user-chip { display:flex; align-items:center; gap:8px; padding:6px 12px 6px 6px; border-radius:24px; position:relative; }
        .online-user-chip.tg { background:rgba(29,185,84,0.12); border:1px solid rgba(29,185,84,0.2); }
        .online-user-chip.anon { background:rgba(255,255,255,0.05); border:1px solid rgba(255,255,255,0.08); }
        .online-user-avatar { width:26px; height:26px; border-radius:50%; background:#1db954; color:black; font-size:11px; font-weight:900; display:flex; align-items:center; justify-content:center; flex-shrink:0; }
        .online-user-chip.anon .online-user-avatar { background:#3f3f46; color:#a1a1aa; }
        .online-user-info { display:flex; flex-direction:column; gap:1px; }
        .online-user-name { font-size:12px; font-weight:700; color:#e4e4e7; line-height:1; }
        .online-user-type { font-size:10px; color:#71717a; line-height:1; }
        .online-pulse { width:6px; height:6px; border-radius:50%; background:#1db954; position:absolute; top:6px; right:6px; animation:livePulse 2s infinite; }
        .live-count { font-size:22px; font-weight:900; color:#fff; }
        .live-text { font-size:13px; font-weight:600; color:#a1a1aa; }
        .live-names { display:flex; gap:6px; flex-wrap:wrap; align-items:center; }
        .live-chip { font-size:11px; font-weight:700; padding:4px 10px; border-radius:20px; background:rgba(29,185,84,0.15); color:#1db954; }
        .live-chip.anon { background:rgba(255,255,255,0.06); color:#a1a1aa; }
        .live-empty { font-size:12px; color:#71717a; font-style:italic; }

        /* Summary */
        .summary-strip { display:grid; grid-template-columns:repeat(6,1fr); gap:12px; }
        .sum-card { padding:16px; border-radius:16px; display:flex; flex-direction:column; gap:6px; border:1px solid rgba(255,255,255,0.05); }
        .sum-icon { width:28px; height:28px; display:flex; align-items:center; justify-content:center; color:#1db954; }
        .sum-val { font-size:24px; font-weight:900; letter-spacing:-1px; line-height:1; }
        .sum-label { font-size:10px; font-weight:800; color:#52525b; text-transform:uppercase; letter-spacing:0.5px; }
        .sum-sub { font-size:11px; font-weight:700; color:#1db954; margin-top:2px; }

        /* Chart */
        .chart-card { padding:28px; border-radius:24px; }
        .chart-head { display:flex; align-items:center; justify-content:space-between; flex-wrap:wrap; gap:12px; margin-bottom:28px; }
        .chart-title-row { display:flex; align-items:center; gap:10px; }
        .chart-title-row h3 { font-size:16px; font-weight:800; }
        .period-tabs { display:flex; gap:4px; background:rgba(255,255,255,0.04); padding:4px; border-radius:10px; }
        .ptab { padding:6px 14px; border-radius:8px; font-size:12px; font-weight:700; color:#71717a; border:none; cursor:pointer; background:transparent; transition:all 0.2s; }
        .ptab.active { background:#1db954; color:black; }
        .ptab:hover:not(.active) { color:white; }
        .chart-empty { display:flex; flex-direction:column; align-items:center; justify-content:center; gap:12px; height:180px; color:#52525b; }
        .spinner { width:32px; height:32px; border:3px solid rgba(255,255,255,0.07); border-top-color:#1db954; border-radius:50%; animation:spinA 0.8s linear infinite; }
        .bars-scroll { overflow-x:auto; }
        .bars-row { height:220px; display:flex; align-items:flex-end; gap:4px; min-width:max-content; padding:0 4px; }
        .bar-col { flex:1; min-width:24px; display:flex; flex-direction:column; align-items:center; height:100%; justify-content:flex-end; gap:3px; }
        .bar-num { font-size:9px; font-weight:800; color:#1db954; min-height:12px; }
        .bar-fill { width:85%; max-width:36px; background:linear-gradient(to top,#1db954,#22c55e66); border-radius:4px 4px 0 0; min-height:3px; transition:height 0.5s cubic-bezier(0.4,0,0.2,1); }
        .bar-lbl { font-size:9px; font-weight:700; color:#52525b; white-space:nowrap; text-transform:uppercase; }

        /* Two column layout */
        .two-col { display:grid; grid-template-columns:1fr 1fr; gap:20px; }
        .panel { padding:24px; border-radius:20px; display:flex; flex-direction:column; gap:12px; }
        .panel-head { display:flex; align-items:center; gap:10px; margin-bottom:4px; }
        .panel-head h3 { font-size:15px; font-weight:800; flex:1; }
        .panel-badge { font-size:11px; font-weight:800; padding:2px 8px; border-radius:20px; background:rgba(29,185,84,0.12); color:#1db954; }
        .panel-sub { font-size:11px; color:#52525b; font-weight:600; }
        .panel-empty { color:#52525b; font-size:13px; text-align:center; padding:24px; }

        /* Recent Activity — Rich Cards */
        .scroll-list { display:flex; flex-direction:column; max-height:400px; overflow-y:auto; gap:0; }
        .scroll-list::-webkit-scrollbar { width:5px; }
        .scroll-list::-webkit-scrollbar-thumb { background:rgba(255,255,255,0.12); border-radius:3px; }

        .activity-card { display:flex; align-items:flex-start; gap:12px; padding:10px 0; border-bottom:1px solid rgba(255,255,255,0.04); position:relative; }
        .activity-card:last-child { border:none; }
        .activity-card.is-online { background:rgba(29,185,84,0.03); border-radius:8px; padding:10px 8px; margin:0 -8px; }
        .activity-left { position:relative; flex-shrink:0; }
        .act-avatar { width:38px; height:38px; border-radius:50%; display:flex; align-items:center; justify-content:center; font-weight:900; font-size:15px; color:black; }
        .online-dot { position:absolute; bottom:0; right:0; width:10px; height:10px; border-radius:50%; background:#1db954; border:2px solid #18181b; box-shadow:0 0 6px #1db954; }
        .activity-body { flex:1; min-width:0; }
        .act-name { display:flex; align-items:center; gap:6px; font-size:13px; font-weight:700; flex-wrap:wrap; }
        .act-handle { color:#1db954; font-size:11px; }
        .act-anon { color:#a1a1aa; }
        .badge-online { font-size:10px; font-weight:800; color:#1db954; padding:1px 6px; border-radius:20px; background:rgba(29,185,84,0.12); }
        .act-meta { display:flex; align-items:center; gap:4px; font-size:11px; color:#71717a; margin-top:2px; flex-wrap:wrap; }
        .act-flag { font-size:13px; }
        .act-dot { color:#3f3f46; }
        .act-visits { color:#1db954; font-weight:700; }
        .act-tags { display:flex; gap:5px; margin-top:5px; flex-wrap:wrap; }
        .act-tag { font-size:10px; font-weight:700; padding:2px 8px; border-radius:20px; }

        /* Country rows */
        .country-row { display:flex; align-items:center; gap:10px; padding:4px 0; }
        .country-left { display:flex; align-items:center; gap:8px; min-width:140px; }
        .flag-large { font-size:20px; line-height:1; }
        .country-name { font-size:13px; font-weight:600; color:#d4d4d8; }
        .country-bar-wrap { flex:1; height:6px; background:rgba(255,255,255,0.06); border-radius:3px; overflow:hidden; }
        .country-bar { height:100%; background:#1db954; border-radius:3px; transition:width 0.6s ease; }
        .country-count { font-size:13px; font-weight:800; color:#a1a1aa; min-width:28px; text-align:right; }

        /* Referrer */
        .referrer-list { display:flex; flex-direction:column; gap:14px; margin-top:4px; }
        .ref-row { display:flex; align-items:center; gap:12px; }
        .ref-left { display:flex; align-items:center; gap:8px; min-width:110px; }
        .ref-icon { font-size:16px; }
        .ref-label { font-size:13px; font-weight:700; color:#d4d4d8; }
        .ref-bar-wrap { flex:1; height:7px; background:rgba(255,255,255,0.05); border-radius:4px; overflow:hidden; }
        .ref-bar { height:100%; border-radius:4px; transition:width 0.6s ease; }
        .ref-count { font-size:13px; font-weight:900; min-width:32px; text-align:right; }

        /* Style bars */
        .style-bars { display:flex; flex-direction:column; gap:12px; margin-top:4px; }
        .style-bar-row { display:flex; align-items:center; gap:10px; }
        .style-rank { font-size:11px; font-weight:800; color:#52525b; width:16px; text-align:center; flex-shrink:0; }
        .style-name { font-size:12px; font-weight:700; color:#a1a1aa; width:80px; flex-shrink:0; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
        .s-bar-wrap { flex:1; height:7px; background:rgba(255,255,255,0.05); border-radius:4px; overflow:hidden; }
        .s-bar { height:100%; border-radius:4px; transition:width 0.5s ease; }
        .style-stats { display:flex; flex-direction:column; align-items:flex-end; min-width:44px; }
        .style-count { font-size:12px; font-weight:800; color:#a1a1aa; }
        .style-pct { font-size:10px; font-weight:700; color:#52525b; }

        /* Track rows */
        .track-row { display:flex; align-items:center; gap:12px; padding:8px 0; border-bottom:1px solid rgba(255,255,255,0.04); }
        .track-row:last-child { border:none; }
        .rank-num { font-size:11px; font-weight:800; color:#52525b; min-width:18px; text-align:center; flex-shrink:0; }
        .track-avatar { width:34px; height:34px; border-radius:8px; display:flex; align-items:center; justify-content:center; flex-shrink:0; }
        .tg-row { display:flex; align-items:center; gap:12px; padding:8px 0; border-bottom:1px solid rgba(255,255,255,0.04); }
        .tg-row:last-child { border:none; }
        .tg-avatar { width:36px; height:36px; border-radius:50%; background:#1db954; color:black; font-weight:900; font-size:15px; display:flex; align-items:center; justify-content:center; flex-shrink:0; }
        .tg-info { flex:1; min-width:0; }
        .tg-name { font-size:14px; font-weight:700; display:flex; align-items:center; gap:6px; flex-wrap:wrap; }
        .tg-meta { font-size:11px; color:#71717a; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
        .tg-visits { font-size:13px; font-weight:800; color:#1db954; white-space:nowrap; }
        .track-stats { display:flex; flex-direction:column; gap:3px; align-items:flex-end; }
        .track-stat { display:flex; align-items:center; gap:3px; font-size:11px; font-weight:800; color:#a1a1aa; }
        .track-stat.share { color:#6366f1; }
        .track-stat.view { color:#f59e0b; }

        /* Library */
        .lib-row { display:grid; grid-template-columns:repeat(3,1fr); gap:16px; }
        .lib-card { padding:20px 24px; border-radius:20px; border:1px solid rgba(255,255,255,0.05); display:flex; align-items:center; gap:16px; }
        .lib-icon { margin-bottom:0; }
        .lib-val { font-size:32px; font-weight:900; letter-spacing:-1.5px; line-height:1; }
        .lib-label { font-size:11px; font-weight:800; color:#71717a; text-transform:uppercase; letter-spacing:0.5px; margin-top:4px; }
        .lib-sub { font-size:12px; color:#1db954; margin-top:4px; font-weight:600; }

        .text-primary { color:#1db954; }
        .animate-in { animation:animIn 0.4s cubic-bezier(0.4,0,0.2,1); }
        @keyframes animIn { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:translateY(0)} }

        @media (max-width:1200px) { .summary-strip { grid-template-columns:repeat(3,1fr); } }
        @media (max-width:900px) { .two-col { grid-template-columns:1fr; } .lib-row { grid-template-columns:1fr 1fr; } }
        @media (max-width:640px) {
          .summary-strip { grid-template-columns:repeat(2,1fr); gap:8px; }
          .sum-val { font-size:20px; }
          .chart-card { padding:16px; }
          .bars-row { height:160px; }
          .lib-row { grid-template-columns:1fr; }
          .country-left { min-width:110px; }
          .panel { padding:16px; }
        }
      `}</style>
    </div>
  );
}
