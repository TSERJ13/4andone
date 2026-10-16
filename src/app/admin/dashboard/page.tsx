"use client";

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  LayoutDashboard, Users, UserCheck, PlayCircle, Crown, Music, Plus, Upload, Send,
  Mail, AlertTriangle, ChevronRight, Clock, Disc
} from 'lucide-react';
import AdminPageHeader from '@/components/admin/AdminPageHeader';
import { useStudio } from '@/components/admin/StudioProvider';
import { adminDb } from '@/lib/admin-db';
import { useNewInquiries } from '@/hooks/useNewInquiries';

type Stats = {
  people: number; newPeople: number; returning: number;
  plays: number; playsWeek: number; playsToday: number;
  premium: number; premiumEnding: number;
};
type RecentPlay = { id: string; track_id: string | null; style: string | null; created_at: string; event_type: string | null };

const DAY = 86400000;
const timeAgo = (iso: string) => {
  const s = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return 'just now';
  if (s < 3600) return `${Math.floor(s / 60)} min ago`;
  if (s < 86400) return `${Math.floor(s / 3600)} h ago`;
  return `${Math.floor(s / 86400)} d ago`;
};
const fmt = (n: number) => n.toLocaleString();

// Counts only — never download whole tables to count them (the old page fetched every play row, capped at 1000).
const count = async (q: PromiseLike<{ count: number | null; error: unknown }>) => {
  const r = await q;
  return r.error ? 0 : r.count ?? 0;
};
const head = { count: 'exact' as const, head: true };

async function loadStats(): Promise<Stats> {
  const now = Date.now();
  const weekAgo = new Date(now - 7 * DAY).toISOString();
  const dayStart = new Date(new Date().setHours(0, 0, 0, 0)).toISOString();
  const nowIso = new Date(now).toISOString();
  const soon = new Date(now + 7 * DAY).toISOString();
  const users = () => adminDb.from('telegram_users').select('telegram_id', head);
  // A "play" is event_type 'play' or empty (older rows); contact messages and coffee clicks are not plays.
  const plays = (since?: string) => Promise.all(
    [(b: ReturnType<typeof base>) => b.eq('event_type', 'play'), (b: ReturnType<typeof base>) => b.is('event_type', null)]
      .map(f => { let b = f(base()); if (since) b = b.gte('created_at', since); return count(b); })
  ).then(([a, c]) => a + c);
  const base = () => adminDb.from('track_plays').select('id', head);

  const [people, newPeople, returning, playsAll, playsWeek, playsToday, premium, premiumEnding] = await Promise.all([
    count(users()),
    count(users().gte('first_seen', weekAgo)),
    count(users().gt('visit_count', 1)),
    plays(), plays(weekAgo), plays(dayStart),
    count(users().eq('is_premium', true)),
    count(users().eq('is_premium', true).gte('premium_until', nowIso).lte('premium_until', soon)),
  ]);
  return { people, newPeople, returning, plays: playsAll, playsWeek, playsToday, premium, premiumEnding };
}

