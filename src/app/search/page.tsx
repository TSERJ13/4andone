"use client";

import React, { useState } from 'react';
import { Search, Music2, Disc, Play, Pause, Heart, Flag } from 'lucide-react';
import { useStudio } from '@/components/admin/StudioProvider';
import { useAudio } from '@/components/audio/AudioProvider';
import { useAuth } from '@/context/AuthContext';
import Link from 'next/link';
import { getMPMFromBPM } from '@/utils/audio';
import { formatDuration } from '@/utils/format';
import ConfirmModal from '@/components/admin/ConfirmModal';
import { Marquee } from '@/components/layout/Marquee';

const SearchPage = () => {
  const [query, setQuery] = useState('');
  const { tracks, styles, finalTracks, addToFinal, removeFromFinal, toggleFavorite } = useStudio();
  const { isPlaying, title: playingTitle, loadTrack } = useAudio();
  const { isAuthenticated, setIsAuthModalOpen } = useAuth();

  const [infoModal, setInfoModal] = useState({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => { }
  });

  const checkAuthAndExecute = (action: () => void, actionName: string) => {
    if (!isAuthenticated) {
      setInfoModal({
        isOpen: true,
        title: 'Authentication Required',
        message: `Please log in with Telegram to ${actionName} and sync your studio data.`,
        onConfirm: () => {
          setInfoModal(prev => ({ ...prev, isOpen: false }));
          setIsAuthModalOpen(true);
        }
      });
      return;
    }
    action();
  };

  const stylesWithTracks = styles.filter(s =>
    s.title.toLowerCase() !== 'fitness' &&
    tracks.some(t => t.style?.toLowerCase() === s.title.toLowerCase())
  );

  const searchResults = tracks.filter(track => {
    const matchesQuery = track.title.toLowerCase().includes(query.toLowerCase()) ||
      track.artist.toLowerCase().includes(query.toLowerCase()) ||
      (track.style && track.style.toLowerCase().includes(query.toLowerCase()));

    const isHidden =
      track.style?.toLowerCase() === 'fitness' ||
      track.tags?.some(tag => tag.toLowerCase() === 'closed' || tag === 'დახურული');

    return matchesQuery && !isHidden;
  });

  const getStyleTrackCount = (styleName: string) => {
    return tracks.filter(t =>
      t.style?.toLowerCase() === styleName.toLowerCase() &&
      !t.tags?.some(tag => tag.toLowerCase() === 'closed' || tag === 'დახურული')
    ).length;
  };

  return (
    <div className="search-page animate-in">
      <div className="search-header-container">
        <div className="search-header glass">
          <Search size={22} className="search-icon" />
          <input
            type="text"
            placeholder="Search for tracks, artists, or styles..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="search-input"
            autoFocus
          />
        </div>
      </div>

      <div className="search-content">
        {!query ? (
          <div className="browse-all">
            <h2 className="section-title">Browse Styles</h2>
            <div className="genre-grid">
              {stylesWithTracks.length > 0 ? stylesWithTracks.map((style) => (
                <Link
                  key={style.id}
                  href={`/style/${style.title.toLowerCase().replace(/\s+/g, '-')}`}
                  className="genre-card"
                  style={{
                    background: `linear-gradient(135deg, ${style.color || '#1db954'}, rgba(18, 18, 18, 0.4))`,
                    height: '80px',
                    borderRadius: '8px',
                    padding: '12px 16px',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'center'
                  } as React.CSSProperties}
                >
                  <div className="genre-info">
                    <h3>{style.title}</h3>
                    <p className="track-count">{getStyleTrackCount(style.title)} Tracks</p>
                  </div>
                  <div className="card-decoration">
                    <Music2 size={100} strokeWidth={1} />
                  </div>
                </Link>
              )) : (
                <div className="empty-search-state glass">
                  <Music2 size={48} opacity={0.2} />
                  <p>Add some music in the Admin Panel to see styles here!</p>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="search-results">
            <h2 className="section-title">Best Matches</h2>
            <div className="results-container">
              {searchResults.length > 0 ? (
                searchResults.map((track, i) => (
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
                      <p className="track-artist">
                        {track.artist}
                        {track.duration ? ` • ${formatDuration(track.duration)}` : ''}
                      </p>
                    </div>

                    <div className="track-badge-col">
                      {styles.find(s => s.title.toLowerCase() === track.style?.toLowerCase()) && (
                        <span 
                          className="style-badge-pill" 
                          style={{ backgroundColor: styles.find(s => s.title.toLowerCase() === track.style?.toLowerCase())?.color }}
                        >
                          {track.style}
                        </span>
                      )}
                    </div>
                    
                    <div className="track-meta-col">
                      {track.bpm ? `${getMPMFromBPM(Number(track.bpm), track.style)} BPM` : formatDuration(track.duration)}
                    </div>

                    <div className="track-actions-col">
                      <button
                        className={`fav-action ${track.isFavorite ? 'active-heart' : ''}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          checkAuthAndExecute(() => toggleFavorite?.(track.id), 'favorite tracks');
                        }}
                      >
                        <Heart size={16} fill={track.isFavorite ? "#ff4b2b" : "none"} color={track.isFavorite ? "#ff4b2b" : "currentColor"} />
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
                ))
              ) : (
                <div className="no-results glass">
                  <p>No results found for "{query}"</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      <ConfirmModal
        isOpen={infoModal.isOpen}
        title={infoModal.title}
        message={infoModal.message}
        confirmText="Login Now"
        variant="primary"
        onClose={() => setInfoModal(prev => ({ ...prev, isOpen: false }))}
        onConfirm={infoModal.onConfirm}
      />

      <style jsx>{`
        .search-page { padding: 40px; padding-bottom: 120px; }
        
        .search-header-container {
          position: sticky; top: 0; z-index: 100;
          padding: 20px 0 32px;
          background: transparent !important;
          backdrop-filter: blur(20px);
          margin-bottom: 0;
          display: flex;
          justify-content: center;
        }

        .search-header {
          display: flex; align-items: center; gap: 16px;
          padding: 14px 28px; border-radius: 50px;
          width: 100%; max-width: 600px;
          background: rgba(255, 255, 255, 0.05) !important;
          border: 1px solid rgba(255,255,255,0.05) !important;
          transition: all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
        }
        
        .search-header:focus-within {
          background: rgba(255, 255, 255, 0.08);
          border-color: rgba(255,255,255,0.2);
          transform: translateY(-2px);
          max-width: 640px;
        }

        .search-icon { color: #71717a; }
        .search-input {
          background: transparent; border: none; outline: none;
          color: white; font-size: 16px; width: 100%; font-weight: 600;
        }
        .search-input::placeholder { opacity: 0.4; }

        .section-title { font-size: 24px; font-weight: 900; margin-bottom: 32px; letter-spacing: -1px; }

        .genre-grid {
          display: grid; 
          grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
          gap: 12px;
        }
        
        .genre-card {
          padding: 48px 16px; border-radius: 8px; height: 520px;
          position: relative; overflow: hidden; cursor: pointer;
          transition: all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
          border: 1px solid rgba(255, 255, 255, 0.1);
          text-decoration: none;
          color: white;
          display: flex; flex-direction: column; justify-content: flex-start;
          box-shadow: 0 10px 25px rgba(0,0,0,0.4);
        }
        
        .genre-card:hover { 
          transform: translateY(-8px) scale(1.02);
          box-shadow: 0 20px 50px rgba(0,0,0,0.5);
        }

        .card-decoration {
          position: absolute;
          bottom: -20px;
          right: -20px;
          opacity: 0.15;
          transform: rotate(-15deg);
          transition: transform 0.3s;
        }

        .genre-card:hover .card-decoration {
          transform: rotate(0deg) scale(1.1);
          opacity: 0.25;
        }

        .genre-info { position: relative; z-index: 2; }
        .genre-card h3 { 
          font-size: 24px; font-weight: 900; margin: 0; 
          color: white; letter-spacing: -1px; margin-bottom: 4px;
        }
        
        .track-count { font-size: 13px; opacity: 0.7; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; }
        
        .fav-action { opacity: 0.4; transition: all 0.2s; }
        .fav-action:hover, .fav-action.active-heart { opacity: 1; transform: scale(1.1); }
        .fav-action.active-heart { color: #ff4b2b; }
        @keyframes dance {
          0%, 100% { transform: scaleY(0.5); }
          50% { transform: scaleY(1); }
        }

        .no-results { padding: 40px; text-align: center; opacity: 0.4; border-radius: 20px; }
        .empty-search-state { padding: 40px; text-align: center; opacity: 0.4; grid-column: 1/-1; border-radius: 24px; }
        
        .text-secondary { color: #71717a; }
        .text-primary { color: var(--primary); }

        @media (max-width: 768px) {
          .search-page { padding: 16px; padding-bottom: 120px; }
          .search-header-container { padding: 10px 0 20px; }
          .search-header { 
            max-width: 100%; 
            margin-bottom: 0; 
            padding: 12px 20px;
          }
          .genre-grid { grid-template-columns: repeat(2, 1fr); gap: 12px; }
          .genre-card { padding: 48px 16px; border-radius: 8px; }
        }
      `}</style>
    </div>
  );
};

export default SearchPage;
