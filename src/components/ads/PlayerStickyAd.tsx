"use client";

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useAudio } from '@/components/audio/AudioProvider';
import { AdBanner } from './AdBanner';
import { Crown, Zap } from 'lucide-react';

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

        {/* House Premium Banner (Shown when AdSense is unfilled / blocked / fallback) */}
        {adStatus === 'unfilled' && (
          <div 
            className="house-premium-ad-banner"
            onClick={() => setIsSubscriptionModalOpen(true)}
            role="button"
            tabIndex={0}
          >
            <div className="house-ad-left">
              <div className="house-ad-icon-badge">
                <Crown size={15} color="#f59e0b" />
              </div>
              <div className="house-ad-text">
                <span className="house-ad-title">
                  ისიამოვნეთ მუსიკით <span className="highlight-green">რეკლამის გარეშე</span>
                </span>
                <span className="house-ad-subtitle">
                  გადადით 4ANDONE Premium-ზე 🚀
                </span>
              </div>
            </div>
            <button 
              type="button"
              className="house-ad-btn"
              onClick={(e) => {
                e.stopPropagation();
                setIsSubscriptionModalOpen(true);
              }}
            >
              <Zap size={13} fill="currentColor" />
              <span>Get Premium</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