export default function AdminOverview() {
  const { tracks, albums } = useStudio();
  const newInquiries = useNewInquiries();
  const [stats, setStats] = useState<Stats | null>(null);
  const [recent, setRecent] = useState<RecentPlay[]>([]);
  const [issues, setIssues] = useState(0);
  const [failed, setFailed] = useState(false);

  const refresh = useCallback(async () => {
    try {
      const [s, recentRes, health] = await Promise.all([
        loadStats(),
        adminDb.from('track_plays').select('id, track_id, style, created_at, event_type').order('created_at', { ascending: false }).limit(40),
        fetch('/api/admin/health', { credentials: 'same-origin', cache: 'no-store' }).then(r => (r.ok ? r.json() : null)).catch(() => null),
      ]);
      setStats(s);
      setFailed(false);
      setRecent(((recentRes.data || []) as RecentPlay[]).filter(r => !r.event_type || r.event_type === 'play').slice(0, 8));
      if (health) setIssues(health.issues ?? 0);
    } catch (e) {
      console.error('Failed to load overview', e);
      setFailed(true);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- initial load
    refresh();
    // Refresh while the page is open and visible (every minute), not every 30 s in the background
    const t = setInterval(() => { if (document.visibilityState === 'visible') refresh(); }, 60000);
    return () => clearInterval(t);
  }, [refresh]);

  const trackTitle = useMemo(() => {
    const m = new Map(tracks.map(t => [t.id, t]));
    return (id: string | null) => (id ? m.get(id) : undefined);
  }, [tracks]);

  const attention = [
    newInquiries > 0 && { href: '/admin/messages?tab=incoming', icon: <Mail size={18} />, tone: 'blue', title: `${newInquiries} new ${newInquiries === 1 ? 'inquiry' : 'inquiries'}`, text: 'Messages from the contact form are waiting.' },
    stats && stats.premiumEnding > 0 && { href: '/admin/premium', icon: <Crown size={18} />, tone: 'amber', title: `${stats.premiumEnding} Premium ending within 7 days`, text: 'Extend them or let them lapse.' },
    issues > 0 && { href: '/admin/settings', icon: <AlertTriangle size={18} />, tone: 'red', title: `${issues} setup ${issues === 1 ? 'problem' : 'problems'}`, text: 'Something the site needs is not configured.' },
  ].filter(Boolean) as { href: string; icon: React.ReactNode; tone: string; title: string; text: string }[];

  const kpis = [
    { label: 'Listeners', value: stats ? fmt(stats.people) : '—', sub: stats ? `+${fmt(stats.newPeople)} this week` : '', icon: <Users size={18} />, color: '#1db954' },
    { label: 'Returning', value: stats ? fmt(stats.returning) : '—', sub: stats && stats.people ? `${Math.round((stats.returning / stats.people) * 100)}% came back` : '', icon: <UserCheck size={18} />, color: '#3b82f6' },
    { label: 'Plays', value: stats ? fmt(stats.plays) : '—', sub: stats ? `${fmt(stats.playsToday)} today · ${fmt(stats.playsWeek)} this week` : '', icon: <PlayCircle size={18} />, color: '#f59e0b' },
    { label: 'Premium', value: stats ? fmt(stats.premium) : '—', sub: 'active members', icon: <Crown size={18} />, color: '#a855f7' },
    { label: 'Music library', value: fmt(tracks.length), sub: `${fmt(albums.length)} albums`, icon: <Music size={18} />, color: '#06b6d4' },
  ];

  return (
    <div className="ov animate-in">
      <AdminPageHeader icon={<LayoutDashboard size={22} />} title="Overview" subtitle="Your studio at a glance">
        <Link href="/admin/library?add=1" className="ap-btn primary"><Plus size={16} /> Add track</Link>
        <Link href="/admin/upload" className="ap-btn"><Upload size={16} /> Upload music</Link>
        <Link href="/admin/messages" className="ap-btn"><Send size={16} /> Telegram post</Link>
      </AdminPageHeader>

      {failed && <p className="ov-error">Could not load the numbers. <button type="button" onClick={refresh}>Try again</button></p>}

      {attention.length > 0 && (
        <section className="ov-attention" aria-label="Needs attention">
          {attention.map(a => (
            <Link key={a.href + a.title} href={a.href} className={`ov-att ${a.tone}`}>
              <span className="ov-att-icon">{a.icon}</span>
              <span className="ov-att-text"><strong>{a.title}</strong><span>{a.text}</span></span>
              <ChevronRight size={18} />
            </Link>
          ))}
        </section>
      )}

      <section className="ov-kpis" aria-label="Key numbers">
        {kpis.map(k => (
          <div key={k.label} className="ov-kpi glass">
            <span className="ov-kpi-icon" style={{ color: k.color, background: `${k.color}1f` }}>{k.icon}</span>
            <span className="ov-kpi-value">{k.value}</span>
            <span className="ov-kpi-label">{k.label}</span>
            {k.sub && <span className="ov-kpi-sub">{k.sub}</span>}
          </div>
        ))}
      </section>

      <section className="ov-card glass">
        <div className="ov-card-head">
          <h2><Clock size={16} /> Latest plays</h2>
          <Link href="/admin/analytics" className="ov-link">All statistics <ChevronRight size={14} /></Link>
        </div>
        {recent.length === 0 ? (
          <p className="ov-empty">No plays yet.</p>
        ) : (
          <ul className="ov-recent">
            {recent.map(r => {
              const t = trackTitle(r.track_id);
              return (
                <li key={r.id}>
                  <span className="ov-recent-icon"><Disc size={16} /></span>
                  <span className="ov-recent-text">
                    <strong>{t?.title || 'Unknown track'}</strong>
                    <span>{[t?.artist, r.style || t?.style].filter(Boolean).join(' · ')}</span>
                  </span>
                  <time>{timeAgo(r.created_at)}</time>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <style jsx>{`
        .ov { width: 100%; max-width: 1200px; margin: 0 auto; }
        .ov-error { margin: 0 0 16px; padding: 10px 14px; border-radius: 12px; background: rgba(239,68,68,0.12); color: #fca5a5; font-size: 14px; }
        .ov-error button { margin-left: 8px; background: none; border: none; color: #fff; text-decoration: underline; cursor: pointer; }
        .ov-attention { display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap: 12px; margin-bottom: 20px; }
        :global(.ov-att) { display: flex; align-items: center; gap: 12px; padding: 14px 16px; border-radius: 16px; text-decoration: none; color: #fff; border: 1px solid rgba(255,255,255,0.1); background: rgba(255,255,255,0.04); }
        :global(.ov-att:hover) { background: rgba(255,255,255,0.07); }
        :global(.ov-att.blue) { border-color: rgba(59,130,246,0.4); }
        :global(.ov-att.amber) { border-color: rgba(245,158,11,0.4); }
        :global(.ov-att.red) { border-color: rgba(239,68,68,0.5); }
        .ov-att-icon { width: 36px; height: 36px; border-radius: 10px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; background: rgba(255,255,255,0.08); }
        :global(.ov-att.blue) .ov-att-icon { color: #60a5fa; background: rgba(59,130,246,0.15); }
        :global(.ov-att.amber) .ov-att-icon { color: #fbbf24; background: rgba(245,158,11,0.15); }
        :global(.ov-att.red) .ov-att-icon { color: #f87171; background: rgba(239,68,68,0.15); }
        .ov-att-text { display: flex; flex-direction: column; gap: 2px; flex: 1; min-width: 0; font-size: 12.5px; color: #a1a1aa; }
        .ov-att-text strong { color: #fff; font-size: 14.5px; }
        .ov-kpis { display: grid; grid-template-columns: repeat(auto-fit, minmax(170px, 1fr)); gap: 14px; margin-bottom: 20px; }
        .ov-kpi { display: flex; flex-direction: column; gap: 2px; padding: 16px; border-radius: 18px; border: 1px solid rgba(255,255,255,0.06); }
        .ov-kpi-icon { width: 34px; height: 34px; border-radius: 10px; display: flex; align-items: center; justify-content: center; margin-bottom: 8px; }
        .ov-kpi-value { font-size: 28px; font-weight: 800; line-height: 1.1; font-variant-numeric: tabular-nums; }
        .ov-kpi-label { font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.6px; color: #a1a1aa; }
        .ov-kpi-sub { font-size: 12px; color: #71717a; margin-top: 2px; }
        .ov-card { padding: 18px; border-radius: 20px; border: 1px solid rgba(255,255,255,0.06); }
        .ov-card-head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px; }
        .ov-card-head h2 { display: flex; align-items: center; gap: 8px; margin: 0; font-size: 16px; font-weight: 800; }
        :global(.ov-link) { display: inline-flex; align-items: center; gap: 2px; font-size: 13px; color: #a1a1aa; text-decoration: none; }
        :global(.ov-link:hover) { color: #fff; }
        .ov-empty { margin: 8px 0; color: #71717a; font-size: 14px; }
        .ov-recent { list-style: none; margin: 0; padding: 0; }
        .ov-recent li { display: flex; align-items: center; gap: 12px; padding: 10px 0; border-top: 1px solid rgba(255,255,255,0.05); }
        .ov-recent li:first-child { border-top: none; }
        .ov-recent-icon { width: 32px; height: 32px; border-radius: 9px; display: flex; align-items: center; justify-content: center; background: rgba(255,255,255,0.06); color: #a1a1aa; flex-shrink: 0; }
        .ov-recent-text { display: flex; flex-direction: column; min-width: 0; flex: 1; font-size: 12.5px; color: #8b8b94; }
        .ov-recent-text strong { color: #fff; font-size: 14px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .ov-recent-text span { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .ov-recent time { font-size: 12px; color: #71717a; flex-shrink: 0; }
        @media (max-width: 640px) {
          .ov-kpis { grid-template-columns: repeat(2, 1fr); gap: 10px; }
          .ov-kpi { padding: 12px; }
          .ov-kpi-value { font-size: 22px; }
        }
      `}</style>
    </div>
  );
}
