"use client";

import React, { useEffect, useState } from 'react';
import { Gift, Copy, Check, Share2, Send, Users, UserPlus, Crown } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { TelegramLogin } from '@/components/auth/TelegramLogin';
import { inviteLink, REF_RESULT_EVENT } from '@/utils/referral';

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
  const { user, isAuthenticated, sessionVersion } = useAuth();
  const [data, setData] = useState<EarnData | null>(null);
  const [state, setState] = useState<'loading' | 'ready' | 'unavailable'>('loading');
  const [copied, setCopied] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    if (!user?.id) return;
    let cancelled = false;
    fetch(`/api/referral?tid=${user.id}`, { cache: 'no-store' })
      .then(r => {
        if (r.status === 401) return null; // server session still being set up
        if (r.status === 503) { if (!cancelled) setState('unavailable'); return null; }
        return r.ok ? r.json() : null;
      })
      .then(d => { if (!cancelled && d?.setup) { setData(d); setState('ready'); } })
      .catch(() => { if (!cancelled) setState('unavailable'); });
    return () => { cancelled = true; };
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
        <div className="earn-card center"><p className="muted">Invites are being set up — please check back soon.</p></div>
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

          <div className="earn-card rules">
            <div className="card-title">How it works</div>
            <ol>
              <li>Send your link to a friend.</li>
              <li>They open it and sign in with Telegram — Premium turns on for them right away for 1 month.</li>
              <li>You get 1 month of Premium for your first friend. Invite as many friends as you like — each of them gets their free month.</li>
              <li>The offer is for new listeners, and each person can receive it once.</li>
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
  @media (max-width: 640px) {
    .earn-page { padding: 16px 16px 140px; }
    .earn-hero h1 { font-size: 22px; }
    .status-grid { grid-template-columns: 1fr; }
  }
`;
