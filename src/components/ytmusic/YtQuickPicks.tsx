"use client";

import React, { useRef, useState } from 'react';
import Link from 'next/link';
import { Play, Pause, ChevronLeft, ChevronRight, ThumbsUp, ChevronRight as ArrowRight } from 'lucide-react';
import { Track, useStudio } from '@/components/admin/StudioProvider';
import { useAudioControls } from '@/components/audio/AudioProvider';
import { useAuth } from '@/context/AuthContext';
import { getTrackCover } from '@/utils/trackCover';

interface YtQuickPicksProps {
  tracks: Track[];
  onPlayAll?: () => void;
}

export default function YtQuickPicks({ tracks, onPlayAll }: YtQuickPicksProps) {
  const { albums } = useStudio();
  const { user } = useAuth();
  const { togglePlay, isPlaying, trackId: playingTrackId, loadTrack } = useAudioControls();
  const [pageIndex, setPageIndex] = useState(0);

  const userName = user?.first_name
    ? `${user.first_name} ${user.last_name || ''}`.trim().toUpperCase()
    : '4ANDONE MUSIC';

  // Phone: swipeable 3x3 pages — page 1 = Liked Music + 8 songs, then 9 per page
  const MOBILE_PAGES = 4;
  const mobilePages: Track[][] = [tracks.slice(0, 8)];
  for (let i = 8; i < tracks.length && mobilePages.length < MOBILE_PAGES; i += 9) mobilePages.push(tracks.slice(i, i + 9));
  const pagerRef = useRef<HTMLDivElement>(null);
  const [mobilePage, setMobilePage] = useState(0);
  const isPhoneLayout = () => !!pagerRef.current && pagerRef.current.offsetParent !== null;
  const goMobilePage = (p: number) => {
    const el = pagerRef.current;
    if (!el) return;
    el.scrollTo({ left: Math.max(0, Math.min(mobilePages.length - 1, p)) * el.clientWidth, behavior: 'smooth' });
  };

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
          <span className="yt-section-sub">{userName}</span>
          <h2 className="yt-section-title">Last Played</h2>
        </div>
        <div className="yt-section-header-right">
          <button type="button" className="yt-btn-play-all" onClick={onPlayAll}>
            Play all
          </button>
          <div className="yt-nav-arrows">
            <button
              type="button"
              className="yt-arrow-btn"
              disabled={pageIndex === 0 && mobilePage === 0}
              onClick={() => (isPhoneLayout() ? goMobilePage(mobilePage - 1) : setPageIndex((p) => Math.max(0, p - 1)))}
              aria-label="Previous picks"
            >
              <ChevronLeft size={20} />
            </button>
            <button
              type="button"
              className="yt-arrow-btn"
              disabled={pageIndex >= maxPages - 1 && mobilePage >= mobilePages.length - 1}
              onClick={() => (isPhoneLayout() ? goMobilePage(mobilePage + 1) : setPageIndex((p) => Math.min(maxPages - 1, p + 1)))}
              aria-label="Next picks"
            >
              <ChevronRight size={20} />
            </button>
          </div>
        </div>
      </div>

      {/* MOBILE: swipeable 3x3 pages (like the album / dance shelves) */}
      <div
        ref={pagerRef}
        className="yt-mobile-quick-pager"
        onScroll={(e) => {
          const el = e.currentTarget;
          if (el.clientWidth > 0) setMobilePage(Math.round(el.scrollLeft / el.clientWidth));
        }}
      >
        {mobilePages.map((pageTracks, pageNo) => (
          <div key={`page-${pageNo}`} className="yt-mobile-quick-grid">
            {pageNo === 0 && (
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
            )}
            {pageTracks.map((track) => {
              const isThisPlaying = playingTrackId === track.id && isPlaying;
              const coverImg = getTrackCover(track, albums);
              return (
                <div
                  key={`mob-${track.id}`}
                  className="yt-grid-card"
                  onClick={() => handleTrackClick(track)}
                >
                  <img
                    src={coverImg}
                    alt={track.title}
                    className="yt-card-img"
                    loading={pageNo === 0 ? undefined : 'lazy'}
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
        ))}
      </div>

      {/* DESKTOP 3-COLUMN LIST LAYOUT */}
      <div className="yt-desktop-quick-columns">
        {columns.map((col, colIdx) => (
          <div key={`col-${colIdx}`} className="yt-quick-col">
            {col.map((track) => {
              const isThisPlaying = playingTrackId === track.id && isPlaying;
              const coverImg = getTrackCover(track, albums);
              return (
                <div
                  key={`desk-${track.id}`}
                  className={`yt-track-row-item ${playingTrackId === track.id ? 'playing' : ''}`}
                  onClick={() => handleTrackClick(track)}
                >
                  <div className="yt-track-thumb-box">
                    <img
                      src={coverImg}
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
                      {track.artist || '4ANDONE Studio'}
                      {track.style && (
                        <span className="yt-style-highlight"> • {track.style}</span>
                      )}
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
