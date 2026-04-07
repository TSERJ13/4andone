"use client";

import React from 'react';
import { Heart, Play, Clock, MoreHorizontal, Music, Flag } from 'lucide-react';
import { useAudio } from '@/components/audio/AudioProvider';
import { useStudio } from '@/components/admin/StudioProvider';
import { getMPMFromBPM } from '@/utils/audio';

const FavoritesPage = () => {
  const { togglePlay, isPlaying, title: playingTitle, loadTrack } = useAudio();
  const { tracks, finalTracks, addToFinal, removeFromFinal } = useStudio();

  const likedTracks = tracks.filter(t => t.isFavorite);

  const handlePlayAll = () => {
    if (likedTracks.length > 0) {
      loadTrack(likedTracks[0]);
    }
  };

  return (
    <div className="favorites-page animate-in">
      <header className="page-header">
        <div className="heart-icon-large glass">
          <Heart size={64} fill="white" />
        </div>
        <div className="head-content">
          <span className="label">Playlist</span>
          <h1 className="title">Liked Songs</h1>
          <p className="stats">
            <span className="text-primary">4and.one User</span> • {likedTracks.length} Tracks
          </p>
        </div>
      </header>

      {likedTracks.length > 0 ? (
        <>
          <div className="actions">
            <button className="play-btn-large" onClick={handlePlayAll}>
              <Play fill="currentColor" size={24} />
            </button>
          </div>

          <div className="track-list">
            {likedTracks.map((track) => (
              <div
                key={track.id}
                className={`playlist-row glass ${isPlaying && playingTitle === track.title ? 'is-playing' : ''}`}
                onClick={() => loadTrack(track)}
                style={{ cursor: 'pointer' }}
              >
                <div className="row-image glass-item">
                  <Music size={20} />
                </div>
                <div className="row-content">
                  <p className="row-title">{track.title}</p>
                  <p className="row-artist text-secondary">
                    {track.artist}
                    {track.bpm && (
                      <span className="text-primary font-bold ml-2">• {getMPMFromBPM(Number(track.bpm), track.style)} Bars/Min</span>
                    )}
                  </p>
                </div>
                <div className="row-actions">
                  <button
                    className={`feature-icon ${finalTracks.some(t => t.id === track.id) ? 'active-flag' : ''}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      finalTracks.some(t => t.id === track.id) ? removeFromFinal(track.id) : addToFinal(track);
                    }}
                  >
                    <Flag size={18} fill={finalTracks.some(t => t.id === track.id) ? "currentColor" : "none"} />
                  </button>
                  <div className="play-row-btn glass">
                    {isPlaying && playingTitle === track.title ? (
                      <div className="playing-bars"><span></span><span></span><span></span></div>
                    ) : (
                      <Play size={18} fill="currentColor" />
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </>
      ) : (
        <div className="empty-state">
          <Heart size={48} className="text-secondary" />
          <h3>Your liked songs will appear here</h3>
          <p>Save tracks by clicking the heart icon while listening.</p>
        </div>
      )}

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

        .track-list { display: flex; flex-direction: column; gap: 12px; }
        
        .playlist-row {
          padding: 12px 20px;
          border-radius: 16px;
          display: flex;
          align-items: center;
          gap: 16px;
          border: 1px solid rgba(255, 255, 255, 0.03);
          transition: all 0.2s;
        }
        .playlist-row:hover { background: rgba(255, 255, 255, 0.05); }
        .playlist-row.is-playing { border-color: var(--primary); background: rgba(29, 185, 84, 0.05); }

        .row-image {
          width: 48px; height: 48px; border-radius: 12px;
          display: flex; align-items: center; justify-content: center;
        }

        .row-title { font-weight: 600; font-size: 15px; }
        .row-artist { font-size: 13px; }

        .row-actions { margin-left: auto; display: flex; align-items: center; gap: 16px; }

        .feature-icon { color: #555; transition: all 0.2s; }
        .feature-icon.active-flag { color: #1db954; }

        .play-row-btn {
          width: 36px; height: 36px; border-radius: 50%;
          display: flex; align-items: center; justify-content: center;
          color: var(--primary);
        }

        .playing-bars { display: flex; align-items: flex-end; gap: 2px; width: 16px; height: 16px; }
        .playing-bars span { width: 2px; background: var(--primary); animation: dance 1s infinite ease-in-out; }
        .playing-bars span:nth-child(1) { height: 60%; animation-delay: -0.4s; }
        .playing-bars span:nth-child(2) { height: 100%; animation-delay: -0.2s; }
        .playing-bars span:nth-child(3) { height: 80%; animation-delay: 0s; }
        @keyframes dance {
          0%, 100% { transform: scaleY(0.5); }
          50% { transform: scaleY(1); }
        }

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
