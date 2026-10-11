"use client";

import React, { useEffect, useMemo, useState, useCallback } from 'react';
import { 
  Gift, RefreshCw, Search, Users, Sparkles, Calendar, 
  ExternalLink, Send, ShieldCheck, CheckCircle2, Clock, 
  AlertCircle, ChevronRight, MessageSquare, Trophy 
} from 'lucide-react';
import ConfirmModal from '@/components/admin/ConfirmModal';

interface Person { 
  id: number; 
  name: string; 
  username: string | null; 
}

interface Referral {
  id: number;
  at: string;
  inviter: Person;
  invitee: Person;
  inviterRewarded: boolean;
  inviterPremiumUntil: string | null;
  inviteePremiumUntil: string | null;
}

const fmtDate = (iso?: string | null) => {
  if (!iso) return 'None';
  return new Date(iso).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' });
};

const timeAgo = (dateStr: string): string => {
  const diff = Date.now() - new Date(dateStr).getTime();
  const m = Math.floor(diff / 60000);
  const h = Math.floor(m / 60);
  const d = Math.floor(h / 24);
  if (d > 0) return `${d}d ago`;
  if (h > 0) return `${h}h ago`;
  if (m > 0) return `${m}m ago`;
  return 'just now';
};

export default function AdminAffiliatesPage() {
  const [rows, setRows] = useState<Referral[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'rewarded' | 'unrewarded'>('all');
  const [viewMode, setViewMode] = useState<'all' | 'leaderboard'>('all');
  const [toast, setToast] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Grant Modal state
  const [grantModal, setGrantModal] = useState<{
    isOpen: boolean;
    user: Person | null;
    role: 'inviter' | 'invitee';
    loading: boolean;
  }>({
    isOpen: false,
    user: null,
    role: 'inviter',
    loading: false,
  });

  // Direct Message Modal state
  const [messageModal, setMessageModal] = useState<{
    isOpen: boolean;
    user: Person | null;
    messageText: string;
    botToken: string;
    sending: boolean;
  }>({
    isOpen: false,
    user: null,
    messageText: '',
    botToken: '',
    sending: false,
  });

  const showToast = (type: 'success' | 'error', text: string) => {
    setToast({ type, text });
    setTimeout(() => setToast(null), 4000);
  };

  const loadData = useCallback(() => {
    setLoading(true);
    fetch('/api/admin/referrals', { cache: 'no-store', credentials: 'same-origin' })
      .then(async res => {
        const d = await res.json().catch(() => null);
        if (!res.ok || !d) {
          showToast('error', d?.error || 'Failed to load referral data');
          setRows([]);
          return;
        }
        setRows(d.referrals || []);
      })
      .catch((err) => {
        showToast('error', err.message || 'Network error');
        setRows([]);
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    loadData();
    const savedToken = localStorage.getItem('4andone_admin_bot_token') || '';
    if (savedToken) {
      setMessageModal(prev => ({ ...prev, botToken: savedToken }));
    }
  }, [loadData]);

  const filteredRows = useMemo(() => {
    if (!rows) return [];
    let list = rows;

    if (statusFilter === 'rewarded') {
      list = list.filter(r => r.inviterRewarded);
    } else if (statusFilter === 'unrewarded') {
      list = list.filter(r => !r.inviterRewarded);
    }

    const q = query.trim().toLowerCase();
    if (!q) return list;

    const hit = (p: Person) => 
      p.name.toLowerCase().includes(q) || 
      (p.username || '').toLowerCase().includes(q) || 
      String(p.id).includes(q);

    return list.filter(r => hit(r.inviter) || hit(r.invitee));
  }, [rows, query, statusFilter]);

  // Leaderboard grouped by inviter
  const leaderboard = useMemo(() => {
    if (!rows) return [];
    const map = new Map<number, { person: Person; friends: Person[]; rewardedCount: number }>();
    for (const r of rows) {
      const entry = map.get(r.inviter.id) || { person: r.inviter, friends: [], rewardedCount: 0 };
      entry.friends.push(r.invitee);
      if (r.inviterRewarded) entry.rewardedCount += 1;
      map.set(r.inviter.id, entry);
    }
    return [...map.values()].sort((a, b) => b.friends.length - a.friends.length);
  }, [rows]);

  const stats = useMemo(() => {
    const totalInvites = rows?.length ?? 0;
    const uniqueInviters = new Set(rows?.map(r => r.inviter.id)).size;
    const rewardedCount = (rows ?? []).filter(r => r.inviterRewarded).length;
    const monthsGiven = (rows ?? []).reduce(
      (n, r) => n + (r.inviteePremiumUntil ? 1 : 0) + (r.inviterRewarded && r.inviterPremiumUntil ? 1 : 0), 
      0
    );
    return { totalInvites, uniqueInviters, rewardedCount, monthsGiven };
  }, [rows]);

  const handleGrantPremium = async () => {
    if (!grantModal.user) return;
    setGrantModal(prev => ({ ...prev, loading: true }));
    try {
      const res = await fetch('/api/admin/referrals/grant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ telegramId: grantModal.user.id, days: 30 }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to grant Premium');
      }
      showToast('success', `Granted 1 month of Premium to ${grantModal.user.name}!`);
      setGrantModal({ isOpen: false, user: null, role: 'inviter', loading: false });
      loadData();
    } catch (err: any) {
      showToast('error', err.message || 'Operation failed');
      setGrantModal(prev => ({ ...prev, loading: false }));
    }
  };

  const handleSendMessage = async () => {
    if (!messageModal.user || !messageModal.messageText.trim()) return;
    setMessageModal(prev => ({ ...prev, sending: true }));
    try {
      const res = await fetch('/api/admin/telegram/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          target: 'single',
          telegramId: messageModal.user.id,
          message: messageModal.messageText,
          botToken: messageModal.botToken,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success || data.sentCount === 0) {
        const errorDetail = data.errors?.[0]?.reason || data.message || data.error || 'Failed to send';
        throw new Error(errorDetail);
      }

      if (messageModal.botToken) {
        localStorage.setItem('4andone_admin_bot_token', messageModal.botToken);
      }

      showToast('success', `Message successfully sent to ${messageModal.user.name} via Telegram!`);
      setMessageModal({ isOpen: false, user: null, messageText: '', botToken: messageModal.botToken, sending: false });
    } catch (err: any) {
      showToast('error', `Failed to send: ${err.message}`);
      setMessageModal(prev => ({ ...prev, sending: false }));
    }
  };

  return (
    <div className="affiliates-page animate-in">
      {/* Header */}
      <div className="page-header">
        <div className="header-info">
          <div className="title-row">
            <div className="header-badge">
              <Gift size={24} className="gift-icon" />
            </div>
            <div>
              <h1 className="page-title">Affiliates &amp; Invites</h1>
              <p className="page-subtitle">
                Track who invited whom, inspect Premium rewards, grant free months, and directly message users.
              </p>
            </div>
          </div>
        </div>

        <div className="header-actions">
          <button 
            type="button" 
            className="btn-refresh glass" 
            onClick={loadData} 
            disabled={loading}
          >
            <RefreshCw size={16} className={loading ? 'spin' : ''} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {toast && (
        <div className={`toast-banner ${toast.type}`}>
          {toast.type === 'success' ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
          <span>{toast.text}</span>
        </div>
      )}

      {/* Metrics Row */}
      <div className="metrics-grid">
        <div className="metric-card glass">
          <div className="metric-header">
            <Users size={18} className="text-emerald" />
            <span>Total Friends Invited</span>
          </div>
          <div className="metric-value">{stats.totalInvites}</div>
          <div className="metric-sub">Joined via referral link</div>
        </div>

        <div className="metric-card glass">
          <div className="metric-header">
            <Gift size={18} className="text-primary" />
            <span>Unique Inviters</span>
          </div>
          <div className="metric-value">{stats.uniqueInviters}</div>
          <div className="metric-sub">Active affiliates sharing links</div>
        </div>

        <div className="metric-card glass">
          <div className="metric-header">
            <Sparkles size={18} className="text-amber" />
            <span>Rewarded Inviters</span>
          </div>
          <div className="metric-value">{stats.rewardedCount}</div>
          <div className="metric-sub">Received free 1 month reward</div>
        </div>

        <div className="metric-card glass">
          <div className="metric-header">
            <ShieldCheck size={18} className="text-purple" />
            <span>Free Months Given</span>
          </div>
          <div className="metric-value">{stats.monthsGiven}</div>
          <div className="metric-sub">Total 30-day Premium gifts awarded</div>
        </div>
      </div>

      {/* Controls Bar */}
      <div className="controls-bar glass">
        <div className="search-wrap">
          <Search size={16} className="search-icon" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search inviter, invited friend, @username, or Telegram ID..."
            className="search-input"
          />
          {query && (
            <button className="clear-btn" onClick={() => setQuery('')}>✕</button>
          )}
        </div>

        <div className="filters-row">
          <div className="view-toggle">
            <button 
              type="button"
              className={`toggle-btn ${viewMode === 'all' ? 'active' : ''}`}
              onClick={() => setViewMode('all')}
            >
              <Users size={14} />
              <span>All Invites ({rows?.length ?? 0})</span>
            </button>
            <button 
              type="button"
              className={`toggle-btn ${viewMode === 'leaderboard' ? 'active' : ''}`}
              onClick={() => setViewMode('leaderboard')}
            >
              <Trophy size={14} />
              <span>Top Inviters ({leaderboard.length})</span>
            </button>
          </div>

          {viewMode === 'all' && (
            <div className="status-filters">
              <button 
                type="button"
                className={`filter-chip ${statusFilter === 'all' ? 'active' : ''}`}
                onClick={() => setStatusFilter('all')}
              >
                All
              </button>
              <button 
                type="button"
                className={`filter-chip ${statusFilter === 'rewarded' ? 'active' : ''}`}
                onClick={() => setStatusFilter('rewarded')}
              >
                ✓ Rewarded
              </button>
              <button 
                type="button"
                className={`filter-chip ${statusFilter === 'unrewarded' ? 'active' : ''}`}
                onClick={() => setStatusFilter('unrewarded')}
              >
                ⏳ Not Rewarded
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Main Table Content */}
      <div className="table-container glass">
        {loading && !rows ? (
          <div className="empty-state">
            <RefreshCw size={28} className="spin text-secondary" />
            <p>Loading referral connections...</p>
          </div>
        ) : viewMode === 'all' ? (
          filteredRows.length === 0 ? (
            <div className="empty-state">
              <Gift size={36} opacity={0.3} />
              <p>No referrals found matching your query.</p>
            </div>
          ) : (
            <div className="table-scroll">
              <table className="affiliates-table">
                <thead>
                  <tr>
                    <th>Inviter (ვინ მოიწვია)</th>
                    <th>Invited Friend (მოწვეული)</th>
                    <th>Date &amp; Time</th>
                    <th>Inviter Reward</th>
                    <th>Friend Reward</th>
                    <th className="text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRows.map((ref) => {
                    return (
                      <tr key={ref.id} className="affiliate-row">
                        {/* Inviter */}
                        <td>
                          <div className="user-cell">
                            <div className="user-avatar inviter-avatar">
                              {ref.inviter.name.charAt(0) || 'U'}
                            </div>
                            <div className="user-details">
                              <span className="user-name">{ref.inviter.name}</span>
                              <div className="user-links">
                                {ref.inviter.username ? (
                                  <a 
                                    href={`https://t.me/${ref.inviter.username}`} 
                                    target="_blank" 
                                    rel="noreferrer"
                                    className="tg-link"
                                  >
                                    @{ref.inviter.username} <ExternalLink size={11} />
                                  </a>
                                ) : (
                                  <span className="tg-id">ID: {ref.inviter.id}</span>
                                )}
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* Invitee */}
                        <td>
                          <div className="user-cell">
                            <div className="user-avatar friend-avatar">
                              {ref.invitee.name.charAt(0) || 'F'}
                            </div>
                            <div className="user-details">
                              <span className="user-name">{ref.invitee.name}</span>
                              <div className="user-links">
                                {ref.invitee.username ? (
                                  <a 
                                    href={`https://t.me/${ref.invitee.username}`} 
                                    target="_blank" 
                                    rel="noreferrer"
                                    className="tg-link"
                                  >
                                    @{ref.invitee.username} <ExternalLink size={11} />
                                  </a>
                                ) : (
                                  <span className="tg-id">ID: {ref.invitee.id}</span>
                                )}
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* Date */}
                        <td>
                          <div className="date-cell">
                            <span className="date-primary">{fmtDate(ref.at)}</span>
                            <span className="date-sub">{timeAgo(ref.at)}</span>
                          </div>
                        </td>

                        {/* Inviter Reward */}
                        <td>
                          <div className="reward-cell">
                            {ref.inviterRewarded ? (
                              <span className="badge badge-success">
                                <CheckCircle2 size={12} /> Rewarded
                              </span>
                            ) : (
                              <span className="badge badge-amber">
                                <Clock size={12} /> 1st Friend Only
                              </span>
                            )}
                            {ref.inviterPremiumUntil && (
                              <span className="reward-date">
                                Until: {fmtDate(ref.inviterPremiumUntil)}
                              </span>
                            )}
                            <button
                              type="button"
                              className="btn-grant-xs"
                              title="Grant +1 month Premium to inviter"
                              onClick={() => setGrantModal({
                                isOpen: true,
                                user: ref.inviter,
                                role: 'inviter',
                                loading: false,
                              })}
                            >
                              +1 Mo
                            </button>
                          </div>
                        </td>

                        {/* Friend Reward */}
                        <td>
                          <div className="reward-cell">
                            {ref.inviteePremiumUntil ? (
                              <span className="badge badge-success">
                                <CheckCircle2 size={12} /> 1 Mo Premium
                              </span>
                            ) : (
                              <span className="badge badge-zinc">
                                Standard
                              </span>
                            )}
                            {ref.inviteePremiumUntil && (
                              <span className="reward-date">
                                Until: {fmtDate(ref.inviteePremiumUntil)}
                              </span>
                            )}
                            <button
                              type="button"
                              className="btn-grant-xs"
                              title="Grant +1 month Premium to friend"
                              onClick={() => setGrantModal({
                                isOpen: true,
                                user: ref.invitee,
                                role: 'invitee',
                                loading: false,
                              })}
                            >
                              +1 Mo
                            </button>
                          </div>
                        </td>

                        {/* Actions */}
                        <td className="text-right">
                          <div className="actions-cell">
                            <button
                              type="button"
                              className="btn-action-icon"
                              title="Send Telegram Bot message to inviter"
                              onClick={() => setMessageModal({
                                isOpen: true,
                                user: ref.inviter,
                                messageText: `Hello ${ref.inviter.name}! Thank you for inviting dancers to 4and.one. 🎵`,
                                botToken: messageModal.botToken,
                                sending: false,
                              })}
                            >
                              <Send size={14} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )
        ) : (
          /* Leaderboard View */
          leaderboard.length === 0 ? (
            <div className="empty-state">
              <Users size={36} opacity={0.3} />
              <p>No affiliates found.</p>
            </div>
          ) : (
            <div className="leaderboard-grid">
              {leaderboard.map((item, idx) => (
                <div key={item.person.id} className="leaderboard-card glass">
                  <div className="card-rank">#{idx + 1}</div>
                  <div className="card-user">
                    <div className="user-avatar inviter-avatar">
                      {item.person.name.charAt(0) || 'U'}
                    </div>
                    <div>
                      <h4 className="user-name">{item.person.name}</h4>
                      <p className="user-handle">
                        {item.person.username ? `@${item.person.username}` : `ID: ${item.person.id}`}
                      </p>
                    </div>
                  </div>

                  <div className="card-stats">
                    <div className="card-stat">
                      <span className="stat-num">{item.friends.length}</span>
                      <span className="stat-label">Friends Invited</span>
                    </div>
                    <div className="card-stat">
                      <span className="stat-num text-emerald">{item.rewardedCount}</span>
                      <span className="stat-label">Rewards Earned</span>
                    </div>
                  </div>

                  <div className="card-footer-actions">
                    <button
                      type="button"
                      className="btn-secondary-sm"
                      onClick={() => setGrantModal({
                        isOpen: true,
                        user: item.person,
                        role: 'inviter',
                        loading: false,
                      })}
                    >
                      +1 Mo Premium
                    </button>
                    <button
                      type="button"
                      className="btn-primary-sm"
                      onClick={() => setMessageModal({
                        isOpen: true,
                        user: item.person,
                        messageText: `Hello ${item.person.name}! You are one of our top ambassadors on 4and.one! 🏆`,
                        botToken: messageModal.botToken,
                        sending: false,
                      })}
                    >
                      <Send size={13} /> Message
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )
        )}
      </div>

      {/* Grant Modal */}
      <ConfirmModal
        isOpen={grantModal.isOpen}
        title="Grant 1 Month Premium"
        message={`Do you want to grant 30 days of free Premium to ${grantModal.user?.name} (ID: ${grantModal.user?.id})? This will immediately extend their Premium access.`}
        confirmText={grantModal.loading ? "Granting..." : "Grant 1 Month"}
        variant="primary"
        showCancel={true}
        onClose={() => setGrantModal({ isOpen: false, user: null, role: 'inviter', loading: false })}
        onConfirm={handleGrantPremium}
      />

      {/* Direct Telegram Message Modal */}
      {messageModal.isOpen && (
        <div className="modal-overlay" onClick={() => setMessageModal(prev => ({ ...prev, isOpen: false }))}>
          <div className="modal-card glass animate-in" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title-row">
                <Send size={20} className="text-primary" />
                <h3>Send Telegram Message to {messageModal.user?.name}</h3>
              </div>
              <button 
                type="button" 
                className="close-btn" 
                onClick={() => setMessageModal(prev => ({ ...prev, isOpen: false }))}
              >
                ✕
              </button>
            </div>

            <div className="modal-body">
              <p className="modal-desc">
                This message will be delivered directly to the user via your Telegram Bot.
              </p>

              <div className="form-group">
                <label>Telegram Bot Token (from @BotFather)</label>
                <input
                  type="password"
                  value={messageModal.botToken}
                  onChange={(e) => {
                    const val = e.target.value;
                    setMessageModal(prev => ({ ...prev, botToken: val }));
                    if (typeof window !== 'undefined') {
                      if (val.trim()) {
                        localStorage.setItem('4andone_admin_bot_token', val.trim());
                      } else {
                        localStorage.removeItem('4andone_admin_bot_token');
                      }
                    }
                  }}
                  placeholder="Paste your 123456789:ABCdefGhI... bot token"
                  className="input-field"
                />
                <span className="field-hint" style={{ color: messageModal.botToken ? '#34d399' : '#a1a1aa' }}>
                  {messageModal.botToken 
                    ? '✓ შენახულია ბრაუზერში (LocalStorage) მომავალი შეტყობინებებისთვის.'
                    : 'Saved automatically in your browser for future messages.'}
                </span>
              </div>

              <div className="form-group">
                <label>Message Content (supports HTML: &lt;b&gt;, &lt;i&gt;, &lt;a&gt;)</label>
                <textarea
                  value={messageModal.messageText}
                  onChange={(e) => setMessageModal(prev => ({ ...prev, messageText: e.target.value }))}
                  rows={5}
                  placeholder="Type your message here..."
                  className="textarea-field"
                />
              </div>

              {messageModal.user?.username && (
                <div className="alt-option">
                  <span>Or open direct chat in Telegram: </span>
                  <a 
                    href={`https://t.me/${messageModal.user.username}`} 
                    target="_blank" 
                    rel="noreferrer"
                    className="direct-tg-btn"
                  >
                    Open @{messageModal.user.username} <ExternalLink size={12} />
                  </a>
                </div>
              )}
            </div>

            <div className="modal-footer">
              <button
                type="button"
                className="btn-secondary"
                onClick={() => setMessageModal(prev => ({ ...prev, isOpen: false }))}
                disabled={messageModal.sending}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn-primary"
                onClick={handleSendMessage}
                disabled={messageModal.sending || !messageModal.messageText.trim()}
              >
                {messageModal.sending ? "Sending..." : "Send via Telegram Bot"}
              </button>
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        .affiliates-page {
          padding: 32px 40px;
          max-width: 1400px;
          margin: 0 auto;
          width: 100%;
          display: flex;
          flex-direction: column;
          gap: 24px;
        }

        .page-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          flex-wrap: wrap;
          gap: 16px;
        }

        .title-row {
          display: flex;
          align-items: center;
          gap: 16px;
        }

        .header-badge {
          width: 48px;
          height: 48px;
          border-radius: 14px;
          background: rgba(16, 185, 129, 0.15);
          border: 1px solid rgba(16, 185, 129, 0.3);
          display: flex;
          align-items: center;
          justify-content: center;
          color: #10b981;
        }

        .page-title {
          font-size: 26px;
          font-weight: 900;
          letter-spacing: -0.5px;
          color: #ffffff;
          margin: 0;
        }

        .page-subtitle {
          font-size: 13px;
          color: #a1a1aa;
          margin-top: 4px;
        }

        .btn-refresh {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 10px 18px;
          border-radius: 12px;
          font-size: 13px;
          font-weight: 700;
          color: #ffffff;
          border: 1px solid rgba(255, 255, 255, 0.1);
          background: rgba(255, 255, 255, 0.05);
          cursor: pointer;
          transition: all 0.2s;
        }
        .btn-refresh:hover {
          background: rgba(255, 255, 255, 0.1);
        }

        .spin {
          animation: spin 0.8s linear infinite;
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        .toast-banner {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 12px 18px;
          border-radius: 12px;
          font-size: 14px;
          font-weight: 600;
        }
        .toast-banner.success {
          background: rgba(16, 185, 129, 0.15);
          border: 1px solid rgba(16, 185, 129, 0.3);
          color: #34d399;
        }
        .toast-banner.error {
          background: rgba(239, 68, 68, 0.15);
          border: 1px solid rgba(239, 68, 68, 0.3);
          color: #f87171;
        }

        /* Metrics */
        .metrics-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
          gap: 16px;
        }
        .metric-card {
          padding: 20px 24px;
          border-radius: 18px;
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid rgba(255, 255, 255, 0.08);
          display: flex;
          flex-direction: column;
          gap: 6px;
        }
        .metric-header {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 12px;
          font-weight: 700;
          color: #a1a1aa;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
        .metric-value {
          font-size: 32px;
          font-weight: 900;
          color: #ffffff;
        }
        .metric-sub {
          font-size: 12px;
          color: #71717a;
        }

        /* Controls */
        .controls-bar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          flex-wrap: wrap;
          gap: 14px;
          padding: 14px 18px;
          border-radius: 16px;
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid rgba(255, 255, 255, 0.08);
        }
        .search-wrap {
          display: flex;
          align-items: center;
          gap: 10px;
          background: rgba(0, 0, 0, 0.35);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 12px;
          padding: 9px 14px;
          flex: 1;
          min-width: 280px;
          max-width: 460px;
        }
        .search-input {
          background: transparent;
          border: none;
          color: #ffffff;
          font-size: 13px;
          width: 100%;
          outline: none;
        }
        .clear-btn {
          background: none;
          border: none;
          color: #71717a;
          cursor: pointer;
        }

        .filters-row {
          display: flex;
          align-items: center;
          gap: 12px;
          flex-wrap: wrap;
          flex-shrink: 0;
        }
        .view-toggle {
          display: flex;
          background: rgba(0, 0, 0, 0.45);
          padding: 4px;
          border-radius: 10px;
          border: 1px solid rgba(255, 255, 255, 0.1);
          flex-shrink: 0;
          gap: 4px;
        }
        .toggle-btn {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 7px 14px;
          border-radius: 8px;
          font-size: 12px;
          font-weight: 700;
          color: #a1a1aa;
          background: transparent;
          border: 1px solid transparent;
          cursor: pointer;
          transition: all 0.2s;
          white-space: nowrap !important;
          flex-shrink: 0;
        }
        .toggle-btn:hover {
          color: #ffffff;
          background: rgba(255, 255, 255, 0.06);
        }
        .toggle-btn.active {
          background: rgba(16, 185, 129, 0.18);
          color: #34d399;
          border-color: rgba(16, 185, 129, 0.4);
        }

        .status-filters {
          display: flex;
          gap: 6px;
          align-items: center;
          flex-shrink: 0;
        }
        .filter-chip {
          padding: 7px 14px;
          border-radius: 8px;
          font-size: 12px;
          font-weight: 700;
          color: #a1a1aa;
          background: rgba(255, 255, 255, 0.04);
          border: 1px solid rgba(255, 255, 255, 0.08);
          cursor: pointer;
          transition: all 0.2s;
          white-space: nowrap !important;
          flex-shrink: 0;
        }
        .filter-chip:hover {
          color: #ffffff;
          background: rgba(255, 255, 255, 0.08);
        }
        .filter-chip.active {
          background: rgba(255, 255, 255, 0.15);
          border-color: rgba(255, 255, 255, 0.25);
          color: #ffffff;
        }

        /* Table */
        .table-container {
          border-radius: 18px;
          background: rgba(255, 255, 255, 0.02);
          border: 1px solid rgba(255, 255, 255, 0.08);
          overflow: hidden;
        }
        .table-scroll {
          overflow-x: auto;
        }
        .affiliates-table {
          width: 100%;
          border-collapse: collapse;
          text-align: left;
        }
        .affiliates-table th {
          padding: 14px 20px;
          font-size: 12px;
          font-weight: 700;
          color: #71717a;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          border-bottom: 1px solid rgba(255, 255, 255, 0.08);
        }
        .affiliates-table td {
          padding: 16px 20px;
          border-bottom: 1px solid rgba(255, 255, 255, 0.04);
          vertical-align: middle;
        }
        .affiliate-row:hover {
          background: rgba(255, 255, 255, 0.03);
        }

        .user-cell {
          display: flex;
          align-items: center;
          gap: 12px;
        }
        .user-avatar {
          width: 36px;
          height: 36px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 800;
          font-size: 14px;
        }
        .inviter-avatar {
          background: #10b981;
          color: #ffffff;
        }
        .friend-avatar {
          background: #0284c7;
          color: #ffffff;
        }
        .user-name {
          font-size: 14px;
          font-weight: 700;
          color: #ffffff;
          display: block;
        }
        .user-links {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 12px;
          margin-top: 2px;
        }
        .tg-link {
          color: #38bdf8;
          text-decoration: none;
          display: inline-flex;
          align-items: center;
          gap: 3px;
        }
        .tg-link:hover {
          text-decoration: underline;
        }
        .tg-id {
          color: #71717a;
        }

        .date-cell {
          display: flex;
          flex-direction: column;
          gap: 2px;
        }
        .date-primary {
          font-size: 13px;
          font-weight: 600;
          color: #ffffff;
        }
        .date-sub {
          font-size: 11px;
          color: #71717a;
        }

        .reward-cell {
          display: flex;
          align-items: center;
          gap: 8px;
          flex-wrap: wrap;
        }
        .badge {
          display: inline-flex;
          align-items: center;
          gap: 5px;
          padding: 4px 10px;
          border-radius: 8px;
          font-size: 11px;
          font-weight: 700;
        }
        .badge-success {
          background: rgba(16, 185, 129, 0.15);
          color: #34d399;
          border: 1px solid rgba(16, 185, 129, 0.3);
        }
        .badge-amber {
          background: rgba(245, 158, 11, 0.15);
          color: #fbbf24;
          border: 1px solid rgba(245, 158, 11, 0.3);
        }
        .badge-zinc {
          background: rgba(255, 255, 255, 0.08);
          color: #a1a1aa;
        }
        .reward-date {
          font-size: 11px;
          color: #a1a1aa;
        }

        .btn-grant-xs {
          background: rgba(16, 185, 129, 0.15);
          border: 1px solid rgba(16, 185, 129, 0.3);
          color: #34d399;
          font-size: 10px;
          font-weight: 800;
          padding: 2px 7px;
          border-radius: 6px;
          cursor: pointer;
          transition: all 0.2s;
        }
        .btn-grant-xs:hover {
          background: #10b981;
          color: #ffffff;
        }

        .actions-cell {
          display: flex;
          align-items: center;
          justify-content: flex-end;
          gap: 8px;
        }
        .btn-action-icon {
          width: 32px;
          height: 32px;
          border-radius: 8px;
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.1);
          color: #ffffff;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: all 0.2s;
        }
        .btn-action-icon:hover {
          background: rgba(56, 189, 248, 0.2);
          border-color: #38bdf8;
          color: #38bdf8;
        }

        /* Leaderboard cards */
        .leaderboard-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
          gap: 16px;
          padding: 20px;
        }
        .leaderboard-card {
          padding: 20px;
          border-radius: 16px;
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid rgba(255, 255, 255, 0.08);
          display: flex;
          flex-direction: column;
          gap: 16px;
          position: relative;
        }
        .card-rank {
          position: absolute;
          top: 14px;
          right: 16px;
          font-size: 13px;
          font-weight: 900;
          color: #fbbf24;
        }
        .card-user {
          display: flex;
          align-items: center;
          gap: 12px;
        }
        .card-stats {
          display: flex;
          gap: 16px;
          padding: 12px;
          background: rgba(0, 0, 0, 0.2);
          border-radius: 10px;
        }
        .card-stat {
          display: flex;
          flex-direction: column;
          gap: 2px;
        }
        .stat-num {
          font-size: 18px;
          font-weight: 900;
          color: #ffffff;
        }
        .stat-label {
          font-size: 10px;
          font-weight: 700;
          color: #71717a;
          text-transform: uppercase;
        }
        .card-footer-actions {
          display: flex;
          gap: 8px;
        }
        .btn-secondary-sm {
          flex: 1;
          padding: 8px 12px;
          border-radius: 8px;
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.1);
          color: #ffffff;
          font-size: 11px;
          font-weight: 700;
          cursor: pointer;
        }
        .btn-primary-sm {
          flex: 1;
          padding: 8px 12px;
          border-radius: 8px;
          background: #0284c7;
          border: none;
          color: #ffffff;
          font-size: 11px;
          font-weight: 700;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 4px;
        }

        /* Empty state */
        .empty-state {
          padding: 60px 20px;
          text-align: center;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 12px;
          color: #71717a;
          font-size: 14px;
        }

        /* Modal */
        .modal-overlay {
          position: fixed;
          inset: 0;
          background: rgba(0, 0, 0, 0.7);
          backdrop-filter: blur(8px);
          z-index: 9999;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 20px;
        }
        .modal-card {
          width: 100%;
          max-width: 520px;
          border-radius: 20px;
          background: #18181b;
          border: 1px solid rgba(255, 255, 255, 0.12);
          overflow: hidden;
          box-shadow: 0 20px 40px rgba(0, 0, 0, 0.5);
        }
        .modal-header {
          padding: 20px 24px;
          border-bottom: 1px solid rgba(255, 255, 255, 0.08);
          display: flex;
          align-items: center;
          justify-content: space-between;
        }
        .modal-title-row {
          display: flex;
          align-items: center;
          gap: 10px;
        }
        .modal-title-row h3 {
          font-size: 16px;
          font-weight: 800;
          color: #ffffff;
          margin: 0;
        }
        .close-btn {
          background: none;
          border: none;
          color: #a1a1aa;
          cursor: pointer;
          font-size: 16px;
        }
        .modal-body {
          padding: 24px;
          display: flex;
          flex-direction: column;
          gap: 18px;
        }
        .modal-desc {
          font-size: 13px;
          color: #a1a1aa;
          margin: 0;
        }
        .form-group {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }
        .form-group label {
          font-size: 12px;
          font-weight: 700;
          color: #e4e4e7;
        }
        .input-field, .textarea-field {
          background: rgba(0, 0, 0, 0.4);
          border: 1px solid rgba(255, 255, 255, 0.12);
          border-radius: 10px;
          padding: 10px 14px;
          color: #ffffff;
          font-size: 13px;
          outline: none;
        }
        .input-field:focus, .textarea-field:focus {
          border-color: #38bdf8;
        }
        .field-hint {
          font-size: 11px;
          color: #71717a;
        }
        .alt-option {
          font-size: 12px;
          color: #a1a1aa;
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .direct-tg-btn {
          color: #38bdf8;
          text-decoration: none;
          font-weight: 700;
          display: inline-flex;
          align-items: center;
          gap: 4px;
        }
        .modal-footer {
          padding: 16px 24px;
          border-top: 1px solid rgba(255, 255, 255, 0.08);
          display: flex;
          justify-content: flex-end;
          gap: 12px;
          background: rgba(0, 0, 0, 0.2);
        }
        .btn-secondary {
          padding: 10px 18px;
          border-radius: 10px;
          background: rgba(255, 255, 255, 0.06);
          border: 1px solid rgba(255, 255, 255, 0.1);
          color: #ffffff;
          font-weight: 700;
          font-size: 13px;
          cursor: pointer;
        }
        .btn-primary {
          padding: 10px 20px;
          border-radius: 10px;
          background: #0284c7;
          border: none;
          color: #ffffff;
          font-weight: 700;
          font-size: 13px;
          cursor: pointer;
        }
        .btn-primary:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
        .text-right {
          text-align: right;
        }
        .text-emerald { color: #10b981; }
        .text-primary { color: #0284c7; }
        .text-amber { color: #f59e0b; }
        .text-purple { color: #a855f7; }
      `}</style>
    </div>
  );
}
