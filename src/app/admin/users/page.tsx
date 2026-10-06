"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { Users, Globe, Clock, TrendingUp, RefreshCw, Calendar, MessageCircle } from 'lucide-react';
import { supabase } from '@/utils/supabase';
import { adminDb } from '@/lib/admin-db';

interface TelegramUser {
  telegram_id: number;
  first_name: string;
  last_name?: string;
  username?: string;
  photo_url?: string;
  country_code?: string;
  country_name?: string;
  first_seen: string;
  last_seen: string;
  visit_count: number;
}

interface WebVisitor {
  id: string;
  ip: string;
  country_code: string;
  country_name: string;
  visit_count: number;
  total_duration: number;
  first_seen: string;
  last_seen: string;
}

interface CountryStat { country_name: string; country_code: string; count: number; }

const FLAG: Record<string, string> = {
  GE:'🇬🇪', US:'🇺🇸', DE:'🇩🇪', RU:'🇷🇺', UA:'🇺🇦', TR:'🇹🇷', GB:'🇬🇧',
  FR:'🇫🇷', IT:'🇮🇹', PL:'🇵🇱', AZ:'🇦🇿', AM:'🇦🇲', NL:'🇳🇱', ES:'🇪🇸',
  CA:'🇨🇦', AU:'🇦🇺', JP:'🇯🇵', KR:'🇰🇷', BR:'🇧🇷', BY:'🇧🇾',
};

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

function fmtDate(d: string) {
  return new Date(d).toLocaleDateString('en', { month: 'short', day: 'numeric', year: 'numeric' });
}

