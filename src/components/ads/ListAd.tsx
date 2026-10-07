"use client";

import React, { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { useAudioControls } from '@/components/audio/AudioProvider';
import { useAuth } from '@/context/AuthContext';
import { AdBanner, logAdEvent } from '@/components/ads/AdBanner';

// ONE in-list ad, shown directly under the track the user starts as their
// 3rd, 6th, 9th… track. Only one at a time: when the next one comes, the ad
// moves under that track. It is a banner between tracks (no sound, nothing
// blocks the screen), clearly labelled. Premium users never see it.

// "სიის რეკლამა" (Responsive) — its own unit so Reports show list revenue separately.
const LIST_AD_SLOT = process.env.NEXT_PUBLIC_ADSENSE_LIST_SLOT || '4624552899';
export const LIST_AD_EVERY = 3; // every 3rd started track gets the ad under it
const PLAY_COUNT_KEY = '4andone-list-ad-plays';

// Tiny shared store: which track the ad sits under.
let anchorTrackId: string | null = null;
const listeners = new Set<() => void>();
const subscribe = (fn: () => void) => { listeners.add(fn); return () => { listeners.delete(fn); }; };
const setAnchor = (id: string | null) => { anchorTrackId = id; listeners.forEach((fn) => fn()); };

/** Id of the track the single list ad is shown under (or null). */
export const useListAdAnchor = () => useSyncExternalStore(subscribe, () => anchorTrackId, () => null);

/** Mounted once (AppLayout): counts started tracks and moves the ad every 3rd one. */
export const ListAdAnchorTracker: React.FC = () => {
  const { trackId, isFinalMode } = useAudioControls();
  const lastId = useRef<string | null>(null);

  useEffect(() => {
    if (!trackId || trackId === lastId.current) return;
    lastId.current = trackId;
    if (isFinalMode) return; // Final sessions don't count
    let n = 0;
    try { n = Number(sessionStorage.getItem(PLAY_COUNT_KEY) || 0); } catch { /* ignore */ }
    n += 1;
    try { sessionStorage.setItem(PLAY_COUNT_KEY, String(n)); } catch { /* ignore */ }
    if (n % LIST_AD_EVERY === 0) {
      logAdEvent(LIST_AD_SLOT, `play #${n} → list ad under this track`);
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
        logAdEvent(LIST_AD_SLOT, requested ? 'no answer from Google in 8s → hidden' : 'never requested → hidden');
        return 'empty';
      }),
      requested ? NO_ANSWER_MS : NO_ANSWER_MS + 4000,
    );
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
