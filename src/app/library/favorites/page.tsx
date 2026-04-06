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
        .favorites-page { padding: 40px; padding-bottom: 120px; }
        .page-header { display: flex; align-items: flex-end; gap: 32px; margin-bottom: 40px; }
        .heart-icon-large { 
          width: 232px; height: 232px; border-radius: 12px; 
          background: linear-gradient(135deg, #1db954, #191414);
          display: flex; align-items: center; justify-content: center;
          flex-shrink: 0;
          box-shadow: 0 12px 32px rgba(0,0,0,0.5);
        }
        .head-content { display: flex; flex-direction: column; gap: 8px; }
        .label { text-transform: uppercase; font-size: 11px; font-weight: 800; letter-spacing: 1px; color: #71717a; }
        .title { font-size: 5rem; font-weight: 950; margin: 0; letter-spacing: -2px; line-height: 1; }
        .stats { font-size: 14px; font-weight: 600; color: #71717a; }
        
        .actions { display: flex; align-items: center; height: 100px; }
        .play-btn-large { 
          width: 56px; height: 56px; border-radius: 50%; background: var(--primary, #1db954); 
          color: black; display: flex; align-items: center; justify-content: center; 
          transition: transform 0.2s;
        }
        .play-btn-large:hover { transform: scale(1.05); }

        .empty-state {
          display: flex; flex-direction: column; align-items: center; justify-content: center;
          padding: 80px 0; color: #71717a; gap: 20px; text-align: center;
        }
        .empty-state h3 { color: white; font-size: 24px; font-weight: 800; }
        .empty-state p { max-width: 300px; line-height: 1.5; font-size: 14px; }

        @media (max-width: 768px) {
          .favorites-page { padding: 20px; }
          .page-header { flex-direction: column; align-items: center; text-align: center; gap: 24px; margin-top: 20px; }
          .heart-icon-large { width: 140px; height: 140px; border-radius: 20px; }
          .title { font-size: 2.2rem; letter-spacing: -1px; }
          .actions { justify-content: center; height: 80px; }
          .empty-state { padding: 40px 0; }
          .empty-state h3 { font-size: 20px; }
        }
      `}</style>
    </div>
  );
};

export default FavoritesPage;
