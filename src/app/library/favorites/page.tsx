"use client";

import React from 'react';
import { Heart, Play, Clock, MoreHorizontal, Disc, Flag } from 'lucide-react';
import { useAudio } from '@/components/audio/AudioProvider';
import { useStudio } from '@/components/admin/StudioProvider';
import { formatDuration } from '@/utils/format';
import { getMPMFromBPM } from '@/utils/audio';
import { Marquee } from '@/components/layout/Marquee';

const FavoritesPage = () => {
  const { togglePlay, isPlaying, title: playingTitle, loadTrack } = useAudio();
  const { tracks, toggleFavorite } = useStudio();

  const likedTracks = tracks.filter(t => t.isFavorite && !t.tags?.some(tag => tag.toLowerCase() === 'closed' || tag === 'დახურული'));

  const handlePlayAll = () => {
    if (likedTracks.length > 0) {
      loadTrack(likedTracks[0]);
    }
  };

  return (
    <div className="favorites-page animate-in">
      <header className="page-header">
        <div className="icon-large glass">
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
                className={`track-row ${isPlaying && (playingTitle === track.title || playingTitle === track.id) ? 'is-active' : ''}`}
                onClick={() => loadTrack(track)}
              >
                <div className="track-index">{i + 1}</div>
                <div className="track-icon-col">
                  <Disc size={18} />
                </div>
                <div className="track-info-col">
                  <Marquee 
                    text={track.title} 
                    className="track-name" 
                    isActive={isPlaying && (playingTitle === track.title || playingTitle === track.id)}
                  />
                  <p className="track-artist">{track.artist}</p>
                </div>
                
                <div className="track-meta-col">
                  {track.bpm ? `${getMPMFromBPM(Number(track.bpm), track.style)} MPM` : formatDuration(track.duration)}
                </div>

                <div className="track-actions-col">
                  <button
                    className={`fav-action active-heart`}
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleFavorite(track.id);
                    }}
                    title="Unlike"
                  >
                    <Heart size={16} fill="#ff4b2b" color="#ff4b2b" />
                  </button>
                  <div className="play-action">
                    {isPlaying && (playingTitle === track.title || playingTitle === track.id) ? (
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
        .icon-large { 
          width: 232px; height: 232px; border-radius: 20px; 
          background: linear-gradient(135deg, var(--primary, #1db954), #191414);
          display: flex; align-items: center; justify-content: center;
          flex-shrink: 0;
          box-shadow: 0 12px 32px rgba(0,0,0,0.5);
          border: 1px solid rgba(255,255,255,0.05);
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

        .fav-action { opacity: 0.4; transition: all 0.2s; background: none; border: none; cursor: pointer; color: #555; }
        .fav-action:hover, .fav-action.active-heart { opacity: 1; transform: scale(1.1); }
        .fav-action.active-heart { color: #f43f5e; }
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
          .playlist-page { padding: 20px; padding-bottom: 120px; }
          .page-header { flex-direction: column; align-items: center; text-align: center; gap: 24px; margin-top: 20px; }
          .icon-large { width: 140px; height: 140px; border-radius: 20px; }
          .title { font-size: 2.2rem; letter-spacing: -1px; }
          .actions { justify-content: center; height: 80px; }
          .track-row { 
            gap: 4px; 
          }
        }
      `}</style>
    </div>
  );
};

export default FavoritesPage;
