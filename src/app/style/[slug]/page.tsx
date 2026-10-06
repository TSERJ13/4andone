"use client";

import React, { useState } from 'react';
import { useParams } from 'next/navigation';
import { Play, Music2, MoreHorizontal, Heart, Filter } from 'lucide-react';
import { useStudio } from '@/components/admin/StudioProvider';
import { useAudioControls } from '@/components/audio/AudioProvider';
import { useAuth } from '@/context/AuthContext';
import { useDownloadedTracks } from '@/hooks/useDownloadedTracks';
import ConfirmModal from '@/components/admin/ConfirmModal';
import { canonicalStyle } from '@/utils/audio';
import { TrackRow } from '@/components/tracks/TrackRow';

const StylePage = () => {
  const { slug } = useParams();
  const { tracks, tags, styles, toggleFavorite, finalTracks, addToFinal, removeFromFinal } = useStudio();
  const { isPlaying, title: playingTitle, trackId: playingTrackId, loadTrack } = useAudioControls();
  const { isAuthenticated, setIsAuthModalOpen } = useAuth();
  const [activeTag, setActiveTag] = useState<string | null>(null);
  const downloadedIds = useDownloadedTracks();

  const [authPrompt, setAuthPrompt] = useState({ isOpen: false, action: '' });

  const checkAuthAndExecute = (action: () => void, actionName: string) => {
    if (!isAuthenticated) {
      setAuthPrompt({ isOpen: true, action: actionName });
      return;
    }
    action();
  };

  const canonSlug = canonicalStyle(slug as string);

  // Find style color if it exists
  const activeStyle = styles.find(s => canonicalStyle(s.title) === canonSlug);
  const styleColor = activeStyle?.color || 'var(--primary)';
  const styleName = activeStyle?.title || ((slug as string).charAt(0).toUpperCase() + (slug as string).slice(1).replace(/-/g, ' '));

  // Filter real tracks by style and optionally by tag
  const filteredTracks = tracks.filter(t => {
    const matchesStyle = canonicalStyle(t.style) === canonSlug;
    const matchesTag = activeTag ? t.tags?.includes(activeTag) : true;
    return matchesStyle && matchesTag;
  });

  const allTracksInStyle = tracks.filter(t => canonicalStyle(t.style) === canonSlug);

  return (
    <div className="style-page">
      <header className="style-header animate-in">
        <div className="style-icon-large glass" style={{ background: styleColor, color: 'black' }}>
          <Music2 size={64} />
        </div>
        <div className="style-head-content">
          <span className="style-label">Style Category</span>
          <h1 className="style-title">{styleName}</h1>
          <p className="style-stats">
            <span className="text-primary">Studio Library</span> • {allTracksInStyle.length} Total Tracks
          </p>
        </div>
      </header>

      <div className="style-controls animate-in" style={{ animationDelay: '0.1s' }}>
        <div className="style-actions">
          <button className="play-btn-large" style={{ background: styleColor }} onClick={() => filteredTracks[0] && loadTrack(filteredTracks[0])}>
            {isPlaying && filteredTracks.some(t => playingTrackId ? t.id === playingTrackId : t.title === playingTitle) ? <span className="pause-icon">||</span> : <Play fill="currentColor" size={24} />}
          </button>
          <button
            className="action-btn-circle glass"
            onClick={(e) => {
              e.stopPropagation();
            }}
          >
            <Heart size={24} />
          </button>
          <button className="action-btn-circle glass"><MoreHorizontal size={24} /></button>
        </div>

        {tags.length > 0 && (
          <div className="tags-scroll-container">
            <div className="tags-row">
              <button
                className={`tag-btn glass ${activeTag === null ? 'active' : ''}`}
                onClick={() => setActiveTag(null)}
              >
                All Mixes
              </button>
              {tags.map((tag) => (
                <button
                  key={tag.id}
                  className={`tag-btn glass ${activeTag === tag.name ? 'active' : ''}`}
                  onClick={() => setActiveTag(activeTag === tag.name ? null : tag.name)}
                >
                  <span className="tag-dot" style={{ backgroundColor: tag.color }}></span>
                  {tag.name}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="tracks-list animate-in" style={{ animationDelay: '0.2s' }}>
        {filteredTracks.length > 0 ? filteredTracks.map((track, i) => {
          const isTrackActive = isPlaying && (playingTrackId ? playingTrackId === track.id : (playingTitle === track.title || playingTitle === track.id));

          return (
          <TrackRow
            key={track.id}
            track={track}
            isActive={isTrackActive}
            onPlay={() => loadTrack(track)}
            onToggleFavorite={() => checkAuthAndExecute(() => toggleFavorite?.(track.id), 'favorite tracks')}
            badge="duration"
            isDownloaded={downloadedIds.includes(track.id)}
          />
          );
        }) : (
          <div className="empty-style-state glass">
            <Filter size={48} className="text-secondary" />
            <p>No tracks match your current filter.</p>
          </div>
        )}
      </div>

      <ConfirmModal
        isOpen={authPrompt.isOpen}
        title="Authentication Required"
        message={`Please log in with Telegram to ${authPrompt.action} and sync your studio data.`}
        confirmText="Login Now"
        variant="primary"
        onClose={() => setAuthPrompt(prev => ({ ...prev, isOpen: false }))}
        onConfirm={() => {
          setAuthPrompt(prev => ({ ...prev, isOpen: false }))
          setIsAuthModalOpen(true);
        }}
      />

      <style jsx>{`
        .style-page { padding: 32px 40px; }
        .style-header { display: flex; align-items: flex-end; gap: 32px; margin-bottom: 40px; }
        .style-icon-large { width: 250px; height: 250px; border-radius: 16px; display: flex; align-items: center; justify-content: center; box-shadow: 0 24px 48px rgba(0,0,0,0.4); }
        .style-label { text-transform: uppercase; font-size: 13px; font-weight: 800; letter-spacing: 1.5px; margin-bottom: 12px; display: block; }
        .style-title { font-size: 7rem; font-weight: 900; margin: 0; letter-spacing: -3px; line-height: 1.1; }
        .style-stats { margin-top: 20px; font-size: 15px; font-weight: 600; }
        .style-controls { display: flex; flex-direction: column; gap: 24px; margin-bottom: 40px; }
        .style-actions { display: flex; align-items: center; gap: 24px; }
        .play-btn-large { width: 64px; height: 64px; border-radius: 50%; color: black; display: flex; align-items: center; justify-content: center; transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1); box-shadow: 0 8px 24px rgba(0,0,0,0.3); }
        .play-btn-large:hover { transform: scale(1.05); }
        .pause-icon { font-weight: 900; font-size: 20px; }
        .action-btn-circle { width: 48px; height: 48px; border-radius: 50%; display: flex; align-items: center; justify-content: center; color: var(--text-secondary); }
        .action-btn-circle:hover { color: white; border-color: white; }
        .tags-scroll-container { overflow-x: auto; scrollbar-width: none; padding-bottom: 10px; }
        .tags-scroll-container::-webkit-scrollbar { display: none; }
        .tags-row { display: flex; align-items: center; gap: 12px; }
        .tag-btn { display: flex; align-items: center; gap: 8px; padding: 8px 20px; border-radius: 20px; font-size: 14px; font-weight: 600; color: #a1a1aa; background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.05); cursor: pointer; transition: all 0.2s ease; white-space: nowrap; }
        .tag-btn:hover { background: rgba(255,255,255,0.08); color: white; }
        .tag-btn.active { background: white; color: black; }
        .tag-dot { width: 8px; height: 8px; border-radius: 50%; }
        .fav-action { opacity: 0.4; transition: all 0.2s; }
        .fav-action:hover, .fav-action.active-heart { opacity: 1; transform: scale(1.1); }
        .fav-action.active-heart { color: #f43f5e; }
        .empty-style-state { padding: 80px 20px; text-align: center; display: flex; flex-direction: column; align-items: center; gap: 16px; border-radius: 24px; margin-top: 20px; }
        .animate-in { animation: slideUp 0.5s cubic-bezier(0.16, 1, 0.3, 1) both; }
        @keyframes slideUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
        @media (max-width: 1024px) { .style-title { font-size: 5rem; } }
        @media (max-width: 768px) {
          .style-page { padding: 16px; padding-bottom: 120px; }
          .style-header { flex-direction: column; align-items: center; text-align: center; gap: 20px; }
          .style-icon-large { width: 120px; height: 120px; }
          .style-title { font-size: 2.5rem; letter-spacing: -1px; }
          
          .tags-row {
            margin: 0 -16px;
            padding: 0 16px;
          }
          
        }
      `}</style>
    </div>
  );
};

export default StylePage;
