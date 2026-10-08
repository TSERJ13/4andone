"use client";

import React, { useState } from 'react';
import Link from 'next/link';
import { Play, Pause, ChevronLeft, ChevronRight, ThumbsUp, ChevronRight as ArrowRight, Pin } from 'lucide-react';
import { Track } from '@/components/admin/StudioProvider';
import { useAudioControls } from '@/components/audio/AudioProvider';

interface YtQuickPicksProps {
  tracks: Track[];
  onPlayAll?: () => void;
}

export default function YtQuickPicks({ tracks, onPlayAll }: YtQuickPicksProps) {
  const { togglePlay, isPlaying, trackId: playingTrackId, loadTrack } = useAudioControls();
  const [pageIndex, setPageIndex] = useState(0);

  // Take top tracks for quick picks
  const displayTracks = tracks.slice(0, 12);
  const mobileQuickPicks = tracks.slice(0, 8); // 8 cards + 1 liked music card = 9 (3x3 grid)

  const itemsPerPage = 12; // 3 columns x 4 rows
  const maxPages = Math.ceil(tracks.length / itemsPerPage);

  const currentPageTracks = tracks.slice(pageIndex * itemsPerPage, (pageIndex + 1) * itemsPerPage);

  // Split current page into 3 columns (4 items each)
  const columns = [
    currentPageTracks.slice(0, 4),
    currentPageTracks.slice(4, 8),
    currentPageTracks.slice(8, 12),
  ];

  const handleTrackClick = (track: Track) => {
    if (playingTrackId === track.id) {
      togglePlay();
    } else {
      loadTrack(track);
    }
  };

  return (
    <section className="yt-quick-picks-section">
      {/* Header */}
      <div className="yt-section-header">
        <div className="yt-section-header-left">
          <span className="yt-section-sub">S_T DANCE STUDIO</span>
          <h2 className="yt-section-title">Quick picks</h2>
        </div>
        <div className="yt-section-header-right">
          <button type="button" className="yt-btn-play-all" onClick={onPlayAll}>
            Play all
          </button>
          <div className="yt-nav-arrows">
            <button
              type="button"
              className="yt-arrow-btn"
              disabled={pageIndex === 0}
              onClick={() => setPageIndex((p) => Math.max(0, p - 1))}
              aria-label="Previous picks"
            >
              <ChevronLeft size={20} />
            </button>
            <button
              type="button"
              className="yt-arrow-btn"
              disabled={pageIndex >= maxPages - 1}
              onClick={() => setPageIndex((p) => Math.min(maxPages - 1, p + 1))}
              aria-label="Next picks"
            >
              <ChevronRight size={20} />
            </button>
          </div>
        </div>
      </div>

      {/* MOBILE 3x3 GRID LAYOUT (Image 1) */}
      <div className="yt-mobile-quick-grid">
        {/* Card 1: Liked Music Special Card */}
        <Link href="/library/favorites" className="yt-grid-card yt-liked-card">
          <div className="yt-liked-card-bg">
            <ThumbsUp size={36} fill="#ffffff" color="#ffffff" className="yt-thumbs-icon" />
          </div>
          <div className="yt-card-gradient-overlay" />
          <div className="yt-card-text-row">
            <span className="yt-card-title">Liked Music</span>
            <ArrowRight size={16} />
          </div>
        </Link>

        {/* Cards 2-9 */}
        {mobileQuickPicks.map((track) => {
          const isThisPlaying = playingTrackId === track.id && isPlaying;
          return (
            <div
              key={`mob-${track.id}`}
              className="yt-grid-card"
              onClick={() => handleTrackClick(track)}
            >
              <img
                src={(track as any).coverUrl || track.artworkUrl || '/logo-square.jpg'}
                alt={track.title}
                className="yt-card-img"
              />
              <div className="yt-card-gradient-overlay" />
              <div className="yt-card-play-overlay">
                <button type="button" className="yt-card-play-btn">
                  {isThisPlaying ? <Pause size={18} fill="#ffffff" /> : <Play size={18} fill="#ffffff" />}
                </button>
              </div>
              <div className="yt-card-text-row">
                <span className="yt-card-title">{track.title}</span>
                <ArrowRight size={14} />
              </div>
            </div>
          );
        })}
      </div>

      {/* DESKTOP 3-COLUMN LIST LAYOUT (Image 2 & 4) */}
      <div className="yt-desktop-quick-columns">
        {columns.map((col, colIdx) => (
          <div key={`col-${colIdx}`} className="yt-quick-col">
            {col.map((track) => {
              const isThisPlaying = playingTrackId === track.id && isPlaying;
              return (
                <div
                  key={`desk-${track.id}`}
                  className={`yt-track-row-item ${playingTrackId === track.id ? 'playing' : ''}`}
                  onClick={() => handleTrackClick(track)}
                >
                  <div className="yt-track-thumb-box">
                    <img
                      src={(track as any).coverUrl || track.artworkUrl || '/logo-square.jpg'}
                      alt={track.title}
                      className="yt-track-thumb"
                    />
                    <div className="yt-track-play-hover">
                      {isThisPlaying ? (
                        <Pause size={16} fill="#ffffff" color="#ffffff" />
                      ) : (
                        <Play size={16} fill="#ffffff" color="#ffffff" />
                      )}
                    </div>
                  </div>

                  <div className="yt-track-info-col">
                    <span className="yt-track-title-text">{track.title}</span>
                    <span className="yt-track-sub-text">
                      {track.artist || '4ANDONE Studio'} • {track.style || 'Dance'}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </section>
  );
}
