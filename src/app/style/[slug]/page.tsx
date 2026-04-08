"use client";

import React, { useState } from 'react';
import { useParams } from 'next/navigation';
import { Play, Clock, Music2, MoreHorizontal, Heart, Disc, Filter } from 'lucide-react';
import { useStudio } from '@/components/admin/StudioProvider';
import { useAudio } from '@/components/audio/AudioProvider';
import { useAuth } from '@/context/AuthContext';
import ConfirmModal from '@/components/admin/ConfirmModal';
import { formatDuration } from '@/utils/format';

const StylePage = () => {
  const { slug } = useParams();
  const { tracks, tags, styles, toggleFavorite, finalTracks, addToFinal, removeFromFinal } = useStudio();
  const { isPlaying, title: playingTitle, loadTrack } = useAudio();
  const { isAuthenticated, setIsAuthModalOpen } = useAuth();
  const [activeTag, setActiveTag] = useState<string | null>(null);

  const [authPrompt, setAuthPrompt] = useState({ isOpen: false, action: '' });

  const checkAuthAndExecute = (action: () => void, actionName: string) => {
    if (!isAuthenticated) {
      setAuthPrompt({ isOpen: true, action: actionName });
      return;
    }
    action();
  };

  const styleName = (slug as string).charAt(0).toUpperCase() + (slug as string).slice(1).replace('-', ' ');
  
  // Find style color if it exists
  const activeStyle = styles.find(s => s.title.toLowerCase().replace(/\s+/g, '-') === slug);
  const styleColor = activeStyle?.color || 'var(--primary)';

  // Filter real tracks by style and optionally by tag
  const filteredTracks = tracks.filter(t => {
    const matchesStyle = t.style.toLowerCase().replace(/\s+/g, '-') === slug;
    const matchesTag = activeTag ? t.tags?.includes(activeTag) : true;
    return matchesStyle && matchesTag;
  });

  const allTracksInStyle = tracks.filter(t => t.style.toLowerCase().replace(/\s+/g, '-') === slug);

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
            {isPlaying && filteredTracks.some(t => t.title === playingTitle) ? <span className="pause-icon">||</span> : <Play fill="currentColor" size={24} />}
          </button>
          <button 
            className="action-btn-circle glass"
            onClick={(e) => {
              e.stopPropagation();
              // This is a style-level favorite, but we'll apply it to the logic needed
              // For now, let's keep it simple or implement if needed
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

      <div className="tracks-table animate-in" style={{ animationDelay: '0.2s' }}>
        <div className="table-header text-secondary">
          <div className="col-num">#</div>
          <div className="col-title">Title</div>
          <div className="col-album">Style / Tags</div>
          <div className="col-bpm">BPM</div>
          <div className="col-duration"><Clock size={16} /></div>
        </div>

        <div className="table-body">
          {filteredTracks.length > 0 ? filteredTracks.map((track, i) => (
            <div 
              key={track.id} 
              className={`track-row ${isPlaying && playingTitle === track.title ? 'is-playing' : ''}`}
              onClick={() => loadTrack(track)}
            >
              <div className="col-num">{i + 1}</div>
              <div className="col-title">
                <div className="track-meta">
                  <span className="track-name">{track.title}</span>
                  <span className="track-artist text-secondary">{track.artist}</span>
                </div>
              </div>
              <div className="col-album text-secondary">
                {track.tags && track.tags.length > 0 ? (
                  <span className="track-tags-inline">
                    {track.tags.join(', ')}
                  </span>
                ) : track.style}
              </div>
              <div className="col-bpm text-secondary">{track.bpm || '-'}</div>
              <div className="col-duration text-secondary">
                <div className="row-actions-mini">
                  <button
                    className={`feature-icon-mini ${track.isFavorite ? 'active-heart' : ''}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      checkAuthAndExecute(() => toggleFavorite?.(track.id), 'favorite tracks');
                    }}
                  >
                    <Heart size={14} fill={track.isFavorite ? "#ff4b2b" : "none"} color={track.isFavorite ? "#ff4b2b" : "currentColor"} />
                  </button>
                  {formatDuration(track.duration)}
                </div>
              </div>
            </div>
          )) : (
            <div className="empty-style-state glass">
              <Filter size={48} className="text-secondary" />
              <p>No tracks match your current filter.</p>
            </div>
          )}
        </div>
      </div>

      <ConfirmModal 
        isOpen={authPrompt.isOpen}
        title="Authentication Required"
        message={`Please log in with Telegram to ${authPrompt.action} and sync your studio data.`}
        confirmText="Login Now"
        variant="primary"
        onClose={() => setAuthPrompt(prev => ({ ...prev, isOpen: false }))}
        onConfirm={() => {
          setAuthPrompt(prev => ({ ...prev, isOpen: false }));
          setIsAuthModalOpen(true);
        }}
      />

      <style jsx>{`
        .style-page {
          padding: 32px 40px;
        }

        .style-header {
          display: flex;
          align-items: flex-end;
          gap: 32px;
          margin-bottom: 40px;
        }

        .style-icon-large {
          width: 250px;
          height: 250px;
          border-radius: 16px;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 24px 48px rgba(0,0,0,0.4);
        }

        .style-label {
          text-transform: uppercase;
          font-size: 13px;
          font-weight: 800;
          letter-spacing: 1.5px;
          margin-bottom: 12px;
          display: block;
        }

        .style-title {
          font-size: 7rem;
          font-weight: 900;
          margin: 0;
          letter-spacing: -3px;
          line-height: 1.1;
        }

        .style-stats {
          margin-top: 20px;
          font-size: 15px;
          font-weight: 600;
        }

        .style-controls {
          display: flex;
          flex-direction: column;
          gap: 24px;
          margin-bottom: 40px;
        }

        .style-actions {
          display: flex;
          align-items: center;
          gap: 24px;
        }

        .play-btn-large {
          width: 64px;
          height: 64px;
          border-radius: 50%;
          color: black;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
          box-shadow: 0 8px 24px rgba(0,0,0,0.3);
        }

        .play-btn-large:hover {
          transform: scale(1.05);
        }

        .pause-icon {
          font-weight: 900;
          font-size: 20px;
        }

        .action-btn-circle {
          width: 48px;
          height: 48px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          color: var(--text-secondary);
        }

        .action-btn-circle:hover {
          color: white;
          border-color: white;
        }

        /* Tabs / Tags */
        .tags-scroll-container {
          overflow-x: auto;
          scrollbar-width: none; /* Firefox */
          padding-bottom: 10px;
        }
        .tags-scroll-container::-webkit-scrollbar {
          display: none; /* Chrome */
        }

        .tags-row {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .tag-btn {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 8px 20px;
          border-radius: 20px;
          font-size: 14px;
          font-weight: 600;
          color: #a1a1aa;
          background: rgba(255,255,255,0.03);
          border: 1px solid rgba(255,255,255,0.05);
          cursor: pointer;
          transition: all 0.2s ease;
          white-space: nowrap;
        }

        .tag-btn:hover {
          background: rgba(255,255,255,0.08);
          color: white;
        }

        .tag-btn.active {
          background: white;
          color: black;
        }

        .tag-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
        }

        /* Tracks Table */
        .tracks-table {
          display: flex;
          flex-direction: column;
        }

        .table-header {
          display: grid;
          grid-template-columns: 48px 4fr 3fr 1fr 100px;
          padding: 8px 16px 16px;
          border-bottom: 1px solid rgba(255,255,255,0.1);
          font-size: 13px;
          text-transform: uppercase;
          letter-spacing: 1px;
          font-weight: 600;
        }

        .track-row {
          display: grid;
          grid-template-columns: 48px 4fr 3fr 1fr 100px;
          padding: 16px;
          border-radius: 12px;
          align-items: center;
          transition: background 0.2s;
          cursor: pointer;
        }

        .track-row:hover {
          background: rgba(255,255,255,0.08);
        }

        .track-row.is-playing {
          background: rgba(29, 185, 84, 0.1);
        }

        .track-meta {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .track-name {
          font-weight: 600;
          font-size: 16px;
          color: white;
        }
        
        .track-row.is-playing .track-name {
          color: #1db954;
        }

        .track-artist {
          font-size: 14px;
        }

        .track-tags-inline {
          display: inline-block;
          font-size: 12px;
          padding: 2px 8px;
          background: rgba(255,255,255,0.1);
          border-radius: 12px;
        }

        .empty-style-state {
          padding: 80px 20px;
          text-align: center;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 16px;
          border-radius: 24px;
          margin-top: 20px;
        }

        .animate-in {
          animation: slideUp 0.5s cubic-bezier(0.16, 1, 0.3, 1) both;
        }

        .row-actions-mini {
          display: flex;
          align-items: center;
          gap: 12px;
          justify-content: flex-end;
        }

        .feature-icon-mini {
          color: #555;
          background: transparent;
          border: none;
          cursor: pointer;
          padding: 4px;
          display: flex;
          align-items: center;
          transition: all 0.2s;
        }
        .feature-icon-mini:hover { color: white; transform: scale(1.2); }
        .feature-icon-mini.active-heart { color: #ff4b2b; }

        @keyframes slideUp {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }

        @media (max-width: 1024px) {
          .style-title { font-size: 5rem; }
        }

        @media (max-width: 768px) {
          .style-page { padding: 16px; padding-bottom: 120px; }
          .style-header { 
            flex-direction: column; 
            align-items: center; 
            text-align: center;
            gap: 20px;
          }
          .style-icon-large { width: 180px; height: 180px; }
          .style-title { font-size: 2.5rem; letter-spacing: -1px; }
          
          .tags-scroll-container {
            margin: 0 -16px;
            padding: 0 16px;
          }
          
          .table-header { display: none; }
          .track-row { 
            grid-template-columns: 32px 1fr 60px; 
            gap: 12px;
          }
          .col-album, .col-bpm { display: none; }
          .col-duration { font-size: 12px; }
        }
      `}</style>
    </div>
  );
};

export default StylePage;
