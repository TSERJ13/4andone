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

          <div className="tracks-list">
            {likedTracks.map((track, i) => (
              <div
                key={track.id}
                className={`track-row glass ${isPlaying && playingTitle === track.title ? 'is-playing' : ''}`}
                onClick={() => loadTrack(track)}
                style={{ cursor: 'pointer' }}
              >
                <div className="track-number">{i + 1}</div>
                <div className="track-meta">
                  <Music size={20} className="text-secondary" />
                  <div>
                    <p className="track-name">{track.title}</p>
                    <p className="track-artist text-secondary">{track.artist}</p>
                  </div>
                </div>
                <div className="track-duration text-secondary">
                  {track.bpm ? `${getMPMFromBPM(Number(track.bpm), track.style)} Bars/Min` : '—'}
                </div>
                <div className="track-actions">
                  <button
                    className={`feature-icon ${finalTracks.some(t => t.id === track.id) ? 'active-flag' : ''}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      finalTracks.some(t => t.id === track.id) ? removeFromFinal(track.id) : addToFinal(track);
                    }}
                  >
                    <Flag size={18} fill={finalTracks.some(t => t.id === track.id) ? "currentColor" : "none"} />
                  </button>
                  <div className="btn-play-row">
                    {isPlaying && playingTitle === track.title ? (
                      <div className="playing-bars"><span></span><span></span><span></span></div>
                    ) : (
                      <Play size={20} fill="currentColor" />
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

        .tracks-list { display: flex; flex-direction: column; gap: 8px; }
        .track-row {
          display: grid;
          grid-template-columns: 40px 1fr 140px 100px;
          align-items: center;
          padding: 12px 16px;
          border-radius: 12px;
          transition: background 0.2s;
        }
        .track-row:hover { background: rgba(255,255,255,0.08); }
        .track-number { font-size: 12px; font-weight: 800; opacity: 0.3; width: 40px; text-align: center; }
        .track-meta { display: flex; align-items: center; gap: 16px; }
        .track-name { font-weight: 600; font-size: 14px; }
        .track-artist { font-size: 12px; }
        .track-duration { font-size: 13px; font-weight: 500; }
        .track-actions { display: flex; align-items: center; justify-content: flex-end; gap: 16px; }
        .btn-play-row { color: var(--primary); }

        .track-row.is-playing {
          background: rgba(29, 185, 84, 0.08);
          border-left: 3px solid #1db954;
        }
        .track-row.is-playing .track-name { color: #1db954; }

        .feature-icon { color: #555; transition: all 0.2s; background: none; border: none; cursor: pointer; }
        .feature-icon:hover { color: white; transform: scale(1.1); }
        .feature-icon.active-flag { color: #1db954; }

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

          .track-row {
            grid-template-columns: 32px 1fr 48px;
            padding: 8px 12px;
          }
          .track-duration { display: none; }
        }
      `}</style>
    </div>
  );
};

export default FavoritesPage;
