"use client";

import React, { useState, Fragment } from 'react';
import Link from 'next/link';
import { Play, Pause, Music2, ListMusic, Activity, Search } from 'lucide-react';
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

      {/* Category Header: icon + title + one quiet info line, then actions */}
      <header className="cat-hero">
        <div className="cat-hero-top">
          <div className="cat-hero-icon">
            <Music2 size={30} />
          </div>
          <div className="cat-hero-text">
            <span className="cat-kicker">{category.discipline} Ballroom</span>
            <h1 className="cat-title">{category.name} Music</h1>
            <div className="cat-meta">
              <span className="cat-meta-item">
                <ListMusic size={14} />
                {initialTracks.length} tracks
              </span>
              <span className="cat-meta-dot" />
              <span className="cat-meta-item">
                <Activity size={14} />
                {category.minBpm}–{category.maxBpm} BPM
              </span>
            </div>
          </div>
        </div>

        <p className="cat-description">{category.description}</p>

        <div className="cat-actions">
          <button
            type="button"
            className="cat-play-all-btn"
            onClick={handlePlayCategory}
            aria-label={isCurrentCategoryPlaying ? 'Pause category' : `Play all ${category.name} tracks`}
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

          {initialTracks.length > 10 && (
            <div className="cat-search-box">
              <Search size={16} className="cat-search-icon" />
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
      </header>

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

        .cat-hero {
          padding: 24px;
          border-radius: 20px;
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid rgba(255, 255, 255, 0.08);
          margin-bottom: 20px;
        }

        .cat-hero-top {
          display: flex;
          align-items: center;
          gap: 18px;
        }

        .cat-hero-icon {
          width: 76px;
          height: 76px;
          border-radius: 18px;
          flex-shrink: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #fff;
          background: linear-gradient(135deg, var(--primary, #1db954), #191414);
          border: 1px solid rgba(255, 255, 255, 0.06);
        }

        .cat-hero-text {
          min-width: 0;
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .cat-kicker {
          font-size: 11px;
          font-weight: 800;
          letter-spacing: 1.4px;
          text-transform: uppercase;
          color: var(--primary, #1db954);
        }

        .cat-title {
          font-size: 34px;
          font-weight: 900;
          color: #fff;
          margin: 0;
          line-height: 1.1;
          letter-spacing: -0.5px;
        }

        .cat-meta {
          display: flex;
          align-items: center;
          flex-wrap: wrap;
          gap: 10px;
          margin-top: 2px;
          font-size: 13px;
          font-weight: 600;
          color: #a1a1aa;
        }

        .cat-meta-item {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          white-space: nowrap;
        }

        .cat-meta-dot {
          width: 3px;
          height: 3px;
          border-radius: 50%;
          background: #52525b;
        }

        .cat-description {
          font-size: 14px;
          line-height: 1.5;
          color: #8b8b93;
          margin: 16px 0 0;
          max-width: 720px;
        }

        .cat-actions {
          display: flex;
          align-items: center;
          gap: 12px;
          margin-top: 18px;
        }

        .cat-play-all-btn {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 11px 22px;
          background: var(--primary, #1db954);
          color: #000;
          font-weight: 800;
          font-size: 14px;
          border-radius: 999px;
          border: none;
          cursor: pointer;
          flex-shrink: 0;
          transition: background-color 0.15s, transform 0.15s;
        }

        .cat-play-all-btn:hover { background: #1ed760; }
        .cat-play-all-btn:active { transform: scale(0.96); }

        .cat-search-box {
          position: relative;
          flex: 1;
          max-width: 320px;
          margin-left: auto;
        }

        .cat-search-box :global(.cat-search-icon) {
          position: absolute;
          left: 14px;
          top: 50%;
          transform: translateY(-50%);
          color: #71717a;
          pointer-events: none;
        }

        .cat-search-input {
          width: 100%;
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.1);
          color: #fff;
          font-size: 14px;
          padding: 10px 16px 10px 38px;
          border-radius: 999px;
          outline: none;
          transition: border-color 0.15s, background-color 0.15s;
        }

        .cat-search-input:focus {
          border-color: rgba(29, 185, 84, 0.6);
          background: rgba(255, 255, 255, 0.08);
        }

        /* ---------- PHONE / TABLET ---------- */
        @media (max-width: 768px) {
          /* The app shell already adds 12–16px side padding — don't double it */
          .cat-page-wrapper {
            padding: 8px 0 160px 0;
          }

          .cat-breadcrumb {
            margin-bottom: 12px;
            flex-wrap: wrap;
            row-gap: 4px;
          }

          .cat-hero {
            padding: 16px;
            border-radius: 18px;
            margin-bottom: 14px;
          }

          .cat-hero-top { gap: 14px; }

          .cat-hero-icon {
            width: 60px;
            height: 60px;
            border-radius: 14px;
          }

          .cat-kicker { font-size: 10px; }
          .cat-title { font-size: 24px; }
          .cat-meta { font-size: 12px; gap: 8px; }

          .cat-description {
            font-size: 13px;
            margin-top: 12px;
            display: -webkit-box;
            -webkit-line-clamp: 2;
            -webkit-box-orient: vertical;
            overflow: hidden;
          }

          .cat-actions { gap: 10px; margin-top: 14px; }
          .cat-play-all-btn { padding: 11px 18px; }
          .cat-search-box { max-width: none; margin-left: 0; }
        }
      `}</style>
    </div>
  );
}
