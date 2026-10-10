"use client";

import React, { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { AdBanner } from './AdBanner';
import { recordAdEvent } from '@/lib/adEvents';

/**
 * Banner at the TOP of the opened (full) player — the bottom ad strip is
 * covered by the full player. Kept far from Play / Next and the seek bar so
 * it can't be tapped by accident. One request per opening (the player is
 * opened by the listener). Free plan only; disappears if no ad is served.
 */
export default function FullPlayerAd({ className = '' }: { className?: string }) {
  const { isPremium, isLoading } = useAuth();
  const [status, setStatus] = useState<'loading' | 'filled' | 'unfilled'>('loading');

  // No answer (ad blocker / no ad) → remove the empty space
  useEffect(() => {
    const t = setTimeout(() => setStatus(prev => {
      if (prev !== 'loading') return prev;
      recordAdEvent('strip', 'no_answer');
      return 'unfilled';
    }), 8000);
    return () => clearTimeout(t);
  }, []);

  if (isLoading || isPremium || status === 'unfilled') return null;

  return (
    <div className={`full-player-ad ${className}`} aria-label="Advertisement" onClick={(e) => e.stopPropagation()}>
      <span className="full-player-ad-label">Ad</span>
      <AdBanner
        variant="auto"
        onStatusChange={(s) => {
          recordAdEvent('strip', s === 'filled' ? 'filled' : 'unfilled');
          setStatus(s);
        }}
        onRequested={() => recordAdEvent('strip', 'requested')}
        onAdClick={() => recordAdEvent('strip', 'click')}
      />
      <style jsx>{`
        .full-player-ad {
          position: relative;
          display: flex;
          justify-content: center;
          align-items: center;
          width: 100%;
          min-height: 50px;
          flex-shrink: 0;
        }
        .full-player-ad-label {
          position: absolute;
          top: -14px;
          left: 50%;
          transform: translateX(-50%);
          font-size: 10px;
          letter-spacing: 0.5px;
          text-transform: uppercase;
          color: rgba(255, 255, 255, 0.4);
        }
      `}</style>
    </div>
  );
}
