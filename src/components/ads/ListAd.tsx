"use client";

import React from 'react';
import { useAuth } from '@/context/AuthContext';
import { AdBanner } from '@/components/ads/AdBanner';

// In-list ad, placed BETWEEN tracks (like Spotify's feed). This is the
// AdSense-compliant placement: the ad sits next to real page content, is
// clearly labelled, never blocks the screen and never makes anyone wait.
// Premium users never see it.

// "სიის რეკლამა" (Responsive) — its own unit so Reports show list revenue separately.
const LIST_AD_SLOT = process.env.NEXT_PUBLIC_ADSENSE_LIST_SLOT || '4624552899';
export const LIST_AD_EVERY = 5; // one ad after every 5 tracks
const MAX_ADS_PER_LIST = 10;

/** True when an ad should follow the track at this (0-based) index. */
export const shouldShowListAdAfter = (index: number, total: number) => {
  const position = index + 1;
  return position % LIST_AD_EVERY === 0
    && position < total                       // never as the very last row
    && position / LIST_AD_EVERY <= MAX_ADS_PER_LIST;
};

export const ListAd: React.FC = () => {
  const { isPremium } = useAuth();
  if (isPremium) return null;
  return (
    <div className="list-ad" aria-label="Advertisement">
      <span className="list-ad-label">Sponsored</span>
      <AdBanner slot={LIST_AD_SLOT} responsive height={100} />
      <style jsx>{`
        .list-ad {
          margin: 6px 0 10px;
          padding: 8px 0 4px;
          border-radius: 16px;
          background: rgba(255, 255, 255, 0.02);
          border: 1px dashed rgba(255, 255, 255, 0.06);
          overflow: hidden;
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
