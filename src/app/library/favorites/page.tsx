"use client";

import React from 'react';
import { Heart, Play, Clock, MoreHorizontal } from 'lucide-react';
import { useAudio } from '@/components/audio/AudioProvider';

const FavoritesPage = () => {
  const { togglePlay, isPlaying } = useAudio();

  return (
    <div className="favorites-page">
      <header className="page-header">
        <div className="heart-icon-large glass">
          <Heart size={64} fill="white" />
        </div>
        <div className="head-content">
          <span className="label">Playlist</span>
          <h1 className="title">Liked Songs</h1>
          <p className="stats">
            <span className="text-primary">4and.one User</span> • 5 Tracks
          </p>
        </div>
      </header>

      <div className="actions">
        <button className="play-btn-large" onClick={togglePlay}>
          {isPlaying ? <span className="pause-icon">||</span> : <Play fill="currentColor" size={24} />}
        </button>
      </div>

      <div className="empty-state">
        <Heart size={48} className="text-secondary" />
        <h3>Your liked songs will appear here</h3>
        <p>Save tracks by clicking the heart icon while listening.</p>
      </div>

      <style jsx>{`
        .favorites-page { padding: 24px; }
        .page-header { display: flex; align-items: flex-end; gap: 24px; margin-bottom: 32px; }
        .heart-icon-large { 
          width: 232px; height: 232px; border-radius: 12px; 
          background: linear-gradient(135deg, #450af5, #c4efd9);
          display: flex; align-items: center; justify-content: center;
        }
        .title { font-size: 6rem; font-weight: 900; margin: 0; }
        .play-btn-large { 
          width: 56px; height: 56px; border-radius: 50%; background: var(--primary); 
          color: black; display: flex; align-items: center; justify-content: center; 
        }
        .empty-state {
          display: flex; flex-direction: column; align-items: center; justify-content: center;
          padding: 60px 0; color: var(--text-secondary); gap: 16px;
        }
        .empty-state h3 { color: white; font-size: 24px; }
      `}</style>
    </div>
  );
};

export default FavoritesPage;
