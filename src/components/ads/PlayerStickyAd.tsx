"use client";

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useAudio } from '@/components/audio/AudioProvider';
import { AdBanner } from './AdBanner';
import { recordAdEvent } from '@/lib/adEvents';
import { Crown, Ban, Trophy, Download, ArrowRight } from 'lucide-react';

export default function PlayerStickyAd() {
  const { isPremium, isLoading, setIsSubscriptionModalOpen } = useAuth();
  const { isLoaded, title, currentTrack } = useAudio();
  const [adStatus, setAdStatus] = useState<'loading' | 'filled' | 'unfilled'>('loading');

  const isPlayerActive = (isLoaded || !!currentTrack) && title !== "No Track Selected";

  // No answer from AdSense (ad blocker / slow network) → our Premium banner.
  // It used to switch after 2s and hide the ad slot with display:none; AdSense
  // often answers later, and a hidden slot (width 0) is never filled — so the
  // Google ad could never appear. 8s matches the list ad.
  useEffect(() => {
    const timer = setTimeout(() => {
      setAdStatus((prev) => {
        if (prev !== 'loading') return prev;
        recordAdEvent('strip', 'no_answer');
        return 'unfilled';
      });
    }, 8000);
    return () => clearTimeout(timer);
  }, []);

  if (isLoading || isPremium) return null;

  return (
    <div 
      className={`player-sticky-ad-container ${isPlayerActive ? 'player-active' : 'player-inactive'}`} 
      aria-label="Advertisement"
    >
      <div className="player-sticky-ad-inner">
        {/* AdSense Unit (Hidden if unfilled to show house banner cleanly) */}
        <div style={{ display: adStatus === 'unfilled' ? 'none' : 'block', width: '100%' }}>
          <AdBanner 
            variant="auto" 
            className="player-ad-unit" 
            onStatusChange={(status) => {
              recordAdEvent('strip', status === 'filled' ? 'filled' : 'unfilled');
              setAdStatus(status);
            }}
            onRequested={() => recordAdEvent('strip', 'requested')}
            onAdClick={() => recordAdEvent('strip', 'click')}
          />
        </div>

        {/* Modern HTML/CSS House Premium Banner in English with 3 Core Features */}
        {adStatus === 'unfilled' && (
          <div 
            className="house-premium-ad-banner"
            onClick={() => { recordAdEvent('strip', 'promo_click'); setIsSubscriptionModalOpen(true); }}
            onKeyDown={(e) => { if (e.key === 'Enter') setIsSubscriptionModalOpen(true); }}
            role="button"
            tabIndex={0}
          >
            <div className="house-ad-glow-effect" />
            
            <div className="house-ad-left">
              <div className="house-ad-crown-box">
                <Crown size={16} className="house-crown-icon" />
              </div>
              <div className="house-ad-text-group">
                <div className="house-ad-headline">
                  <span>Unlock 4ANDONE Premium</span>
                </div>
                <div className="house-ad-features-row">
                  <span className="house-feature-chip">
                    <Ban size={10} /> Ad-Free
                  </span>
                  <span className="house-feature-chip">
                    <Trophy size={10} /> Final Mode
                  </span>
                  <span className="house-feature-chip house-chip-extra">
                    <Download size={10} /> Offline Mode
                  </span>
                </div>
              </div>
            </div>

            <button 
              type="button"
              className="house-ad-cta-btn"
              onClick={(e) => {
                e.stopPropagation();
                recordAdEvent('strip', 'promo_click');
                setIsSubscriptionModalOpen(true);
              }}
            >
              <span className="cta-btn-text">GET PREMIUM</span>
              <ArrowRight size={14} className="cta-arrow" />
              <div className="cta-shimmer" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
