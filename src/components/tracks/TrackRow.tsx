"use client";

import React from 'react';
import { Disc, Heart, Play, CheckCircle2 } from 'lucide-react';
import { getTrackSlug } from '@/utils/seo';
import { formatDuration } from '@/utils/format';
import { getMPMFromBPM } from '@/utils/audio';
import { displayStyleName } from '@/utils/styleNames';
import { getTrackCover } from '@/utils/trackCover';
import { useStudio } from '@/components/admin/StudioProvider';

export interface TrackRowTrack {
  id: string;
  title: string;
  artist?: string;
  style?: string;
  album?: string;
  coverUrl?: string;
  artworkUrl?: string;
  bpm?: string | number | null;
  duration?: number | null;
  isFavorite?: boolean;
}

interface TrackRowProps {
  track: TrackRowTrack;
  /** This row is the one currently playing. */
  isActive: boolean;
  onPlay: () => void;
  onToggleFavorite?: () => void;
  /**
   * 'style'    → coloured style badge (lists that mix dances: home, search…)
   * 'duration' → track length instead (a single dance's page: no "SAMBA" on every row)
   */
  badge?: 'style' | 'duration';
  styleColor?: string;
  isDownloaded?: boolean;
  /** Optional extra control (e.g. remove from playlist), shown before the heart. */
  extraAction?: React.ReactNode;
  /** Precomputed track page path (collision-free slug); defaults to getTrackSlug. */
  href?: string;
}

export const TrackRow = React.memo(function TrackRow({
  track,
  isActive,
  onPlay,
  onToggleFavorite,
  badge = 'style',
  styleColor,
  isDownloaded = false,
  extraAction,
  href,
}: TrackRowProps) {
  const { albums, styles } = useStudio();
  const isFitness = track.style?.toLowerCase() === 'fitness';
  const duration = track.duration ? formatDuration(track.duration) : '';
  const mpm = !isFitness && track.bpm ? `${getMPMFromBPM(Number(track.bpm), track.style || '')} MPM` : '';
  const showStyleBadge = badge === 'style' && !!track.style;

  const coverImage = getTrackCover(track as any, albums, styles);
  const styleTitle = track.style ? displayStyleName(track.style) : '';

  return (
    <div
      className={`track-row ${isActive ? 'is-active' : ''}`}
      onClick={onPlay}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => { if (e.key === 'Enter') onPlay(); }}
    >
      <div className="track-icon-col">
        {coverImage ? (
          <img 
            src={coverImage} 
            alt={track.title}
            className="track-row-cover"
            onError={(e) => {
              (e.target as HTMLElement).style.display = 'none';
            }}
          />
        ) : (
          <Disc size={18} />
        )}
      </div>

      <div className="track-info-col">
        <div className="track-title-row">
          <a
            href={href || `/music/${getTrackSlug({ id: track.id, title: track.title, artist: track.artist, style: track.style || '' })}`}
            className="track-title-seo-link track-name"
            onClick={(e) => {
              if (e.metaKey || e.ctrlKey || e.shiftKey) { e.stopPropagation(); return; }
              e.preventDefault();
            }}
          >
            {track.title}
          </a>
          {isDownloaded && (
            <span className="track-downloaded-badge" title="Stored on device (offline)">
              <CheckCircle2 size={13} />
            </span>
          )}
        </div>
        <p className="track-artist">
          <span>{track.artist || '4and.one Music'}</span>
          {styleTitle && (
            <>
              {' • '}
              <span className="style-highlight-bold">{styleTitle}</span>
            </>
          )}
          {duration && <span className="track-duration-sub"> • {duration}</span>}
        </p>
      </div>

      <div className="track-badge-col">
        {showStyleBadge ? (
          <span className="style-badge-pill" style={{ backgroundColor: styleColor || '#e4e4e7' }}>
            {displayStyleName(track.style)}
          </span>
        ) : badge === 'duration' && duration ? (
          <span className="track-duration-text">{duration}</span>
        ) : null}
      </div>

      <div className="track-meta-col">{isFitness ? duration : mpm}</div>

      <div className="track-actions-col">
        {extraAction}
        {onToggleFavorite && (
          <button
            type="button"
            className={`fav-action ${track.isFavorite ? 'active-heart' : ''}`}
            onClick={(e) => { e.stopPropagation(); onToggleFavorite(); }}
            aria-label={track.isFavorite ? 'Remove from liked songs' : 'Like song'}
          >
            <Heart size={16} fill={track.isFavorite ? '#ff4b2b' : 'none'} color={track.isFavorite ? '#ff4b2b' : 'currentColor'} />
          </button>
        )}
        <div className="play-action">
          {isActive ? (
            <div className="playing-bars"><span></span><span></span><span></span></div>
          ) : (
            <Play size={18} fill="currentColor" />
          )}
        </div>
      </div>
    </div>
  );
});

export default TrackRow;
