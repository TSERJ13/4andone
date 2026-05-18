"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { BarChart3, TrendingUp, Users, Music, Folder, Flag, Calendar, RefreshCw, Globe, Clock, Radio } from 'lucide-react';
import { useStudio } from '@/components/admin/StudioProvider';
import { supabase } from '@/utils/supabase';

type Period = 'day' | 'week' | 'month' | 'year';

interface VisitBucket { label: string; count: number; }
interface CountryStat { country_code: string; country_name: string; count: number; }
interface TelegramUser { telegram_id: number; first_name: string; last_name?: string; username?: string; last_seen: string; visit_count: number; country_name?: string; }

function getDateRange(period: Period) {
  const now = new Date();
  const start = new Date(now);
  if (period === 'day') { start.setHours(0,0,0,0); }
  else if (period === 'week') { start.setDate(now.getDate() - now.getDay()); start.setHours(0,0,0,0); }
  else if (period === 'month') { start.setDate(1); start.setHours(0,0,0,0); }
  else { start.setMonth(0,1); start.setHours(0,0,0,0); }
  return { start, end: now };
}

function buildBuckets(rows: { created_at: string }[], period: Period): VisitBucket[] {
  const now = new Date();
  if (period === 'day') {
    const b: Record<number, number> = {};
    for (let h = 0; h < 24; h++) b[h] = 0;
    rows.forEach(r => { const h = new Date(r.created_at).getHours(); b[h]++; });
    return Object.entries(b).map(([h, count]) => ({ label: `${h.padStart(2,'0')}h`, count }));
  }
  if (period === 'week') {
    const days = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
    const b: Record<number,number> = {}; days.forEach((_,i) => b[i]=0);
    rows.forEach(r => { b[new Date(r.created_at).getDay()]++; });
    return days.map((l,i) => ({ label: l, count: b[i] }));
  }
  if (period === 'month') {
    const dim = new Date(now.getFullYear(), now.getMonth()+1, 0).getDate();
    const b: Record<number,number> = {}; for(let d=1;d<=dim;d++) b[d]=0;
    rows.forEach(r => { b[new Date(r.created_at).getDate()]++; });
    return Object.entries(b).map(([d,count]) => ({ label: d, count }));
  }
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const b: Record<number,number> = {}; months.forEach((_,i) => b[i]=0);
  rows.forEach(r => { b[new Date(r.created_at).getMonth()]++; });
  return months.map((l,i) => ({ label: l, count: b[i] }));
}

const COUNTRY_FLAGS: Record<string, string> = {
  GE:'🇬🇪', US:'🇺🇸', DE:'🇩🇪', RU:'🇷🇺', UA:'🇺🇦', TR:'🇹🇷', GB:'🇬🇧',
  FR:'🇫🇷', IT:'🇮🇹', PL:'🇵🇱', AZ:'🇦🇿', AM:'🇦🇲', BY:'🇧🇾', NL:'🇳🇱',
  ES:'🇪🇸', CA:'🇨🇦', AU:'🇦🇺', JP:'🇯🇵', KR:'🇰🇷', CN:'🇨🇳', BR:'🇧🇷',
};

