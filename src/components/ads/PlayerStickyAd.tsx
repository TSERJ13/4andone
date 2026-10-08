"use client";

import React from 'react';
import { useAuth } from '@/context/AuthContext';
import { AdBanner } from './AdBanner';

export default function PlayerStickyAd() {
  const { isPremium, isLoading } = useAuth();

  if (isLoading || isPremium) return null;

  return (
    <div className="player-sticky-ad-container" aria-label="Advertisement">
      <div className="player-sticky-ad-inner">
        <AdBanner variant="auto" className="player-ad-unit" />
      </div>
    </div>
  );
}
