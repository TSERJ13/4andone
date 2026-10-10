"use client";

import React, { useEffect, useMemo, useState } from 'react';
import { Gift, RefreshCw, Search } from 'lucide-react';

interface Person { id: number; name: string; username: string | null }
interface Referral {
  id: number;
  at: string;
  inviter: Person;
  invitee: Person;
  inviterRewarded: boolean;
  inviterPremiumUntil: string | null;
  inviteePremiumUntil: string | null;
}

const fmt = (iso?: string | null) =>
  iso ? new Date(iso).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' }) : '';

const who = (p: Person) => (
  <span className="rp-person">
    <span className="rp-name">{p.name}</span>
    <span className="rp-handle">{p.username ? `@${p.username} · ` : ''}ID {p.id}</span>
  </span>
);

/** Admin → Earn: every invite — who invited whom, when, and the Premium it gave. */
export default function ReferralsPanel() {
  const [rows, setRows] = useState<Referral[] | null>(null);
  const [status, setStatus] = useState<'loading' | 'ready' | 'not_setup' | 'error'>('loading');
  const [query, setQuery] = useState('');
  const [view, setView] = useState<'all' | 'inviters'>('all');

  const load = () => {
    setStatus('loading');
    fetch('/api/admin/referrals', { cache: 'no-store', credentials: 'same-origin' })
      .then(async r => {
        const d = await r.json().catch(() => null);
        if (r.status === 503 && d?.setup === false) { setStatus('not_setup'); return; }
        if (!r.ok || !d) { setStatus('error'); return; }
        setRows(d.referrals);
        setStatus('ready');
      })
      .catch(() => setStatus('error'));
  };
  // eslint-disable-next-line react-hooks/set-state-in-effect -- initial load
  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!rows) return [];
    if (!q) return rows;
    const hit = (p: Person) => p.name.toLowerCase().includes(q) || (p.username || '').toLowerCase().includes(q) || String(p.id).includes(q);
    return rows.filter(r => hit(r.inviter) || hit(r.invitee));
  }, [rows, query]);

  const inviters = useMemo(() => {
    const m = new Map<number, { person: Person; friends: Person[]; rewardedUntil: string | null; rewarded: boolean }>();
    for (const r of filtered) {
      const e = m.get(r.inviter.id) || { person: r.inviter, friends: [], rewardedUntil: null, rewarded: false };
      e.friends.push(r.invitee);
      if (r.inviterRewarded) { e.rewarded = true; e.rewardedUntil = r.inviterPremiumUntil; }
      m.set(r.inviter.id, e);
    }
    return [...m.values()].sort((a, b) => b.friends.length - a.friends.length);
  }, [filtered]);

  const total = rows?.length ?? 0;
  const uniqueInviters = new Set(rows?.map(r => r.inviter.id)).size;
  const monthsGiven = (rows ?? []).reduce((n, r) => n + (r.inviteePremiumUntil ? 1 : 0) + (r.inviterRewarded && r.inviterPremiumUntil ? 1 : 0), 0);

  return (
    <section className="rp glass">
      <div className="rp-head">
        <div className="rp-title">
          <span className="rp-icon"><Gift size={18} /></span>
          <div>
            <h3>Invites · Earn Premium</h3>
            <p>Friend + inviter each get 1 month (inviter: first friend only). New listeners only, once per person.</p>
          </div>
        </div>
        <button type="button" className="rp-refresh" onClick={load} aria-label="Refresh"><RefreshCw size={16} /></button>
      </div>

      {status === 'not_setup' && <p className="rp-note">The invites table is not in the database yet (migrations/referrals.sql).</p>}
      {status === 'error' && <p className="rp-note">Could not load invites.</p>}
      {status === 'loading' && !rows && <p className="rp-note">Loading…</p>}

      {rows && (
        <>
          <div className="rp-stats">
            <div><strong>{total}</strong><span>friends joined</span></div>
            <div><strong>{uniqueInviters}</strong><span>inviters</span></div>
            <div><strong>{monthsGiven}</strong><span>free months given</span></div>
          </div>

          <div className="rp-tools">
            <div className="rp-search">
              <Search size={15} />
              <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search name, @username or ID" aria-label="Search invites" />
            </div>
            <div className="rp-switch" role="tablist">
              <button type="button" role="tab" aria-selected={view === 'all'} className={view === 'all' ? 'on' : ''} onClick={() => setView('all')}>All invites</button>
              <button type="button" role="tab" aria-selected={view === 'inviters'} className={view === 'inviters' ? 'on' : ''} onClick={() => setView('inviters')}>By inviter</button>
            </div>
          </div>

          {filtered.length === 0 ? (
            <p className="rp-note">{total === 0 ? 'No invites yet.' : 'Nothing matches.'}</p>
          ) : view === 'all' ? (
            <div className="rp-table-wrap">
              <table className="rp-table">
                <thead>
                  <tr><th>Date</th><th>Invited by</th><th>New listener</th><th>Friend&apos;s Premium</th><th>Inviter reward</th></tr>
                </thead>
                <tbody>
                  {filtered.map(r => (
                    <tr key={r.id}>
                      <td className="rp-date">{fmt(r.at)}</td>
                      <td>{who(r.inviter)}</td>
                      <td>{who(r.invitee)}</td>
                      <td>{r.inviteePremiumUntil ? `until ${fmt(r.inviteePremiumUntil)}` : <span className="rp-dim">already Premium</span>}</td>
                      <td>{r.inviterRewarded ? (r.inviterPremiumUntil ? `until ${fmt(r.inviterPremiumUntil)}` : <span className="rp-dim">already Premium</span>) : <span className="rp-dim">— (got it earlier)</span>}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <ul className="rp-inviters">
              {inviters.map(e => (
                <li key={e.person.id}>
                  <div className="rp-inviter-row">
                    {who(e.person)}
                    <span className="rp-badge">{e.friends.length} {e.friends.length === 1 ? 'friend' : 'friends'}</span>
                    <span className="rp-dim">{e.rewarded ? (e.rewardedUntil ? `reward until ${fmt(e.rewardedUntil)}` : 'already Premium') : ''}</span>
                  </div>
                  <div className="rp-friends">{e.friends.map(f => <span key={f.id} className="rp-chip">{f.name}{f.username ? ` @${f.username}` : ''}</span>)}</div>
                </li>
              ))}
            </ul>
          )}
        </>
      )}

      <style jsx>{`
        .rp { padding: 22px; border-radius: 18px; margin-bottom: 24px; color: #fff; }
        .rp-head { display: flex; justify-content: space-between; align-items: flex-start; gap: 12px; margin-bottom: 16px; }
        .rp-title { display: flex; gap: 12px; align-items: flex-start; }
        .rp-icon { width: 38px; height: 38px; border-radius: 12px; display: flex; align-items: center; justify-content: center; background: rgba(16,185,129,0.15); color: #34d399; flex-shrink: 0; }
        h3 { margin: 0; font-size: 17px; font-weight: 800; }
        .rp-title p { margin: 3px 0 0; color: #94a3b8; font-size: 13px; line-height: 1.45; }
        .rp-refresh { background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.1); color: #cbd5e1; border-radius: 10px; padding: 8px; cursor: pointer; }
        .rp-note { color: #94a3b8; font-size: 14px; margin: 8px 0; }
        .rp-stats { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; margin-bottom: 16px; }
        .rp-stats div { background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.08); border-radius: 12px; padding: 12px; display: flex; flex-direction: column; gap: 2px; }
        .rp-stats strong { font-size: 22px; font-weight: 800; }
        .rp-stats span { color: #94a3b8; font-size: 12px; }
        .rp-tools { display: flex; gap: 10px; flex-wrap: wrap; margin-bottom: 12px; }
        .rp-search { flex: 1; min-width: 200px; display: flex; align-items: center; gap: 8px; padding: 0 12px; height: 38px; border-radius: 10px; background: rgba(0,0,0,0.25); border: 1px solid rgba(255,255,255,0.1); color: #94a3b8; }
        .rp-search input { flex: 1; min-width: 0; background: none; border: none; outline: none; color: #fff; font-size: 14px; }
        .rp-switch { display: flex; background: rgba(0,0,0,0.25); border: 1px solid rgba(255,255,255,0.1); border-radius: 10px; padding: 3px; }
        .rp-switch button { background: none; border: none; color: #94a3b8; font-size: 13px; font-weight: 700; padding: 6px 12px; border-radius: 8px; cursor: pointer; }
        .rp-switch button.on { background: rgba(255,255,255,0.1); color: #fff; }
        .rp-table-wrap { overflow-x: auto; }
        .rp-table { width: 100%; border-collapse: collapse; font-size: 13px; }
        .rp-table th { text-align: left; color: #94a3b8; font-weight: 700; font-size: 12px; padding: 8px 10px; border-bottom: 1px solid rgba(255,255,255,0.08); white-space: nowrap; }
        .rp-table td { padding: 10px; border-bottom: 1px solid rgba(255,255,255,0.05); vertical-align: top; }
        .rp-date { white-space: nowrap; color: #cbd5e1; }
        .rp-dim { color: #64748b; }
        .rp-inviters { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 10px; }
        .rp-inviters li { padding: 12px; border-radius: 12px; background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.06); }
        .rp-inviter-row { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; font-size: 13px; }
        .rp-badge { background: rgba(16,185,129,0.15); color: #34d399; border-radius: 999px; padding: 2px 10px; font-size: 12px; font-weight: 700; }
        .rp-friends { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 8px; }
        .rp-chip { background: rgba(255,255,255,0.06); border-radius: 999px; padding: 3px 10px; font-size: 12px; color: #cbd5e1; }
        .rp :global(.rp-person) { display: flex; flex-direction: column; gap: 1px; }
        .rp :global(.rp-name) { font-weight: 700; color: #fff; }
        .rp :global(.rp-handle) { color: #64748b; font-size: 12px; }
        @media (max-width: 640px) { .rp { padding: 16px; } .rp-stats strong { font-size: 18px; } }
      `}</style>
    </section>
  );
}
