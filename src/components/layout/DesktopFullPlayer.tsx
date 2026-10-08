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
} from 'lucide-react';
import { useAudio } from '@/components/audio/AudioProvider';
import { useStudio, Track } from '@/components/admin/StudioProvider';
import { getTrackCover } from '@/utils/trackCover';

const formatTime = (seconds: number): string => {
  if (!seconds || isNaN(seconds)) return '0:00';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

interface DesktopFullPlayerProps {
  onClose: () => void;
}

export default function DesktopFullPlayer({ onClose }: DesktopFullPlayerProps) {
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
    loadTrack
  } = useAudio();

  const { tracks, albums } = useStudio();
  const [activeTab, setActiveTab] = useState<'upnext' | 'lyrics' | 'comments' | 'related'>('upnext');

  const coverImg = getTrackCover(currentTrack, albums);
  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;

  const handleSeekClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const ratio = clickX / rect.width;
    seek(ratio * duration);
  };

  return (
    <div className="yt-full-player-desktop-overlay">
      {/* Main Split Body: 60% Left Video/Art + 40% Right Queue */}
      <div className="yt-full-player-body">
        {/* Left Side: Large 16:9 Artwork / Video Stage */}
        <div className="yt-player-left-stage">
          <div className="yt-player-artwork-box">
            <img
              src={coverImg}
              alt={title}
              className="yt-player-stage-img"
            />
            <div className="yt-stage-gradient-overlay" />
          </div>
        </div>

        {/* Right Side: Up Next / Lyrics / Related Panel */}
        <div className="yt-player-right-panel">
          {/* Top Tabs Header */}
          <div className="yt-panel-tabs-bar">
            <button
              type="button"
              className={`yt-panel-tab ${activeTab === 'upnext' ? 'active' : ''}`}
              onClick={() => setActiveTab('upnext')}
            >
              UP NEXT
            </button>
            <button
              type="button"
              className={`yt-panel-tab ${activeTab === 'lyrics' ? 'active' : ''}`}
              onClick={() => setActiveTab('lyrics')}
            >
              LYRICS
            </button>
            <button
              type="button"
              className={`yt-panel-tab ${activeTab === 'comments' ? 'active' : ''}`}
              onClick={() => setActiveTab('comments')}
            >
              COMMENTS
            </button>
            <button
              type="button"
              className={`yt-panel-tab ${activeTab === 'related' ? 'active' : ''}`}
              onClick={() => setActiveTab('related')}
            >
              RELATED
            </button>
          </div>

          {/* Tab 1: UP NEXT Track Queue */}
          {activeTab === 'upnext' && (
            <div className="yt-panel-queue-list">
              {tracks.slice(0, 35).map((track: Track) => {
                const isThisPlaying = currentTrack?.id === track.id;
                const trkCover = getTrackCover(track, albums);
                return (
                  <div
                    key={track.id}
                    className={`yt-queue-item ${isThisPlaying ? 'active' : ''}`}
                    onClick={() => loadTrack(track)}
                  >
                    <div className="yt-queue-thumb-box">
                      <img
                        src={trkCover}
                        alt={track.title}
                        className="yt-queue-thumb"
                      />
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

                    <span className="yt-queue-duration">
                      {track.duration ? formatTime(track.duration) : '3:15'}
                    </span>
                  </div>
                );
              })}
            </div>
          )}

          {/* Tab 2: LYRICS / Track Info */}
          {activeTab === 'lyrics' && (
            <div className="yt-panel-info-content">
              <h3 className="yt-info-track-title">{title}</h3>
              <p className="yt-info-artist-name">{artist}</p>
              <div className="yt-info-tags-row">
                <span className="yt-info-badge">Style: {currentTrack?.style || 'Dance'}</span>
                {currentTrack?.bpm && <span className="yt-info-badge">BPM: {currentTrack.bpm}</span>}
              </div>
              <div className="yt-info-text-box">
                <p>Lyrics and track details available for 4ANDONE premium members.</p>
              </div>
            </div>
          )}

          {/* Tab 3: COMMENTS */}
          {activeTab === 'comments' && (
            <div className="yt-panel-info-content">
              <h4>Community Comments</h4>
              <p className="yt-info-text-box">No comments yet. Be the first dancer to leave a note!</p>
            </div>
          )}

          {/* Tab 4: RELATED */}
          {activeTab === 'related' && (
            <div className="yt-panel-queue-list">
              {tracks.slice(5, 20).map((track: Track) => {
                const trkCover = getTrackCover(track, albums);
                return (
                  <div
                    key={`rel-${track.id}`}
                    className="yt-queue-item"
                    onClick={() => loadTrack(track)}
                  >
                    <div className="yt-queue-thumb-box">
                      <img
                        src={trkCover}
                        alt={track.title}
                        className="yt-queue-thumb"
                      />
                    </div>
                    <div className="yt-queue-info">
                      <span className="yt-queue-title">{track.title}</span>
                      <span className="yt-queue-artist">
                        {track.style && <span className="yt-style-highlight">• {track.style}</span>}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Bottom Full Player Bar */}
      <div className="yt-full-player-bottom-bar">
        {/* Progress Line */}
        <div className="yt-progress-line-track" onClick={handleSeekClick}>
          <div className="yt-progress-line-fill" style={{ width: `${progressPercent}%` }} />
        </div>

        <div className="yt-full-bar-controls">
          {/* Left: Prev, Play/Pause, Next */}
          <div className="yt-bar-left-controls">
            <button type="button" className="yt-bar-btn" onClick={playPrevious} title="Previous">
              <SkipBack size={22} fill="currentColor" />
            </button>
            <button type="button" className="yt-bar-play-circle" onClick={togglePlay} title={isPlaying ? 'Pause' : 'Play'}>
              {isPlaying ? <Pause size={22} fill="#000" color="#000" /> : <Play size={22} fill="#000" color="#000" style={{ marginLeft: 2 }} />}
            </button>
            <button type="button" className="yt-bar-btn" onClick={playNext} title="Next">
              <SkipForward size={22} fill="currentColor" />
            </button>
          </div>

          {/* Center: Track Title & Subtitle */}
          <div className="yt-bar-center-meta">
            <span className="yt-bar-track-title">{title}</span>
            <span className="yt-bar-track-subtitle">
              {artist}
              {currentTrack?.style && <span className="yt-style-highlight"> • {currentTrack.style}</span>}
            </span>
          </div>

          {/* Right: Volume, Repeat, Shuffle, Collapse Chevron */}
          <div className="yt-bar-right-controls">
            <div className="yt-volume-control">
              <button type="button" className="yt-bar-btn" onClick={() => setVolume(volume > 0 ? 0 : 1)}>
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

            <button type="button" className={`yt-bar-btn ${isRepeat ? 'active' : ''}`} onClick={toggleRepeat} title="Repeat">
              <Repeat size={18} />
            </button>
            <button type="button" className={`yt-bar-btn ${isShuffle ? 'active' : ''}`} onClick={toggleShuffle} title="Shuffle">
              <Shuffle size={18} />
            </button>

            <button type="button" className="yt-bar-btn yt-collapse-btn" onClick={onClose} title="Collapse">
              <ChevronDown size={24} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
