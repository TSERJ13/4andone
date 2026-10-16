"use client";

import AdminPageHeader from '@/components/admin/AdminPageHeader';
import { sortUsers, USER_SORT_OPTIONS, UserSortKey } from '@/utils/sortUsers';
import React, { useState, useEffect, useCallback } from 'react';
import { Users, Globe, Clock, TrendingUp, RefreshCw, MessageCircle, Search, Sparkles } from 'lucide-react';
import { adminDb as supabase } from '@/lib/admin-db';
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
  is_premium?: boolean;
  premium_until?: string | null;
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
  const [loadError, setLoadError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<'all' | 'premium' | 'free'>('all');
  const [visible, setVisible] = useState(50);
  // Invites: who invited whom (empty until the referrals table exists)
  const [invites, setInvites] = useState<{ inviter_id: number; invitee_id: number }[]>([]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [usersRes, visitsRes, durRes, recentVisitsRes] = await Promise.all([
        adminDb.from('telegram_users').select('*').order('visit_count', { ascending: false }),
        supabase.from('page_visits').select('id', { count: 'exact', head: true }),
        supabase.from('page_visits').select('duration_seconds').gt('duration_seconds', 0),
        supabase.from('page_visits').select('id, created_at, session_id, user_ref, duration_seconds, country_code, country_name').order('created_at', { ascending: false }).limit(2000),
      ]);

      if (usersRes.error) throw usersRes.error;
      setLoadError(null);
      const allUsers = (usersRes.data || []) as TelegramUser[];
      adminDb.from('referrals').select('inviter_id, invitee_id').then(r => setInvites(r.data || []));
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
      setLoadError(`Could not load users: ${(e as Error).message || 'please refresh'}`);
    } finally {
      setLoading(false);
    }
  }, [activeTab]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const [userSort, setUserSort] = useState<UserSortKey>('visits');
  const isActivePremium = (u: TelegramUser) => !!u.is_premium && (!u.premium_until || new Date(u.premium_until).getTime() > Date.now());
  const premiumTotal = users.filter(isActivePremium).length;
  const filteredTelegram = sortUsers(users.filter(u => {
    if (statusFilter === 'premium' && !isActivePremium(u)) return false;
    if (statusFilter === 'free' && isActivePremium(u)) return false;
    if (!search) return true;
    const q = search.toLowerCase();
    return u.first_name?.toLowerCase().includes(q)
      || u.last_name?.toLowerCase().includes(q)
      || u.username?.toLowerCase().includes(q)
      || u.country_name?.toLowerCase().includes(q);
  }), userSort);

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
      <AdminPageHeader icon={<Users size={22} />} title="Users" subtitle="Telegram-authenticated listeners and anonymous visitors">
        <button type="button" className="ap-btn" onClick={fetchData}>
          <RefreshCw size={15} className={loading ? 'spin' : ''} /> Refresh
        </button>
      </AdminPageHeader>

      {loadError && <div className="load-error" role="alert">{loadError}</div>}

      {/* Summary cards */}
      <div className="summary-row">
        {[
          { icon: <MessageCircle size={18} />, val: users.length, label: 'Telegram users' },
          { icon: <Sparkles size={18} />, val: premiumTotal, label: 'Premium members', accent: true },
          { icon: <TrendingUp size={18} />, val: totalVisits.toLocaleString(), label: 'Total sessions' },
          { icon: <Clock size={18} />, val: avgSession ? fmtDur(avgSession) : '—', label: 'Avg session' },
          { icon: <Globe size={18} />, val: countries.length, label: 'Countries' },
        ].map(c => (
          <div key={c.label} className={`sum-card glass ${c.accent ? 'accent' : ''}`}>
            <span className="sum-icon">{c.icon}</span>
            <div>
              <div className="sum-val">{loading ? '—' : c.val}</div>
              <div className="sum-label">{c.label}</div>
            </div>
          </div>
        ))}
      </div>

      <div className="content-grid">
        <section className="users-panel glass">
          {/* One toolbar: who, search, filter, sort */}
          <div className="toolbar">
            <div className="seg" role="tablist" aria-label="User type">
              <button type="button" role="tab" aria-selected={activeTab === 'telegram'} className={`seg-btn ${activeTab === 'telegram' ? 'on' : ''}`} onClick={() => { setActiveTab('telegram'); setVisible(50); }}>
                Telegram <b>{users.length}</b>
              </button>
              <button type="button" role="tab" aria-selected={activeTab === 'web'} className={`seg-btn ${activeTab === 'web' ? 'on web' : ''}`} onClick={() => { setActiveTab('web'); setVisible(50); }}>
                Web visitors <b>{webVisitors.length}</b>
              </button>
            </div>
            <div className="search-box">
              <Search size={15} />
              <input
                placeholder={activeTab === 'telegram' ? 'Search name, @username, country…' : 'Search IP or country…'}
                value={search}
                onChange={e => { setSearch(e.target.value); setVisible(50); }}
                aria-label="Search users"
              />
            </div>
            {activeTab === 'telegram' && (
              <>
                <div className="chips" role="tablist" aria-label="Premium filter">
                  {([['all', 'All', users.length], ['premium', 'Premium', premiumTotal], ['free', 'Free', users.length - premiumTotal]] as const).map(([k, label, n]) => (
                    <button key={k} type="button" role="tab" aria-selected={statusFilter === k} className={`chip ${statusFilter === k ? 'on' : ''}`} onClick={() => { setStatusFilter(k); setVisible(50); }}>
                      {label} <b>{n}</b>
                    </button>
                  ))}
                </div>
                <select className="sort" value={userSort} onChange={e => setUserSort(e.target.value as UserSortKey)} aria-label="Sort users">
                  {USER_SORT_OPTIONS.map(o => <option key={o.key} value={o.key}>{o.label}</option>)}
                </select>
              </>
            )}
          </div>

          {loading ? (
            <div className="state"><div className="spinner" /><span>Loading users…</span></div>
          ) : activeTab === 'telegram' ? (
            filteredTelegram.length === 0 ? (
              <div className="state"><Users size={36} opacity={0.25} /><p>No Telegram users match.</p></div>
            ) : (
              <>
                <div className="list-head tg-cols" aria-hidden="true">
                  <span>User</span><span>Country</span><span>Joined</span><span>Last active</span><span className="r">Logins</span>
                </div>
                <ul className="list">
                  {filteredTelegram.slice(0, visible).map(u => {
                    const by = invites.find(x => Number(x.invitee_id) === Number(u.telegram_id));
                    const inviter = by && users.find(x => Number(x.telegram_id) === Number(by.inviter_id));
                    const count = invites.filter(x => Number(x.inviter_id) === Number(u.telegram_id)).length;
                    const premium = isActivePremium(u);
                    return (
                      <li key={u.telegram_id} className={`row tg-cols ${premium ? 'is-premium' : ''}`}>
                        <div className="who">
                          <div className="avatar">
                            {u.photo_url ? <img src={u.photo_url} alt="" /> : <span>{(u.first_name || '?').charAt(0)}</span>}
                          </div>
                          <div className="who-text">
                            <div className="name">
                              <span className="name-text">{u.first_name}{u.last_name ? ` ${u.last_name}` : ''}</span>
                              {premium && <span className="premium-badge" title="Active Premium member">💎 Premium</span>}
                            </div>
                            <div className="sub">
                              {u.username ? <span className="handle">@{u.username}</span> : <span className="muted">no username</span>}
                              {by && (
                                <span className="invite-tag" title="Joined with an invite (1 month free Premium)">
                                  invited by {inviter ? `${inviter.first_name || ''}${inviter.username ? ` @${inviter.username}` : ''}`.trim() : by.inviter_id}
                                </span>
                              )}
                              {count > 0 && <span className="invite-tag inviter">invited {count}</span>}
                            </div>
                          </div>
                        </div>
                        <div className="cell country" data-label="Country">{u.country_name ? `${FLAG[u.country_code || ''] || '🌍'} ${u.country_name}` : <span className="muted">—</span>}</div>
                        <div className="cell" data-label="Joined">{fmtDate(u.first_seen)}</div>
                        <div className="cell" data-label="Last active">{timeAgo(u.last_seen)}</div>
                        <div className="cell r" data-label="Logins"><span className="count">{u.visit_count}×</span></div>
                      </li>
                    );
                  })}
                </ul>
                {filteredTelegram.length > visible && (
                  <button type="button" className="more" onClick={() => setVisible(v => v + 50)}>
                    Show more ({filteredTelegram.length - visible} left)
                  </button>
                )}
              </>
            )
          ) : (
            filteredWeb.length === 0 ? (
              <div className="state"><Globe size={36} opacity={0.25} /><p>No web visitors tracked yet.</p></div>
            ) : (
              <>
                <div className="list-head web-cols" aria-hidden="true">
                  <span>Visitor</span><span>Country</span><span>First seen</span><span>Last active</span><span className="r">Visits</span>
                </div>
                <ul className="list">
                  {filteredWeb.slice(0, visible).map(w => (
                    <li key={w.id || w.ip} className="row web-cols">
                      <div className="who">
                        <div className="avatar web">🌐</div>
                        <div className="who-text">
                          <div className="name"><span className="name-text mono">{w.ip}</span></div>
                          <div className="sub">{w.total_duration > 0 ? <span className="muted">⏱ {fmtDur(w.total_duration)} total</span> : <span className="muted">no time recorded</span>}</div>
                        </div>
                      </div>
                      <div className="cell country" data-label="Country">{FLAG[w.country_code] || '🌍'} {w.country_name}</div>
                      <div className="cell" data-label="First seen">{fmtDate(w.first_seen)}</div>
                      <div className="cell" data-label="Last active">{timeAgo(w.last_seen)}</div>
                      <div className="cell r" data-label="Visits"><span className="count web">{w.visit_count}×</span></div>
                    </li>
                  ))}
                </ul>
                {filteredWeb.length > visible && (
                  <button type="button" className="more" onClick={() => setVisible(v => v + 50)}>
                    Show more ({filteredWeb.length - visible} left)
                  </button>
                )}
              </>
            )
          )}
        </section>

        {/* Country breakdown */}
        <aside className="country-panel glass">
          <div className="panel-header-sm"><Globe size={16} className="text-primary" /><h3>By country</h3></div>
          {countries.length === 0 ? (
            <div className="empty-sm">No data yet</div>
          ) : countries.slice(0, 12).map(c => (
            <div key={c.country_code} className="country-row">
              <div className="country-flag-name">
                <span className="cflag">{FLAG[c.country_code] || '🌍'}</span>
                <span className="cname">{c.country_name}</span>
              </div>
              <div className="cbar-wrap"><div className="cbar" style={{ width: `${Math.round((c.count / maxCountry) * 100)}%` }} /></div>
              <span className="ccount">{c.count}</span>
            </div>
          ))}
        </aside>
      </div>

      <style jsx>{`
        .users-page { display:flex; flex-direction:column; gap:20px; padding-bottom:80px; width:100%; max-width:1400px; margin:0 auto; }
        .load-error { padding:10px 14px; border-radius:12px; background:rgba(239,68,68,0.12); color:#fca5a5; font-size:14px; }
        .spin { animation:sp 0.8s linear infinite; }
        @keyframes sp { to { transform:rotate(360deg); } }

        /* Summary */
        .summary-row { display:grid; grid-template-columns:repeat(5,1fr); gap:12px; }
        .sum-card { padding:14px 16px; border-radius:16px; display:flex; align-items:center; gap:12px; border:1px solid rgba(255,255,255,0.06); min-width:0; }
        .sum-card.accent { border-color:rgba(168,85,247,0.35); background:rgba(168,85,247,0.07); }
        .sum-icon { width:36px; height:36px; border-radius:10px; display:flex; align-items:center; justify-content:center; background:rgba(29,185,84,0.12); color:#1db954; flex-shrink:0; }
        .sum-card.accent .sum-icon { background:rgba(168,85,247,0.18); color:#c084fc; }
        .sum-val { font-size:22px; font-weight:900; letter-spacing:-0.5px; line-height:1.1; }
        .sum-label { font-size:11px; font-weight:700; color:#8b8b94; margin-top:2px; }

        .content-grid { display:grid; grid-template-columns:minmax(0,1fr) 280px; gap:20px; align-items:start; }

        /* Panel + toolbar */
        .users-panel { border-radius:20px; border:1px solid rgba(255,255,255,0.06); padding:16px; display:flex; flex-direction:column; gap:14px; min-width:0; }
        .toolbar { display:flex; align-items:center; gap:10px; flex-wrap:wrap; }
        .seg { display:flex; gap:4px; padding:4px; border-radius:12px; background:rgba(255,255,255,0.05); }
        .seg-btn { border:none; background:transparent; color:#a1a1aa; padding:8px 14px; border-radius:9px; font-size:13px; font-weight:800; cursor:pointer; white-space:nowrap; }
        .seg-btn b { margin-left:5px; font-weight:800; opacity:0.7; }
        .seg-btn.on { background:#1db954; color:#000; }
        .seg-btn.on.web { background:#38bdf8; }
        .search-box { display:flex; align-items:center; gap:8px; flex:1 1 150px; min-width:150px; padding:0 12px; height:38px; border-radius:10px; background:rgba(255,255,255,0.05); border:1px solid rgba(255,255,255,0.08); color:#71717a; }
        .search-box:focus-within { border-color:#1db954; }
        .search-box input { flex:1; min-width:0; background:transparent; border:none; outline:none; color:#fff; font-size:14px; }
        .chips { display:flex; gap:6px; }
        .chip { border:1px solid rgba(255,255,255,0.12); background:rgba(255,255,255,0.04); color:#d4d4d8; border-radius:999px; padding:7px 12px; font-size:12.5px; font-weight:700; cursor:pointer; white-space:nowrap; }
        .chip b { margin-left:4px; color:#a1a1aa; }
        .chip.on { background:rgba(29,185,84,0.16); border-color:rgba(29,185,84,0.5); color:#4ade80; }
        .chip.on b { color:#4ade80; }
        .sort { height:38px; background:rgba(255,255,255,0.05); color:#e4e4e7; border:1px solid rgba(255,255,255,0.12); border-radius:10px; padding:0 10px; font-size:13px; }

        .state { display:flex; flex-direction:column; align-items:center; justify-content:center; gap:12px; padding:48px 20px; color:#71717a; text-align:center; }
        .spinner { width:30px; height:30px; border:3px solid rgba(255,255,255,0.07); border-top-color:#1db954; border-radius:50%; animation:sp 0.8s linear infinite; }

        /* List: header + rows share the same columns */
        .tg-cols { display:grid; grid-template-columns:minmax(0,2.6fr) minmax(0,1.3fr) minmax(0,1fr) minmax(0,1fr) 72px; gap:14px; align-items:center; }
        .web-cols { display:grid; grid-template-columns:minmax(0,2.6fr) minmax(0,1.3fr) minmax(0,1fr) minmax(0,1fr) 72px; gap:14px; align-items:center; }
        .list-head { padding:0 12px 8px; font-size:11px; font-weight:800; letter-spacing:0.8px; text-transform:uppercase; color:#71717a; border-bottom:1px solid rgba(255,255,255,0.07); text-align:left; }
        .list { list-style:none; margin:0; padding:0; display:flex; flex-direction:column; }
        .row { padding:10px 12px; border-bottom:1px solid rgba(255,255,255,0.05); border-radius:12px; text-align:left; transition:background 0.15s; }
        .row:hover { background:rgba(255,255,255,0.04); }
        .row.is-premium { background:linear-gradient(90deg, rgba(168,85,247,0.08), transparent 55%); }
        .r { text-align:right; justify-self:end; }
        .who { display:flex; align-items:center; gap:12px; min-width:0; }
        .avatar { width:40px; height:40px; border-radius:50%; overflow:hidden; flex-shrink:0; background:#1db954; display:flex; align-items:center; justify-content:center; color:#000; font-weight:900; font-size:16px; }
        .avatar.web { background:#0c4a6e; color:#fff; font-size:18px; }
        .avatar img { width:100%; height:100%; object-fit:cover; }
        .who-text { min-width:0; display:flex; flex-direction:column; gap:3px; }
        .name { display:flex; align-items:center; gap:8px; flex-wrap:wrap; min-width:0; }
        .name-text { font-size:15px; font-weight:700; color:#fff; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; max-width:100%; }
        .name-text.mono { font-family:ui-monospace,monospace; font-size:14px; }
        .sub { display:flex; align-items:center; gap:8px; flex-wrap:wrap; font-size:12.5px; }
        .handle { color:#1db954; font-weight:600; }
        .muted { color:#71717a; }
        .cell { font-size:13.5px; color:#d4d4d8; min-width:0; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
        .count { display:inline-block; min-width:44px; text-align:center; font-size:12.5px; font-weight:800; padding:4px 9px; border-radius:8px; background:rgba(29,185,84,0.13); color:#4ade80; }
        .count.web { background:rgba(56,189,248,0.14); color:#38bdf8; }
        .premium-badge { font-size:10.5px; font-weight:800; padding:2px 8px; border-radius:999px; background:rgba(168,85,247,0.16); color:#c084fc; border:1px solid rgba(168,85,247,0.35); white-space:nowrap; }
        .invite-tag { font-size:11px; font-weight:700; padding:1px 8px; border-radius:999px; background:rgba(16,185,129,0.15); color:#34d399; white-space:nowrap; }
        .invite-tag.inviter { background:rgba(168,85,247,0.15); color:#c084fc; }
        .more { margin:6px auto 0; padding:10px 22px; border-radius:12px; border:1px solid rgba(255,255,255,0.12); background:rgba(255,255,255,0.04); color:#e4e4e7; font-size:13px; font-weight:800; cursor:pointer; }
        .more:hover { background:rgba(255,255,255,0.08); }

        /* Country panel */
        .country-panel { padding:18px; border-radius:20px; display:flex; flex-direction:column; gap:12px; border:1px solid rgba(255,255,255,0.06); position:sticky; top:12px; }
        .panel-header-sm { display:flex; align-items:center; gap:8px; margin-bottom:2px; }
        .panel-header-sm h3 { font-size:14px; font-weight:800; margin:0; }
        .text-primary { color:#1db954; }
        .empty-sm { font-size:12px; color:#71717a; text-align:center; padding:20px; }
        .country-row { display:flex; align-items:center; gap:8px; }
        .country-flag-name { display:flex; align-items:center; gap:6px; min-width:112px; }
        .cflag { font-size:16px; }
        .cname { font-size:12.5px; font-weight:600; color:#d4d4d8; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
        .cbar-wrap { flex:1; height:5px; background:rgba(255,255,255,0.07); border-radius:3px; overflow:hidden; }
        .cbar { height:100%; background:#1db954; border-radius:3px; }
        .ccount { font-size:12px; font-weight:800; color:#a1a1aa; min-width:20px; text-align:right; }

        .animate-in { animation:aIn 0.4s cubic-bezier(0.4,0,0.2,1); }
        @keyframes aIn { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:translateY(0)} }

        @media (max-width: 1100px) {
          .summary-row { grid-template-columns:repeat(3,1fr); }
          .content-grid { grid-template-columns:1fr; }
          .country-panel { position:static; }
        }

        /* Tablets/phones: each person becomes a card */
        @media (max-width: 760px) {
          .summary-row { grid-template-columns:repeat(2,1fr); gap:8px; }
          .sum-card { padding:12px; gap:10px; }
          .sum-icon { width:32px; height:32px; }
          .sum-val { font-size:19px; }
          .sum-card:last-child { grid-column:1 / -1; }
          .users-panel { padding:12px; border-radius:16px; }
          .seg { width:100%; }
          .seg-btn { flex:1; }
          .search-box { flex-basis:100%; }
          .sort { flex:1; }
          .chips { overflow-x:auto; scrollbar-width:none; }
          .list-head { display:none; }
          .tg-cols, .web-cols { grid-template-columns:1fr 1fr; gap:6px 12px; }
          .row { border:1px solid rgba(255,255,255,0.07); border-radius:14px; margin-bottom:8px; padding:12px; background:rgba(255,255,255,0.02); }
          .who { grid-column:1 / -1; }
          .cell { font-size:12.5px; white-space:normal; }
          .cell::before { content:attr(data-label); display:block; font-size:10px; font-weight:800; letter-spacing:0.6px; text-transform:uppercase; color:#71717a; margin-bottom:1px; }
          .cell.r { text-align:left; justify-self:start; }
          .country-panel { padding:14px; }
        }
      `}</style>
    </div>
  );
}
