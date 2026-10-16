"use client";

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Settings, CheckCircle2, XCircle, MinusCircle, RefreshCw, Activity, Loader2 } from 'lucide-react';
import AdminPageHeader from '@/components/admin/AdminPageHeader';

type Check = { group: string; id: string; label: string; ok: boolean; required: boolean; detail?: string; hint?: string };
type Health = { live: boolean; checks: Check[]; issues: number; warnings: number };

/**
 * What the site needs to work, and whether it has it. The first list only reads which server settings are
 * SET (values are never shown). "Run live tests" also talks to the database, Telegram and PayPal.
 */
export default function AdminSettingsPage() {
  const [health, setHealth] = useState<Health | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (live: boolean) => {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/health${live ? '?live=1' : ''}`, { credentials: 'same-origin', cache: 'no-store' });
      if (!res.ok) throw new Error(res.status === 401 ? 'Please log in again' : `Request failed (${res.status})`);
      setHealth(await res.json());
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }, []);

  // eslint-disable-next-line react-hooks/set-state-in-effect -- initial load
  useEffect(() => { load(false); }, [load]);

  const groups = useMemo(() => {
    const map = new Map<string, Check[]>();
    (health?.checks || []).forEach(c => { (map.get(c.group) || map.set(c.group, []).get(c.group)!).push(c); });
    return [...map.entries()];
  }, [health]);

  const issues = health?.issues ?? 0;
  const warnings = health?.warnings ?? 0;

  return (
    <div className="st animate-in">
      <AdminPageHeader icon={<Settings size={22} />} title="System & Settings" subtitle="Is everything the site needs set up?">
        <button type="button" className="ap-btn" onClick={() => load(false)} disabled={busy}><RefreshCw size={16} className={busy ? 'st-spin' : ''} /> Refresh</button>
        <button type="button" className="ap-btn primary" onClick={() => load(true)} disabled={busy}>
          {busy ? <Loader2 size={16} className="st-spin" /> : <Activity size={16} />} Run live tests
        </button>
      </AdminPageHeader>

      {error && <p className="st-error">{error}</p>}

      {health && (
        <div className={`st-summary ${issues > 0 ? 'bad' : warnings > 0 ? 'warn' : 'good'}`}>
          {issues > 0 ? <XCircle size={22} /> : <CheckCircle2 size={22} />}
          <div>
            <strong>{issues > 0 ? `${issues} required ${issues === 1 ? 'setting is' : 'settings are'} missing or failing` : 'Everything required is set up'}</strong>
            <span>{warnings > 0 ? `${warnings} optional ${warnings === 1 ? 'item is' : 'items are'} not set.` : 'No optional items missing.'}{!health.live && ' Press "Run live tests" to also test the connections.'}</span>
          </div>
        </div>
      )}

      {groups.map(([group, checks]) => (
        <section key={group} className="st-group glass">
          <h2>{group}</h2>
          <ul>
            {checks.map(c => (
              <li key={c.id} className={c.ok ? 'ok' : c.required ? 'bad' : 'opt'}>
                <span className="st-icon">{c.ok ? <CheckCircle2 size={18} /> : c.required ? <XCircle size={18} /> : <MinusCircle size={18} />}</span>
                <span className="st-text">
                  <strong>{c.label}</strong>
                  <span>
                    {c.detail || (c.ok ? 'Set' : c.required ? 'Missing' : 'Not set (optional)')}
                    {!c.ok && c.hint && <em> — {c.hint}</em>}
                    {c.ok && c.hint && <em> — {c.hint}</em>}
                  </span>
                </span>
                {c.required && <span className="st-tag">required</span>}
              </li>
            ))}
          </ul>
        </section>
      ))}

      <p className="st-note">
        Server settings are changed in Vercel → Project → Settings → Environment Variables, then Redeploy. Secrets are never shown here, only whether they are set.
      </p>

      <style jsx>{`
        .st { width: 100%; max-width: 900px; margin: 0 auto; }
        .st-error { margin: 0 0 14px; padding: 10px 14px; border-radius: 12px; background: rgba(239,68,68,0.12); color: #fca5a5; font-size: 14px; }
        .st-summary { display: flex; align-items: center; gap: 14px; padding: 16px 18px; border-radius: 16px; margin-bottom: 18px; border: 1px solid rgba(255,255,255,0.1); }
        .st-summary div { display: flex; flex-direction: column; gap: 2px; font-size: 13px; color: #a1a1aa; }
        .st-summary strong { color: #fff; font-size: 15.5px; }
        .st-summary.good { border-color: rgba(34,197,94,0.4); background: rgba(34,197,94,0.07); color: #4ade80; }
        .st-summary.warn { border-color: rgba(245,158,11,0.4); background: rgba(245,158,11,0.07); color: #fbbf24; }
        .st-summary.bad { border-color: rgba(239,68,68,0.5); background: rgba(239,68,68,0.08); color: #f87171; }
        .st-group { padding: 6px 18px 10px; border-radius: 18px; margin-bottom: 14px; border: 1px solid rgba(255,255,255,0.06); }
        .st-group h2 { margin: 12px 0 4px; font-size: 12px; font-weight: 800; letter-spacing: 1.2px; text-transform: uppercase; color: #71717a; }
        .st-group ul { list-style: none; margin: 0; padding: 0; }
        .st-group li { display: flex; align-items: flex-start; gap: 12px; padding: 11px 0; border-top: 1px solid rgba(255,255,255,0.05); }
        .st-group li:first-child { border-top: none; }
        .st-icon { margin-top: 1px; flex-shrink: 0; }
        li.ok .st-icon { color: #4ade80; }
        li.bad .st-icon { color: #f87171; }
        li.opt .st-icon { color: #71717a; }
        .st-text { display: flex; flex-direction: column; gap: 2px; flex: 1; min-width: 0; font-size: 13px; color: #a1a1aa; line-height: 1.45; }
        .st-text strong { color: #fff; font-size: 14.5px; }
        .st-text em { font-style: normal; color: #8b8b94; }
        li.bad .st-text span { color: #fca5a5; }
        .st-tag { font-size: 10.5px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.6px; color: #71717a; border: 1px solid rgba(255,255,255,0.12); border-radius: 999px; padding: 2px 8px; flex-shrink: 0; }
        .st-note { margin: 16px 2px 0; font-size: 12.5px; color: #71717a; line-height: 1.5; }
        :global(.st-spin) { animation: stSpin 0.9s linear infinite; }
        @keyframes stSpin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
