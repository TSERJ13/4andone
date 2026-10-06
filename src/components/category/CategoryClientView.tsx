"use client";

import React, { useState, Fragment } from 'react';
import Link from 'next/link';
import { Play, Pause, Music2 } from 'lucide-react';
import { useAudioControls } from '@/components/audio/AudioProvider';
import { useStudio } from '@/components/admin/StudioProvider';
import { useAuth } from '@/context/AuthContext';
import { SeoTrack } from '@/lib/seo-data';
import { SeoDanceCategory } from '@/utils/seo';
import { TrackRow } from '@/components/tracks/TrackRow';
import { ListAd, shouldShowListAdAfter } from '@/components/ads/ListAd';

interface Props {
  category: SeoDanceCategory;
  initialTracks: { track: SeoTrack; slug: string }[];
}

export default function CategoryClientView({ category, initialTracks }: Props) {
  const { isPlaying, title: playingTitle, trackId: playingTrackId, loadTrack, togglePlay } = useAudioControls();
  const { tracks, toggleFavorite } = useStudio();
  const { isAuthenticated, setIsAuthModalOpen } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');

  // Tap a track: play it, or pause/resume when it is already the current one.
  const playOrToggle = (track: Parameters<typeof loadTrack>[0], isRowActive: boolean) => {
    const isCurrent = playingTrackId ? playingTrackId === track.id : playingTitle === track.title;
    if (isRowActive || isCurrent) togglePlay();
    else loadTrack(track);
  };

  const filtered = initialTracks.filter(({ track }) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return track.title.toLowerCase().includes(q) || (track.artist && track.artist.toLowerCase().includes(q));
  });

  const isCurrentCategoryPlaying = isPlaying && initialTracks.some(
    ({ track }) => playingTrackId ? playingTrackId === track.id : playingTitle === track.title
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
      <div className="tracks-list">
        {filtered.map(({ track, slug }, i) => {
          const liveTrack = tracks.find((t) => t.id === track.id) || track;
          const isRowActive = isPlaying && (playingTrackId ? playingTrackId === track.id : playingTitle === track.title);

          return (
            <Fragment key={track.id}>
              <TrackRow
                track={liveTrack}
                isActive={isRowActive}
                onPlay={() => playOrToggle(liveTrack, isRowActive)}
                onToggleFavorite={() => {
                  if (!isAuthenticated) {
                    setIsAuthModalOpen(true);
                    return;
                  }
                  toggleFavorite?.(track.id);
                }}
                badge="duration"
                href={`/music/${slug}`}
              />
              {shouldShowListAdAfter(i, filtered.length) && <ListAd />}
            </Fragment>
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

        /* ---------- PHONE / TABLET ---------- */
        @media (max-width: 768px) {
          /* The app shell already adds 12–16px side padding — don't double it */
          .cat-page-wrapper {
            padding: 8px 0 160px 0;
          }

          .cat-breadcrumb {
            margin-bottom: 14px;
            flex-wrap: wrap;
            row-gap: 4px;
          }

          .cat-header {
            flex-direction: row;
            align-items: center;
            text-align: left;
            padding: 16px;
            gap: 14px;
            border-radius: 18px;
            margin-bottom: 16px;
          }

          .cat-header-icon {
            width: 56px;
            height: 56px;
            border-radius: 14px;
          }

          .cat-header-tags {
            flex-wrap: wrap;
            gap: 6px;
            margin-bottom: 6px;
          }

          .cat-title {
            font-size: 22px;
            margin-bottom: 4px;
          }

          .cat-description {
            font-size: 13px;
            display: -webkit-box;
            -webkit-line-clamp: 2;
            -webkit-box-orient: vertical;
            overflow: hidden;
          }

          .cat-actions-bar {
            gap: 8px;
            margin-bottom: 14px;
          }

          .cat-play-all-btn {
            padding: 10px 20px;
          }

          .cat-count-pill,
          .cat-bpm-pill {
            font-size: 12px;
            padding: 6px 12px;
          }

          .cat-search-box {
            margin-left: 0;
            width: 100%;
          }

          .cat-search-input,
          .cat-search-input:focus {
            width: 100%;
            padding: 11px 16px;
            font-size: 14px;
          }

          /* Track rows: full width, roomy, easy to tap */
          .cat-tracks-list {
            gap: 8px;
          }

          .cat-track-row {
            padding: 10px 12px;
            gap: 12px;
            min-height: 64px;
            border-radius: 14px;
          }

          .cat-track-row:hover {
            transform: none;
          }

          .cat-row-num {
            display: none;
          }

          .cat-row-play {
            width: 42px;
            height: 42px;
            background: rgba(29, 185, 84, 0.15);
            color: #1ed760;
          }

          .cat-row-title {
            font-size: 15px;
          }

          .cat-row-artist {
            font-size: 12px;
            margin-top: 2px;
          }

          .cat-row-meta {
            flex-direction: column;
            align-items: flex-end;
            gap: 4px;
          }

          .cat-row-bpm {
            font-size: 10px;
            padding: 2px 6px;
          }

          .cat-row-duration {
            min-width: 0;
            font-size: 12px;
          }

          .cat-fav-btn {
            padding: 8px;
          }
        }
      `}</style>
    </div>
  );
}