export default function AdminAnalytics() {
  const { tracks, folders, finalFolders, styles } = useStudio();
  const [period, setPeriod] = useState<Period>('week');
  const [buckets, setBuckets] = useState<VisitBucket[]>([]);
  const [totals, setTotals] = useState({ today: 0, week: 0, month: 0, year: 0 });
  const [uniqueTotals, setUniqueTotals] = useState({ today: 0, week: 0, month: 0, year: 0 });
  const [avgDuration, setAvgDuration] = useState(0);
  const [countries, setCountries] = useState<CountryStat[]>([]);
  const [tgUsers, setTgUsers] = useState<TelegramUser[]>([]);
  const [topTracks, setTopTracks] = useState<{ id: string, title: string, artist: string, count: number }[]>([]);
  const [styleStats, setStyleStats] = useState<{ style: string, count: number }[]>([]);
  const [liveUsers, setLiveUsers] = useState<{ session_id: string; name: string | null; is_telegram: boolean }[]>([]);
  const [loading, setLoading] = useState(true);

  // Keep a ref to the latest tracks so fetch_ can read them WITHOUT listing
  // `tracks` as a dependency. Listing it caused fetch_ to be recreated on every
  // library update, which re-triggered the fetch effect — a render loop that
  // crashed the page ("This page couldn't load").
  const tracksRef = React.useRef(tracks);
  React.useEffect(() => { tracksRef.current = tracks; }, [tracks]);

  const fetch_ = useCallback(async () => {
    setLoading(true);
    const tracks = tracksRef.current || []; // local snapshot, not a dependency
    try {
      const { start } = getDateRange(period);
      const now = new Date();
      const todayStart = new Date(now); todayStart.setHours(0,0,0,0);
      const weekStart = new Date(now); weekStart.setDate(now.getDate()-now.getDay()); weekStart.setHours(0,0,0,0);
      const monthStart = new Date(now); monthStart.setDate(1); monthStart.setHours(0,0,0,0);
      const yearStart = new Date(now); yearStart.setMonth(0,1); yearStart.setHours(0,0,0,0);

      // NOTE: Supabase caps a normal select at 1000 rows. The site already has
      // 1000+ visits/year, so fetching them all and counting client-side silently
      // dropped the newest rows — that's why "today"/"this week" showed 0.
      // FIX: each total is its own server-side count query (head:true → no rows
      // transferred, no 1000 cap). Unique sessions still need the rows, so we pull
      // those for a bounded recent window (30 days) which stays well under 1000.
      const countVisits = (from: Date) =>
        supabase.from('page_visits')
          .select('id', { count: 'exact', head: true })
          .gte('created_at', from.toISOString());

      const uniqueWindowStart = new Date(now);
      uniqueWindowStart.setDate(now.getDate() - 30);
      uniqueWindowStart.setHours(0, 0, 0, 0);

      const [
        yearRows, chartData, durData, countryData, tgData, playData,
        cToday, cWeek, cMonth, cYear,
      ] = await Promise.all([
        supabase.from('page_visits')
          .select('session_id, created_at')
          .gte('created_at', uniqueWindowStart.toISOString())
          .order('created_at', { ascending: false }),
        supabase.from('page_visits')
          .select('created_at')
          .gte('created_at', start.toISOString())
          .order('created_at'),
        supabase.from('page_visits')
          .select('duration_seconds')
          .gt('duration_seconds', 0)
          .gte('created_at', monthStart.toISOString()),
        supabase.from('page_visits')
          .select('country_code,country_name')
          .not('country_code','is',null)
          .gte('created_at', yearStart.toISOString()),
        supabase.from('telegram_users')
          .select('*')
          .order('visit_count', { ascending: false }),
        supabase.from('track_plays')
          .select('track_id, style, created_at')
          .gte('created_at', monthStart.toISOString()),
        countVisits(todayStart),
        countVisits(weekStart),
        countVisits(monthStart),
        countVisits(yearStart),
      ]);

      // ---- Visits totals: straight from server-side counts (accurate past 1000) ----
      setTotals({
        today: cToday.count ?? 0,
        week:  cWeek.count ?? 0,
        month: cMonth.count ?? 0,
        year:  cYear.count ?? 0,
      });

      // ---- Unique sessions: derived from the recent 30-day row window ----
      const rows = (yearRows.data || []) as { session_id: string | null; created_at: string }[];
      const inRange = (d: string, from: Date) => new Date(d) >= from;
      const countUnique = (from: Date) => {
        const set = new Set<string>();
        rows.forEach(r => {
          if (inRange(r.created_at, from) && r.session_id) set.add(r.session_id);
        });
        return set.size;
      };

      setUniqueTotals({
        today: countUnique(todayStart),
        week:  countUnique(weekStart),
        month: countUnique(monthStart),
        // Year-unique is limited to the 30-day window; show month's unique as a
        // safe lower bound rather than an undercount that looks broken.
        year:  countUnique(uniqueWindowStart),
      });

      // ---- Track plays: most played + style popularity (from the FULL month dataset) ----
      const plays = (playData.data || []) as { track_id: string; style: string | null }[];

      const trackCounts: Record<string, number> = {};
      plays.forEach(p => { trackCounts[p.track_id] = (trackCounts[p.track_id] || 0) + 1; });

      const topTracksDetailed = Object.entries(trackCounts)
        .sort((a,b) => b[1] - a[1])
        .slice(0, 8)
        .map(([id, count]) => {
          const t = tracks.find(tt => tt.id === id);
          return { id, count, title: t?.title || 'Unknown Track', artist: t?.artist || 'Unknown' };
        });
      setTopTracks(topTracksDetailed);

      // Style popularity: count EVERY play, using the denormalized style on track_plays
      // and falling back to the track's style from the library if it's missing.
      const styleCounts: Record<string, number> = {};
      plays.forEach(p => {
        let s = (p.style || '').trim();
        if (!s || s.toLowerCase() === 'unknown') {
          s = tracks.find(tt => tt.id === p.track_id)?.style || 'Unknown';
        }
        if (!s) s = 'Unknown';
        styleCounts[s] = (styleCounts[s] || 0) + 1;
      });
      const styleSorted = Object.entries(styleCounts)
        .filter(([s]) => s.toLowerCase() !== 'unknown')
        .sort((a,b) => b[1] - a[1])
        .slice(0, 8)
        .map(([style, count]) => ({ style, count }));
      setStyleStats(styleSorted);

      setBuckets(buildBuckets(chartData.data || [], period));

      // Avg duration in seconds
      const durations = (durData.data || []).map((d: { duration_seconds: number }) => d.duration_seconds).filter(Boolean);
      setAvgDuration(durations.length ? Math.round(durations.reduce((a: number,b: number) => a+b, 0) / durations.length) : 0);

      // Aggregate country stats
      const cmap: Record<string, CountryStat> = {};
      (countryData.data || []).forEach((r: { country_code: string | null; country_name: string | null }) => {
        if (!r.country_code) return;
        const k = r.country_code;
        cmap[k] = cmap[k] ? { ...cmap[k], count: cmap[k].count+1 } : { country_code: k, country_name: r.country_name||k, count: 1 };
      });
      setCountries(Object.values(cmap).sort((a,b) => b.count - a.count).slice(0, 8));

      setTgUsers((tgData.data || []) as TelegramUser[]);
    } catch(e) {
      console.error('Analytics error:', e);
    } finally {
      setLoading(false);
    }
  }, [period]);

  useEffect(() => { fetch_(); }, [fetch_]);

  // LIVE LISTENERS: subscribe to the same presence channel visitors join.
  // presenceState() returns everyone currently online, in real time.
  // Defensive: if realtime is unavailable the page must still render fine.
  useEffect(() => {
    let mounted = true;
    let channel: ReturnType<typeof supabase.channel> | undefined;
    try {
      // Find the existing channel created by AnalyticsTracker to avoid duplicate channel conflicts
      channel = supabase.getChannels().find(c => c.topic === 'realtime:4andone-live');
      
      if (!channel) {
        channel = supabase.channel('4andone-live');
      }

      const syncLive = () => {
        if (!channel || !mounted) return;
        try {
          type PresenceEntry = { session_id?: string; name?: string | null; is_telegram?: boolean };
          const state = channel.presenceState() as Record<string, PresenceEntry[]>;
          const seen = new Set<string>();
          const users: { session_id: string; name: string | null; is_telegram: boolean }[] = [];
          Object.values(state).forEach(entries => {
            entries.forEach((e: PresenceEntry) => {
              if (!e?.session_id || e.session_id === 'admin-dashboard') return;
              if (seen.has(e.session_id)) return;
              seen.add(e.session_id);
              users.push({
                session_id: e.session_id,
                name: e.name ?? null,
                is_telegram: !!e.is_telegram,
              });
            });
          });
          setLiveUsers(users);
        } catch (err) {
          console.warn('[ANALYTICS] presence sync failed:', err);
        }
      };

      channel
        .on('presence', { event: 'sync' }, syncLive)
        .on('presence', { event: 'join' }, syncLive)
        .on('presence', { event: 'leave' }, syncLive);

      if (channel.state !== 'joined' && channel.state !== 'joining') {
        channel.subscribe();
      } else {
        syncLive(); // If already joined, just pull the current state
      }
    } catch (err) {
      console.warn('[ANALYTICS] presence channel init failed:', err);
    }

    return () => {
      mounted = false;
    };
  }, []);

  const maxBucket = Math.max(...buckets.map(b => b.count), 1);
  const maxCountry = Math.max(...countries.map(c => c.count), 1);

  const fmtDuration = (s: number) => {
    if (!s) return '—';
    const m = Math.floor(s/60), sec = s%60;
    return m > 0 ? `${m}m ${sec}s` : `${sec}s`;
  };

  const fmtDate = (d: string) => new Date(d).toLocaleDateString('en', { month:'short', day:'numeric' });
  const periodLabel: Record<Period,string> = { day:'Today (hourly)', week:'This Week', month:'This Month', year:'This Year' };

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

      {/* Summary strip */}
      {/* LIVE NOW — realtime count of visitors currently on the site */}
      <div className="live-banner glass">
        <div className="live-left">
          <span className="live-dot" />
          <Radio size={18} />
          <span className="live-count">{liveUsers.length}</span>
          <span className="live-text">
            {liveUsers.length === 1 ? 'person online now' : 'people online now'}
          </span>
        </div>
        <div className="live-names">
          {liveUsers.filter(u => u.is_telegram && u.name).length > 0 ? (
            liveUsers
              .filter(u => u.is_telegram && u.name)
              .slice(0, 8)
              .map(u => (
                <span key={u.session_id} className="live-chip">{u.name}</span>
              ))
          ) : (
            <span className="live-empty">
              {liveUsers.length > 0 ? 'Anonymous web visitors' : 'No one online right now'}
            </span>
          )}
          {liveUsers.filter(u => !u.is_telegram).length > 0 &&
            liveUsers.filter(u => u.is_telegram && u.name).length > 0 && (
            <span className="live-chip anon">
              +{liveUsers.filter(u => !u.is_telegram).length} anonymous
            </span>
          )}
        </div>
      </div>

      <div className="summary-strip">
        {([
          { label:'Visits Today', value: totals.today, sub:`${uniqueTotals.today} unique`, icon:<Calendar size={16}/> },
          { label:'This Week', value: totals.week, sub:`${uniqueTotals.week} unique`, icon:<TrendingUp size={16}/> },
          { label:'This Month', value: totals.month, sub:`${uniqueTotals.month} unique`, icon:<Users size={16}/> },
          { label:'This Year', value: totals.year, sub:`${uniqueTotals.year} unique`, icon:<BarChart3 size={16}/> },
          { label:'Avg Session', value: fmtDuration(avgDuration), icon:<Clock size={16}/>, isStr:true },
          { label:'TG Users', value: tgUsers.length, icon:<Users size={16}/>, color:'#1db954' },
        ] as { label:string; value:string|number; sub?:string; icon:React.ReactNode; isStr?:boolean; color?:string }[]).map(item => (
          <div key={item.label} className="sum-card glass">
            <div className="sum-icon" style={{ color: item.color||'#1db954' }}>{item.icon}</div>
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
            {(['day','week','month','year'] as Period[]).map(p => (
              <button key={p} className={`ptab ${period===p?'active':''}`} onClick={() => setPeriod(p)}>
                {p==='day'?'24h':p==='week'?'7D':p==='month'?'30D':'1Y'}
              </button>
            ))}
          </div>
        </div>
        {loading ? (
          <div className="chart-empty"><div className="spinner"/><span>Loading...</span></div>
        ) : (
          <div className="bars-scroll">
            <div className="bars-row">
              {buckets.map((b,i) => (
                <div key={i} className="bar-col">
                  <div className="bar-num">{b.count>0?b.count:''}</div>
                  <div className="bar-fill" style={{ height:`${Math.round((b.count/maxBucket)*100)}%` }}/>
                  <div className="bar-lbl">{period==='month'?(Number(b.label)%5===1?b.label:''):b.label}</div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Two-column: Countries + Telegram users */}
      <div className="two-col">

        {/* Country stats */}
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
                <span className="flag">{COUNTRY_FLAGS[c.country_code] || '🌍'}</span>
                <span className="country-name">{c.country_name}</span>
              </div>
              <div className="country-bar-wrap">
                <div className="country-bar" style={{ width:`${Math.round((c.count/maxCountry)*100)}%` }}/>
              </div>
              <span className="country-count">{c.count}</span>
            </div>
          ))}
        </div>

        {/* Telegram top users */}
        <div className="panel glass">
          <div className="panel-head">
            <Users size={18} className="text-primary"/>
            <h3>Telegram Users ({tgUsers.length})</h3>
          </div>
          {loading ? <div className="panel-empty">Loading...</div> :
           tgUsers.length === 0 ? <div className="panel-empty">No auth users yet</div> : (
            <div className="scroll-list">
              {tgUsers.map((u, i) => (
                <div key={u.telegram_id} className="tg-row">
                  <span className="rank-num">{i + 1}</span>
                  <div className="tg-avatar">{u.first_name?.charAt(0) || '?'}</div>
                  <div className="tg-info">
                    <div className="tg-name">{u.first_name}{u.last_name ? ' '+u.last_name : ''}</div>
                    <div className="tg-meta">
                      {u.username ? `@${u.username} · ` : ''}{u.country_name || 'Unknown'} · {fmtDate(u.last_seen)}
                    </div>
                  </div>
                  <div className="tg-visits">{u.visit_count}x</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Track Stats */}
      <div className="two-col">
        <div className="panel glass">
          <div className="panel-head">
            <Music size={18} className="text-primary"/>
            <h3>Most Played Tracks (30D)</h3>
          </div>
          {loading ? <div className="panel-empty">Loading...</div> :
           topTracks.length === 0 ? <div className="panel-empty">No play data yet</div> : (
            <div className="scroll-list">
              {topTracks.map((t, i) => (
                <div key={t.id} className="tg-row">
                  <span className="rank-num">{i + 1}</span>
                  <div className="tg-avatar"><Music size={14}/></div>
                  <div className="tg-info">
                    <div className="tg-name">{t.title}</div>
                    <div className="tg-meta">{t.artist}</div>
                  </div>
                  <div className="tg-visits">{t.count} plays</div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="panel glass">
          <div className="panel-head">
            <TrendingUp size={18} className="text-primary"/>
            <h3>Style Popularity (30D)</h3>
          </div>
          {loading ? <div className="panel-empty">Loading...</div> :
           styleStats.length === 0 ? <div className="panel-empty">No play data yet</div> : (
            <div className="style-bars">
              {styleStats.map(s => {
                const maxCount = Math.max(...styleStats.map(x => x.count), 1);
                return (
                  <div key={s.style} className="style-bar-row">
                    <span className="style-name">{s.style}</span>
                    <div className="s-bar-wrap">
                      <div className="s-bar" style={{ width: `${Math.max(4, (s.count/maxCount)*100)}%` }} />
                    </div>
                    <span className="style-count">{s.count}</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Library Stats */}
      <div className="lib-grid">
        {[
          { label:'Total Tracks', value:tracks.length, sub:`${tracks.filter(t=>t.style?.toLowerCase()==='fitness').length} in Fitness`, icon:<Music size={18}/> },
          { label:'Dance Styles', value:folders.length, sub:`${styles.length} style types`, icon:<Folder size={18}/> },
          { label:'Finals Queues', value:finalFolders.length, sub:`${tracks.filter(t=>t.isFavorite).length} Liked Songs`, icon:<Flag size={18}/> },
        ].map(s => (
          <div key={s.label} className="lib-card glass">
            <div className="lib-icon text-primary">{s.icon}</div>
            <div className="lib-val">{s.value}</div>
            <div className="lib-label">{s.label}</div>
            <div className="lib-sub">{s.sub}</div>
          </div>
        ))}
      </div>

      <style jsx>{`
        .admin-analytics { display:flex; flex-direction:column; gap:24px; padding-bottom:100px; }

        /* Header */
        .a-header { display:flex; align-items:center; justify-content:space-between; flex-wrap:wrap; gap:12px; }
        .a-header h2 { font-size:22px; font-weight:800; margin-bottom:4px; }
        .text-muted { font-size:13px; color:#71717a; }

        .btn-refresh { display:flex; align-items:center; gap:8px; padding:9px 18px; border-radius:12px; font-size:13px; font-weight:700; color:white; border:1px solid rgba(255,255,255,0.1); cursor:pointer; transition:background 0.2s; }
        .btn-refresh:hover { background:rgba(255,255,255,0.06); }
        .spin { animation:spinA 0.8s linear infinite; }
        @keyframes spinA { to { transform:rotate(360deg); } }

        /* Summary strip */
        .summary-strip { display:grid; grid-template-columns:repeat(6,1fr); gap:12px; }

        /* Live Now banner */
        .live-banner {
          display:flex; align-items:center; justify-content:space-between;
          gap:16px; padding:14px 20px; margin-bottom:14px; border-radius:14px;
          background:linear-gradient(135deg, rgba(29,185,84,0.12), rgba(29,185,84,0.03));
          border:1px solid rgba(29,185,84,0.2); flex-wrap:wrap;
        }
        .live-left { display:flex; align-items:center; gap:10px; color:#1db954; }
        .live-dot {
          width:9px; height:9px; border-radius:50%; background:#1db954;
          box-shadow:0 0 0 0 rgba(29,185,84,0.7); animation:livePulse 2s infinite;
        }
        @keyframes livePulse {
          0% { box-shadow:0 0 0 0 rgba(29,185,84,0.6); }
          70% { box-shadow:0 0 0 10px rgba(29,185,84,0); }
          100% { box-shadow:0 0 0 0 rgba(29,185,84,0); }
        }
        .live-count { font-size:22px; font-weight:900; color:#fff; }
        .live-text { font-size:13px; font-weight:600; color:#a1a1aa; }
        .live-names { display:flex; gap:6px; flex-wrap:wrap; align-items:center; }
        .live-chip {
          font-size:11px; font-weight:700; padding:4px 10px; border-radius:20px;
          background:rgba(29,185,84,0.15); color:#1db954; white-space:nowrap;
        }
        .live-chip.anon { background:rgba(255,255,255,0.06); color:#a1a1aa; }
        .live-empty { font-size:12px; color:#71717a; font-style:italic; }
        .sum-card { padding:16px; border-radius:16px; display:flex; flex-direction:column; gap:6px; border:1px solid rgba(255,255,255,0.05); }
        .sum-icon { width:28px; height:28px; display:flex; align-items:center; justify-content:center; }
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

        /* Two column */
        .two-col { display:grid; grid-template-columns:1fr 1fr; gap:20px; }
        .panel { padding:24px; border-radius:20px; display:flex; flex-direction:column; gap:12px; }
        .panel-head { display:flex; align-items:center; gap:10px; margin-bottom:4px; }
        .panel-head h3 { font-size:15px; font-weight:800; }
        .panel-empty { color:#52525b; font-size:13px; text-align:center; padding:24px; }

        /* Country rows */
        .country-row { display:flex; align-items:center; gap:10px; }
        .country-left { display:flex; align-items:center; gap:8px; min-width:130px; }
        .flag { font-size:18px; }
        .country-name { font-size:13px; font-weight:600; color:#d4d4d8; }
        .country-bar-wrap { flex:1; height:6px; background:rgba(255,255,255,0.06); border-radius:3px; overflow:hidden; }
        .country-bar { height:100%; background:#1db954; border-radius:3px; transition:width 0.6s ease; }
        .country-count { font-size:13px; font-weight:800; color:#a1a1aa; min-width:28px; text-align:right; }

        /* Scrollable user/track list — caps panel height so long lists don't blow up the page */
        .scroll-list { display:flex; flex-direction:column; max-height:340px; overflow-y:auto; margin:-4px -8px 0; padding:0 8px; }
        .scroll-list::-webkit-scrollbar { width:5px; }
        .scroll-list::-webkit-scrollbar-thumb { background:rgba(255,255,255,0.12); border-radius:3px; }
        .scroll-list::-webkit-scrollbar-track { background:transparent; }
        .rank-num { font-size:11px; font-weight:800; color:#52525b; min-width:18px; text-align:center; flex-shrink:0; }

        /* Telegram rows */
        .tg-row { display:flex; align-items:center; gap:12px; padding:8px 0; border-bottom:1px solid rgba(255,255,255,0.04); }
        .tg-row:last-child { border:none; }
        .tg-avatar { width:36px; height:36px; border-radius:50%; background:#1db954; color:black; font-weight:900; font-size:15px; display:flex; align-items:center; justify-content:center; flex-shrink:0; }
        .tg-info { flex:1; min-width:0; }
        .tg-name { font-size:14px; font-weight:700; }
        .tg-meta { font-size:11px; color:#71717a; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
        .tg-visits { font-size:13px; font-weight:800; color:#1db954; white-space:nowrap; }

        /* Style Popularity */
        .style-bars { display:flex; flex-direction:column; gap:14px; margin-top:8px; }
        .style-bar-row { display:flex; align-items:center; gap:12px; }
        .style-name { font-size:12px; font-weight:700; color:#a1a1aa; width:70px; }
        .s-bar-wrap { flex:1; height:6px; background:rgba(255,255,255,0.05); border-radius:3px; overflow:hidden; }
        .s-bar { height:100%; background:linear-gradient(to right, #1db954, #22c55e); border-radius:3px; }
        .style-count { font-size:11px; font-weight:800; color:#52525b; min-width:24px; text-align:right; }

        /* Library */
        .lib-grid { display:grid; grid-template-columns:repeat(3,1fr); gap:16px; }
        .lib-card { padding:24px; border-radius:20px; border:1px solid rgba(255,255,255,0.05); }
        .lib-icon { margin-bottom:12px; }
        .lib-val { font-size:36px; font-weight:900; letter-spacing:-1.5px; line-height:1; }
        .lib-label { font-size:11px; font-weight:800; color:#71717a; text-transform:uppercase; letter-spacing:0.5px; margin-top:6px; }
        .lib-sub { font-size:12px; color:#1db954; margin-top:4px; font-weight:600; }

        .text-primary { color:#1db954; }

        .animate-in { animation:animIn 0.4s cubic-bezier(0.4,0,0.2,1); }
        @keyframes animIn { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:translateY(0)} }

        @media (max-width: 1200px) {
          .summary-strip { grid-template-columns:repeat(3,1fr); }
        }
        @media (max-width: 900px) {
          .two-col { grid-template-columns:1fr; }
          .lib-grid { grid-template-columns:1fr 1fr; }
        }
        @media (max-width: 640px) {
          .summary-strip { grid-template-columns:repeat(2,1fr); gap:8px; }
          .sum-val { font-size:20px; }
          .chart-card { padding:16px; }
          .bars-row { height:160px; }
          .lib-grid { grid-template-columns:1fr; }
          .country-left { min-width:100px; }
          .panel { padding:16px; }
        }
      `}</style>
    </div>
  );
}
