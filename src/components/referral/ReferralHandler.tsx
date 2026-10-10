"use client";

import React, { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { Gift, X, Sparkles } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { captureRefFromUrl, clearPendingRef, getPendingRef, REF_RESULT_EVENT } from '@/utils/referral';

type Result =
  | { ok: true; inviter: { name: string; username: string | null }; premiumUntil: string | null; inviterRewarded: boolean }
  | { ok: false; reason: string };

const fmtDate = (iso: string) => new Date(iso).toLocaleDateString(undefined, { day: 'numeric', month: 'long', year: 'numeric' });

const FAIL_TEXT: Record<string, string> = {
  own_code: "That's your own invite link — share it with a friend instead.",
  already_used: 'You have already accepted an invite. The free month can be received only once.',
  not_new: 'Invite gifts are for new listeners only — this account was already registered.',
  bad_code: 'This invite link is not valid. Ask your friend to send it again.',
};

/**
 * Invite links (?ref=CODE): remembers the code, asks a signed-out visitor to
 * sign in with Telegram, then accepts the invite on the server and shows the
 * result ("1 month Premium activated, a gift from …").
 */
export default function ReferralHandler() {
  const { user, isLoading, sessionVersion, setIsAuthModalOpen, refreshPremium } = useAuth();
  const [pending, setPending] = useState<string | null>(null);
  const [promptHidden, setPromptHidden] = useState(false);
  const [result, setResult] = useState<Result | null>(null);
  const claimingRef = useRef(false);

  useEffect(() => {
    const fromUrl = captureRefFromUrl();
    // eslint-disable-next-line react-hooks/set-state-in-effect -- read once from the URL / storage
    setPending(fromUrl || getPendingRef());
  }, []);

  // Signed in (and the server session is ready) → accept the invite once
  useEffect(() => {
    if (!pending || !user?.id || sessionVersion === 0 || claimingRef.current) return;
    claimingRef.current = true;
    fetch('/api/referral/claim', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ code: pending, tid: user.id }),
    })
      .then(r => r.json().catch(() => null))
      .then(async (data: Result | null) => {
        if (!data) { claimingRef.current = false; return; }
        const definitive = data.ok || (data.reason in FAIL_TEXT);
        if (!definitive) { claimingRef.current = false; return; } // server busy / not set up — try next visit
        clearPendingRef();
        setPending(null);
        if (data.ok) await refreshPremium();
        setResult(data);
        window.dispatchEvent(new CustomEvent(REF_RESULT_EVENT, { detail: data }));
      })
      .catch(() => { claimingRef.current = false; });
  }, [pending, user?.id, sessionVersion, refreshPremium]);

  if (result) {
    return (
      <div className="ref-backdrop" role="dialog" aria-modal="true" aria-labelledby="ref-title" onClick={() => setResult(null)}>
        <div className="ref-card" onClick={(e) => e.stopPropagation()}>
          <button type="button" className="ref-close" onClick={() => setResult(null)} aria-label="Close"><X size={18} /></button>
          <div className={`ref-icon ${result.ok ? 'ok' : ''}`}>{result.ok ? <Sparkles size={26} /> : <Gift size={26} />}</div>
          {result.ok ? (
            <>
              <h2 id="ref-title">Premium is on!</h2>
              <p>
                <strong>{result.inviter.name}</strong> invited you — you both got <strong>1 month of Premium</strong> for free.
                {result.premiumUntil && <> Yours is active until <strong>{fmtDate(result.premiumUntil)}</strong>.</>}
              </p>
              <p className="ref-sub">No ads, Final Mode unlocked. Invite your own friends from Earn Premium.</p>
              <div className="ref-actions">
                <button type="button" className="ref-btn primary" onClick={() => setResult(null)}>Start listening</button>
                <Link href="/earn" className="ref-btn" onClick={() => setResult(null)}>Earn Premium</Link>
              </div>
            </>
          ) : (
            <>
              <h2 id="ref-title">Invite not applied</h2>
              <p>{FAIL_TEXT[result.reason] || 'Something went wrong.'}</p>
              <div className="ref-actions">
                <button type="button" className="ref-btn primary" onClick={() => setResult(null)}>OK</button>
              </div>
            </>
          )}
        </div>
        <style jsx>{styles}</style>
      </div>
    );
  }

  if (pending && !user && !isLoading && !promptHidden) {
    return (
      <div className="ref-sheet" role="dialog" aria-labelledby="ref-sheet-title">
        <div className="ref-icon ok small"><Gift size={20} /></div>
        <div className="ref-sheet-text">
          <strong id="ref-sheet-title">A friend invited you</strong>
          <span>Sign in with Telegram and you both get 1 month of Premium free.</span>
        </div>
        <button type="button" className="ref-btn primary" onClick={() => setIsAuthModalOpen(true)}>Sign in</button>
        <button type="button" className="ref-close inline" onClick={() => setPromptHidden(true)} aria-label="Not now"><X size={16} /></button>
        <style jsx>{styles}</style>
      </div>
    );
  }

  return null;
}

