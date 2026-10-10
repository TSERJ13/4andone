"use client";

import React, { useEffect, useRef, useState } from 'react';
import { Play, Pause } from 'lucide-react';
import type { Track } from '@/components/admin/StudioProvider';
import type { Album } from '@/types/album';
import { getTrackCover } from '@/utils/trackCover';

const PAGE = 40; // rows added each time the list is scrolled near its end

const formatTime = (seconds?: number): string => {
  if (!seconds || isNaN(seconds)) return '';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

interface QueuePanelListProps {
  tracks: Track[];
  albums: Album[];
  currentTrackId?: string | null;
  isPlaying: boolean;
  onSelect: (track: Track) => void;
  kicker?: string;
  heading?: string;
  emptyText: string;
}

/**
 * A list in the full player's side panel. Shows the WHOLE list: more rows are
 * added as you scroll near the bottom (it used to stop at 35 songs), and the
 * panel scrolls all the way to the last song.
 */
export function QueuePanelList({ tracks, albums, currentTrackId, isPlaying, onSelect, kicker, heading, emptyText }: QueuePanelListProps) {
  const [shown, setShown] = useState(PAGE);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const hasMore = shown < tracks.length;

  useEffect(() => {
    const el = sentinelRef.current;
    if (!el || !hasMore) return;
    const io = new IntersectionObserver((entries) => {
      if (entries.some(e => e.isIntersecting)) setShown(n => n + PAGE);
    }, { root: el.parentElement, rootMargin: '600px 0px' });
    io.observe(el);
    return () => io.disconnect();
  }, [hasMore, shown]);

  return (
    <div className="yt-panel-queue-list">
      {heading && (
        <div className="yt-panel-list-head">
          {kicker && <div className="yt-panel-list-kicker">{kicker}</div>}
          <div className="yt-panel-list-title">{heading}</div>
          {tracks.length > 0 && (
            <div className="yt-panel-list-count">{tracks.length} {tracks.length === 1 ? 'track' : 'tracks'}</div>
          )}
        </div>
      )}
      {tracks.length === 0 && emptyText && (
        <div className="yt-panel-info-content">
          <p className="yt-info-text-box">{emptyText}</p>
        </div>
      )}
      {tracks.slice(0, shown).map((track, i) => {
        const isThisPlaying = currentTrackId === track.id;
        return (
          <div
            key={`${track.id}-${i}`}
            className={`yt-queue-item ${isThisPlaying ? 'active' : ''}`}
            onClick={() => onSelect(track)}
          >
            <div className="yt-queue-thumb-box">
              <img src={getTrackCover(track, albums)} alt={track.title} className="yt-queue-thumb" loading="lazy" />
              {isThisPlaying && (
                <div className="yt-queue-playing-icon">
                  {isPlaying ? <Pause size={14} fill="#ffffff" /> : <Play size={14} fill="#ffffff" />}
                </div>
              )}
            </div>
            <div className="yt-queue-info">
              <span className="yt-queue-title">{track.title}</span>
              <span className="yt-queue-artist">
                {track.artist || '4ANDONE Music'}
                {track.style && <span className="yt-style-highlight"> • {track.style}</span>}
              </span>
            </div>
            <span className="yt-queue-duration">{formatTime(track.duration)}</span>
          </div>
        );
      })}
      {hasMore && <div ref={sentinelRef} className="yt-panel-list-sentinel" aria-hidden="true" />}
    </div>
  );
}
