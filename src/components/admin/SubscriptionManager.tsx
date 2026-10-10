"use client";

import React, { useState, useEffect } from 'react';
import { Crown, Sparkles, DollarSign, Users, Calendar, Check, X, ShieldAlert, Search, RefreshCw, UserCheck } from 'lucide-react';
import { supabase } from '@/utils/supabase';
import { adminDb } from '@/lib/admin-db';

interface Subscriber {
  telegram_id: number;
  first_name: string;
  last_name?: string;
  username?: string;
  photo_url?: string;
  is_premium: boolean;
  subscription_id?: string;
  premium_until?: string; // expiry date
  created_at?: string;
  last_seen?: string;
}

export default function SubscriptionManager() {
  const [subscribers, setSubscribers] = useState<Subscriber[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [actionLoading, setActionLoading] = useState<number | null>(null);

  const fetchSubscribers = async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const { data, error } = await adminDb
        .from('telegram_users')
        .select('*')
        .order('is_premium', { ascending: false });

      if (data) {
        setSubscribers(data as Subscriber[]);
      }
    } catch (err) {
      console.error('[SUB-MANAGER-FETCH-ERROR]', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSubscribers();
  }, []);

  // How long a free (admin-gifted) Premium lasts — picked per row.
  const DURATIONS: { key: string; label: string; days?: number; months?: number }[] = [
    { key: '7d', label: '7 days', days: 7 },
    { key: '1m', label: '1 month', months: 1 },
    { key: '3m', label: '3 months', months: 3 },
    { key: '6m', label: '6 months', months: 6 },
    { key: '1y', label: '1 year', months: 12 },
    { key: 'forever', label: 'Forever' },
  ];
  const [durationFor, setDurationFor] = useState<Record<number, string>>({});

  const [toast, setToast] = useState<{ ok: boolean; text: string } | null>(null);
  const showToast = (ok: boolean, text: string) => {
    setToast({ ok, text });
    setTimeout(() => setToast(null), 4000);
  };

  // Gifted with no end date = Forever (the owner's LIFETIME row too)
  const isForever = (u: Subscriber) =>
    u.is_premium && !u.premium_until && !!u.subscription_id &&
    (u.subscription_id.startsWith('MANUAL_') || u.subscription_id.startsWith('LIFETIME_'));

  const isActivePremium = (u: Subscriber) =>
    u.is_premium && (!u.premium_until || new Date(u.premium_until).getTime() > Date.now());

  type PremiumPatch = { is_premium: boolean; subscription_id: string | null; premium_until: string | null };
  const updateUser = async (user: Subscriber, patch: PremiumPatch) => {
    setActionLoading(user.telegram_id);
    try {
      const { error } = await adminDb
        .from('telegram_users')
        .update(patch)
        .eq('telegram_id', user.telegram_id);
      if (error) {
        showToast(false, `Could not save ${user.first_name}: ${error.message}`);
        return;
      }
      const who = user.first_name || `#${user.telegram_id}`;
      showToast(true, !patch.is_premium
        ? `Saved — ${who}: Premium removed`
        : patch.premium_until
          ? `Saved — ${who}: Premium until ${new Date(patch.premium_until).toLocaleDateString()}`
          : `Saved — ${who}: Premium forever`);
      setSubscribers(prev => prev.map(s => s.telegram_id === user.telegram_id
        ? { ...s, is_premium: patch.is_premium, subscription_id: patch.subscription_id ?? undefined, premium_until: patch.premium_until ?? undefined }
        : s));
    } catch (e) {
      console.error('[PREMIUM-UPDATE-ERROR]', e);
    } finally {
      setActionLoading(null);
      fetchSubscribers(true); // re-read from the database: the table shows what is really saved
    }
  };

  // What the dropdown starts on: a Forever user's current plan, otherwise 1 month
  const selectedDuration = (u: Subscriber) => durationFor[u.telegram_id] || (isForever(u) ? 'forever' : '1m');

  // Give or extend free Premium. Extending adds to the current end date
  // (not to today), so a gifted month is never lost.
  const grantPremium = (user: Subscriber) => {
    const opt = DURATIONS.find(d => d.key === selectedDuration(user)) || DURATIONS[1];
    let premiumUntil: string | null = null;
    // A Forever user switched to a fixed period: confirm (it shortens it)
    if (isForever(user) && opt.key !== 'forever') {
      const end = new Date();
      if (opt.days) end.setDate(end.getDate() + opt.days);
      if (opt.months) end.setMonth(end.getMonth() + opt.months);
      if (!confirm(`${user.first_name} has Premium forever. Change it to ${opt.label} (ends ${end.toLocaleDateString()})?`)) return;
    }
    if (opt.key !== 'forever') {
      const current = user.premium_until ? new Date(user.premium_until).getTime() : 0;
      const d = new Date(isActivePremium(user) && current > Date.now() ? current : Date.now());
      if (opt.days) d.setDate(d.getDate() + opt.days);
      if (opt.months) d.setMonth(d.getMonth() + opt.months);
      premiumUntil = d.toISOString();
    }
    const keepsPayPal = user.subscription_id?.startsWith('I-');
    return updateUser(user, {
      is_premium: true,
      // A PayPal subscriber keeps their PayPal ID (renewals keep working)
      subscription_id: keepsPayPal ? user.subscription_id! : `MANUAL_ADMIN_${Date.now()}`,
      premium_until: premiumUntil,
    });
  };

  const revokePremium = (user: Subscriber) => {
    if (user.subscription_id?.startsWith('I-') &&
        !confirm('This user pays through PayPal. Revoking here does NOT stop their PayPal payments — cancel the subscription in PayPal too. Revoke anyway?')) {
      return;
    }
    return updateUser(user, { is_premium: false, subscription_id: null, premium_until: null });
  };

  const premiumUsers = subscribers.filter(isActivePremium);
  const paidSubs = premiumUsers.filter(s => s.subscription_id?.startsWith('I-'));
  // Free Premium: admin gifts, the owner, and invite rewards (REFERRAL_)
  const manualSubs = premiumUsers.filter(s => s.subscription_id?.startsWith('MANUAL_') || s.subscription_id?.startsWith('LIFETIME_') || s.subscription_id?.startsWith('REFERRAL_'));

  const monthlyRevenue = paidSubs.length * 1.99;

  const filtered = subscribers.filter(s => {
    const q = search.toLowerCase();
    return (
      (s.first_name || '').toLowerCase().includes(q) ||
      (s.last_name || '').toLowerCase().includes(q) ||
      (s.username || '').toLowerCase().includes(q) ||
      s.telegram_id.toString().includes(q)
    );
  });

  return (
    <div className="sub-manager-card glass">
      {/* Top Header */}
      <div className="sub-top-bar">
        <div className="title-group">
          <div className="icon-badge">
            <Crown size={22} className="text-emerald" />
          </div>
          <div>
            <div className="card-heading">
              <h3>Subscriptions &amp; Premium Members</h3>
              <span className="count-pill">{premiumUsers.length} Active</span>
            </div>
            <p className="card-subtitle">Control manual access, PayPal recurring memberships &amp; monthly revenue</p>
          </div>
        </div>

        <button 
          onClick={() => fetchSubscribers()} 
          className={`refresh-btn glass ${loading ? 'spinning' : ''}`}
          title="Refresh"
        >
          <RefreshCw size={15} />
        </button>
      </div>

      {/* Stats Summary Row */}
      <div className="sub-stats-grid">
        <div className="stat-card glass">
          <div className="stat-label">
            <DollarSign size={16} className="text-emerald" />
            <span>Monthly Subscription Revenue</span>
          </div>
          <div className="stat-val">${monthlyRevenue.toFixed(2)} <span className="sub-sub">/ mo</span></div>
          <div className="stat-meta">{paidSubs.length} paying subscribers ($1.99/mo)</div>
        </div>

        <div className="stat-card glass">
          <div className="stat-label">
            <Crown size={16} className="text-emerald" />
            <span>Total Premium Users</span>
          </div>
          <div className="stat-val">{premiumUsers.length}</div>
          <div className="stat-meta">{paidSubs.length} PayPal • {manualSubs.length} Comped / Admin</div>
        </div>

        <div className="stat-card glass">
          <div className="stat-label">
            <Users size={16} className="text-muted" />
            <span>Total Registered Users</span>
          </div>
          <div className="stat-val">{subscribers.length}</div>
          <div className="stat-meta">Syncable via Telegram</div>
        </div>
      </div>

      {/* Search and Table */}
      <div className="table-controls">
        <div className="search-wrap">
          <Search size={15} className="search-icon" />
          <input 
            type="text" 
            placeholder="Search member by name, @username, ID..." 
            value={search} 
            onChange={e => setSearch(e.target.value)}
            className="search-input"
          />
        </div>
      </div>

      <div className="sub-table-wrap">
        <table className="sub-table">
          <thead>
            <tr>
              <th>Member</th>
              <th>Status</th>
              <th>Type / Plan</th>
              <th>Valid Until</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={5} className="loading-cell">Loading subscribers...</td>
              </tr>
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={5} className="empty-cell">No users found.</td>
              </tr>
            ) : (
              filtered.map(user => {
                const isLifetime = user.subscription_id === 'LIFETIME_OWNER';
                return (
                  <tr key={user.telegram_id} className={isActivePremium(user) ? 'is-premium-row' : ''}>
                    <td>
                      <div className="user-cell">
                        {user.photo_url ? (
                          <img src={user.photo_url} alt="" className="avatar-img" />
                        ) : (
                          <div className="avatar-placeholder">{user.first_name?.charAt(0) || 'U'}</div>
                        )}
                        <div className="user-names">
                          <span className="real-name">{user.first_name} {user.last_name || ''}</span>
                          <span className="tg-handle">@{user.username || user.telegram_id}</span>
                        </div>
                      </div>
                    </td>
                    <td>
                      {isActivePremium(user) ? (
                        <span className="status-badge premium">
                          <Crown size={12} /> Active Premium
                        </span>
                      ) : user.is_premium ? (
                        <span className="status-badge free">Expired</span>
                      ) : (
                        <span className="status-badge free">Free User</span>
                      )}
                    </td>
                    <td>
                      <span className="plan-type">
                        {isLifetime ? (
                          <strong className="text-emerald">Lifetime Owner</strong>
                        ) : user.subscription_id?.startsWith('MANUAL_') ? (
                          'Admin Gifted'
                        ) : user.subscription_id?.startsWith('REFERRAL_') ? (
                          'Invite reward (1 month)'
                        ) : user.subscription_id ? (
                          'PayPal ($1.99/mo)'
                        ) : (
                          'None'
                        )}
                      </span>
                    </td>
                    <td>
                      <span className="expiry-text">
                        {isLifetime ? (
                          'Never Expires'
                        ) : user.premium_until ? (
                          new Date(user.premium_until).toLocaleDateString()
                        ) : user.is_premium && user.subscription_id?.startsWith('MANUAL_') ? (
                          <strong className="text-emerald">Forever</strong>
                        ) : user.is_premium ? (
                          'Auto-Renewing'
                        ) : (
                          '—'
                        )}
                      </span>
                    </td>
                    <td>
                      {isLifetime ? (
                        <span className="owner-tag">Owner</span>
                      ) : (
                        <div className="premium-actions">
                          <select
                            className="duration-select"
                            value={selectedDuration(user)}
                            onChange={(e) => setDurationFor(prev => ({ ...prev, [user.telegram_id]: e.target.value }))}
                            disabled={actionLoading === user.telegram_id}
                            aria-label="Premium duration"
                          >
                            {DURATIONS.map(d => <option key={d.key} value={d.key}>{d.label}</option>)}
                          </select>
                          <button
                            disabled={actionLoading === user.telegram_id || (isForever(user) && selectedDuration(user) === 'forever')}
                            onClick={() => grantPremium(user)}
                            className="toggle-sub-btn activate"
                          >
                            <Sparkles size={13} />
                            <span>
                              {!isActivePremium(user)
                                ? 'Give Premium'
                                : isForever(user)
                                  ? (selectedDuration(user) === 'forever' ? 'Forever ✓' : 'Change')
                                  : selectedDuration(user) === 'forever' ? 'Make Forever' : 'Extend'}
                            </span>
                          </button>
                          {user.is_premium && (
                            <button
                              disabled={actionLoading === user.telegram_id}
                              onClick={() => revokePremium(user)}
                              className="toggle-sub-btn deactivate"
                            >
                              <X size={13} />
                              <span>Revoke</span>
                            </button>
                          )}
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {toast && (
        <div className={`admin-toast ${toast.ok ? 'ok' : 'err'}`} role="status">
          {toast.ok ? <Check size={15} /> : <X size={15} />}
          <span>{toast.text}</span>
        </div>
      )}

      <style jsx>{`
        .sub-manager-card {
          background: rgba(18, 18, 22, 0.6);
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 20px;
          padding: 24px 28px;
          display: flex;
          flex-direction: column;
          gap: 20px;
          color: white;
          margin-top: 16px;
        }

        .sub-top-bar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          flex-wrap: wrap;
          gap: 12px;
        }

        .title-group {
          display: flex;
          align-items: center;
          gap: 14px;
        }

        .icon-badge {
          width: 44px;
          height: 44px;
          border-radius: 12px;
          background: rgba(16, 185, 129, 0.15);
          border: 1px solid rgba(16, 185, 129, 0.3);
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .card-heading {
          display: flex;
          align-items: center;
          gap: 10px;
        }
        .card-heading h3 {
          margin: 0;
          font-size: 1.25rem;
          font-weight: 800;
        }

        .count-pill {
          background: rgba(16, 185, 129, 0.15);
          border: 1px solid rgba(16, 185, 129, 0.3);
          color: #10b981;
          font-size: 0.75rem;
          font-weight: 700;
          padding: 2px 8px;
          border-radius: 12px;
        }

        .card-subtitle {
          margin: 4px 0 0;
          font-size: 0.85rem;
          color: rgba(255, 255, 255, 0.5);
        }

        .refresh-btn {
          width: 36px;
          height: 36px;
          border-radius: 10px;
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.1);
          color: #a1a1aa;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: all 0.2s;
        }
        .refresh-btn:hover {
          color: white;
          background: rgba(255, 255, 255, 0.1);
        }

        .sub-stats-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
          gap: 14px;
        }

        .stat-card {
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid rgba(255, 255, 255, 0.06);
          border-radius: 14px;
          padding: 16px;
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .stat-label {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 0.8rem;
          color: rgba(255, 255, 255, 0.6);
        }

        .stat-val {
          font-size: 1.6rem;
          font-weight: 800;
          color: white;
        }
        .sub-sub {
          font-size: 0.9rem;
          color: rgba(255, 255, 255, 0.4);
          font-weight: 500;
        }

        .stat-meta {
          font-size: 0.75rem;
          color: #10b981;
          font-weight: 600;
        }

        .table-controls {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-top: 4px;
        }

        .search-wrap {
          position: relative;
          width: 100%;
          max-width: 340px;
        }

        .search-icon {
          position: absolute;
          left: 12px;
          top: 50%;
          transform: translateY(-50%);
          color: rgba(255, 255, 255, 0.4);
        }

        .search-input {
          width: 100%;
          padding: 8px 12px 8px 36px;
          background: rgba(255, 255, 255, 0.04);
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 10px;
          color: white;
          font-size: 0.85rem;
          outline: none;
        }
        .search-input:focus {
          border-color: #10b981;
        }

        .sub-table-wrap {
          overflow-x: auto;
          border-radius: 12px;
          border: 1px solid rgba(255, 255, 255, 0.06);
        }

        .sub-table {
          width: 100%;
          border-collapse: collapse;
          text-align: left;
          font-size: 0.88rem;
        }

        .sub-table th {
          background: rgba(255, 255, 255, 0.03);
          padding: 12px 16px;
          font-size: 0.75rem;
          text-transform: uppercase;
          color: rgba(255, 255, 255, 0.5);
          letter-spacing: 0.5px;
          border-bottom: 1px solid rgba(255, 255, 255, 0.06);
        }

        .sub-table td {
          padding: 12px 16px;
          border-bottom: 1px solid rgba(255, 255, 255, 0.04);
        }

        .is-premium-row {
          background: rgba(16, 185, 129, 0.02);
        }

        .user-cell {
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .avatar-img {
          width: 32px;
          height: 32px;
          border-radius: 50%;
          object-fit: cover;
        }

        .avatar-placeholder {
          width: 32px;
          height: 32px;
          border-radius: 50%;
          background: rgba(255, 255, 255, 0.1);
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 700;
          font-size: 0.85rem;
        }

        .user-names {
          display: flex;
          flex-direction: column;
        }

        .real-name {
          font-weight: 700;
          color: white;
        }

        .tg-handle {
          font-size: 0.75rem;
          color: rgba(255, 255, 255, 0.4);
        }

        .status-badge {
          display: inline-flex;
          align-items: center;
          gap: 5px;
          padding: 3px 8px;
          border-radius: 10px;
          font-size: 0.75rem;
          font-weight: 700;
        }
        .status-badge.premium {
          background: rgba(16, 185, 129, 0.15);
          border: 1px solid rgba(16, 185, 129, 0.3);
          color: #10b981;
        }
        .status-badge.free {
          background: rgba(255, 255, 255, 0.05);
          color: rgba(255, 255, 255, 0.4);
        }

        .plan-type, .expiry-text {
          font-size: 0.82rem;
          color: rgba(255, 255, 255, 0.7);
        }

        .toggle-sub-btn {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 6px 12px;
          border-radius: 10px;
          font-size: 0.78rem;
          font-weight: 700;
          border: none;
          cursor: pointer;
          transition: all 0.15s;
        }
        .toggle-sub-btn.activate {
          background: rgba(16, 185, 129, 0.15);
          border: 1px solid rgba(16, 185, 129, 0.4);
          color: #10b981;
        }
        .toggle-sub-btn.activate:hover {
          background: #10b981;
          color: black;
        }
        .toggle-sub-btn.deactivate {
          background: rgba(239, 68, 68, 0.12);
          border: 1px solid rgba(239, 68, 68, 0.3);
          color: #f87171;
        }
        .toggle-sub-btn.deactivate:hover {
          background: #ef4444;
          color: white;
        }

        .admin-toast {
          position: fixed;
          bottom: 24px;
          left: 50%;
          transform: translateX(-50%);
          z-index: 2000;
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 10px 16px;
          border-radius: 12px;
          font-size: 0.85rem;
          font-weight: 700;
          box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5);
        }
        .admin-toast.ok {
          background: #064e3b;
          color: #a7f3d0;
          border: 1px solid rgba(16, 185, 129, 0.5);
        }
        .admin-toast.err {
          background: #450a0a;
          color: #fecaca;
          border: 1px solid rgba(239, 68, 68, 0.5);
        }
        .toggle-sub-btn:disabled {
          opacity: 0.55;
          cursor: default;
        }

        .premium-actions {
          display: flex;
          align-items: center;
          gap: 6px;
          flex-wrap: wrap;
        }
        .duration-select {
          background: rgba(255, 255, 255, 0.06);
          border: 1px solid rgba(255, 255, 255, 0.15);
          color: #fff;
          border-radius: 10px;
          padding: 6px 8px;
          font-size: 0.78rem;
          font-weight: 600;
          cursor: pointer;
        }
        .duration-select option {
          background: #18181b;
        }

        .owner-tag {
          font-size: 0.75rem;
          color: #10b981;
          font-weight: 700;
        }

        .loading-cell, .empty-cell {
          text-align: center;
          padding: 24px;
          color: rgba(255, 255, 255, 0.4);
        }
      `}</style>
    </div>
  );
}
