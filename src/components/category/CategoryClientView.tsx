"use client";

import React, { useState } from 'react';
import Link from 'next/link';
import { Play, Pause, Disc, Heart, Clock, Music2 } from 'lucide-react';
import { useAudio } from '@/components/audio/AudioProvider';
import { useStudio } from '@/components/admin/StudioProvider';
import { useAuth } from '@/context/AuthContext';
import { SeoTrack } from '@/lib/seo-data';
import { SeoDanceCategory } from '@/utils/seo';
import { formatDuration } from '@/utils/format';

interface Props {
  category: SeoDanceCategory;
  initialTracks: { track: SeoTrack; slug: string }[];
}

export default function CategoryClientView({ category, initialTracks }: Props) {
  const { isPlaying, title: playingTitle, loadTrack, togglePlay } = useAudio();
  const { tracks, toggleFavorite } = useStudio();
  const { isAuthenticated, setIsAuthModalOpen } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');

  const filtered = initialTracks.filter(({ track }) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return track.title.toLowerCase().includes(q) || (track.artist && track.artist.toLowerCase().includes(q));
  });

  const isCurrentCategoryPlaying = isPlaying && initialTracks.some(
    ({ track }) => playingTitle === track.title || playingTitle === track.id
  );

  const handlePlayCategory = () => {
    if (isCurrentCategoryPlaying) {
      togglePlay();
    } else if (initialTracks.length > 0) {
      const first = tracks.find((t) => t.id === initialTracks[0].track.id) || initialTracks[0].track;
      loadTrack(first);
    }
  };

  return (
    <div className="cat-page-wrapper animate-in">
      {/* Breadcrumb Navigation */}
      <nav aria-label="Breadcrumb" className="cat-breadcrumb">
        <Link href="/" className="crumb-link">Home</Link>
        <span className="crumb-sep">/</span>
        <span className="crumb-plain">{category.discipline} Ballroom</span>
        <span className="crumb-sep">/</span>
        <span className="crumb-current">{category.name} Music</span>
      </nav>

      {/* Category Header */}
      <header className="cat-header glass">
        <div className="cat-header-icon">
          <Music2 size={44} />
        </div>
        <div className="cat-header-text">
          <div className="cat-header-tags">
            <span className="cat-discipline-badge">{category.discipline} Ballroom</span>
            <span className="cat-tempo-badge">BPM Range: {category.minBpm}–{category.maxBpm}</span>
          </div>

          <h1 className="cat-title">{category.name} Music</h1>

          <p className="cat-description">
            {category.description}
          </p>
        </div>
      </header>

      {/* Category Actions Bar */}
      <div className="cat-actions-bar">
        <button
          type="button"
          className="cat-play-all-btn"
          onClick={handlePlayCategory}
          aria-label={isCurrentCategoryPlaying ? 'Pause category' : `Play all ${category.name} tracks`}
        >
          {isCurrentCategoryPlaying ? (
            <>
              <Pause size={20} />
              <span>Pause</span>
            </>
          ) : (
            <>
              <Play size={20} fill="currentColor" />
              <span>Play All</span>
            </>
          )}
        </button>

        <span className="cat-count-pill">
          {initialTracks.length} Practice Tracks
        </span>

        {category.defaultBpm && (
          <span className="cat-bpm-pill">
            Tempo: {category.minBpm}–{category.maxBpm} BPM (Default: {category.defaultBpm})
          </span>
        )}

        {initialTracks.length > 10 && (
          <div className="cat-search-box">
            <input
              type="text"
              placeholder={`Search in ${category.name}...`}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="cat-search-input"
            />
          </div>
        )}
      </div>

      {/* Crawlable Tracks List */}
      <div className="cat-tracks-list">
        {filtered.map(({ track, slug }, index) => {
          const liveTrack = tracks.find((t) => t.id === track.id) || track;
          const isRowActive = isPlaying && (playingTitle === track.title || playingTitle === track.id);

          return (
            <div
              key={track.id}
              className={`cat-track-row glass ${isRowActive ? 'is-active' : ''}`}
              onClick={() => loadTrack(liveTrack)}
            >
              <div className="cat-row-num">{index + 1}</div>

              <button
                type="button"
                className="cat-row-play"
                onClick={(e) => {
                  e.stopPropagation();
                  if (isRowActive) {
                    togglePlay();
                  } else {
                    loadTrack(liveTrack);
                  }
                }}
                aria-label={`Play ${track.title}`}
              >
                {isRowActive ? <Pause size={16} /> : <Play size={16} fill="currentColor" />}
              </button>

              <div className="cat-row-info">
                {/* Real crawlable HTML link for search engine discovery */}
                <Link
                  href={`/music/${slug}`}
                  className="cat-row-title"
                  onClick={(e) => {
                    if (!e.metaKey && !e.ctrlKey && !e.shiftKey) {
                      loadTrack(liveTrack);
                    }
                  }}
                >
                  {track.title}
                </Link>
                <span className="cat-row-artist">{track.artist || '4and.one Music'}</span>
              </div>

              <div className="cat-row-meta">
                {track.bpm && <span className="cat-row-bpm">{track.bpm} BPM</span>}
                {track.duration ? (
                  <span className="cat-row-duration">
                    <Clock size={12} className="inline mr-1 opacity-60" />
                    {formatDuration(track.duration)}
                  </span>
                ) : null}
              </div>

              <div className="cat-row-actions" onClick={(e) => e.stopPropagation()}>
                <button
                  type="button"
                  className={`cat-fav-btn ${liveTrack.isFavorite ? 'is-fav' : ''}`}
                  onClick={() => {
                    if (!isAuthenticated) {
                      setIsAuthModalOpen(true);
                      return;
                    }
                    toggleFavorite?.(track.id);
                  }}
                  aria-label="Add to favorites"
                >
                  <Heart size={16} fill={liveTrack.isFavorite ? 'currentColor' : 'none'} />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      <style jsx>{`
        .cat-page-wrapper {
          padding: 32px 40px 140px 40px;
          max-width: 1200px;
          margin: 0 auto;
        }

        .cat-breadcrumb {
          display: flex;
          align-items: center;
          gap: 10px;
          font-size: 13px;
          color: #71717a;
          margin-bottom: 24px;
        }

        .crumb-link {
          color: #a1a1aa;
          text-decoration: none;
          transition: color 0.2s;
        }

        .crumb-link:hover {
          color: #fff;
        }

        .crumb-sep {
          color: #3f3f46;
        }

        .crumb-plain {
          color: #a1a1aa;
        }

        .crumb-current {
          color: #fff;
          font-weight: 600;
        }

        .cat-header {
          display: flex;
          align-items: center;
          gap: 32px;
          padding: 32px;
          border-radius: 24px;
          background: rgba(24, 24, 27, 0.5);
          border: 1px solid rgba(255, 255, 255, 0.08);
          backdrop-filter: blur(20px);
          margin-bottom: 28px;
        }

        .cat-header-icon {
          width: 96px;
          height: 96px;
          border-radius: 20px;
          background: linear-gradient(135deg, rgba(29, 185, 84, 0.3) 0%, rgba(20, 20, 22, 0.9) 100%);
          border: 1px solid rgba(29, 185, 84, 0.3);
          color: #1ed760;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          box-shadow: 0 12px 28px rgba(0, 0, 0, 0.4);
        }

        .cat-header-text {
          flex: 1;
        }

        .cat-header-tags {
          display: flex;
          align-items: center;
          gap: 10px;
          margin-bottom: 8px;
        }

        .cat-discipline-badge {
          background: rgba(29, 185, 84, 0.15);
          color: #1ed760;
          border: 1px solid rgba(29, 185, 84, 0.3);
          font-size: 11px;
          font-weight: 700;
          padding: 3px 10px;
          border-radius: 999px;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .cat-tempo-badge {
          background: rgba(255, 255, 255, 0.05);
          color: #a1a1aa;
          font-size: 12px;
          padding: 3px 10px;
          border-radius: 999px;
        }

        .cat-title {
          font-size: 34px;
          font-weight: 900;
          color: #fff;
          margin: 0 0 6px 0;
          letter-spacing: -0.5px;
        }

        .cat-description {
          font-size: 14px;
          line-height: 1.5;
          color: #a1a1aa;
          margin: 0;
          max-width: 680px;
        }

        .cat-actions-bar {
          display: flex;
          align-items: center;
          gap: 16px;
          margin-bottom: 24px;
          flex-wrap: wrap;
        }

        .cat-play-all-btn {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 10px 24px;
          background: #1db954;
          color: #000;
          font-weight: 700;
          font-size: 14px;
          border-radius: 999px;
          border: none;
          cursor: pointer;
          transition: all 0.2s cubic-bezier(0.34, 1.56, 0.64, 1);
        }

        .cat-play-all-btn:hover {
          background: #1ed760;
          transform: scale(1.03);
        }

        .cat-count-pill {
          font-size: 13px;
          color: #a1a1aa;
          background: rgba(255, 255, 255, 0.05);
          padding: 6px 14px;
          border-radius: 999px;
          border: 1px solid rgba(255, 255, 255, 0.08);
        }

        .cat-bpm-pill {
          font-size: 13px;
          color: #facc15;
          background: rgba(234, 179, 8, 0.1);
          padding: 6px 14px;
          border-radius: 999px;
          border: 1px solid rgba(234, 179, 8, 0.2);
        }

        .cat-search-box {
          margin-left: auto;
        }

        .cat-search-input {
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.1);
          color: #fff;
          font-size: 13px;
          padding: 8px 16px;
          border-radius: 999px;
          outline: none;
          width: 220px;
          transition: all 0.2s;
        }

        .cat-search-input:focus {
          border-color: #1ed760;
          background: rgba(255, 255, 255, 0.08);
          width: 260px;
        }

        .cat-tracks-list {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .cat-track-row {
          display: flex;
          align-items: center;
          gap: 16px;
          padding: 10px 16px;
          border-radius: 12px;
          background: rgba(24, 24, 27, 0.3);
          border: 1px solid rgba(255, 255, 255, 0.03);
          cursor: pointer;
          transition: all 0.15s ease;
        }

        .cat-track-row:hover {
          background: rgba(39, 39, 42, 0.6);
          border-color: rgba(255, 255, 255, 0.1);
          transform: translateX(2px);
        }

        .cat-track-row.is-active {
          background: rgba(29, 185, 84, 0.1);
          border-color: rgba(29, 185, 84, 0.3);
        }

        .cat-row-num {
          width: 24px;
          font-size: 13px;
          color: #71717a;
          text-align: center;
          font-variant-numeric: tabular-nums;
        }

        .cat-row-play {
          width: 32px;
          height: 32px;
          border-radius: 50%;
          background: rgba(255, 255, 255, 0.08);
          color: #fff;
          border: none;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: all 0.2s;
          flex-shrink: 0;
        }

        .cat-track-row:hover .cat-row-play {
          background: #1db954;
          color: #000;
        }

        .cat-track-row.is-active .cat-row-play {
          background: #1db954;
          color: #000;
        }

        .cat-row-info {
          flex: 1;
          min-width: 0;
          display: flex;
          flex-direction: column;
        }

        .cat-row-title {
          font-size: 14px;
          font-weight: 600;
          color: #ffffff;
          text-decoration: none;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          transition: color 0.2s;
        }

        .cat-row-title:hover {
          color: #1ed760;
        }

        .cat-track-row.is-active .cat-row-title {
          color: #1ed760;
        }

        .cat-row-artist {
          font-size: 12px;
          color: #71717a;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .cat-row-meta {
          display: flex;
          align-items: center;
          gap: 16px;
          font-size: 13px;
          color: #a1a1aa;
        }

        .cat-row-bpm {
          background: rgba(255, 255, 255, 0.05);
          padding: 2px 8px;
          border-radius: 6px;
          font-size: 11px;
          font-weight: 600;
          color: #e4e4e7;
        }

        .cat-row-duration {
          font-size: 12px;
          min-width: 50px;
          text-align: right;
        }

        .cat-row-actions {
          display: flex;
          align-items: center;
        }

        .cat-fav-btn {
          background: transparent;
          border: none;
          color: #71717a;
          cursor: pointer;
          padding: 6px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.2s;
        }

        .cat-fav-btn:hover {
          color: #f43f5e;
          transform: scale(1.15);
        }

        .cat-fav-btn.is-fav {
          color: #f43f5e;
        }

        @media (max-width: 768px) {
          .cat-page-wrapper {
            padding: 20px 16px 140px 16px;
          }

          .cat-header {
            flex-direction: column;
            text-align: center;
            padding: 24px 16px;
            gap: 18px;
          }

          .cat-header-tags {
            justify-content: center;
          }

          .cat-title {
            font-size: 26px;
          }

          .cat-search-box {
            margin-left: 0;
            width: 100%;
          }

          .cat-search-input {
            width: 100%;
          }

          .cat-row-bpm {
            display: none;
          }

          .cat-track-row {
            padding: 8px 12px;
            gap: 12px;
          }
        }
      `}</style>
    </div>
  );
}
