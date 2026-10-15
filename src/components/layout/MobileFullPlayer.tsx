"use client";

import { isFinalSpeedLockedRoute } from '@/utils/renderedFinalTest';
import React, { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  ChevronDown,
  MoreVertical,
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Shuffle,
  Repeat,
  Heart,
  Share2,
  Bookmark,
  Music2,
  ListMusic,
  Gauge,
  Minus,
  Plus,
  Download,
  ListPlus,
  Disc,
  Trophy,
  X
} from 'lucide-react';
import { openAddToPlaylist, saveTrackOffline } from '@/components/audio/playerActions';
import { useAudio } from '@/components/audio/AudioProvider';
import { FINAL_USER_STOP_EVENT } from '@/components/audio/FinalStopButton';
import { useStudio } from '@/components/admin/StudioProvider';
import { getTrackCover } from '@/utils/trackCover';
import { SeekBar } from '@/components/audio/SeekBar';
import { QueuePanelList } from './QueuePanelList';
import { useRecentlyPlayed } from '@/hooks/useRecentlyPlayed';
import type { Track } from '@/components/admin/StudioProvider';
import FullPlayerAd from '@/components/ads/FullPlayerAd';

const formatTime = (seconds: number): string => {
  if (!seconds || isNaN(seconds)) return '0:00';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

interface MobileFullPlayerProps {
  isOpen: boolean;
  onClose: () => void;
}


/**
 * The player's list = what was listened to lately, newest first, with the song playing right now on top
 * (the order is read when the list opens, so tapping a song doesn't shuffle it under the finger).
 */
function RecentQueue() {
  const { albums, tracks } = useStudio();
  const { isPlaying, currentTrack, loadTrack, sessionTracks, isFinalMode } = useAudio();
  const recentIds = useRecentlyPlayed(100);
  const list = React.useMemo(() => {
    if (isFinalMode && sessionTracks.length > 0) return sessionTracks;
    const recent = recentIds.map(id => tracks.find(t => t.id === id)).filter(Boolean) as Track[];
    const current = currentTrack ? (tracks.find(t => t.id === currentTrack.id) || currentTrack) as Track : null;
    return current ? [current, ...recent.filter(t => t.id !== current.id)] : recent;
  }, [recentIds, tracks, currentTrack?.id, isFinalMode, sessionTracks]); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <QueuePanelList
      tracks={list}
      albums={albums}
      currentTrackId={currentTrack?.id}
      isPlaying={isPlaying}
      onSelect={(t) => { if (!isFinalMode) loadTrack(t, false, undefined, { queue: list }); }}
      kicker="Recently played"
      emptyText="No recently played tracks yet."
    />
  );
}

