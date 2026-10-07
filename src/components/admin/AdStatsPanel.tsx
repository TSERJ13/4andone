"use client";

import React, { useCallback, useEffect, useState } from 'react';
import { Megaphone, RefreshCw } from 'lucide-react';
import { adminDb } from '@/lib/admin-db';

type Row = {
  country: string;
  visits: number;
  listeners: number;
  requested: number;
  filled: number;
  not_filled: number;
  promo_clicks: number;
};
type Period = 'today' | '7d' | '30d';

const periodStart = (p: Period) => {
  const d = new Date();
  if (p === 'today') { d.setHours(0, 0, 0, 0); return d; }
  d.setDate(d.getDate() - (p === '7d' ? 7 : 30));
  return d;
};

const flag = (code: string) =>
  /^[A-Z]{2}$/.test(code)
    ? String.fromCodePoint(...code.split('').map((c) => 127397 + c.charCodeAt(0)))
    : '🌐';

/**
 * Admin report: page visits, people who actually played music, and our ads
 * (requested / shown by Google / not shown / Premium-card clicks), by country.
 * Data: page_visits, track_plays and ad_events via get_ad_stats().
 */
export default function AdStatsPanel() {
  const [period, setPeriod] = useState<Period>('today');
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const { data, error } = await adminDb.rpc('get_ad_stats', { start_time: periodStart(period).toISOString() });
    if (error) setError(error.message);
    setRows(((data as Row[]) || []).map((r) => ({
      country: r.country,
      visits: Number(r.visits) || 0,
      listeners: Number(r.listeners) || 0,
      requested: Number(r.requested) || 0,
      filled: Number(r.filled) || 0,
      not_filled: Number(r.not_filled) || 0,
      promo_clicks: Number(r.promo_clicks) || 0,
    })));
    setLoading(false);
  }, [period]);

  useEffect(() => { load(); }, [load]);

  const total = rows.reduce(
    (t, r) => ({
      visits: t.visits + r.visits,
      listeners: t.listeners + r.listeners,
      requested: t.requested + r.requested,
      filled: t.filled + r.filled,
      not_filled: t.not_filled + r.not_filled,
      promo_clicks: t.promo_clicks + r.promo_clicks,
    }),
    { visits: 0, listeners: 0, requested: 0, filled: 0, not_filled: 0, promo_clicks: 0 },
  );
  const fillRate = total.requested ? Math.round((total.filled / total.requested) * 100) : 0;

  const cards: { label: string; value: string | number; hint: string; color?: string }[] = [
    { label: 'Page visits', value: total.visits, hint: 'entries to the site' },
    { label: 'Listeners', value: total.listeners, hint: 'played at least 1 track', color: '#1db954' },
    { label: 'Ads requested', value: total.requested, hint: 'asked Google for an ad' },
    { label: 'Ads shown', value: total.filled, hint: `Google gave an ad · ${fillRate}%`, color: '#22c55e' },
    { label: 'Not shown', value: total.not_filled, hint: 'Google had no ad / blocked', color: '#ef4444' },
    { label: 'Premium card clicks', value: total.promo_clicks, hint: 'shown instead of an ad', color: '#facc15' },
  ];

  return (
    <section className="ad-stats glass">
      <div className="ad-stats-head">
        <div className="ad-stats-title">
          <Megaphone size={18} />
          <div>
            <h3>Ads &amp; Visitors</h3>
            <p>Visits, real listeners and our ads by country (clicks and earnings: AdSense reports)</p>
          </div>
        </div>
        <div className="ad-stats-tabs">
          {(['today', '7d', '30d'] as Period[]).map((p) => (
            <button key={p} className={period === p ? 'active' : ''} onClick={() => setPeriod(p)}>
              {p === 'today' ? 'Today' : p === '7d' ? '7 Days' : '30 Days'}
            </button>
          ))}
          <button onClick={load} aria-label="Refresh"><RefreshCw size={14} className={loading ? 'spin' : ''} /></button>
        </div>
      </div>

      {error && <div className="ad-stats-error">Could not load: {error}</div>}

      <div className="ad-stats-cards">
        {cards.map((c) => (
          <div key={c.label} className="ad-card">
            <span className="ad-card-value" style={c.color ? { color: c.color } : undefined}>{c.value}</span>
            <span className="ad-card-label">{c.label}</span>
            <span className="ad-card-hint">{c.hint}</span>
          </div>
        ))}
      </div>

      <div className="ad-table-wrap">
        <table className="ad-table">
          <thead>
            <tr>
              <th>Country</th>
              <th>Visits</th>
              <th>Listeners</th>
              <th>Ads requested</th>
              <th>Shown</th>
              <th>Not shown</th>
              <th>Premium clicks</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && !loading && (
              <tr><td colSpan={7} className="ad-empty">No data for this period yet.</td></tr>
            )}
            {rows.map((r) => (
              <tr key={r.country}>
                <td>{flag(r.country)} {r.country === 'UNKNOWN' ? 'Unknown' : r.country}</td>
                <td>{r.visits}</td>
                <td className="g">{r.listeners}</td>
                <td>{r.requested}</td>
                <td className="g">{r.filled}</td>
                <td className="r">{r.not_filled}</td>
                <td className="y">{r.promo_clicks}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <style jsx>{`
        .ad-stats { border-radius: 24px; padding: 24px; margin-bottom: 24px; }
        .ad-stats-head { display: flex; justify-content: space-between; align-items: center; gap: 16px; flex-wrap: wrap; margin-bottom: 18px; }
        .ad-stats-title { display: flex; align-items: center; gap: 12px; color: #facc15; }
        .ad-stats-title h3 { margin: 0; font-size: 18px; color: #fff; font-weight: 800; }
        .ad-stats-title p { margin: 2px 0 0; font-size: 12.5px; color: #71717a; }
        .ad-stats-tabs { display: flex; gap: 4px; background: rgba(255,255,255,0.04); padding: 4px; border-radius: 12px; }
        .ad-stats-tabs button { border: none; background: transparent; color: #a1a1aa; font-weight: 700; font-size: 13px; padding: 7px 14px; border-radius: 9px; cursor: pointer; display: inline-flex; align-items: center; }
        .ad-stats-tabs button.active { background: #1db954; color: #000; }
        .ad-stats-error { color: #ef4444; font-size: 13px; margin-bottom: 12px; }
        .ad-stats-cards { display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 12px; margin-bottom: 18px; }
        .ad-card { display: flex; flex-direction: column; gap: 2px; padding: 16px; border-radius: 16px; background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.06); }
        .ad-card-value { font-size: 26px; font-weight: 900; color: #fff; }
        .ad-card-label { font-size: 11px; font-weight: 800; letter-spacing: 1px; text-transform: uppercase; color: #a1a1aa; }
        .ad-card-hint { font-size: 11.5px; color: #71717a; }
        .ad-table-wrap { overflow-x: auto; }
        .ad-table { width: 100%; border-collapse: collapse; font-size: 13.5px; }
        .ad-table th { text-align: right; color: #71717a; font-size: 11px; text-transform: uppercase; letter-spacing: 0.8px; padding: 10px 12px; border-bottom: 1px solid rgba(255,255,255,0.08); white-space: nowrap; }
        .ad-table th:first-child, .ad-table td:first-child { text-align: left; }
        .ad-table td { text-align: right; padding: 10px 12px; border-bottom: 1px solid rgba(255,255,255,0.04); color: #e4e4e7; font-variant-numeric: tabular-nums; }
        .ad-table td.g { color: #22c55e; font-weight: 700; }
        .ad-table td.r { color: #ef4444; }
        .ad-table td.y { color: #facc15; }
        .ad-empty { text-align: center !important; color: #71717a !important; padding: 24px !important; }
        :global(.spin) { animation: adspin 1s linear infinite; }
        @keyframes adspin { to { transform: rotate(360deg); } }
      `}</style>
    </section>
  );
}