const styles = `
  .ref-backdrop {
    position: fixed;
    inset: 0;
    z-index: 3000;
    background: rgba(0, 0, 0, 0.7);
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 16px;
  }
  .ref-card {
    position: relative;
    width: 100%;
    max-width: 380px;
    background: #181818;
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 20px;
    padding: 28px 24px 22px;
    text-align: center;
    color: #fff;
  }
  .ref-card h2 {
    margin: 14px 0 8px;
    font-size: 20px;
    font-weight: 800;
  }
  .ref-card p {
    margin: 0 0 8px;
    color: #d4d4d4;
    font-size: 14px;
    line-height: 1.5;
  }
  .ref-card .ref-sub {
    color: #9a9a9a;
    font-size: 13px;
  }
  .ref-icon {
    width: 56px;
    height: 56px;
    margin: 0 auto;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    background: rgba(255, 255, 255, 0.08);
    color: #e5e5e5;
  }
  .ref-icon.ok {
    background: rgba(34, 197, 94, 0.15);
    color: #4ade80;
  }
  .ref-icon.small {
    width: 40px;
    height: 40px;
    margin: 0;
    flex-shrink: 0;
  }
  .ref-actions {
    display: flex;
    gap: 10px;
    justify-content: center;
    margin-top: 16px;
    flex-wrap: wrap;
  }
  .ref-btn {
    border: 1px solid rgba(255, 255, 255, 0.18);
    background: transparent;
    color: #fff;
    border-radius: 999px;
    padding: 10px 18px;
    font-size: 14px;
    font-weight: 700;
    cursor: pointer;
    text-decoration: none;
    white-space: nowrap;
  }
  .ref-btn.primary {
    background: #fff;
    color: #000;
    border-color: #fff;
  }
  .ref-close {
    position: absolute;
    top: 12px;
    right: 12px;
    background: none;
    border: none;
    color: #9a9a9a;
    cursor: pointer;
    padding: 6px;
  }
  .ref-close.inline {
    position: static;
    flex-shrink: 0;
  }
  .ref-sheet {
    position: fixed;
    left: 16px;
    right: 16px;
    bottom: calc(var(--yt-player-height, 72px) + 16px + env(safe-area-inset-bottom, 0px));
    z-index: 2500;
    max-width: 520px;
    margin: 0 auto;
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 12px 12px 12px 14px;
    border-radius: 16px;
    background: #202020;
    border: 1px solid rgba(255, 255, 255, 0.12);
    box-shadow: 0 12px 32px rgba(0, 0, 0, 0.5);
    color: #fff;
  }
  .ref-sheet-text {
    display: flex;
    flex-direction: column;
    gap: 2px;
    flex: 1;
    min-width: 0;
    font-size: 13px;
    color: #cfcfcf;
    line-height: 1.35;
  }
  .ref-sheet-text strong {
    color: #fff;
    font-size: 14px;
  }
`;
