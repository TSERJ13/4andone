"use client";

import React, { useState, Fragment } from 'react';
import { useParams } from 'next/navigation';
import { Play, Pause, Music2, MoreHorizontal, Heart, Filter, Disc } from 'lucide-react';
import { useStudio } from '@/components/admin/StudioProvider';
import { useAudioControls } from '@/components/audio/AudioProvider';
import { useAuth } from '@/context/AuthContext';
import { useDownloadedTracks } from '@/hooks/useDownloadedTracks';
import ConfirmModal from '@/components/admin/ConfirmModal';
import { canonicalStyle } from '@/utils/audio';
import { displayStyleName } from '@/utils/styleNames';
import { TrackRow } from '@/components/tracks/TrackRow';
import { ListAd, useListAdAnchor } from '@/components/ads/ListAd';
import { getTrackCover } from '@/utils/trackCover';

const StylePage = () => {
  const { slug } = useParams();
  const slugStr = typeof slug === 'string' ? slug : Array.isArray(slug) ? slug[0] : '';
  const canonSlug = canonicalStyle(slugStr);

  const { tracks, tags, styles, albums, toggleFavorite } = useStudio();
  const { isPlaying, title: playingTitle, trackId: playingTrackId, loadTrack, togglePlay } = useAudioControls();
  const listAdAnchor = useListAdAnchor();
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

  // 1. Find style object by ID, canonical title, or title slug
  const activeStyle = styles.find(s => 
    s.id === slugStr || 
    canonicalStyle(s.title) === canonSlug ||
    s.title.toLowerCase().replace(/[\s\-_]+/g, '-') === slugStr.toLowerCase()
  );

  // 2. Resolve display style name (clean string like "Samba" or "Cha-Cha-Cha", never raw UUID)
  const styleName = activeStyle?.title || displayStyleName(slugStr);
  const styleColor = activeStyle?.color || '#ff0033';
  const effectiveCanon = canonicalStyle(styleName);

  // 3. Filter all tracks belonging to this dance style
  const allTracksInStyle = tracks.filter(t => {
    const tCanon = canonicalStyle(t.style);
    return tCanon === effectiveCanon || (t.style && t.style.toLowerCase() === styleName.toLowerCase());
  });

  // 4. Optionally filter by active tag pill
  const filteredTracks = allTracksInStyle.filter(t => {
    return activeTag ? t.tags?.includes(activeTag) : true;
  });

  const firstTrack = filteredTracks[0] || allTracksInStyle[0];
  const coverImage = firstTrack ? getTrackCover(firstTrack, albums, styles) : null;

  const isCurrentCategoryPlaying = isPlaying && filteredTracks.some(
    t => playingTrackId ? playingTrackId === t.id : playingTitle === t.title
  );

  const handlePlayAll = () => {
    if (isCurrentCategoryPlaying) {
      togglePlay();
    } else if (firstTrack) {
      loadTrack(firstTrack);
    }
  };

  return (
    <div className="yt-style-page animate-in">
      {/* YouTube Music Hero Header */}
      <header className="yt-hero-header">
        <div 
          className="yt-hero-cover-box"
          style={{
            background: coverImage ? undefined : `linear-gradient(135deg, ${styleColor}44 0%, #121212 100%)`,
            borderColor: `${styleColor}33`
          }}
        >
          {coverImage ? (
            <img src={coverImage} alt={styleName} className="yt-hero-cover-img" />
          ) : (
            <Music2 size={64} style={{ color: styleColor }} />
          )}
        </div>

        <div className="yt-hero-info">
          <span className="yt-hero-kicker">DANCE STYLE</span>
          <h1 className="yt-hero-title">{styleName}</h1>
          <p className="yt-hero-meta">
            <span>4and.one Music</span> • <span>{allTracksInStyle.length} tracks</span>
          </p>

          <div className="yt-hero-actions">
            <button
              className="yt-play-btn-primary"
              onClick={handlePlayAll}
              disabled={allTracksInStyle.length === 0}
            >
              {isCurrentCategoryPlaying ? (
                <>
                  <Pause size={18} fill="currentColor" />
                  <span>Pause</span>
                </>
              ) : (
                <>
                  <Play size={18} fill="currentColor" />
                  <span>Play All</span>
                </>
              )}
            </button>

            <button
              className="yt-action-icon-btn"
              onClick={() => checkAuthAndExecute(() => {}, 'favorite playlist')}
              title="Save to library"
            >
              <Heart size={20} />
            </button>

            <button className="yt-action-icon-btn" title="More options">
              <MoreHorizontal size={20} />
            </button>
          </div>
        </div>
      </header>

      {/* Filter Tag Chips Bar */}
      {tags.length > 0 && (
        <div className="yt-tags-bar">
          <button
            className={`yt-tag-chip ${activeTag === null ? 'active' : ''}`}
            onClick={() => setActiveTag(null)}
          >
            All Mixes
          </button>
          {tags.map((tag) => (
            <button
              key={tag.id}
              className={`yt-tag-chip ${activeTag === tag.name ? 'active' : ''}`}
              onClick={() => setActiveTag(activeTag === tag.name ? null : tag.name)}
            >
              <span className="yt-tag-dot" style={{ backgroundColor: tag.color }}></span>
              {tag.name}
            </button>
          ))}
        </div>
      )}

      {/* Tracks List */}
      <div className="yt-tracks-section">
        {filteredTracks.length > 0 ? (
          filteredTracks.map((track) => {
            const isTrackActive = isPlaying && (playingTrackId ? playingTrackId === track.id : (playingTitle === track.title || playingTitle === track.id));

            return (
              <Fragment key={track.id}>
                <TrackRow
                  track={track}
                  isActive={isTrackActive}
                  onPlay={() => loadTrack(track)}
                  onToggleFavorite={() => checkAuthAndExecute(() => toggleFavorite?.(track.id), 'favorite tracks')}
                  badge="duration"
                  isDownloaded={downloadedIds.includes(track.id)}
                />
                {track.id === listAdAnchor && <ListAd key={track.id} />}
              </Fragment>
            );
          })
        ) : (
          <div className="yt-empty-state">
            <Filter size={40} className="text-secondary" />
            <p>No {styleName} tracks match your current filter tag.</p>
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
          setAuthPrompt(prev => ({ ...prev, isOpen: false }));
          setIsAuthModalOpen(true);
        }}
      />

      <style jsx>{`
        .yt-style-page {
          padding: 24px 32px 140px 32px;
          max-width: 1200px;
          margin: 0 auto;
        }

        .yt-hero-header {
          display: flex;
          align-items: flex-end;
          gap: 28px;
          margin-bottom: 28px;
        }

        .yt-hero-cover-box {
          width: 180px;
          height: 180px;
          border-radius: 8px;
          overflow: hidden;
          flex-shrink: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 10px 30px rgba(0, 0, 0, 0.6);
          border: 1px solid rgba(255, 255, 255, 0.08);
          background: #181818;
        }

        .yt-hero-cover-img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .yt-hero-info {
          display: flex;
          flex-direction: column;
          gap: 6px;
          flex: 1;
          min-width: 0;
        }

        .yt-hero-kicker {
          font-size: 11px;
          font-weight: 800;
          letter-spacing: 1.2px;
          text-transform: uppercase;
          color: #ff0033;
        }

        .yt-hero-title {
          font-size: 2.4rem;
          font-weight: 900;
          color: #ffffff;
          margin: 0;
          letter-spacing: -0.5px;
          line-height: 1.1;
        }

        .yt-hero-meta {
          font-size: 13px;
          color: #aaa;
          margin: 2px 0 14px 0;
          font-weight: 500;
        }

        .yt-hero-actions {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .yt-play-btn-primary {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 11px 24px;
          border-radius: 999px;
          background: #ff0033;
          color: #ffffff;
          font-weight: 700;
          font-size: 14px;
          border: none;
          cursor: pointer;
          transition: transform 0.15s, background-color 0.15s;
        }

        .yt-play-btn-primary:hover {
          background: #cc0029;
          transform: scale(1.02);
        }

        .yt-play-btn-primary:disabled {
          opacity: 0.4;
          cursor: default;
          transform: none;
        }

        .yt-action-icon-btn {
          width: 42px;
          height: 42px;
          border-radius: 50%;
          background: rgba(255, 255, 255, 0.08);
          border: 1px solid rgba(255, 255, 255, 0.1);
          color: #ffffff;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: background-color 0.15s;
        }

        .yt-action-icon-btn:hover {
          background: rgba(255, 255, 255, 0.16);
        }

        .yt-tags-bar {
          display: flex;
          align-items: center;
          gap: 8px;
          overflow-x: auto;
          padding-bottom: 12px;
          margin-bottom: 20px;
          scrollbar-width: none;
        }

        .yt-tags-bar::-webkit-scrollbar {
          display: none;
        }

        .yt-tag-chip {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 7px 16px;
          border-radius: 18px;
          font-size: 13px;
          font-weight: 600;
          color: #f1f1f1;
          background: rgba(255, 255, 255, 0.08);
          border: 1px solid rgba(255, 255, 255, 0.06);
          cursor: pointer;
          white-space: nowrap;
          transition: all 0.15s ease;
        }

        .yt-tag-chip:hover {
          background: rgba(255, 255, 255, 0.16);
        }

        .yt-tag-chip.active {
          background: #ffffff;
          color: #030303;
        }

        .yt-tag-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
        }

        .yt-tracks-section {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .yt-empty-state {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 60px 20px;
          text-align: center;
          color: #717171;
          gap: 12px;
        }

        @media (max-width: 768px) {
          .yt-style-page {
            padding: 12px 0 120px 0;
          }

          .yt-hero-header {
            flex-direction: row;
            align-items: center;
            gap: 16px;
            margin-bottom: 20px;
          }

          .yt-hero-cover-box {
            width: 110px;
            height: 110px;
            border-radius: 6px;
          }

          .yt-hero-title {
            font-size: 1.6rem;
          }

          .yt-hero-meta {
            font-size: 12px;
            margin-bottom: 10px;
          }

          .yt-play-btn-primary {
            padding: 9px 18px;
            font-size: 13px;
          }
        }
      `}</style>
    </div>
  );
};

export default StylePage;
