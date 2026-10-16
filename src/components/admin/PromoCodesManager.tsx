"use client";

import { useFlash } from '@/hooks/useFlash';
import ConfirmModal from '@/components/admin/ConfirmModal';
import React, { useEffect, useState } from 'react';
import { Gift, Plus, Check, X, Sparkles, RefreshCw, Trash2, Calendar, Tag, ShieldCheck, Power } from 'lucide-react';

interface PromoItem {
  id: string;
  code: string;
  name: string;
  days: number;
  active: boolean;
  maxUses?: number | null;
  usedCount: number;
  createdAt: string;
}

export default function PromoCodesManager() {
  const [promos, setPromos] = useState<PromoItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Form states
  const [newCode, setNewCode] = useState('');
  const [newName, setNewName] = useState('');
  const [newDays, setNewDays] = useState('30');
  const [newMaxUses, setNewMaxUses] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [flash, say] = useFlash();
  const toast = flash && { ok: flash.kind === 'ok', text: flash.text };

  const showToast = (ok: boolean, text: string) => say(ok ? 'ok' : 'error', text);

  const fetchPromos = async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const res = await fetch('/api/admin/promos', { cache: 'no-store' });
      const data = await res.json();
      if (res.ok && data?.promos) {
        setPromos(data.promos);
      } else {
        showToast(false, data?.error || 'პრომო კოდების ჩატვირთვა ვერ მოხერხდა');
      }
    } catch (e) {
      console.error('[PROMO_FETCH_ERROR]', e);
      showToast(false, 'პრომო კოდების ჩატვირთვა ვერ მოხერხდა (კავშირის შეცდომა)');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPromos();
  }, []);

  const handleCreatePromo = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    const code = newCode.trim().toUpperCase();
    if (!code || code.length < 3) {
      setFormError('კოდი უნდა შედგებოდეს მინიმუმ 3 სიმბოლოსგან');
      return;
    }
    const days = parseInt(newDays, 10);
    if (isNaN(days) || days < 1) {
      setFormError('დღეების რაოდენობა უნდა იყოს მინიმუმ 1');
      return;
    }

    setActionLoading('creating');
    try {
      const res = await fetch('/api/admin/promos', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          code,
          name: newName.trim() || `Promo ${code}`,
          days,
          active: true,
          maxUses: newMaxUses.trim() ? parseInt(newMaxUses, 10) : null,
        }),
      });
      const data = await res.json();
      if (res.ok && data?.success) {
        showToast(true, `პრომო კოდი ${code} (${days} დღე) წარმატებით შეიქმნა!`);
        setShowAddModal(false);
        setNewCode('');
        setNewName('');
        setNewDays('30');
        setNewMaxUses('');
        fetchPromos(true);
      } else {
        setFormError(data?.error || 'შექმნა ვერ მოხერხდა');
      }
    } catch {
      setFormError('კავშირის შეცდომა');
    } finally {
      setActionLoading(null);
    }
  };

  const togglePromo = async (promo: PromoItem) => {
    setActionLoading(promo.code);
    try {
      const res = await fetch('/api/admin/promos', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          code: promo.code,
          name: promo.name,
          days: promo.days,
          active: !promo.active,
          maxUses: promo.maxUses,
        }),
      });
      if (res.ok) {
        showToast(true, `კოდი ${promo.code} ${!promo.active ? 'გააქტიურდა' : 'დეაქტივირდა'}`);
        fetchPromos(true);
      } else {
        showToast(false, 'სტატუსის შეცვლა ვერ მოხერხდა');
      }
    } catch {
      showToast(false, 'კავშირის შეცდომა');
    } finally {
      setActionLoading(null);
    }
  };

  const [toDelete, setToDelete] = useState<PromoItem | null>(null);

  const deletePromo = async (promo: PromoItem) => {
    setToDelete(null);
    setActionLoading(promo.code);
    try {
      const res = await fetch(`/api/admin/promos?code=${encodeURIComponent(promo.code)}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        showToast(true, `პრომო კოდი ${promo.code} წაიშალა`);
        fetchPromos(true);
      } else {
        showToast(false, 'წაშლა ვერ მოხერხდა');
      }
    } catch {
      showToast(false, 'კავშირის შეცდომა');
    } finally {
      setActionLoading(null);
    }
  };

  const totalUsed = promos.reduce((sum, p) => sum + (p.usedCount || 0), 0);
  const activeCount = promos.filter(p => p.active).length;

  return (
    <div className="promo-manager glass">
      {/* Head */}
      <div className="pm-head">
        <div className="pm-title-group">
          <div className="pm-icon-wrap">
            <Gift size={20} className="text-emerald" />
          </div>
          <div>
            <div className="pm-title-row">
              <h3>Promo Codes Manager</h3>
              <span className="pm-badge">{activeCount} აქტიური</span>
            </div>
            <p className="pm-desc">
              შექმენით და მართეთ პრომო კოდები (დღეების რაოდენობა, აქტივაციის ლიმიტი, ჩართვა/გამორთვა).
            </p>
          </div>
        </div>

        <div className="pm-head-actions">
          <button
            type="button"
            className="pm-action-btn primary"
            onClick={() => setShowAddModal(true)}
          >
            <Plus size={15} />
            <span>ახალი პრომო კოდი</span>
          </button>
          <button
            type="button"
            className="pm-refresh-btn"
            onClick={() => fetchPromos()}
            title="განახლება"
          >
            <RefreshCw size={15} className={loading ? 'spin' : ''} />
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="pm-stats-grid">
        <div className="stat-box">
          <span className="stat-label">სულ კოდები</span>
          <span className="stat-val">{promos.length}</span>
        </div>
        <div className="stat-box">
          <span className="stat-label">აქტიური კოდები</span>
          <span className="stat-val active-val">{activeCount}</span>
        </div>
        <div className="stat-box">
          <span className="stat-label">გააქტიურებული ჯამში</span>
          <span className="stat-val used-val">{totalUsed} <span className="stat-unit">მომხმარებელი</span></span>
        </div>
      </div>

      {/* Table (Desktop) */}
      <div className="pm-table-wrap desktop-only-table">
        <table className="pm-table">
          <thead>
            <tr>
              <th>კოდი (Code)</th>
              <th>დასახელება &amp; აღწერა</th>
              <th>Premium ხანგრძლივობა</th>
              <th>გამოყენებულია</th>
              <th>სტატუსი</th>
              <th>მოქმედება</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={6} className="center-cell">იტვირთება პრომო კოდები...</td></tr>
            ) : promos.length === 0 ? (
              <tr><td colSpan={6} className="center-cell">პრომო კოდები არ მოიძებნა. შექმენით ახალი!</td></tr>
            ) : (
              promos.map(p => (
                <tr key={p.code} className={!p.active ? 'is-disabled' : ''}>
                  <td>
                    <div className="code-badge">
                      <Tag size={13} />
                      <strong>{p.code}</strong>
                    </div>
                  </td>
                  <td>
                    <span className="promo-name">{p.name}</span>
                  </td>
                  <td>
                    <span className="days-chip">
                      <Calendar size={13} />
                      +{p.days} დღე
                    </span>
                  </td>
                  <td>
                    <div className="used-info">
                      <strong>{p.usedCount || 0}</strong>
                      {p.maxUses ? <span className="max-uses"> / {p.maxUses} max</span> : <span className="unlimited"> (ულიმიტო)</span>}
                    </div>
                  </td>
                  <td>
                    <span className={`status-pill ${p.active ? 'active' : 'inactive'}`}>
                      {p.active ? <Check size={12} /> : <X size={12} />}
                      {p.active ? 'აქტიური' : 'გამორთული'}
                    </span>
                  </td>
                  <td>
                    <div className="action-row">
                      <button
                        type="button"
                        className={`pm-btn toggle ${p.active ? 'deact' : 'act'}`}
                        disabled={actionLoading === p.code}
                        onClick={() => togglePromo(p)}
                        title={p.active ? 'დეაქტივაცია' : 'გააქტიურება'}
                      >
                        <Power size={13} />
                        <span>{p.active ? 'გამორთვა' : 'ჩართვა'}</span>
                      </button>
                      <button
                        type="button"
                        className="pm-btn del"
                        disabled={actionLoading === p.code}
                        onClick={() => setToDelete(p)}
                        title="წაშლა"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Mobile Cards View */}
      <div className="pm-cards-mobile">
        {loading ? (
          <div className="center-cell">იტვირთება პრომო კოდები...</div>
        ) : promos.length === 0 ? (
          <div className="center-cell">პრომო კოდები არ მოიძებნა. შექმენით ახალი!</div>
        ) : (
          promos.map(p => (
            <div key={p.code} className={`pm-mobile-card glass ${!p.active ? 'is-disabled' : ''}`}>
              <div className="pm-card-top">
                <div className="code-badge">
                  <Tag size={13} />
                  <strong>{p.code}</strong>
                </div>
                <span className={`status-pill ${p.active ? 'active' : 'inactive'}`}>
                  {p.active ? <Check size={12} /> : <X size={12} />}
                  {p.active ? 'აქტიური' : 'გამორთული'}
                </span>
              </div>
              <div className="pm-card-name">{p.name}</div>
              <div className="pm-card-meta">
                <span className="days-chip">
                  <Calendar size={13} />
                  +{p.days} დღე
                </span>
                <span className="used-info">
                  გამოყენებულია: <strong>{p.usedCount || 0}</strong>
                  {p.maxUses ? <span className="max-uses"> / {p.maxUses}</span> : <span className="unlimited"> (ულიმიტო)</span>}
                </span>
              </div>
              <div className="pm-card-actions">
                <button
                  type="button"
                  className={`pm-btn toggle ${p.active ? 'deact' : 'act'}`}
                  disabled={actionLoading === p.code}
                  onClick={() => togglePromo(p)}
                >
                  <Power size={13} />
                  <span>{p.active ? 'გამორთვა' : 'ჩართვა'}</span>
                </button>
                <button
                  type="button"
                  className="pm-btn del"
                  disabled={actionLoading === p.code}
                  onClick={() => setToDelete(p)}
                  title="წაშლა"
                >
                  <Trash2 size={13} />
                  <span>წაშლა</span>
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Create Modal */}
      {showAddModal && (
        <div className="modal-backdrop" onClick={() => setShowAddModal(false)}>
          <div className="modal-content glass animate-in" onClick={e => e.stopPropagation()}>
            <div className="modal-head">
              <div className="modal-head-title">
                <Gift size={20} className="text-emerald" />
                <h4>ახალი პრომო კოდის შექმნა</h4>
              </div>
              <button
                type="button"
                className="close-btn"
                onClick={() => setShowAddModal(false)}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreatePromo} className="modal-form">
              {formError && <div className="form-err">{formError}</div>}

              <div className="form-group">
                <label>პრომო კოდი (Code) *</label>
                <input
                  type="text"
                  className="form-input code-input"
                  placeholder="მაგ. SUMMER2026, LATINVIP, SPECIAL50..."
                  value={newCode}
                  onChange={e => setNewCode(e.target.value.toUpperCase())}
                  required
                />
                <span className="field-hint">კოდი ავტომატურად გადადის დიდ ასოებში (uppercase).</span>
              </div>

              <div className="form-group">
                <label>დასახელება / კამპანია</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="მაგ. Summer Dance Festival Gift"
                  value={newName}
                  onChange={e => setNewName(e.target.value)}
                />
              </div>

              <div className="form-row-2">
                <div className="form-group">
                  <label>Premium დღეები *</label>
                  <select
                    className="form-select"
                    value={newDays}
                    onChange={e => setNewDays(e.target.value)}
                  >
                    <option value="7">7 დღე (1 კვირა)</option>
                    <option value="14">14 დღე (2 კვირა)</option>
                    <option value="30">30 დღე (1 თვე)</option>
                    <option value="60">60 დღე (2 თვე)</option>
                    <option value="90">90 დღე (3 თვე)</option>
                    <option value="180">180 დღე (6 თვე)</option>
                    <option value="365">365 დღე (1 წელი)</option>
                  </select>
                </div>

                <div className="form-group">
                  <label>ლიმიტი (არასავალდებულო)</label>
                  <input
                    type="number"
                    className="form-input"
                    placeholder="ულიმიტო (ცარიელი)"
                    value={newMaxUses}
                    onChange={e => setNewMaxUses(e.target.value)}
                    min="1"
                  />
                </div>
              </div>

              <div className="modal-foot">
                <button
                  type="button"
                  className="pm-action-btn cancel"
                  onClick={() => setShowAddModal(false)}
                >
                  გაუქმება
                </button>
                <button
                  type="submit"
                  className="pm-action-btn primary"
                  disabled={actionLoading === 'creating'}
                >
                  <Sparkles size={15} />
                  <span>{actionLoading === 'creating' ? 'იქმნება...' : 'კოდის შექმნა'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Toast Notification */}
      <ConfirmModal
        isOpen={!!toDelete}
        onClose={() => setToDelete(null)}
        onConfirm={() => toDelete && deletePromo(toDelete)}
        title={`პრომო კოდის წაშლა: ${toDelete?.code ?? ''}`}
        message="კოდი სრულად წაიშლება და მომხმარებლები მას ვეღარ გამოიყენებენ. უკვე გააქტიურებული Premium არ შეიცვლება."
        confirmText="წაშლა"
        variant="danger"
      />

      {toast && (
        <div className={`toast-box ${toast.ok ? 'ok' : 'err'}`}>
          {toast.ok ? <Check size={16} /> : <X size={16} />}
          <span>{toast.text}</span>
        </div>
      )}

      <style jsx>{`
        .promo-manager {
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

        .pm-head {
          display: flex;
          align-items: center;
          justify-content: space-between;
          flex-wrap: wrap;
          gap: 14px;
        }

        .pm-title-group {
          display: flex;
          align-items: center;
          gap: 14px;
        }

        .pm-icon-wrap {
          width: 44px;
          height: 44px;
          border-radius: 12px;
          background: rgba(16, 185, 129, 0.15);
          border: 1px solid rgba(16, 185, 129, 0.3);
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .pm-title-row {
          display: flex;
          align-items: center;
          gap: 10px;
        }
        .pm-title-row h3 {
          margin: 0;
          font-size: 1.25rem;
          font-weight: 800;
        }

        .pm-badge {
          background: rgba(16, 185, 129, 0.15);
          border: 1px solid rgba(16, 185, 129, 0.3);
          color: #10b981;
          font-size: 0.75rem;
          font-weight: 700;
          padding: 2px 8px;
          border-radius: 12px;
        }

        .pm-desc {
          margin: 4px 0 0;
          font-size: 0.85rem;
          color: rgba(255, 255, 255, 0.5);
        }

        .pm-head-actions {
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .pm-action-btn {
          display: inline-flex;
          align-items: center;
          gap: 7px;
          padding: 8px 16px;
          border-radius: 12px;
          font-size: 0.84rem;
          font-weight: 700;
          cursor: pointer;
          border: none;
          transition: all 0.2s;
        }
        .pm-action-btn.primary {
          background: #10b981;
          color: #000;
        }
        .pm-action-btn.primary:hover {
          background: #34d399;
          transform: translateY(-1px);
        }
        .pm-action-btn.cancel {
          background: rgba(255, 255, 255, 0.08);
          color: #d1d5db;
        }

        .pm-refresh-btn {
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
        }
        .pm-refresh-btn:hover {
          color: white;
          background: rgba(255, 255, 255, 0.1);
        }

        .pm-stats-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 14px;
        }

        .stat-box {
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid rgba(255, 255, 255, 0.06);
          border-radius: 14px;
          padding: 14px 18px;
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .stat-label {
          font-size: 0.8rem;
          color: rgba(255, 255, 255, 0.6);
        }
        .stat-val {
          font-size: 1.5rem;
          font-weight: 800;
          color: white;
        }
        .stat-val.active-val { color: #10b981; }
        .stat-val.used-val { color: #38bdf8; }
        .stat-unit { font-size: 0.85rem; font-weight: 500; color: rgba(255, 255, 255, 0.4); }

        .pm-table-wrap {
          overflow-x: auto;
          border-radius: 12px;
          border: 1px solid rgba(255, 255, 255, 0.06);
        }

        .pm-table {
          width: 100%;
          border-collapse: collapse;
          text-align: left;
          font-size: 0.88rem;
        }

        .pm-table th {
          background: rgba(255, 255, 255, 0.03);
          padding: 12px 16px;
          font-size: 0.75rem;
          text-transform: uppercase;
          color: rgba(255, 255, 255, 0.5);
          letter-spacing: 0.5px;
          border-bottom: 1px solid rgba(255, 255, 255, 0.06);
        }

        .pm-table td {
          padding: 12px 16px;
          border-bottom: 1px solid rgba(255, 255, 255, 0.04);
        }

        .is-disabled {
          opacity: 0.55;
          background: rgba(0, 0, 0, 0.15);
        }

        .code-badge {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          background: rgba(16, 185, 129, 0.12);
          border: 1px solid rgba(16, 185, 129, 0.3);
          color: #34d399;
          padding: 4px 10px;
          border-radius: 8px;
          font-family: monospace;
          font-size: 0.95rem;
          letter-spacing: 0.5px;
        }

        .promo-name {
          font-weight: 600;
          color: #e2e8f0;
        }

        .days-chip {
          display: inline-flex;
          align-items: center;
          gap: 5px;
          background: rgba(56, 189, 248, 0.1);
          color: #38bdf8;
          border-radius: 8px;
          padding: 3px 8px;
          font-size: 0.8rem;
          font-weight: 600;
        }

        .used-info {
          font-size: 0.88rem;
        }
        .max-uses, .unlimited {
          font-size: 0.78rem;
          color: rgba(255, 255, 255, 0.45);
        }

        .status-pill {
          display: inline-flex;
          align-items: center;
          gap: 5px;
          padding: 3px 8px;
          border-radius: 8px;
          font-size: 0.75rem;
          font-weight: 700;
        }
        .status-pill.active {
          background: rgba(16, 185, 129, 0.15);
          color: #10b981;
          border: 1px solid rgba(16, 185, 129, 0.3);
        }
        .status-pill.inactive {
          background: rgba(239, 68, 68, 0.12);
          color: #f87171;
          border: 1px solid rgba(239, 68, 68, 0.3);
        }

        .action-row {
          display: flex;
          align-items: center;
          gap: 6px;
        }

        .pm-btn {
          display: inline-flex;
          align-items: center;
          gap: 5px;
          padding: 5px 10px;
          border-radius: 8px;
          font-size: 0.76rem;
          font-weight: 700;
          border: none;
          cursor: pointer;
          transition: all 0.15s;
        }
        .pm-btn.toggle.deact {
          background: rgba(239, 68, 68, 0.12);
          border: 1px solid rgba(239, 68, 68, 0.3);
          color: #f87171;
        }
        .pm-btn.toggle.deact:hover {
          background: #ef4444;
          color: white;
        }
        .pm-btn.toggle.act {
          background: rgba(16, 185, 129, 0.15);
          border: 1px solid rgba(16, 185, 129, 0.3);
          color: #10b981;
        }
        .pm-btn.toggle.act:hover {
          background: #10b981;
          color: black;
        }
        .pm-btn.del {
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.1);
          color: #94a3b8;
          padding: 5px 8px;
        }
        .pm-btn.del:hover {
          color: #f87171;
          border-color: rgba(239, 68, 68, 0.4);
        }

        .center-cell {
          text-align: center;
          padding: 24px;
          color: rgba(255, 255, 255, 0.4);
        }

        /* Modal */
        .modal-backdrop {
          position: fixed;
          inset: 0;
          background: rgba(0, 0, 0, 0.75);
          backdrop-filter: blur(8px);
          z-index: 1000;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 16px;
        }

        .modal-content {
          width: 100%;
          max-width: 480px;
          background: #18181b;
          border: 1px solid rgba(255, 255, 255, 0.12);
          border-radius: 20px;
          padding: 24px;
          box-shadow: 0 20px 40px rgba(0, 0, 0, 0.6);
        }

        .modal-head {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 20px;
        }
        .modal-head-title {
          display: flex;
          align-items: center;
          gap: 10px;
        }
        .modal-head h4 {
          margin: 0;
          font-size: 1.15rem;
          font-weight: 800;
        }
        .close-btn {
          background: none;
          border: none;
          color: #94a3b8;
          cursor: pointer;
        }
        .close-btn:hover { color: white; }

        .modal-form {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .form-err {
          background: rgba(239, 68, 68, 0.15);
          border: 1px solid rgba(239, 68, 68, 0.4);
          color: #fca5a5;
          padding: 10px 14px;
          border-radius: 10px;
          font-size: 0.85rem;
        }

        .form-group {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }
        .form-group label {
          font-size: 0.82rem;
          font-weight: 700;
          color: #cbd5e1;
        }

        .form-input, .form-select {
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.12);
          border-radius: 10px;
          padding: 10px 14px;
          color: white;
          font-size: 0.9rem;
          outline: none;
        }
        .form-input:focus, .form-select:focus {
          border-color: #10b981;
        }
        .form-select option {
          background: #18181b;
        }

        .code-input {
          font-family: monospace;
          letter-spacing: 1px;
          font-weight: 700;
        }

        .field-hint {
          font-size: 0.72rem;
          color: rgba(255, 255, 255, 0.4);
        }

        .form-row-2 {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 12px;
        }

        .modal-foot {
          display: flex;
          justify-content: flex-end;
          gap: 10px;
          margin-top: 8px;
        }

        .toast-box {
          position: fixed;
          bottom: 24px;
          left: 50%;
          transform: translateX(-50%);
          z-index: 2000;
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 10px 18px;
          border-radius: 12px;
          font-size: 0.86rem;
          font-weight: 700;
          box-shadow: 0 10px 30px rgba(0, 0, 0, 0.6);
        }
        .toast-box.ok {
          background: #064e3b;
          color: #a7f3d0;
          border: 1px solid rgba(16, 185, 129, 0.5);
        }
        .toast-box.err {
          background: #450a0a;
          color: #fecaca;
          border: 1px solid rgba(239, 68, 68, 0.5);
        }

        .pm-cards-mobile {
          display: none;
        }

        @media (max-width: 640px) {
          .desktop-only-table {
            display: none !important;
          }
          .pm-cards-mobile {
            display: flex;
            flex-direction: column;
            gap: 10px;
          }
          .pm-mobile-card {
            padding: 14px;
            border-radius: 14px;
            background: rgba(255, 255, 255, 0.03);
            border: 1px solid rgba(255, 255, 255, 0.08);
            display: flex;
            flex-direction: column;
            gap: 10px;
          }
          .pm-card-top {
            display: flex;
            align-items: center;
            justify-content: space-between;
          }
          .pm-card-name {
            font-size: 14px;
            font-weight: 700;
            color: #ffffff;
          }
          .pm-card-meta {
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 8px;
            flex-wrap: wrap;
            font-size: 12px;
          }
          .pm-card-actions {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 8px;
            padding-top: 6px;
            border-top: 1px solid rgba(255, 255, 255, 0.06);
          }
          .pm-card-actions .pm-btn {
            justify-content: center;
            height: 38px;
          }
          .promo-manager {
            padding: 16px;
            border-radius: 16px;
          }
          .pm-head {
            flex-direction: column;
            align-items: stretch;
            gap: 12px;
          }
          .pm-head-actions {
            width: 100%;
          }
          .pm-action-btn.primary {
            flex: 1;
            justify-content: center;
            height: 40px;
          }
          .pm-refresh-btn {
            width: 40px;
            height: 40px;
          }
          .pm-stats-grid {
            grid-template-columns: 1fr 1fr;
            gap: 8px;
          }
          .stat-box {
            padding: 10px 12px;
            border-radius: 12px;
          }
          .stat-val {
            font-size: 1.25rem;
          }
          .pm-table {
            min-width: 600px;
          }
          .action-row {
            gap: 4px;
          }
          .pm-btn {
            min-height: 34px;
            padding: 6px 10px;
          }
          .modal-content {
            padding: 18px 16px;
            border-radius: 16px;
            max-width: 95vw;
          }
          .form-row-2 {
            grid-template-columns: 1fr;
            gap: 12px;
          }
          .modal-foot {
            flex-direction: column-reverse;
            gap: 8px;
          }
          .modal-foot button {
            width: 100%;
            height: 42px;
            justify-content: center;
          }
        }
      `}</style>
    </div>
  );
}
