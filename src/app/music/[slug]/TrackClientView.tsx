"use client";

import React, { useEffect } from 'react';
import Link from 'next/link';
import { Play, Pause, Heart, Share2, Plus, Clock, Activity, Music2 } from 'lucide-react';
import { useAudioControls } from '@/components/audio/AudioProvider';
import { useStudio } from '@/components/admin/StudioProvider';
import { useAuth } from '@/context/AuthContext';
import { SeoTrack } from '@/lib/seo-data';
import { SeoDanceCategory } from '@/utils/seo';
import { formatDuration } from '@/utils/format';
import { displayStyleName } from '@/utils/styleNames';
import { getTrackCover } from '@/utils/trackCover';
import { TrackRow } from '@/components/tracks/TrackRow';
import { OPEN_ADD_TO_PLAYLIST_EVENT } from '@/components/audio/playerActions';

interface Props {
  track: SeoTrack;
  slug: string;
  category?: SeoDanceCategory;
  relatedTracks: { track: SeoTrack; slug: string }[];
}

export default function TrackClientView({ track, slug, category, relatedTracks }: Props) {
  const { isPlaying, title: playingTitle, trackId: playingTrackId, loadTrack, togglePlay } = useAudioControls();
  const { tracks, albums, styles, toggleFavorite } = useStudio();
  const { isAuthenticated, setIsAuthModalOpen } = useAuth();

  // Find track in StudioProvider state if present to get live state
  const liveTrack = tracks.find((t) => t.id === track.id) || track;
  const isThisTrackPlaying = isPlaying && (playingTrackId ? playingTrackId === track.id : playingTitle === track.title);
  const isThisTrackLoaded = playingTrackId ? playingTrackId === track.id : playingTitle === track.title;

  // Automatically load the track into the player bar when opening the page
  useEffect(() => {
    if (liveTrack && (!playingTrackId || playingTrackId !== liveTrack.id)) {
      loadTrack(liveTrack);
    }
  }, [liveTrack.id, loadTrack]);

  const handlePlayMain = () => {
    if (isThisTrackLoaded) {
      togglePlay();
    } else {
      loadTrack(liveTrack);
    }
  };

  const handleShare = async () => {
    const shareUrl = typeof window !== 'undefined' ? window.location.href : `https://4and.one/music/${slug}`;
    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({
          title: `${track.title} – ${track.style} | 4and.one`,
          text: `Listen to ${track.title} (${track.style}) on 4and.one Music!`,
          url: shareUrl,
        });
      } catch (e) {
        // Ignored if user dismissed share sheet
      }
    } else if (typeof navigator !== 'undefined' && navigator.clipboard) {
      await navigator.clipboard.writeText(shareUrl);
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

  const handleAddToPlaylist = () => {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent(OPEN_ADD_TO_PLAYLIST_EVENT, { detail: liveTrack }));
    }
  };

  const discipline = category?.discipline || (['Cha-Cha-Cha', 'Samba', 'Rumba', 'Paso Doble', 'Jive'].includes(track.style) ? 'Latin' : 'Standard');
  const categoryPath = category?.slug ? `/${category.slug}` : `/style/${track.style.toLowerCase().replace(/[\s\-_]+/g, '-')}`;
  const coverImage = getTrackCover(liveTrack, albums, styles);
  const styleTitle = displayStyleName(track.style);

  return (
    <div className="cat-page-wrapper track-view-page animate-in">
      {/* Breadcrumb Navigation */}
      <nav aria-label="Breadcrumb" className="cat-breadcrumb">
        <Link href="/" className="crumb-link">Home</Link>
        <span className="crumb-sep">/</span>
        <span className="crumb-plain">{discipline} Ballroom</span>
        <span className="crumb-sep">/</span>
        <Link href={categoryPath} className="crumb-link">
          {category?.name || styleTitle}
        </Link>
        <span className="crumb-sep">/</span>
        <span className="crumb-current">{track.title}</span>
      </nav>

      {/* Main Track Hero Header in 4and.one Style */}
      <header className="track-hero">
        <div className="track-hero-layout">
          <div className="track-cover-box">
            <img
              src={coverImage}
              alt={`${track.title} cover`}
              className="track-cover-img"
              onError={(e) => {
                (e.target as HTMLImageElement).src = '/logo-lockscreen.png';
              }}
            />
          </div>

          <div className="track-hero-info">
            <span className="cat-kicker">
              {styleTitle} · {discipline} Ballroom
            </span>

            <h1 className="track-title">{track.title}</h1>

            <div className="track-meta-row">
              <span className="track-artist">{track.artist || '4and.one Music'}</span>
              {track.bpm && (
                <>
                  <span className="cat-meta-dot" />
                  <span className="track-meta-badge">
                    <Activity size={13} />
                    {track.bpm} BPM
                  </span>
                </>
              )}
              {track.duration ? (
                <>
                  <span className="cat-meta-dot" />
                  <span className="track-meta-item">
                    <Clock size={13} />
                    {formatDuration(track.duration)}
                  </span>
                </>
              ) : null}
            </div>

            <div className="track-actions-row">
              <button
                type="button"
                className={`cat-play-all-btn ${isThisTrackPlaying ? 'is-playing' : ''}`}
                onClick={handlePlayMain}
                aria-label={isThisTrackPlaying ? `Pause ${track.title}` : `Play ${track.title}`}
              >
                {isThisTrackPlaying ? (
                  <>
                    <Pause size={18} fill="currentColor" />
                    <span>Pause</span>
                  </>
                ) : (
                  <>
                    <Play size={18} fill="currentColor" style={{ marginLeft: 2 }} />
                    <span>Play</span>
                  </>
                )}
              </button>

              <button
                type="button"
                className={`track-icon-btn ${liveTrack.isFavorite ? 'is-fav' : ''}`}
                onClick={handleToggleFavorite}
                title={liveTrack.isFavorite ? 'Remove from favorites' : 'Add to favorites'}
                aria-label="Toggle favorite"
              >
                <Heart size={18} fill={liveTrack.isFavorite ? 'currentColor' : 'none'} />
              </button>

              <button
                type="button"
                className="track-icon-btn"
                onClick={handleAddToPlaylist}
                title="Save to playlist"
                aria-label="Save to playlist"
              >
                <Plus size={18} />
              </button>

              <button
                type="button"
                className="track-icon-btn"
                onClick={handleShare}
                title="Share track"
                aria-label="Share track"
              >
                <Share2 size={18} />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Related Tracks List in exact 4and.one TrackRow Style */}
      {relatedTracks.length > 0 && (
        <section className="track-related-section">
          <div className="track-related-header">
            <div>
              <h2 className="cat-title" style={{ fontSize: '20px' }}>
                More {category?.name || styleTitle} Tracks
              </h2>
            </div>
            <Link href={categoryPath} className="cat-view-all">
              View All ({category?.name || styleTitle}) →
            </Link>
          </div>

          <div className="tracks-list">
            {relatedTracks.map(({ track: rTrack, slug: rSlug }) => {
              const rLive = tracks.find((t) => t.id === rTrack.id) || rTrack;
              const isRowActive = isPlaying && (playingTrackId ? playingTrackId === rTrack.id : playingTitle === rTrack.title);

              return (
                <TrackRow
                  key={rTrack.id}
                  track={rLive}
                  isActive={isRowActive}
                  onPlay={() => {
                    if (isRowActive) togglePlay();
                    else loadTrack(rLive);
                  }}
                  onToggleFavorite={() => {
                    if (!isAuthenticated) {
                      setIsAuthModalOpen(true);
                      return;
                    }
                    toggleFavorite?.(rTrack.id);
                  }}
                  badge="duration"
                  href={`/music/${rSlug}`}
                />
              );
            })}
          </div>
        </section>
      )}

      {/* Scoped CSS strictly matching 4and.one YouTube Music design system */}
      <style jsx>{`
        .track-view-page {
          padding: 24px 32px 140px 32px;
          max-width: 1100px;
          margin: 0 auto;
        }

        .cat-breadcrumb {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 13px;
          color: #71717a;
          margin-bottom: 24px;
          flex-wrap: wrap;
        }

        .crumb-link {
          color: #a1a1aa;
          text-decoration: none;
          transition: color 0.2s ease;
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

        .cat-kicker {
          font-size: 11px;
          font-weight: 800;
          letter-spacing: 1.4px;
          text-transform: uppercase;
          color: #ff0033;
        }

        .cat-meta-dot {
          width: 3px;
          height: 3px;
          border-radius: 50%;
          background: #52525b;
        }

        .track-hero {
          padding: 28px;
          border-radius: 20px;
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid rgba(255, 255, 255, 0.08);
          margin-bottom: 32px;
          backdrop-filter: blur(20px);
        }

        .track-hero-layout {
          display: flex;
          align-items: center;
          gap: 28px;
        }

        .track-cover-box {
          width: 140px;
          height: 140px;
          border-radius: 16px;
          overflow: hidden;
          background: #18181b;
          border: 1px solid rgba(255, 255, 255, 0.1);
          box-shadow: 0 12px 30px rgba(0, 0, 0, 0.6);
          flex-shrink: 0;
        }

        .track-cover-img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          display: block;
        }

        .track-hero-info {
          flex: 1;
          min-width: 0;
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .track-title {
          font-size: 32px;
          font-weight: 900;
          color: #fff;
          margin: 0;
          line-height: 1.15;
          letter-spacing: -0.5px;
        }

        .track-meta-row {
          display: flex;
          align-items: center;
          flex-wrap: wrap;
          gap: 10px;
          margin-top: 2px;
          font-size: 14px;
          color: #a1a1aa;
        }

        .track-artist {
          font-weight: 600;
          color: #e4e4e7;
        }

        .track-meta-badge {
          display: inline-flex;
          align-items: center;
          gap: 5px;
          font-size: 12px;
          font-weight: 700;
          color: #facc15;
        }

        .track-meta-item {
          display: inline-flex;
          align-items: center;
          gap: 5px;
          font-size: 13px;
        }

        .track-actions-row {
          display: flex;
          align-items: center;
          gap: 12px;
          margin-top: 14px;
        }

        .cat-play-all-btn {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 10px 24px;
          border-radius: 9999px;
          background: #ff0033;
          color: #fff;
          font-size: 14px;
          font-weight: 700;
          border: none;
          cursor: pointer;
          transition: all 0.2s;
          box-shadow: 0 4px 16px rgba(255, 0, 51, 0.35);
        }

        .cat-play-all-btn:hover {
          background: #cc0029;
          transform: scale(1.02);
        }

        .cat-play-all-btn.is-playing {
          background: #27272a;
          box-shadow: none;
          border: 1px solid rgba(255, 255, 255, 0.15);
        }

        .track-icon-btn {
          width: 40px;
          height: 40px;
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

        .track-icon-btn:hover {
          background: rgba(255, 255, 255, 0.1);
          color: #fff;
          transform: scale(1.05);
        }

        .track-icon-btn.is-fav {
          color: #f43f5e;
          background: rgba(244, 63, 94, 0.15);
          border-color: rgba(244, 63, 94, 0.3);
        }

        .track-related-section {
          margin-top: 24px;
        }

        .track-related-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 16px;
        }

        .cat-view-all {
          font-size: 13px;
          font-weight: 600;
          color: #ff0033;
          text-decoration: none;
          transition: opacity 0.2s;
        }

        .cat-view-all:hover {
          opacity: 0.8;
        }

        @media (max-width: 768px) {
          .track-view-page {
            padding: 16px 16px 140px 16px;
          }

          .track-hero {
            padding: 20px 16px;
          }

          .track-hero-layout {
            flex-direction: column;
            text-align: center;
            gap: 16px;
          }

          .track-cover-box {
            width: 130px;
            height: 130px;
            margin: 0 auto;
          }

          .track-meta-row {
            justify-content: center;
          }

          .track-actions-row {
            justify-content: center;
          }

          .track-title {
            font-size: 24px;
          }
        }
      `}</style>
    </div>
  );
}