export default function MobileFullPlayer({ isOpen, onClose }: MobileFullPlayerProps) {
  const router = useRouter();
  const { albums, tracks, toggleFavorite } = useStudio();
  const {
    isPlaying,
    isLoading,
    togglePlay,
    playNext,
    playPrevious,
    title,
    artist,
    currentTrack,
    isShuffle,
    toggleShuffle,
    isRepeat,
    toggleRepeat,
    currentTime,
    duration,
    seek,
    bpm,
    setBpm,
    isFinalMode,
    toggleFinalMode,
    isPauseCountdown,
    pauseTime,
    sessionDuration,
    stop,
    activeMode,
  } = useAudio();

  const [mode, setMode] = useState<'now' | 'queue'>('now');
  const [scrubTime, setScrubTime] = useState<number | null>(null);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isSpeedPopoverOpen, setIsSpeedPopoverOpen] = useState(false);
  // Dragging the slider only changes this label; the music changes once, when the finger lifts.
  const [draftBpm, setDraftBpm] = useState<number | null>(null);
  const [showCopiedToast, setShowCopiedToast] = useState(false);

  const menuRef = useRef<HTMLDivElement>(null);
  const speedRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false);
      }
      if (speedRef.current && !speedRef.current.contains(event.target as Node)) {
        setIsSpeedPopoverOpen(false);
      }
    };
    if (isMenuOpen || isSpeedPopoverOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isMenuOpen, isSpeedPopoverOpen]);

  if (!isOpen) return null;

  const liveTrack = tracks.find((t) => t.id === currentTrack?.id) || currentTrack;
  const isFavorite = liveTrack?.isFavorite || false;
  const coverImg = getTrackCover(currentTrack, albums);
  // Final Mode: the bar shows the whole session and can't be dragged.
  const speedLocked = isFinalMode && isFinalSpeedLockedRoute();
  const totalDur = isFinalMode && sessionDuration > 0 ? sessionDuration : duration;

  const currentBpm = bpm || 100;
  const shownBpm = draftBpm ?? currentBpm;
  const bpmDelta = shownBpm - 100;
  const isBpmChanged = currentBpm !== 100;
  const commitDraftBpm = () => {
    if (draftBpm === null) return;
    setBpm(draftBpm, true);
    setDraftBpm(null);
  };
  const bpmDisplay = bpmDelta === 0 ? '0%' : (bpmDelta > 0 ? `+${bpmDelta}%` : `${bpmDelta}%`);

  // Light red tint for the whole of Final Mode. (It compared the session clock
  // with one dance's limit, so in programs it went fully red after ~1:30.)
  const isFinalRedActive = isFinalMode;

  const handleBpmChange = (delta: number) => {
    const currentVal = bpm || 100;
    const newBpm = Math.min(150, Math.max(50, currentVal + delta));
    setBpm(newBpm, true);
  };

  const resetBpm = () => {
    setBpm(100, true);
  };


  const handleShare = () => {
    if (!currentTrack) return;
    const shareUrl = `${window.location.origin}/track/${currentTrack.id}`;
    if (navigator.clipboard) {
      navigator.clipboard.writeText(shareUrl);
    }
    setShowCopiedToast(true);
    setTimeout(() => setShowCopiedToast(false), 2500);
  };

  const handleDownload = () => saveTrackOffline(currentTrack);

  return (
    <div className={`yt-mobile-full-player-overlay ${isFinalRedActive ? 'final-mode-active' : ''}`}>
      {/* Top Bar */}
      <div className="yt-mobile-player-header">
        <button type="button" className="yt-mobile-icon-btn" onClick={onClose}>
          <ChevronDown size={24} />
        </button>

        {/* Now playing / Up next */}
        <div className="yt-mode-switcher-pill" role="tablist">
          <button type="button" role="tab" aria-selected={mode === 'now'} aria-label="Now playing" title="Now playing"
            className={`yt-mode-btn ${mode === 'now' ? 'active' : ''}`} onClick={() => setMode('now')}>
            <Music2 size={18} />
          </button>
          <button type="button" role="tab" aria-selected={mode === 'queue'} aria-label="Up next" title="Up next"
            className={`yt-mode-btn ${mode === 'queue' ? 'active' : ''}`} onClick={() => setMode('queue')}>
            <ListMusic size={18} />
          </button>
        </div>

        {/* Top Right 3-Dots Context Menu Button */}
        <div style={{ position: 'relative' }} ref={menuRef}>
          <button
            type="button"
            className="yt-mobile-icon-btn"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            aria-label="More options"
          >
            <MoreVertical size={20} />
          </button>

          {/* Toast feedback */}
          {showCopiedToast && (
            <div className="yt-copied-toast mobile-toast">
              Link copied to clipboard!
            </div>
          )}

          {/* YouTube Music 3-Dots Context Menu Popover */}
          {isMenuOpen && (
            <div className="yt-context-menu-popover mobile-context-popover">
              <button
                type="button"
                className="yt-context-menu-item"
                onClick={async () => {
                  setIsMenuOpen(false);
                  if (currentTrack?.id) await toggleFavorite(currentTrack.id);
                }}
              >
                <Heart size={16} fill={isFavorite ? '#ef4444' : 'none'} color={isFavorite ? '#ef4444' : 'currentColor'} />
                <span>{isFavorite ? 'Remove from Liked Songs' : 'Save to Liked Songs'}</span>
              </button>

              <button
                type="button"
                className="yt-context-menu-item"
                onClick={() => {
                  setIsMenuOpen(false);
                  handleDownload();
                }}
              >
                <Download size={16} />
                <span>Download track</span>
              </button>

              <button
                type="button"
                className="yt-context-menu-item"
                onClick={() => {
                  setIsMenuOpen(false);
                  openAddToPlaylist(currentTrack);
                }}
              >
                <ListPlus size={16} />
                <span>Save to playlist</span>
              </button>

              {currentTrack?.album && (
                <button
                  type="button"
                  className="yt-context-menu-item"
                  onClick={() => {
                    setIsMenuOpen(false);
                    onClose();
                    router.push(`/album/${currentTrack.album.toLowerCase().replace(/\s+/g, '-')}`);
                  }}
                >
                  <Disc size={16} />
                  <span>Go to album</span>
                </button>
              )}

              <button
                type="button"
                className="yt-context-menu-item"
                onClick={() => {
                  setIsMenuOpen(false);
                  handleShare();
                }}
              >
                <Share2 size={16} />
                <span>Share track</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Everything above the progress bar is one area, so the bar and the player buttons stay in the same place in both views */}
      <div className="yt-mobile-top-area">
      {mode === 'queue' ? (
        <div className="yt-mobile-queue-view">
          <RecentQueue />
        </div>
      ) : (
      <>
      <div className="yt-mobile-space-top" aria-hidden="true" />
      {/* Ad at the top, away from the controls and the seek bar (free plan) */}
      <FullPlayerAd className="yt-mobile-full-ad" onClose={onClose} />

      {/* Main Cover Artwork */}
      <div className="yt-mobile-stage">
        <div className="yt-mobile-art-box">
          <img
            src={coverImg}
            alt={title}
            className="yt-mobile-art-img"
          />
        </div>
      </div>

      {/* Track Meta & Title */}
      <div className="yt-mobile-meta-section">
        <div className="yt-mobile-title-row">
          <h2 className="yt-mobile-track-title">{title}</h2>
        </div>
        <p className="yt-mobile-track-artist">
          {artist}
          {currentTrack?.style && (
            <span className="yt-style-highlight"> • {currentTrack.style}</span>
          )}
        </p>
      </div>

      {/* Action Buttons Pill Row (Like, Speed, Final 1:45, Save) */}
      <div className="yt-mobile-actions-wrapper" ref={speedRef}>
        <div className="yt-mobile-actions-row">
          <button
            type="button"
            className={`yt-action-pill ${isFavorite ? 'active-heart' : ''}`}
            aria-label={isFavorite ? 'Remove from liked songs' : 'Like'}
            title={isFavorite ? 'Liked' : 'Like'}
            onClick={async () => {
              if (currentTrack?.id) {
                await toggleFavorite(currentTrack.id);
              }
            }}
          >
            <Heart size={20} fill={isFavorite ? '#ef4444' : 'none'} color={isFavorite ? '#ef4444' : 'currentColor'} />
          </button>

          {/* Speedometer Pill Button */}
          <button
            type="button"
            className={`yt-action-pill ${isBpmChanged || isSpeedPopoverOpen ? 'active-speed' : ''}`}
            disabled={speedLocked}
            style={speedLocked ? { opacity: 0.35 } : undefined}
            onClick={() => setIsSpeedPopoverOpen(!isSpeedPopoverOpen)}
            aria-label={isBpmChanged ? `Speed ${bpmDisplay}` : 'Speed'}
            title={isBpmChanged ? `Speed ${bpmDisplay}` : 'Speed'}
          >
            <Gauge size={20} />
            {isBpmChanged && <span className="yt-action-value">{bpmDisplay}</span>}
          </button>

          {/* Final Mode Pill Button (1:45 Timer + Red Highlight) */}
          <button
            type="button"
            className={`yt-action-pill ${isFinalMode ? 'active-final' : ''}`}
            onClick={() => {
              if (isFinalMode) {
                // Ending Final Mode = the user's choice (no "Final Mode is Over" popup)
                window.dispatchEvent(new Event(FINAL_USER_STOP_EVENT));
                // A program ends completely; a single track keeps playing normally
                if (activeMode) stop(); else toggleFinalMode();
              } else {
                toggleFinalMode();
              }
            }}
            title={isFinalMode ? 'Stop Final Mode' : 'Final Mode (1:45 Timer)'}
            aria-label={isFinalMode ? 'Stop Final Mode' : 'Final Mode'}
          >
            {isFinalMode ? <X size={20} color="#ef4444" strokeWidth={2.75} /> : <Trophy size={20} color="currentColor" />}
          </button>

          <button
            type="button"
            className="yt-action-pill"
            onClick={() => openAddToPlaylist(currentTrack)}
            aria-label="Save to playlist"
            title="Save"
          >
            <Bookmark size={20} />
          </button>
        </div>

        {/* BPM Speed Popover Card Modal */}
        {isSpeedPopoverOpen && (
          <div className="yt-speed-popover-card mobile-speed-card">
            <div className="yt-speed-popover-header">
              <span className="yt-speed-percentage-text">{bpmDisplay}</span>
              <button
                type="button"
                className="yt-speed-reset-btn"
                onClick={resetBpm}
              >
                RESET
              </button>
            </div>

            <div className="yt-speed-slider-row">
              <button
                type="button"
                className="yt-speed-step-btn"
                onClick={() => handleBpmChange(-5)}
                title="-5%"
              >
                <Minus size={15} />
              </button>

              <input
                type="range"
                min={50}
                max={150}
                step={1}
                value={shownBpm}
                onChange={(e) => setDraftBpm(parseInt(e.target.value, 10))}
                onPointerUp={commitDraftBpm}
                onTouchEnd={commitDraftBpm}
                onMouseUp={commitDraftBpm}
                onKeyUp={commitDraftBpm}
                onBlur={commitDraftBpm}
                aria-label="Speed"
                className="yt-speed-range-slider"
              />

              <button
                type="button"
                className="yt-speed-step-btn"
                onClick={() => handleBpmChange(5)}
                title="+5%"
              >
                <Plus size={15} />
              </button>
            </div>

            <div className="yt-speed-labels-row">
              <span>-50%</span>
              <span>NORMAL</span>
              <span>+50%</span>
            </div>
          </div>
        )}
      </div>

      </>
      )}
      </div>

      {/* Progress Slider */}
      <div className="yt-mobile-progress-wrap">
        <SeekBar
          current={currentTime}
          total={totalDur}
          onSeek={seek}
          disabled={isFinalMode}
          color={isFinalMode ? '#ef4444' : undefined}
          onScrub={setScrubTime}
        />
        <div className="yt-mobile-time-row" style={isFinalMode ? { color: '#ef4444' } : undefined}>
          {isPauseCountdown ? (
            <span style={{ fontWeight: 800 }} aria-live="polite">Rest · next dance in {pauseTime}s</span>
          ) : (
            <span>{formatTime(scrubTime ?? currentTime)}</span>
          )}
          <span>{formatTime(totalDur)}</span>
        </div>
      </div>

      {/* Main Controls Row */}
      <div className="yt-mobile-controls-row">
        <button
          type="button"
          className={`yt-mobile-control-btn ${isShuffle ? 'active' : ''}`} aria-pressed={isShuffle}
          onClick={toggleShuffle}
        >
          <Shuffle size={20} />
        </button>

        <button
          type="button"
          className="yt-mobile-control-btn"
          onClick={playPrevious}
          disabled={isFinalMode}
          style={isFinalMode ? { opacity: 0.3 } : undefined}
        >
          <SkipBack size={26} fill="currentColor" />
        </button>

        <button type="button" className="yt-mobile-play-main-circle" onClick={togglePlay}>
          {isLoading && !isPlaying ? (
            <span className="yt-spin-ring" role="status" aria-label="Loading" />
          ) : isPlaying ? (
            <Pause size={28} fill="#000000" color="#000000" />
          ) : (
            <Play size={28} fill="#000000" color="#000000" style={{ marginLeft: 3 }} />
          )}
        </button>

        <button
          type="button"
          className="yt-mobile-control-btn"
          onClick={playNext}
          disabled={isFinalMode}
          style={isFinalMode ? { opacity: 0.3 } : undefined}
        >
          <SkipForward size={26} fill="currentColor" />
        </button>

        <button
          type="button"
          className={`yt-mobile-control-btn ${isRepeat ? 'active' : ''}`} aria-pressed={isRepeat}
          onClick={toggleRepeat}
        >
          <Repeat size={20} />
        </button>
      </div>
    </div>
  );
}
