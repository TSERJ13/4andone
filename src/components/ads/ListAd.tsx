"use client";

import React, { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { AdBanner } from '@/components/ads/AdBanner';

// In-list ad, placed BETWEEN tracks (like Spotify's feed). This is the
// AdSense-compliant placement: the ad sits next to real page content, is
// clearly labelled, never blocks the screen and never makes anyone wait.
// Premium users never see it.

// "სიის რეკლამა" (Responsive) — its own unit so Reports show list revenue separately.
const LIST_AD_SLOT = process.env.NEXT_PUBLIC_ADSENSE_LIST_SLOT || '4624552899';
export const LIST_AD_EVERY = 3; // one ad after every 3 tracks
const MAX_ADS_PER_LIST = 10;

/** True when an ad should follow the track at this (0-based) index. */
export const shouldShowListAdAfter = (index: number, total: number) => {
  const position = index + 1;
  return position % LIST_AD_EVERY === 0
    && position < total                       // never as the very last row
    && position / LIST_AD_EVERY <= MAX_ADS_PER_LIST;
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
    if (status !== 'pending' || !requested) return;
    const t = setTimeout(() => setStatus((s) => (s === 'pending' ? 'empty' : s)), NO_ANSWER_MS);
    return () => clearTimeout(t);
  }, [status, requested]);

  if (isPremium || status === 'empty') return null;
  return (
    <div className={`list-ad ${status}`} aria-label="Advertisement">
      {status === 'filled' && <span className="list-ad-label">Sponsored</span>}
      <AdBanner
        slot={LIST_AD_SLOT}
        responsive
        height={100}
        onStatusChange={(s) => setStatus(s === 'filled' ? 'filled' : 'empty')}
        onRequested={() => setRequested(true)}
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

export default ListAd;
