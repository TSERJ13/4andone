"use client";

import React from 'react';
import Link from 'next/link';
import { Play, Pause, Heart, Share2, Disc, ArrowLeft, Clock, Music } from 'lucide-react';
import { useAudio } from '@/components/audio/AudioProvider';
import { useStudio } from '@/components/admin/StudioProvider';
import { useAuth } from '@/context/AuthContext';
import { SeoTrack } from '@/lib/seo-data';
import { SeoDanceCategory } from '@/utils/seo';
import { formatDuration } from '@/utils/format';

interface Props {
  track: SeoTrack;
  slug: string;
  category?: SeoDanceCategory;
  relatedTracks: { track: SeoTrack; slug: string }[];
}

export default function TrackClientView({ track, slug, category, relatedTracks }: Props) {
  const { isPlaying, title: playingTitle, trackId: playingTrackId, loadTrack, togglePlay } = useAudio();
  const { tracks, toggleFavorite } = useStudio();
  const { isAuthenticated, setIsAuthModalOpen } = useAuth();

  // Find track in StudioProvider state if present to get live favorite status
  const liveTrack = tracks.find((t) => t.id === track.id) || track;
  const isThisTrackPlaying = isPlaying && (playingTrackId ? playingTrackId === track.id : playingTitle === track.title);
  const isThisTrackLoaded = playingTrackId ? playingTrackId === track.id : playingTitle === track.title;

  const handlePlayMain = () => {
    if (isThisTrackLoaded) {
      togglePlay();
    } else {
      loadTrack(liveTrack);
    }
  };

  const handleShare = async () => {
    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({
          title: `${track.title} – ${track.style} | 4and.one`,
          text: `Listen to ${track.title} (${track.style}) on 4and.one Music with adjustable BPM!`,
          url: window.location.href,
        });
      } catch (e) {}
    } else if (typeof navigator !== 'undefined' && navigator.clipboard) {
      await navigator.clipboard.writeText(window.location.href);
      alert('Link copied to clipboard!');
    }
  };

  const handleToggleFavorite = () => {
    if (!isAuthenticated) {
      setIsAuthModalOpen(true);
      return;
    }
    toggleFavorite?.(track.id);
  };

  const discipline = category?.discipline || (['Cha-Cha-Cha', 'Samba', 'Rumba', 'Paso Doble', 'Jive'].includes(track.style) ? 'Latin' : 'Standard');
  const categoryPath = category?.slug ? `/${category.slug}` : `/style/${track.style.toLowerCase().replace(/[\s\-_]+/g, '-')}`;

  return (
    <div className="seo-track-page animate-in">
      {/* Top Breadcrumb Nav */}
      <nav aria-label="Breadcrumb" className="seo-breadcrumb-nav">
        <Link href="/" className="crumb-link">Home</Link>
        <span className="crumb-sep">/</span>
        <span className="crumb-plain">{discipline}</span>
        <span className="crumb-sep">/</span>
        <Link href={categoryPath} className="crumb-link">
          {category?.name || track.style}
        </Link>
        <span className="crumb-sep">/</span>
        <span className="crumb-current">{track.title}</span>
      </nav>

      {/* Main Track Showcase Card */}
      <article className="seo-track-card glass">
        <div className="seo-cover-wrapper">
          {track.artworkUrl ? (
            <img
              src={track.artworkUrl}
              alt={`${track.title} ${track.style} cover art`}
              className="seo-cover-img"
              width={220}
              height={220}
            />
          ) : (
            <div className="seo-cover-placeholder">
              <Disc size={64} className={isThisTrackPlaying ? 'animate-spin-slow' : ''} />
            </div>
          )}
          <button
            type="button"
            className="seo-play-floating-btn"
            onClick={handlePlayMain}
            aria-label={isThisTrackPlaying ? `Pause ${track.title}` : `Play ${track.title}`}
          >
            {isThisTrackPlaying ? <Pause size={32} /> : <Play size={32} fill="currentColor" style={{ marginLeft: 3 }} />}
          </button>
        </div>

        <div className="seo-details">
          <div className="seo-badge-row">
            <Link href={categoryPath} className="seo-style-badge">
              {category?.name || track.style}
            </Link>
            {track.bpm && (
              <span className="seo-bpm-badge">
                ⚡ {track.bpm} BPM
              </span>
            )}
            <span className="seo-discipline-tag">{discipline} Ballroom</span>
          </div>

          <h1 className="seo-track-title">{track.title}</h1>

          <div className="seo-artist-meta">
            <span className="seo-artist-name">{track.artist || '4and.one Music'}</span>
            {track.duration ? (
              <>
                <span className="seo-dot">·</span>
                <span className="seo-duration">
                  <Clock size={14} className="inline mr-1 opacity-70" />
                  {formatDuration(track.duration)}
                </span>
              </>
            ) : null}
          </div>

          <p className="seo-track-summary">
            Listen to <strong>{track.title}</strong> by {track.artist || '4and.one Music'} in <strong>{category?.name || track.style}</strong> tempo ({track.bpm || 'Standard'} BPM). Full tempo-adjustable DanceSport and ballroom practice music on 4and.one.
          </p>

          <div className="seo-actions-bar">
            <button
              type="button"
              className={`seo-main-play-cta ${isThisTrackPlaying ? 'is-playing' : ''}`}
              onClick={handlePlayMain}
            >
              {isThisTrackPlaying ? (
                <>
                  <Pause size={20} />
                  <span>Pause Playback</span>
                </>
              ) : (
                <>
                  <Play size={20} fill="currentColor" />
                  <span>{isThisTrackLoaded ? 'Resume Playback' : 'Play Track Now'}</span>
                </>
              )}
            </button>

            <button
              type="button"
              className={`seo-icon-btn ${liveTrack.isFavorite ? 'is-favorite' : ''}`}
              onClick={handleToggleFavorite}
              title={liveTrack.isFavorite ? 'Remove from favorites' : 'Add to favorites'}
              aria-label="Toggle favorite"
            >
              <Heart size={20} fill={liveTrack.isFavorite ? 'currentColor' : 'none'} />
            </button>

            <button
              type="button"
              className="seo-icon-btn"
              onClick={handleShare}
              title="Share this track"
              aria-label="Share track"
            >
              <Share2 size={20} />
            </button>
          </div>
        </div>
      </article>

      {/* Related Tracks Section */}
      {relatedTracks.length > 0 && (
        <section className="seo-related-section">
          <div className="seo-related-header">
            <div>
              <h2 className="seo-related-title">More {category?.name || track.style} Music</h2>
              <p className="seo-related-subtitle">
                Explore popular {category?.name || track.style} practice tracks for DanceSport competitors.
              </p>
            </div>
            <Link href={categoryPath} className="seo-view-all-link">
              View All ({category?.name || track.style}) →
            </Link>
          </div>

          <div className="seo-related-grid">
            {relatedTracks.map(({ track: rTrack, slug: rSlug }) => {
              const isPlayingThis = isPlaying && (playingTrackId ? playingTrackId === rTrack.id : playingTitle === rTrack.title);

              return (
                <div key={rTrack.id} className="seo-related-card glass">
                  <button
                    type="button"
                    className="seo-related-play"
                    onClick={() => loadTrack(rTrack)}
                    aria-label={`Play ${rTrack.title}`}
                  >
                    {isPlayingThis ? <Pause size={18} /> : <Play size={18} fill="currentColor" />}
                  </button>

                  <div className="seo-related-info">
                    <Link href={`/music/${rSlug}`} className="seo-related-name" title={rTrack.title}>
                      {rTrack.title}
                    </Link>
                    <div className="seo-related-meta">
                      <span className="seo-related-artist">{rTrack.artist}</span>
                      {rTrack.bpm && <span>· {rTrack.bpm} BPM</span>}
                      {rTrack.duration ? <span>· {formatDuration(rTrack.duration)}</span> : null}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* Scoped CSS styling matching 4and.one dark glass aesthetic */}
      <style jsx>{`
        .seo-track-page {
          padding: 32px 40px 140px 40px;
          max-width: 1200px;
          margin: 0 auto;
        }

        .seo-breadcrumb-nav {
          display: flex;
          align-items: center;
          gap: 10px;
          font-size: 13px;
          color: #71717a;
          margin-bottom: 28px;
          flex-wrap: wrap;
        }

        .crumb-link {
          color: #a1a1aa;
          text-decoration: none;
          transition: color 0.2s ease;
        }

        .crumb-link:hover {
          color: #ffffff;
        }

        .crumb-sep {
          color: #3f3f46;
        }

        .crumb-plain {
          color: #a1a1aa;
        }

        .crumb-current {
          color: #ffffff;
          font-weight: 600;
        }

        .seo-track-card {
          display: flex;
          gap: 36px;
          align-items: center;
          padding: 36px;
          border-radius: 24px;
          background: rgba(24, 24, 27, 0.6);
          border: 1px solid rgba(255, 255, 255, 0.08);
          backdrop-filter: blur(20px);
          margin-bottom: 48px;
        }

        .seo-cover-wrapper {
          position: relative;
          width: 220px;
          height: 220px;
          flex-shrink: 0;
          border-radius: 20px;
          overflow: hidden;
          background: #121214;
          box-shadow: 0 16px 36px rgba(0, 0, 0, 0.5);
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .seo-cover-img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .seo-cover-placeholder {
          width: 100%;
          height: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #52525b;
          background: linear-gradient(135deg, #18181b 0%, #09090b 100%);
        }

        .seo-play-floating-btn {
          position: absolute;
          inset: 0;
          margin: auto;
          width: 64px;
          height: 64px;
          border-radius: 50%;
          background: #1db954;
          color: #000;
          border: none;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          opacity: 0.95;
          box-shadow: 0 8px 24px rgba(29, 185, 84, 0.4);
          transition: transform 0.2s cubic-bezier(0.34, 1.56, 0.64, 1), background-color 0.2s;
        }

        .seo-play-floating-btn:hover {
          transform: scale(1.08);
          background: #1ed760;
        }

        .seo-details {
          flex: 1;
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .seo-badge-row {
          display: flex;
          align-items: center;
          gap: 10px;
          flex-wrap: wrap;
        }

        .seo-style-badge {
          background: rgba(29, 185, 84, 0.15);
          color: #1ed760;
          border: 1px solid rgba(29, 185, 84, 0.3);
          padding: 4px 12px;
          border-radius: 999px;
          font-size: 12px;
          font-weight: 700;
          text-decoration: none;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          transition: all 0.2s;
        }

        .seo-style-badge:hover {
          background: rgba(29, 185, 84, 0.25);
          transform: translateY(-1px);
        }

        .seo-bpm-badge {
          background: rgba(234, 179, 8, 0.12);
          color: #facc15;
          border: 1px solid rgba(234, 179, 8, 0.25);
          padding: 4px 10px;
          border-radius: 999px;
          font-size: 12px;
          font-weight: 600;
        }

        .seo-discipline-tag {
          font-size: 12px;
          color: #a1a1aa;
        }

        .seo-track-title {
          font-size: 36px;
          font-weight: 900;
          color: #ffffff;
          line-height: 1.15;
          letter-spacing: -0.8px;
          margin: 0;
        }

        .seo-artist-meta {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 15px;
          color: #a1a1aa;
        }

        .seo-artist-name {
          color: #e4e4e7;
          font-weight: 600;
        }

        .seo-dot {
          color: #52525b;
        }

        .seo-track-summary {
          font-size: 14px;
          line-height: 1.6;
          color: #a1a1aa;
          margin: 6px 0 12px 0;
          max-width: 680px;
        }

        .seo-track-summary strong {
          color: #ffffff;
        }

        .seo-actions-bar {
          display: flex;
          align-items: center;
          gap: 12px;
          margin-top: 6px;
        }

        .seo-main-play-cta {
          display: inline-flex;
          align-items: center;
          gap: 10px;
          padding: 12px 28px;
          background: #1db954;
          color: #000000;
          font-weight: 700;
          font-size: 15px;
          border-radius: 999px;
          border: none;
          cursor: pointer;
          transition: all 0.2s cubic-bezier(0.34, 1.56, 0.64, 1);
        }

        .seo-main-play-cta:hover {
          background: #1ed760;
          transform: scale(1.03);
        }

        .seo-main-play-cta.is-playing {
          background: #27272a;
          color: #ffffff;
          border: 1px solid rgba(255, 255, 255, 0.15);
        }

        .seo-icon-btn {
          width: 44px;
          height: 44px;
          border-radius: 50%;
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.1);
          color: #a1a1aa;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: all 0.2s;
        }

        .seo-icon-btn:hover {
          background: rgba(255, 255, 255, 0.1);
          color: #ffffff;
          transform: scale(1.05);
        }

        .seo-icon-btn.is-favorite {
          color: #f43f5e;
          background: rgba(244, 63, 94, 0.15);
          border-color: rgba(244, 63, 94, 0.3);
        }

        /* Related Section */
        .seo-related-section {
          margin-top: 48px;
        }

        .seo-related-header {
          display: flex;
          align-items: flex-end;
          justify-content: space-between;
          margin-bottom: 20px;
          flex-wrap: wrap;
          gap: 12px;
        }

        .seo-related-title {
          font-size: 22px;
          font-weight: 800;
          color: #ffffff;
          margin: 0 0 4px 0;
        }

        .seo-related-subtitle {
          font-size: 13px;
          color: #71717a;
          margin: 0;
        }

        .seo-view-all-link {
          font-size: 13px;
          font-weight: 600;
          color: #1ed760;
          text-decoration: none;
          transition: opacity 0.2s;
        }

        .seo-view-all-link:hover {
          opacity: 0.8;
        }

        .seo-related-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
          gap: 16px;
        }

        .seo-related-card {
          display: flex;
          align-items: center;
          gap: 14px;
          padding: 14px 16px;
          border-radius: 16px;
          background: rgba(24, 24, 27, 0.4);
          border: 1px solid rgba(255, 255, 255, 0.05);
          transition: all 0.2s ease;
        }

        .seo-related-card:hover {
          background: rgba(39, 39, 42, 0.6);
          border-color: rgba(255, 255, 255, 0.12);
          transform: translateY(-2px);
        }

        .seo-related-play {
          width: 38px;
          height: 38px;
          border-radius: 50%;
          background: #1db954;
          color: #000;
          border: none;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          flex-shrink: 0;
          transition: transform 0.2s;
        }

        .seo-related-play:hover {
          transform: scale(1.1);
        }

        .seo-related-info {
          flex: 1;
          min-width: 0;
        }

        .seo-related-name {
          display: block;
          font-size: 14px;
          font-weight: 700;
          color: #ffffff;
          text-decoration: none;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          transition: color 0.2s;
        }

        .seo-related-name:hover {
          color: #1ed760;
        }

        .seo-related-meta {
          font-size: 12px;
          color: #71717a;
          margin-top: 2px;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        @media (max-width: 840px) {
          .seo-track-page {
            padding: 20px 16px 140px 16px;
          }

          .seo-track-card {
            flex-direction: column;
            text-align: center;
            padding: 24px 20px;
            gap: 24px;
          }

          .seo-badge-row {
            justify-content: center;
          }

          .seo-artist-meta {
            justify-content: center;
          }

          .seo-actions-bar {
            justify-content: center;
          }

          .seo-track-title {
            font-size: 26px;
          }

          .seo-cover-wrapper {
            width: 180px;
            height: 180px;
          }

          .seo-related-grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </div>
  );
}
