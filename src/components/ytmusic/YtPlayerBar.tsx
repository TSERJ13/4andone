"use client";

import React from 'react';
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Shuffle,
  Repeat,
  Volume2,
  VolumeX,
  Maximize2,
  ThumbsUp
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

interface YtPlayerBarProps {
  onExpandPlayer?: () => void;
}

export default function YtPlayerBar({ onExpandPlayer }: YtPlayerBarProps) {
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
    volume,
    setVolume,
    currentTime,
    duration,
    seek
  } = useAudio();

  if (!currentTrack && title === "No Track Selected") {
    return null;
  }

  const coverImg = getTrackCover(currentTrack, albums);
  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;

  const handleSeekClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const ratio = clickX / rect.width;
    seek(ratio * duration);
  };

  return (
    <div className="yt-player-bar-container">
      {/* Top Red Progress Line */}
      <div className="yt-progress-line-track" onClick={handleSeekClick}>
        <div
          className="yt-progress-line-fill"
          style={{ width: `${progressPercent}%` }}
        />
      </div>

      <div className="yt-player-bar-content">
        {/* Left: Artwork + Track Meta */}
        <div className="yt-player-left" onClick={onExpandPlayer}>
          <img
            src={coverImg}
            alt={title}
            className="yt-player-thumb"
          />
          <div className="yt-player-meta">
            <span className="yt-player-title">{title}</span>
            <span className="yt-player-artist">
              {artist}
              {currentTrack?.style && (
                <span className="yt-style-highlight"> • {currentTrack.style}</span>
              )}
            </span>
          </div>
          <button
            type="button"
            className="yt-player-icon-btn yt-like-btn"
            onClick={(e) => {
              e.stopPropagation();
            }}
            title="Like"
          >
            <ThumbsUp size={18} />
          </button>
        </div>

        {/* Center: Playback Controls */}
        <div className="yt-player-center">
          <button
            type="button"
            className={`yt-player-icon-btn ${isShuffle ? 'active' : ''}`}
            onClick={toggleShuffle}
            title="Shuffle"
          >
            <Shuffle size={18} />
          </button>

          <button
            type="button"
            className="yt-player-icon-btn"
            onClick={playPrevious}
            title="Previous"
          >
            <SkipBack size={20} fill="currentColor" />
          </button>

          <button
            type="button"
            className="yt-player-play-circle-btn"
            onClick={togglePlay}
            title={isPlaying ? 'Pause' : 'Play'}
          >
            {isPlaying ? (
              <Pause size={20} fill="#000000" color="#000000" />
            ) : (
              <Play size={20} fill="#000000" color="#000000" style={{ marginLeft: 2 }} />
            )}
          </button>

          <button
            type="button"
            className="yt-player-icon-btn"
            onClick={playNext}
            title="Next"
          >
            <SkipForward size={20} fill="currentColor" />
          </button>

          <button
            type="button"
            className={`yt-player-icon-btn ${isRepeat ? 'active' : ''}`}
            onClick={toggleRepeat}
            title="Repeat"
          >
            <Repeat size={18} />
          </button>

          <span className="yt-player-time-display">
            {formatTime(currentTime)} / {formatTime(duration)}
          </span>
        </div>

        {/* Right: Volume & Expand */}
        <div className="yt-player-right">
          <div className="yt-volume-control">
            <button
              type="button"
              className="yt-player-icon-btn"
              onClick={() => setVolume(volume > 0 ? 0 : 1)}
            >
              {volume === 0 ? <VolumeX size={18} /> : <Volume2 size={18} />}
            </button>
            <input
              type="range"
              min={0}
              max={1}
              step={0.01}
              value={volume}
              onChange={(e) => setVolume(parseFloat(e.target.value))}
              className="yt-volume-slider"
            />
          </div>

          <button
            type="button"
            className="yt-player-icon-btn"
            onClick={onExpandPlayer}
            title="Expand"
          >
            <Maximize2 size={18} />
          </button>
        </div>
      </div>
    </div>
  );
}
