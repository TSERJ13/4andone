"use client";

import React, { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { useAudioControls } from '@/components/audio/AudioProvider';
import { usePathname } from 'next/navigation';
import { Sparkles } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { AdBanner, logAdEvent } from '@/components/ads/AdBanner';
import { recordAdEvent } from '@/lib/adEvents';

// ONE in-list ad per page view. It appears under the 2nd track the user
// starts on a page and then STAYS there — it is never moved or re-requested
// on the same page (AdSense does not allow refreshing ads; moving it under
// every new track re-requested an ad each time). A new page (another style,
// album, search…) is a new page view and gets its own ad. It is a banner
// between tracks (no sound, nothing blocks the screen), clearly labelled.
// Premium users never see it.

// "სიის რეკლამა" (Responsive) — its own unit so Reports show list revenue separately.
const LIST_AD_SLOT = process.env.NEXT_PUBLIC_ADSENSE_LIST_SLOT || '4624552899';
export const LIST_AD_AFTER_PLAYS = 2; // shown under the 2nd track started on a page

// Tiny shared store: which track the ad sits under.
let anchorTrackId: string | null = null;
const listeners = new Set<() => void>();
const subscribe = (fn: () => void) => { listeners.add(fn); return () => { listeners.delete(fn); }; };
const setAnchor = (id: string | null) => { anchorTrackId = id; listeners.forEach((fn) => fn()); };

/** Id of the track the single list ad is shown under (or null). */
export const useListAdAnchor = () => useSyncExternalStore(subscribe, () => anchorTrackId, () => null);

/** Mounted once (AppLayout): places the page's single list ad, then keeps it put. */
export const ListAdAnchorTracker: React.FC = () => {
  const { trackId, isFinalMode } = useAudioControls();
  const pathname = usePathname();
  const lastId = useRef<string | null>(null);
  const playsOnPage = useRef(0);

  // New page view → the next page gets its own ad
  useEffect(() => {
    playsOnPage.current = 0;
    setAnchor(null);
  }, [pathname]);

  useEffect(() => {
    if (!trackId || trackId === lastId.current) return;
    lastId.current = trackId;
    if (isFinalMode) return; // Final sessions don't count
    if (anchorTrackId) return; // this page already has its ad — never move it
    playsOnPage.current += 1;
    if (playsOnPage.current >= LIST_AD_AFTER_PLAYS) {
      logAdEvent(LIST_AD_SLOT, `play #${playsOnPage.current} on this page → list ad under this track (stays)`);
      setAnchor(trackId);
    }
  }, [trackId, isFinalMode]);

  return null;
};

// How long to wait for AdSense's answer before treating the slot as blocked
// (ad blockers never answer). Then the block disappears.
const NO_ANSWER_MS = 8000;

export const ListAd: React.FC = () => {
  const { isPremium } = useAuth();
  // pending → slot visible while AdSense decides (hidden slots are not allowed)
  // filled  → shown with the "Sponsored" label
  // empty   → no ad / blocked: the block disappears, tracks close up
  const [status, setStatus] = useState<'pending' | 'filled' | 'empty'>('pending');
  // The wait starts when the ad is actually requested (ads further down the
  // list are only requested when the user scrolls near them).
  const [requested, setRequested] = useState(false);

  useEffect(() => {
    if (status !== 'pending') return;
    // Normally the wait starts at the request; but if the request never
    // happens (or never gets an answer) the empty space must not stay forever.
    const t = setTimeout(
      () => setStatus((s) => {
        if (s !== 'pending') return s;
        logAdEvent(LIST_AD_SLOT, requested ? 'no answer from Google in 8s → Premium card' : 'never requested → Premium card');
        if (requested) recordAdEvent('list', 'no_answer');
        return 'empty';
      }),
      requested ? NO_ANSWER_MS : NO_ANSWER_MS + 4000,
    );
    return () => clearTimeout(t);
  }, [status, requested]);

  if (isPremium) return null;
  // Google had no ad (or it was blocked): show our own Premium card instead.
  if (status === 'empty') return <PremiumPromoCard />;
  return (
    <div className={`list-ad ${status}`} aria-label="Advertisement">
      {status === 'filled' && <span className="list-ad-label">Sponsored</span>}
      <AdBanner
        slot={LIST_AD_SLOT}
        responsive
        // Fixed 100px-tall slot: on phones a responsive "auto" unit picked a big
        // 300×250 box that broke the track list. 100px → a slim banner.
        fillHeight="100px"
        onStatusChange={(s) => {
          recordAdEvent('list', s === 'filled' ? 'filled' : 'unfilled');
          if (s === 'unfilled') logAdEvent(LIST_AD_SLOT, 'no Google ad → Premium card');
          setStatus(s === 'filled' ? 'filled' : 'empty');
        }}
        onRequested={() => { setRequested(true); recordAdEvent('list', 'requested'); }}
        onAdClick={() => recordAdEvent('list', 'click')}
      />
      <style jsx>{`
        .list-ad {
          margin: 6px 0 10px;
          padding: 8px 0 4px;
          border-radius: 16px;
          background: rgba(255, 255, 255, 0.02);
          border: 1px solid rgba(255, 255, 255, 0.06);
          overflow: hidden;
        }
        /* While AdSense decides: a quiet slot, no frame or label */
        .list-ad.pending {
          background: transparent;
          border-color: transparent;
          padding: 0;
          /* NO content-visibility here: off-screen it gives the ad slot width 0,
             and AdSense then never fills it ("availableWidth=0"). */
        }
        .list-ad-label {
          display: block;
          font-size: 10px;
          letter-spacing: 0.6px;
          text-transform: uppercase;
          color: #71717a;
          padding: 0 14px 6px;
        }
      `}</style>
    </div>
  );
};

/** Our own card (not an ad) shown where Google had no ad to show. */
const PremiumPromoCard: React.FC = () => {
  const { setIsSubscriptionModalOpen } = useAuth();
  return (
    <button
      type="button"
      className="premium-promo"
      onClick={() => { recordAdEvent('list', 'promo_click'); setIsSubscriptionModalOpen(true); }}
    >
      <span className="premium-promo-icon"><Sparkles size={18} /></span>
      <span className="premium-promo-text">
        <strong>Listen without ads</strong>
        <span>Ad-Free Premium · only $1.99/mo</span>
      </span>
      <span className="premium-promo-btn">Upgrade</span>
      <style jsx>{`
        .premium-promo {
          width: 100%;
          display: flex;
          align-items: center;
          gap: 12px;
          margin: 6px 0 10px;
          padding: 12px 14px;
          border-radius: 16px;
          border: 1px solid rgba(29, 185, 84, 0.3);
          background: linear-gradient(135deg, rgba(29, 185, 84, 0.12), rgba(29, 185, 84, 0.03));
          color: #fff;
          text-align: left;
          cursor: pointer;
          transition: border-color 0.15s, background-color 0.15s;
        }
        .premium-promo:hover { border-color: rgba(29, 185, 84, 0.6); }
        .premium-promo-icon {
          width: 36px;
          height: 36px;
          flex-shrink: 0;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #1db954;
          background: rgba(29, 185, 84, 0.15);
        }
        .premium-promo-text { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 2px; }
        .premium-promo-text strong { font-size: 14px; font-weight: 800; }
        .premium-promo-text span { font-size: 12px; color: #1db954; font-weight: 600; }
        .premium-promo-btn {
          flex-shrink: 0;
          padding: 8px 16px;
          border-radius: 999px;
          background: #1db954;
          color: #000;
          font-size: 13px;
          font-weight: 800;
        }
      `}</style>
    </button>
  );
};

export default ListAd;
