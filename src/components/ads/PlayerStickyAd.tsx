"use client";

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useAudio } from '@/components/audio/AudioProvider';
import { AdBanner } from './AdBanner';
import { Crown, Sparkles, ArrowRight } from 'lucide-react';

export default function PlayerStickyAd() {
  const { isPremium, isLoading, setIsSubscriptionModalOpen } = useAuth();
  const { isLoaded, title, currentTrack } = useAudio();
  const [adStatus, setAdStatus] = useState<'loading' | 'filled' | 'unfilled'>('loading');

  const isPlayerActive = (isLoaded || !!currentTrack) && title !== "No Track Selected";

  // Fallback timer: if AdSense hasn't reported 'filled' in 2 seconds, show our House Premium Banner
  useEffect(() => {
    const timer = setTimeout(() => {
      setAdStatus((prev) => (prev === 'loading' ? 'unfilled' : prev));
    }, 2000);
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
            onStatusChange={(status) => setAdStatus(status)}
          />
        </div>

        {/* Modern HTML/CSS House Premium Banner in English */}
        {adStatus === 'unfilled' && (
          <div 
            className="house-premium-ad-banner"
            onClick={() => setIsSubscriptionModalOpen(true)}
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
                  <span>Enjoy Unlimited Music</span>
                  <span className="house-accent-pill">Ad-Free</span>
                </div>
                <div className="house-ad-subline">
                  <Sparkles size={11} className="house-sparkle" />
                  <span>Unlimited Downloads • High Fidelity Audio</span>
                </div>
              </div>
            </div>

            <button 
              type="button"
              className="house-ad-cta-btn"
              onClick={(e) => {
                e.stopPropagation();
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
