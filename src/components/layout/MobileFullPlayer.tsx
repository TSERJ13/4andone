"use client";

import React, { useState } from 'react';
import {
  ChevronDown,
  MoreVertical,
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Shuffle,
  Repeat,
  ThumbsUp,
  ThumbsDown,
  MessageSquare,
  Bookmark,
  Headphones,
  Video
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
  const { albums } = useStudio();
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
    seek
  } = useAudio();

  const [mode, setMode] = useState<'audio' | 'video'>('audio');
  const [liked, setLiked] = useState(false);
  const [disliked, setDisliked] = useState(false);

  if (!isOpen) return null;

  const coverImg = getTrackCover(currentTrack, albums);
  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;

  const handleSeekClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const ratio = clickX / rect.width;
    seek(ratio * duration);
  };

  return (
    <div className="yt-mobile-full-player-overlay">
      {/* Top Bar */}
      <div className="yt-mobile-player-header">
        <button type="button" className="yt-mobile-icon-btn" onClick={onClose}>
          <ChevronDown size={24} />
        </button>

        {/* Audio / Video Switcher Pill */}
        <div className="yt-mode-switcher-pill">
          <button
            type="button"
            className={`yt-mode-btn ${mode === 'audio' ? 'active' : ''}`}
            onClick={() => setMode('audio')}
          >
            <Headphones size={14} />
          </button>
          <button
            type="button"
            className={`yt-mode-btn ${mode === 'video' ? 'active' : ''}`}
            onClick={() => setMode('video')}
          >
            <Video size={14} />
          </button>
        </div>

        <button type="button" className="yt-mobile-icon-btn">
          <MoreVertical size={20} />
        </button>
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

      {/* Action Buttons Pill Row (Like, Dislike, Comment, Save) */}
      <div className="yt-mobile-actions-row">
        <button
          type="button"
          className={`yt-action-pill ${liked ? 'active' : ''}`}
          onClick={() => {
            setLiked(!liked);
            if (disliked) setDisliked(false);
          }}
        >
          <ThumbsUp size={16} />
          <span>1.4k</span>
        </button>

        <button
          type="button"
          className={`yt-action-pill ${disliked ? 'active' : ''}`}
          onClick={() => {
            setDisliked(!disliked);
            if (liked) setLiked(false);
          }}
        >
          <ThumbsDown size={16} />
        </button>

        <button type="button" className="yt-action-pill">
          <MessageSquare size={16} />
          <span>12</span>
        </button>

        <button type="button" className="yt-action-pill">
          <Bookmark size={16} />
          <span>Save</span>
        </button>
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
