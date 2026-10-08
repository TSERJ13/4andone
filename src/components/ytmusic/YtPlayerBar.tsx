"use client";

import React, { useState } from 'react';
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Shuffle,
  Repeat,
  Volume2,
  VolumeX,
  ChevronDown,
  ThumbsUp,
  ThumbsDown,
  MoreVertical,
  Minus,
  Plus,
  Gauge
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
    seek,
    bpm,
    setBpm
  } = useAudio();

  const [isLiked, setIsLiked] = useState(false);
  const [isDisliked, setIsDisliked] = useState(false);

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

  const handleBpmChange = (delta: number) => {
    const currentVal = bpm || 100;
    const newBpm = Math.min(130, Math.max(70, currentVal + delta));
    setBpm(newBpm, true);
  };

  const resetBpm = () => {
    setBpm(100, true);
  };

  const currentBpm = bpm || 100;
  const bpmDisplay = `${currentBpm}%`;
  const isBpmChanged = currentBpm !== 100;

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
        {/* LEFT: Playback Controls & Time */}
        <div className="yt-player-left-controls">
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
            className="yt-player-icon-btn yt-main-play-btn"
            onClick={togglePlay}
            title={isPlaying ? 'Pause' : 'Play'}
          >
            {isPlaying ? (
              <Pause size={22} fill="currentColor" color="currentColor" />
            ) : (
              <Play size={22} fill="currentColor" color="currentColor" style={{ marginLeft: 2 }} />
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

          <span className="yt-player-time-display">
            {formatTime(currentTime)} / {formatTime(duration)}
          </span>
        </div>

        {/* CENTER: Thumbnail, Title, Artist, Likes */}
        <div className="yt-player-center-meta" onClick={onExpandPlayer}>
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

          <div className="yt-player-actions" onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              className={`yt-player-icon-btn ${isLiked ? 'active' : ''}`}
              onClick={() => {
                setIsLiked(!isLiked);
                if (isDisliked) setIsDisliked(false);
              }}
              title="Like"
            >
              <ThumbsUp size={18} fill={isLiked ? 'currentColor' : 'none'} />
            </button>

            <button
              type="button"
              className={`yt-player-icon-btn ${isDisliked ? 'active' : ''}`}
              onClick={() => {
                setIsDisliked(!isDisliked);
                if (isLiked) setIsLiked(false);
              }}
              title="Dislike"
            >
              <ThumbsDown size={18} fill={isDisliked ? 'currentColor' : 'none'} />
            </button>

            <button
              type="button"
              className="yt-player-icon-btn"
              title="More options"
            >
              <MoreVertical size={18} />
            </button>
          </div>
        </div>

        {/* RIGHT: BPM Speed Pill, Volume, Repeat, Shuffle, Down Chevron */}
        <div className="yt-player-right-controls">
          {/* YT Music Style BPM Speed Controller Pill */}
          <div className="yt-bpm-controller-pill">
            <button
              type="button"
              className="yt-bpm-btn"
              onClick={() => handleBpmChange(-1)}
              title="Decrease speed (-1%)"
            >
              <Minus size={13} />
            </button>

            <button
              type="button"
              className={`yt-bpm-value-btn ${isBpmChanged ? 'changed' : ''}`}
              onClick={resetBpm}
              title="Click to reset to 100%"
            >
              <Gauge size={13} className="yt-bpm-icon" />
              <span>{bpmDisplay}</span>
            </button>

            <button
              type="button"
              className="yt-bpm-btn"
              onClick={() => handleBpmChange(1)}
              title="Increase speed (+1%)"
            >
              <Plus size={13} />
            </button>
          </div>

          {/* Volume control */}
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
            className={`yt-player-icon-btn ${isRepeat ? 'active' : ''}`}
            onClick={toggleRepeat}
            title="Repeat"
          >
            <Repeat size={18} />
          </button>

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
            onClick={onExpandPlayer}
            title="Collapse / Expand"
          >
            <ChevronDown size={20} />
          </button>
        </div>
      </div>
    </div>
  );
}
