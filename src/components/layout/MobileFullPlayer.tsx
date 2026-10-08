"use client";

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
  Headphones,
  Video,
  Gauge,
  Minus,
  Plus,
  Download,
  ListPlus,
  Disc,
  Trophy
} from 'lucide-react';
import { useAudio } from '@/components/audio/AudioProvider';
import { useStudio } from '@/components/admin/StudioProvider';
import { getTrackCover } from '@/utils/trackCover';

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

export default function MobileFullPlayer({ isOpen, onClose }: MobileFullPlayerProps) {
  const router = useRouter();
  const { albums, tracks, toggleFavorite } = useStudio();
  const {
    isPlaying,
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
    toggleFinalMode
  } = useAudio();

  const [mode, setMode] = useState<'audio' | 'video'>('audio');
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isSpeedPopoverOpen, setIsSpeedPopoverOpen] = useState(false);
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
  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;

  const currentBpm = bpm || 100;
  const bpmDelta = currentBpm - 100;
  const isBpmChanged = currentBpm !== 100;
  const bpmDisplay = bpmDelta === 0 ? '0%' : (bpmDelta > 0 ? `+${bpmDelta}%` : `${bpmDelta}%`);

  const handleBpmChange = (delta: number) => {
    const currentVal = bpm || 100;
    const newBpm = Math.min(150, Math.max(50, currentVal + delta));
    setBpm(newBpm, true);
  };

  const resetBpm = () => {
    setBpm(100, true);
  };

  const handleSeekClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const ratio = clickX / rect.width;
    seek(ratio * duration);
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

  const handleDownload = () => {
    if (!currentTrack) return;
    const url = currentTrack.audioUrl || currentTrack.audio_url;
    if (url) {
      const a = document.createElement('a');
      a.href = url;
      a.download = `${currentTrack.title || 'track'}.mp3`;
      a.target = '_blank';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    }
  };

  return (
    <div className={`yt-mobile-full-player-overlay ${isFinalMode ? 'final-mode-active' : ''}`}>
      {/* Top Bar */}
      <div className="yt-mobile-player-header">
        <button type="button" className="yt-mobile-icon-btn" onClick={onClose}>
          <ChevronDown size={24} />
        </button>

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
                  onClose();
                  router.push('/library');
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
          <span className="yt-title-chevron">&gt;</span>
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
            onClick={async () => {
              if (currentTrack?.id) {
                await toggleFavorite(currentTrack.id);
              }
            }}
          >
            <Heart size={14} fill={isFavorite ? '#ef4444' : 'none'} color={isFavorite ? '#ef4444' : 'currentColor'} />
            <span>{isFavorite ? 'Liked' : 'Like'}</span>
          </button>

          {/* Speedometer Pill Button */}
          <button
            type="button"
            className={`yt-action-pill ${isBpmChanged || isSpeedPopoverOpen ? 'active-speed' : ''}`}
            onClick={() => setIsSpeedPopoverOpen(!isSpeedPopoverOpen)}
          >
            <Gauge size={14} />
            <span>{isBpmChanged ? `Speed ${bpmDisplay}` : 'Speed'}</span>
          </button>

          {/* Final Mode Pill Button (1:45 Timer + Red Highlight) */}
          <button
            type="button"
            className={`yt-action-pill ${isFinalMode ? 'active-final' : ''}`}
            onClick={toggleFinalMode}
            title="Final Mode (1:45 Timer)"
          >
            <Trophy size={14} color={isFinalMode ? '#ef4444' : 'currentColor'} />
            <span>Final</span>
          </button>

          <button
            type="button"
            className="yt-action-pill"
            onClick={() => {
              onClose();
              router.push('/library');
            }}
          >
            <Bookmark size={14} />
            <span>Save</span>
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
                value={currentBpm}
                onChange={(e) => setBpm(parseInt(e.target.value), true)}
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

      {/* Progress Slider */}
      <div className="yt-mobile-progress-wrap">
        <div className="yt-progress-line-track" onClick={handleSeekClick}>
          <div className="yt-progress-line-fill" style={{ width: `${progressPercent}%` }} />
        </div>
        <div className="yt-mobile-time-row">
          <span>{formatTime(currentTime)}</span>
          <span>{formatTime(duration)}</span>
        </div>
      </div>

      {/* Main Controls Row */}
      <div className="yt-mobile-controls-row">
        <button
          type="button"
          className={`yt-mobile-control-btn ${isShuffle ? 'active' : ''}`}
          onClick={toggleShuffle}
        >
          <Shuffle size={20} />
        </button>

        <button type="button" className="yt-mobile-control-btn" onClick={playPrevious}>
          <SkipBack size={26} fill="currentColor" />
        </button>

        <button type="button" className="yt-mobile-play-main-circle" onClick={togglePlay}>
          {isPlaying ? (
            <Pause size={28} fill="#000000" color="#000000" />
          ) : (
            <Play size={28} fill="#000000" color="#000000" style={{ marginLeft: 3 }} />
          )}
        </button>

        <button type="button" className="yt-mobile-control-btn" onClick={playNext}>
          <SkipForward size={26} fill="currentColor" />
        </button>

        <button
          type="button"
          className={`yt-mobile-control-btn ${isRepeat ? 'active' : ''}`}
          onClick={toggleRepeat}
        >
          <Repeat size={20} />
        </button>
      </div>

      {/* Bottom Style Badge */}
      <div className="yt-mobile-bottom-tag">
        <span className="yt-style-highlight">{currentTrack?.style || 'Dance Track'}</span>
      </div>
    </div>
  );
}
