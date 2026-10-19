"use client";

import React, { useEffect, useState } from 'react';
import { Gift, Copy, Check, Share2, Send, Users, UserPlus, Crown, Tag } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { TelegramLogin } from '@/components/auth/TelegramLogin';
import { inviteLink, REF_RESULT_EVENT } from '@/utils/referral';
import { sessionFetch } from '@/utils/userSession';

interface Person { name: string; username: string | null; at: string }
interface EarnData {
  setup: boolean;
  code: string;
  days: number;
  invitedBy: (Person & { premiumUntil: string | null }) | null;
  invited: Person[];
  myReward: { at: string; premiumUntil: string | null } | null;
}

const fmtDate = (iso?: string | null) =>
  iso ? new Date(iso).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' }) : '';

export default function EarnPremiumPage() {
  const { user, isAuthenticated, sessionVersion, refreshPremium } = useAuth();
  const [data, setData] = useState<EarnData | null>(null);
  const [state, setState] = useState<'loading' | 'ready' | 'unavailable'>('loading');
  const [copied, setCopied] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  // Promo code states
  const [promoInput, setPromoInput] = useState('');
  const [promoLoading, setPromoLoading] = useState(false);
  const [promoError, setPromoError] = useState<string | null>(null);
  const [promoSuccess, setPromoSuccess] = useState<string | null>(null);
  const [activePromoInfo, setActivePromoInfo] = useState<{ code: string; until: string | null } | null>(null);

  // Check if current user has an active promo
  useEffect(() => {
    if (!user?.id) return;
    sessionFetch(`/api/user/premium?tid=${encodeURIComponent(String(user.id))}`, { cache: 'no-store' })
      .then(r => r.json())
      .then(d => {
        if (d?.active && typeof d.subscriptionId === 'string' && d.subscriptionId.startsWith('PROMO_')) {
          const parts = d.subscriptionId.split('_');
          const codeName = parts[1] || 'PROMO';
          setActivePromoInfo({ code: codeName, until: d.premiumUntil || null });
        } else {
          setActivePromoInfo(null);
        }
      })
      .catch(() => {});
  }, [user?.id, sessionVersion, reloadKey]);

  const handleClaimPromo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.id || !promoInput.trim() || promoLoading) return;
    setPromoLoading(true);
    setPromoError(null);
    setPromoSuccess(null);

    try {
      const res = await sessionFetch('/api/referral/claim', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ tid: user.id, code: promoInput.trim() })
      });
      const resData = await res.json().catch(() => null);

      if (res.ok && resData?.ok) {
        const codeUpper = promoInput.trim().toUpperCase();
        setPromoSuccess(`გილოცავთ! პრომო კოდი ${codeUpper} წარმატებით გააქტიურდა (+${resData.days} დღე Premium).`);
        setPromoInput('');
        if (resData.premiumUntil) {
          setActivePromoInfo({ code: codeUpper, until: resData.premiumUntil });
        }
        await refreshPremium({ active: true, subscriptionId: `PROMO_${codeUpper}` });
        setReloadKey(k => k + 1);
      } else {
        const reason = resData?.reason;
        const msg = resData?.message
          || (res.status === 401 || res.status === 403
            ? 'სესია ამოიწურა. შედით Telegram-ით ხელახლა და სცადეთ თავიდან.'
            : res.status >= 500 || reason === 'failed' || reason === 'not_setup'
            ? 'სერვერზე დროებითი შეცდომაა, კოდი არ დაიხარჯა. სცადეთ ცოტა ხანში.'
            : reason === 'already_has_promo'
            ? 'თქვენ უკვე გაქვთ აქტიური პრომო კოდი! ერთდროულად 2 პრომო აქციით სარგებლობა არ შეიძლება.'
            : reason === 'already_used'
            ? 'ეს პრომო კოდი უკვე გამოყენებულია ამ ანგარიშზე.'
            : reason === 'existing_subscription'
            ? 'თქვენ უკვე გაქვთ Premium გამოწერა, პრომო კოდი საჭირო არ არის.'
            : reason === 'promo_limit_reached'
            ? 'ამ პრომო კოდის გამოყენების მაქსიმალური რაოდენობა ამოიწურა.'
            : 'პრომო კოდი არასწორია ან ვადაგასულია.');
        setPromoError(msg);
      }
    } catch {
      setPromoError('დაფიქსირდა შეცდომა კოდის შემოწმებისას.');
    } finally {
      setPromoLoading(false);
    }
  };

  // Restore cached invite data immediately for 0-latency display
  useEffect(() => {
    if (!user?.id) return;
    try {
      const cached = localStorage.getItem(`4andone_ref_data_${user.id}`);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (parsed?.code) {
          setData(parsed);
          setState('ready');
        }
      }
    } catch { /* ignore */ }
  }, [user?.id]);

  useEffect(() => {
    if (!user?.id) return;
    let cancelled = false;

    // Safety timeout: never hang in 'loading' longer than 4 seconds
    const timeout = setTimeout(() => {
      if (!cancelled) {
        setState(prev => (prev === 'loading' ? 'unavailable' : prev));
      }
    }, 4000);

    const loadData = async () => {
      try {
        let res = await sessionFetch(`/api/referral?tid=${user.id}`, { cache: 'no-store' });
        if (res.status === 401) {
          // Fallback to direct tid fetch
          res = await fetch(`/api/referral?tid=${user.id}`, { cache: 'no-store' });
        }

        if (cancelled) return;

        if (res.ok) {
          const d = await res.json();
          if (cancelled) return;
          if (d?.setup && d?.code) {
            setData(d);
            setState('ready');
            try {
              localStorage.setItem(`4andone_ref_data_${user.id}`, JSON.stringify(d));
            } catch { /* ignore */ }
            return;
          }
        }

        if (!cancelled) {
          setState(prev => (prev === 'loading' ? 'unavailable' : prev));
        }
      } catch {
        if (!cancelled) {
          setState(prev => (prev === 'loading' ? 'unavailable' : prev));
        }
      }
    };

    loadData();

    return () => {
      cancelled = true;
      clearTimeout(timeout);
    };
  }, [user?.id, sessionVersion, reloadKey]);

  // An invite was just accepted on this device → show it here too
  useEffect(() => {
    const onResult = () => setReloadKey(k => k + 1);
    window.addEventListener(REF_RESULT_EVENT, onResult);
    return () => window.removeEventListener(REF_RESULT_EVENT, onResult);
  }, []);

  const hero = (
    <div className="earn-hero">
      <div className="earn-hero-icon"><Gift size={28} /></div>
      <h1>Invite a friend, both get Premium</h1>
      <p>Your friend gets <strong>1 month of Premium free</strong> when they sign in with your link — and you get <strong>1 month</strong> too.</p>
    </div>
  );

  if (!isAuthenticated || !user) {
    return (
      <div className="earn-page">
        {hero}
        <div className="earn-card center">
          <p className="muted">Sign in with Telegram to get your personal invite link.</p>
          <TelegramLogin />
        </div>
        <style jsx>{styles}</style>
      </div>
    );
  }

  const link = data ? inviteLink(data.code) : '';
  const shareText = 'Ballroom & Latin practice music — sign in with my link and we both get 1 month of 4and.one Premium free:';

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch { /* clipboard blocked */ }
  };
  const share = async () => {
    if (navigator.share) {
      try { await navigator.share({ title: '4and.one Music', text: shareText, url: link }); } catch { /* cancelled */ }
    } else {
      copy();
    }
  };

  return (
    <div className="earn-page">
      {hero}

      {state === 'unavailable' && (
        <div className="earn-card center">
          <p className="muted">Could not load invite link right now. Please try again.</p>
          <button
            type="button"
            className="btn primary"
            style={{ marginTop: 14 }}
            onClick={() => {
              setState('loading');
              setReloadKey(k => k + 1);
            }}
          >
            Retry
          </button>
        </div>
      )}
      {state === 'loading' && <div className="earn-card center"><p className="muted">Loading your invite link…</p></div>}

      {state === 'ready' && data && (
        <>
          <div className="earn-card">
            <div className="card-title">Your invite link</div>
            <div className="link-row">
              <input className="link-input" value={link} readOnly onFocus={(e) => e.currentTarget.select()} aria-label="Your invite link" />
              <button type="button" className="btn primary" onClick={copy}>
                {copied ? <Check size={16} /> : <Copy size={16} />}<span>{copied ? 'Copied' : 'Copy'}</span>
              </button>
            </div>
            <div className="share-row">
              <a
                className="btn"
                href={`https://t.me/share/url?url=${encodeURIComponent(link)}&text=${encodeURIComponent(shareText)}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                <Send size={16} /><span>Invite</span>
              </a>
              <button type="button" className="btn" onClick={share}><Share2 size={16} /><span>Share</span></button>
            </div>
          </div>

          <div className="status-grid">
            <div className={`earn-card status ${data.myReward ? 'is-on' : ''}`}>
              <div className="status-icon"><Crown size={18} /></div>
              <div className="status-text">
                <span className="status-label">Your reward</span>
                {data.myReward ? (
                  <span className="status-detail">
                    1 month of Premium received on {fmtDate(data.myReward.at)}
                    {data.myReward.premiumUntil ? ` · until ${fmtDate(data.myReward.premiumUntil)}` : ' · you already had Premium'}
                  </span>
                ) : (
                  <span className="status-detail">Invite your first friend to get 1 month of Premium.</span>
                )}
              </div>
            </div>
            <div className={`earn-card status ${data.invitedBy ? 'is-on' : ''}`}>
              <div className="status-icon"><UserPlus size={18} /></div>
              <div className="status-text">
                <span className="status-label">Invited by</span>
                {data.invitedBy ? (
                  <span className="status-detail">
                    {data.invitedBy.name}{data.invitedBy.username ? ` (@${data.invitedBy.username})` : ''} · {fmtDate(data.invitedBy.at)}
                    {data.invitedBy.premiumUntil ? ` · free Premium until ${fmtDate(data.invitedBy.premiumUntil)}` : ''}
                  </span>
                ) : (
                  <span className="status-detail">You joined without an invite.</span>
                )}
              </div>
            </div>
          </div>

          <div className="earn-card">
            <div className="card-title"><Users size={16} /> Friends you invited <span className="count">{data.invited.length}</span></div>
            {data.invited.length === 0 ? (
              <p className="muted">No friends yet — send your link to dance partners and your club.</p>
            ) : (
              <ul className="friends">
                {data.invited.map((f, i) => (
                  <li key={`${f.at}-${i}`}>
                    <span className="friend-avatar">{f.name.charAt(0).toUpperCase()}</span>
                    <span className="friend-name">{f.name}{f.username && <span className="friend-handle"> @{f.username}</span>}</span>
                    <span className="friend-date">{fmtDate(f.at)}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="earn-card promo-card">
            <div className="card-title">
              <Gift size={16} /> Have a Promo Code?
            </div>
            <p className="muted">Enter an official partner or event promo code to unlock free Premium access.</p>
            {promoSuccess ? (
              <div className="promo-status-box success">
                <Check size={18} />
                <span>{promoSuccess}</span>
              </div>
            ) : null}
            {promoError ? (
              <div className="promo-status-box error">
                <span>{promoError}</span>
              </div>
            ) : null}
            {activePromoInfo ? (
              <div className="active-promo-banner">
                <Crown size={16} className="active-crown" />
                <span>Active Promo: <strong>{activePromoInfo.code}</strong> (Valid until {fmtDate(activePromoInfo.until)})</span>
              </div>
            ) : (
              <form onSubmit={handleClaimPromo} className="link-row promo-row">
                <div className="promo-input-wrapper">
                  <Tag size={16} className="promo-field-icon" />
                  <input
                    type="text"
                    className="link-input promo-input-field"
                    placeholder="Promo Code"
                    value={promoInput}
                    onChange={(e) => {
                      setPromoInput(e.target.value.toUpperCase());
                      setPromoError(null);
                    }}
                    disabled={promoLoading}
                  />
                </div>
                <button
                  type="submit"
                  className="btn primary promo-submit-btn"
                  disabled={promoLoading || !promoInput.trim()}
                >
                  {promoLoading ? 'Checking...' : 'Activate'}
                </button>
              </form>
            )}
          </div>

          <div className="earn-card rules">
            <div className="card-title">How it works</div>
            <ol>
              <li>Send your link to a friend.</li>
              <li>They open it and sign in with Telegram — Premium turns on for them right away for 1 month.</li>
              <li>You get 1 month of Premium for your first friend. Invite as many friends as you like — each of them gets their free month.</li>
              <li>Promo codes grant free trial access and can be used once per dancer. Only 1 active promo can run at a time.</li>
            </ol>
          </div>
        </>
      )}
      <style jsx>{styles}</style>
    </div>
  );
}

const styles = `
  .earn-page { max-width: 720px; margin: 0 auto; padding: 24px 0 140px; color: #fff; }
  .earn-hero { text-align: center; padding: 8px 8px 24px; }
  .earn-hero-icon {
    width: 60px; height: 60px; margin: 0 auto 14px; border-radius: 18px;
    display: flex; align-items: center; justify-content: center;
    background: rgba(16,185,129,0.15); color: #34d399;
  }
  .earn-hero h1 { margin: 0 0 8px; font-size: 26px; font-weight: 800; line-height: 1.2; }
  .earn-hero p { margin: 0 auto; max-width: 480px; color: #bdbdbd; font-size: 15px; line-height: 1.5; }
  .earn-card {
    background: #1f1f1f; border: 1px solid rgba(255,255,255,0.08);
    border-radius: 16px; padding: 18px; margin-bottom: 14px;
  }
  .earn-card.center { text-align: center; }
  .muted { margin: 0 0 4px; color: #9a9a9a; font-size: 14px; line-height: 1.5; }
  .earn-card.center .muted { margin-bottom: 16px; }
  .card-title { display: flex; align-items: center; gap: 8px; font-weight: 800; font-size: 15px; margin-bottom: 12px; }
  .count { margin-left: auto; background: rgba(255,255,255,0.08); border-radius: 999px; padding: 2px 10px; font-size: 13px; color: #d4d4d4; }
  .link-row { display: flex; gap: 8px; }
  .link-input {
    flex: 1; min-width: 0; height: 42px; padding: 0 12px; border-radius: 10px;
    background: #121212; border: 1px solid rgba(255,255,255,0.12); color: #fff; font-size: 14px;
  }
  .share-row { display: flex; gap: 8px; margin-top: 10px; flex-wrap: wrap; }
  .btn {
    display: inline-flex; align-items: center; justify-content: center; gap: 6px;
    height: 42px; padding: 0 16px; border-radius: 999px; flex-shrink: 0;
    background: transparent; border: 1px solid rgba(255,255,255,0.18); color: #fff;
    font-size: 14px; font-weight: 700; cursor: pointer; text-decoration: none;
  }
  .share-row .btn { flex: 1; }
  .btn.primary { background: #fff; color: #000; border-color: #fff; }
  .status-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; margin-bottom: 14px; }
  .status-grid .earn-card { margin-bottom: 0; }
  .status { display: flex; gap: 12px; align-items: flex-start; }
  .status-icon {
    width: 36px; height: 36px; border-radius: 10px; flex-shrink: 0;
    display: flex; align-items: center; justify-content: center;
    background: rgba(255,255,255,0.08); color: #aaa;
  }
  .status.is-on { border-color: rgba(16,185,129,0.4); }
  .status.is-on .status-icon { background: rgba(16,185,129,0.18); color: #34d399; }
  .status-text { display: flex; flex-direction: column; gap: 3px; min-width: 0; }
  .status-label { font-weight: 800; font-size: 14px; }
  .status-detail { color: #a3a3a3; font-size: 13px; line-height: 1.45; }
  .friends { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; }
  .friends li { display: flex; align-items: center; gap: 12px; padding: 10px 0; border-top: 1px solid rgba(255,255,255,0.06); }
  .friends li:first-child { border-top: none; }
  .friend-avatar {
    width: 34px; height: 34px; border-radius: 50%; flex-shrink: 0;
    display: flex; align-items: center; justify-content: center;
    background: #10b981; color: #fff; font-weight: 800; font-size: 14px;
  }
  .friend-name { flex: 1; min-width: 0; font-size: 14px; font-weight: 600; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .friend-handle { color: #8a8a8a; font-weight: 400; }
  .friend-date { color: #8a8a8a; font-size: 13px; flex-shrink: 0; }
  .rules ol { margin: 0; padding-left: 20px; color: #bdbdbd; font-size: 14px; line-height: 1.6; }
  .promo-row { margin-top: 14px; display: flex; gap: 10px; }
  .promo-input-wrapper {
    position: relative;
    flex: 1;
    display: flex;
    align-items: center;
  }
  .promo-field-icon {
    position: absolute;
    left: 14px;
    color: rgba(255, 255, 255, 0.4);
    pointer-events: none;
    transition: color 0.2s;
  }
  .promo-input-field {
    width: 100%;
    height: 44px;
    padding: 0 14px 0 40px !important;
    border-radius: 12px !important;
    background: #141416 !important;
    border: 1px solid rgba(255, 255, 255, 0.12) !important;
    color: #fff !important;
    font-size: 14.5px !important;
    font-weight: 600;
    letter-spacing: 0.5px;
    transition: all 0.2s ease;
  }
  .promo-input-field::placeholder {
    color: rgba(255, 255, 255, 0.35);
    font-weight: 500;
    letter-spacing: normal;
  }
  .promo-input-field:focus {
    outline: none;
    border-color: #10b981 !important;
    background: #18181b !important;
    box-shadow: 0 0 0 3px rgba(16, 185, 129, 0.15);
  }
  .promo-input-wrapper:focus-within .promo-field-icon {
    color: #10b981;
  }
  .promo-submit-btn {
    height: 44px;
    padding: 0 20px;
    border-radius: 12px;
    font-weight: 700;
    font-size: 14px;
    background: #fff;
    color: #000;
    border: none;
    cursor: pointer;
    transition: all 0.2s ease;
  }
  .promo-submit-btn:hover:not(:disabled) {
    background: #f3f4f6;
    transform: translateY(-1px);
  }
  .promo-submit-btn:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }
  .promo-status-box {
    margin-top: 12px; padding: 12px 14px; border-radius: 12px; font-size: 13.5px;
    display: flex; align-items: center; gap: 8px; line-height: 1.45;
  }
  .promo-status-box.success { background: rgba(16,185,129,0.12); color: #34d399; border: 1px solid rgba(16,185,129,0.3); }
  .promo-status-box.error { background: rgba(239,68,68,0.12); color: #f87171; border: 1px solid rgba(239,68,68,0.3); }
  .active-promo-banner {
    margin-top: 12px; padding: 12px 14px; border-radius: 12px;
    background: rgba(245,158,11,0.12); border: 1px solid rgba(245,158,11,0.3);
    color: #fbbf24; font-size: 14px; display: flex; align-items: center; gap: 8px;
  }
  .active-crown { color: #f59e0b; flex-shrink: 0; }
  @media (max-width: 640px) {
    .earn-page { padding: 16px 16px 140px; }
    .earn-hero h1 { font-size: 22px; }
    .status-grid { grid-template-columns: 1fr; }
    .promo-input-field { font-size: 16px !important; }
    .link-input { font-size: 15px; }
  }
  @media (max-width: 480px) {
    .promo-row { flex-direction: column; gap: 8px; }
    .promo-submit-btn { width: 100%; height: 44px; }
  }
`;