export default function AdminUsersPage() {
  const [activeTab, setActiveTab] = useState<'telegram' | 'web'>('telegram');
  const [users, setUsers] = useState<TelegramUser[]>([]);
  const [webVisitors, setWebVisitors] = useState<WebVisitor[]>([]);
  const [countries, setCountries] = useState<CountryStat[]>([]);
  const [totalVisits, setTotalVisits] = useState(0);
  const [avgSession, setAvgSession] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [usersRes, visitsRes, durRes, recentVisitsRes] = await Promise.all([
        adminDb.from('telegram_users').select('*').order('visit_count', { ascending: false }),
        supabase.from('page_visits').select('id', { count: 'exact', head: true }),
        supabase.from('page_visits').select('duration_seconds').gt('duration_seconds', 0),
        supabase.from('page_visits').select('id, created_at, session_id, user_ref, duration_seconds, country_code, country_name').order('created_at', { ascending: false }).limit(2000),
      ]);

      const allUsers = (usersRes.data || []) as TelegramUser[];
      setUsers(allUsers);
      setTotalVisits(visitsRes.count ?? 0);

      // Aggregate Web Visitors (by IP or persistent user_ref)
      const visitorMap: Record<string, WebVisitor> = {};
      (recentVisitsRes.data || []).forEach((v: any) => {
        // Skip telegram users
        const isTgUser = allUsers.some(u => u.telegram_id.toString() === v.user_ref);
        if (isTgUser) return;

        let ip = 'Unknown IP';
        if (v.user_ref && v.user_ref.startsWith('ip:')) {
          ip = v.user_ref.replace('ip:', '');
        } else if (v.user_ref && !v.user_ref.startsWith('v_')) {
          ip = v.user_ref;
        }

        const key = ip !== 'Unknown IP' ? ip : (v.user_ref || v.session_id);
        if (!visitorMap[key]) {
          visitorMap[key] = {
            id: v.id,
            ip: ip,
            country_code: v.country_code || 'Unknown',
            country_name: v.country_name || v.country_code || 'Unknown',
            visit_count: 1,
            total_duration: v.duration_seconds || 0,
            first_seen: v.created_at,
            last_seen: v.created_at,
          };
        } else {
          visitorMap[key].visit_count += 1;
          visitorMap[key].total_duration += (v.duration_seconds || 0);
          if (new Date(v.created_at) < new Date(visitorMap[key].first_seen)) {
            visitorMap[key].first_seen = v.created_at;
          }
          if (new Date(v.created_at) > new Date(visitorMap[key].last_seen)) {
            visitorMap[key].last_seen = v.created_at;
          }
        }
      });

      const sortedWebVisitors = Object.values(visitorMap).sort((a, b) => b.visit_count - a.visit_count);
      setWebVisitors(sortedWebVisitors);

      // Country aggregation
      const cmap: Record<string, CountryStat> = {};
      const sourceList = activeTab === 'telegram' ? allUsers : sortedWebVisitors;
      sourceList.forEach((u: any) => {
        if (!u.country_code || u.country_code === 'Unknown') return;
        cmap[u.country_code] = cmap[u.country_code]
          ? { ...cmap[u.country_code], count: cmap[u.country_code].count + 1 }
          : { country_code: u.country_code, country_name: u.country_name || u.country_code, count: 1 };
      });
      setCountries(Object.values(cmap).sort((a, b) => b.count - a.count));

      const durations = (durRes.data || []).map((d: any) => d.duration_seconds).filter(Boolean);
      setAvgSession(durations.length ? Math.round(durations.reduce((a: number, b: number) => a + b, 0) / durations.length) : 0);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [activeTab]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const filteredTelegram = users.filter(u => {
    if (!search) return true;
    const q = search.toLowerCase();
    return u.first_name?.toLowerCase().includes(q)
      || u.last_name?.toLowerCase().includes(q)
      || u.username?.toLowerCase().includes(q)
      || u.country_name?.toLowerCase().includes(q);
  });

  const filteredWeb = webVisitors.filter(w => {
    if (!search) return true;
    const q = search.toLowerCase();
    return w.ip.toLowerCase().includes(q)
      || w.country_name.toLowerCase().includes(q)
      || w.country_code.toLowerCase().includes(q);
  });

  const fmtDur = (s: number) => s > 60 ? `${Math.floor(s/60)}m ${s%60}s` : `${s}s`;
  const maxCountry = Math.max(...countries.map(c => c.count), 1);

  return (
    <div className="users-page animate-in">

      {/* Header */}
      <div className="page-header">
        <div>
          <h1>Users</h1>
          <p className="text-muted">Telegram authenticated visitors and their activity.</p>
        </div>
        <button className="btn-refresh glass" onClick={fetchData}>
          <RefreshCw size={15} className={loading ? 'spin' : ''} /> Refresh
        </button>
      </div>

      {/* Summary cards */}
      <div className="summary-row">
        <div className="sum-card glass">
          <MessageCircle size={20} className="sum-icon" />
          <div className="sum-val">{loading ? '—' : users.length}</div>
          <div className="sum-label">Telegram Users</div>
        </div>
        <div className="sum-card glass">
          <TrendingUp size={20} className="sum-icon" />
          <div className="sum-val">{loading ? '—' : totalVisits.toLocaleString()}</div>
          <div className="sum-label">Total Sessions</div>
        </div>
        <div className="sum-card glass">
          <Clock size={20} className="sum-icon" />
          <div className="sum-val">{loading ? '—' : avgSession ? fmtDur(avgSession) : '—'}</div>
          <div className="sum-label">Avg Session</div>
        </div>
        <div className="sum-card glass">
          <Globe size={20} className="sum-icon" />
          <div className="sum-val">{loading ? '—' : countries.length}</div>
          <div className="sum-label">Countries</div>
        </div>
      </div>

      {/* Tabs: Telegram Users vs Web Visitors */}
      <div style={{ display: 'flex', gap: '10px', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '14px' }}>
        <button
          onClick={() => setActiveTab('telegram')}
          style={{
            padding: '9px 18px',
            borderRadius: '12px',
            fontSize: '13px',
            fontWeight: 700,
            cursor: 'pointer',
            border: activeTab === 'telegram' ? '1px solid #1db954' : '1px solid rgba(255,255,255,0.1)',
            background: activeTab === 'telegram' ? 'rgba(29, 185, 84, 0.15)' : 'rgba(255,255,255,0.03)',
            color: activeTab === 'telegram' ? '#1db954' : '#a1a1aa',
            transition: 'all 0.2s',
          }}
        >
          ✈️ Telegram Users ({users.length})
        </button>
        <button
          onClick={() => setActiveTab('web')}
          style={{
            padding: '9px 18px',
            borderRadius: '12px',
            fontSize: '13px',
            fontWeight: 700,
            cursor: 'pointer',
            border: activeTab === 'web' ? '1px solid #38bdf8' : '1px solid rgba(255,255,255,0.1)',
            background: activeTab === 'web' ? 'rgba(56, 189, 248, 0.15)' : 'rgba(255,255,255,0.03)',
            color: activeTab === 'web' ? '#38bdf8' : '#a1a1aa',
            transition: 'all 0.2s',
          }}
        >
          🌐 Web Visitors & IPs ({webVisitors.length})
        </button>
      </div>

      {/* Main content: user list + country sidebar */}
      <div className="content-grid">

        {/* Users table */}
        <div className="users-panel">
          <div className="panel-header">
            <h2>
              <Users size={18} /> 
              {activeTab === 'telegram' ? `Telegram Users (${filteredTelegram.length})` : `Web Visitors & IPs (${filteredWeb.length})`}
            </h2>
            <input
              className="search-input glass"
              placeholder={activeTab === 'telegram' ? "Search by name, @username, country..." : "Search by IP, country..."}
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>

          {loading ? (
            <div className="loading-state"><div className="spinner" /><span>Loading users...</span></div>
          ) : activeTab === 'telegram' ? (
            filteredTelegram.length === 0 ? (
              <div className="empty-state">
                <Users size={40} opacity={0.2} />
                <p>No Telegram users found.</p>
              </div>
            ) : (
              <div className="users-list">
                {filteredTelegram.map((u, i) => (
                  <div key={u.telegram_id} className="user-row glass">
                    <div className="user-rank">#{i + 1}</div>
                    <div className="user-avatar">
                      {u.photo_url
                        ? <img src={u.photo_url} alt="" />
                        : <span>{u.first_name?.charAt(0) || '?'}</span>
                      }
                    </div>
                    <div className="user-info">
                      <div className="user-name">
                        {u.first_name}{u.last_name ? ` ${u.last_name}` : ''}
                      </div>
                      <div className="user-meta">
                        {u.username && <span className="tg-handle">@{u.username}</span>}
                        {u.country_name && (
                          <span className="user-country">
                            {FLAG[u.country_code || ''] || '🌍'} {u.country_name}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="user-stats">
                      <div className="stat-pill visits">{u.visit_count}x logins</div>
                      <div className="stat-pill date">
                        <Calendar size={10} /> {fmtDate(u.first_seen)}
                      </div>
                      <div className="stat-pill lastseen">last: {timeAgo(u.last_seen)}</div>
                    </div>
                  </div>
                ))}
              </div>
            )
          ) : (
            filteredWeb.length === 0 ? (
              <div className="empty-state">
                <Globe size={40} opacity={0.2} />
                <p>No web visitors tracked yet.</p>
              </div>
            ) : (
              <div className="users-list">
                {filteredWeb.map((w, i) => (
                  <div key={w.id || w.ip} className="user-row glass">
                    <div className="user-rank">#{i + 1}</div>
                    <div className="user-avatar" style={{ background: '#0284c7', color: 'white' }}>
                      🌐
                    </div>
                    <div className="user-info">
                      <div className="user-name" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontFamily: 'monospace', fontSize: '15px' }}>{w.ip}</span>
                        {w.visit_count > 1 && (
                          <span style={{ fontSize: '11px', background: 'rgba(56, 189, 248, 0.15)', color: '#38bdf8', border: '1px solid rgba(56, 189, 248, 0.3)', padding: '2px 8px', borderRadius: '6px', fontWeight: 800 }}>
                            {w.visit_count} visits
                          </span>
                        )}
                      </div>
                      <div className="user-meta">
                        <span className="user-country">
                          {FLAG[w.country_code] || '🌍'} {w.country_name} {w.country_code !== 'Unknown' ? `(${w.country_code})` : ''}
                        </span>
                        {w.total_duration > 0 && (
                          <span style={{ fontSize: '12px', color: '#a1a1aa' }}>
                            ⏱ {fmtDur(w.total_duration)} total time
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="user-stats">
                      <div className="stat-pill visits" style={{ background: 'rgba(56, 189, 248, 0.15)', color: '#38bdf8' }}>
                        {w.visit_count}x visits
                      </div>
                      <div className="stat-pill date">
                        <Calendar size={10} /> first: {fmtDate(w.first_seen)}
                      </div>
                      <div className="stat-pill lastseen">last: {timeAgo(w.last_seen)}</div>
                    </div>
                  </div>
                ))}
              </div>
            )
          )}
        </div>

        {/* Country breakdown */}
        <div className="country-panel glass">
          <div className="panel-header-sm">
            <Globe size={16} className="text-primary" />
            <h3>By Country</h3>
          </div>
          {countries.length === 0 ? (
            <div className="empty-sm">No data yet</div>
          ) : countries.map(c => (
            <div key={c.country_code} className="country-row">
              <div className="country-flag-name">
                <span className="cflag">{FLAG[c.country_code] || '🌍'}</span>
                <span className="cname">{c.country_name}</span>
              </div>
              <div className="cbar-wrap">
                <div className="cbar" style={{ width: `${Math.round((c.count / maxCountry) * 100)}%` }} />
              </div>
              <span className="ccount">{c.count}</span>
            </div>
          ))}
        </div>
      </div>

      <style jsx>{`
        .users-page { display:flex; flex-direction:column; gap:24px; padding-bottom:80px; }

        .page-header { display:flex; align-items:center; justify-content:space-between; flex-wrap:wrap; gap:12px; }
        .page-header h1 { font-size:24px; font-weight:900; letter-spacing:-0.5px; }
        .text-muted { font-size:13px; color:#71717a; margin-top:3px; }

        .btn-refresh { display:flex; align-items:center; gap:8px; padding:9px 18px; border-radius:12px; font-size:13px; font-weight:700; color:white; border:1px solid rgba(255,255,255,0.1); cursor:pointer; transition:background 0.2s; background:transparent; }
        .btn-refresh:hover { background:rgba(255,255,255,0.06); }
        .spin { animation:sp 0.8s linear infinite; }
        @keyframes sp { to { transform:rotate(360deg); } }

        /* Summary */
        .summary-row { display:grid; grid-template-columns:repeat(4,1fr); gap:14px; }
        .sum-card { padding:20px; border-radius:18px; display:flex; flex-direction:column; gap:8px; border:1px solid rgba(255,255,255,0.05); }
        .sum-icon { color:#1db954; }
        .sum-val { font-size:28px; font-weight:900; letter-spacing:-1px; line-height:1; }
        .sum-label { font-size:10px; font-weight:800; color:#52525b; text-transform:uppercase; letter-spacing:0.5px; }

        /* Layout */
        .content-grid { display:grid; grid-template-columns:1fr 260px; gap:20px; align-items:start; }

        /* Users panel */
        .users-panel { display:flex; flex-direction:column; gap:16px; }
        .panel-header { display:flex; align-items:center; justify-content:space-between; flex-wrap:wrap; gap:12px; }
        .panel-header h2 { display:flex; align-items:center; gap:8px; font-size:16px; font-weight:800; }

        .search-input { 
          padding:9px 14px; border-radius:10px; font-size:13px; color:white;
          background:rgba(255,255,255,0.05); border:1px solid rgba(255,255,255,0.08);
          outline:none; width:240px; transition:border-color 0.2s;
        }
        .search-input:focus { border-color:#1db954; }
        .search-input::placeholder { color:#52525b; }

        .loading-state, .empty-state { 
          display:flex; flex-direction:column; align-items:center; justify-content:center;
          gap:12px; padding:60px 20px; color:#52525b; text-align:center;
          border:1px solid rgba(255,255,255,0.05); border-radius:16px;
        }
        .empty-state p { font-size:13px; max-width:280px; line-height:1.6; }
        .spinner { width:32px; height:32px; border:3px solid rgba(255,255,255,0.07); border-top-color:#1db954; border-radius:50%; animation:sp 0.8s linear infinite; }

        /* User rows */
        .users-list { display:flex; flex-direction:column; gap:8px; }
        .user-row { 
          display:flex; align-items:center; gap:12px;
          padding:14px 16px; border-radius:16px;
          border:1px solid rgba(255,255,255,0.04);
          transition:border-color 0.2s, background 0.2s;
        }
        .user-row:hover { background:rgba(255,255,255,0.03); border-color:rgba(255,255,255,0.08); }

        .user-rank { font-size:12px; font-weight:800; color:#3f3f46; min-width:24px; text-align:center; }

        .user-avatar { 
          width:44px; height:44px; border-radius:50%; overflow:hidden; flex-shrink:0;
          background:#1db954; display:flex; align-items:center; justify-content:center;
          color:black; font-weight:900; font-size:18px;
        }
        .user-avatar img { width:100%; height:100%; object-fit:cover; }

        .user-info { flex:1; min-width:0; }
        .user-name { font-size:15px; font-weight:700; margin-bottom:3px; }
        .user-meta { display:flex; align-items:center; gap:10px; flex-wrap:wrap; }
        .tg-handle { font-size:12px; color:#1db954; font-weight:600; }
        .user-country { font-size:12px; color:#71717a; }

        .user-stats { display:flex; flex-direction:column; gap:4px; align-items:flex-end; flex-shrink:0; }
        .stat-pill { 
          display:flex; align-items:center; gap:4px;
          font-size:11px; font-weight:700; padding:3px 8px;
          border-radius:6px; white-space:nowrap;
        }
        .stat-pill.visits { background:rgba(29,185,84,0.12); color:#1db954; }
        .stat-pill.date { color:#71717a; }
        .stat-pill.lastseen { color:#52525b; }

        /* Country panel */
        .country-panel { padding:20px; border-radius:20px; display:flex; flex-direction:column; gap:12px; border:1px solid rgba(255,255,255,0.05); }
        .panel-header-sm { display:flex; align-items:center; gap:8px; margin-bottom:4px; }
        .panel-header-sm h3 { font-size:14px; font-weight:800; }
        .text-primary { color:#1db954; }
        .empty-sm { font-size:12px; color:#52525b; text-align:center; padding:20px; }

        .country-row { display:flex; align-items:center; gap:8px; }
        .country-flag-name { display:flex; align-items:center; gap:6px; min-width:110px; }
        .cflag { font-size:16px; }
        .cname { font-size:12px; font-weight:600; color:#d4d4d8; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
        .cbar-wrap { flex:1; height:5px; background:rgba(255,255,255,0.06); border-radius:3px; overflow:hidden; }
        .cbar { height:100%; background:#1db954; border-radius:3px; transition:width 0.5s ease; }
        .ccount { font-size:12px; font-weight:800; color:#71717a; min-width:20px; text-align:right; }

        .animate-in { animation:aIn 0.4s cubic-bezier(0.4,0,0.2,1); }
        @keyframes aIn { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:translateY(0)} }

        @media (max-width: 900px) {
          .summary-row { grid-template-columns:repeat(2,1fr); }
          .content-grid { grid-template-columns:1fr; }
          .country-panel { order:-1; }
          .search-input { width:100%; }
        }

        @media (max-width: 640px) {
          .summary-row { grid-template-columns:repeat(2,1fr); gap:10px; }
          .sum-card { padding:14px; }
          .sum-val { font-size:22px; }
          .user-stats { display:none; }
          .panel-header { flex-direction:column; align-items:flex-start; }
          .search-input { width:100%; }
        }
      `}</style>
    </div>
  );
}
