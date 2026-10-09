"use client";

import React, { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
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
  Heart,
  Share2,
  MoreVertical,
  Minus,
  Plus,
  Gauge,
  Download,
  ListPlus,
  Disc,
  Trophy
} from 'lucide-react';
import { openAddToPlaylist, saveTrackOffline } from '@/components/audio/playerActions';
import { useAudio } from '@/components/audio/AudioProvider';
import { FinalStopButton } from '@/components/audio/FinalStopButton';
import { useStudio, Track } from '@/components/admin/StudioProvider';
import { getTrackCover } from '@/utils/trackCover';
import { getRecentlyPlayedTrackIds } from '@/utils/history';
import { getStyleQueue, upNextFrom } from '@/utils/playQueue';

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
  const router = useRouter();
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
    loadTrack,
    isFinalMode,
    toggleFinalMode,
    activeMode,
    sessionTracks,
    isPauseCountdown,
    pauseTime,
    sessionDuration,
    stop,
    bpm,
    setBpm
  } = useAudio();
  // A Final program ends completely; Final on a single track just turns off and keeps playing
  const endFinal = () => (activeMode ? stop() : toggleFinalMode());

  const { tracks, albums, toggleFavorite } = useStudio();
  const [activeTab, setActiveTab] = useState<'upnext' | 'recent' | 'album' | 'artist'>('upnext');
  const [isSpeedPopoverOpen, setIsSpeedPopoverOpen] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [showCopiedToast, setShowCopiedToast] = useState(false);

  // 0. Up Next = what Next will actually play: the Final program's list while
  //    one runs (from the current dance), otherwise the same dance from every
  //    album (getStyleQueue — the exact list playNext() uses).
  const upNextTracks = React.useMemo(() => {
    if (isFinalMode && sessionTracks.length > 0) {
      const idx = currentTrack ? sessionTracks.findIndex(t => t.id === currentTrack.id) : -1;
      return idx === -1 ? sessionTracks : sessionTracks.slice(idx);
    }
    const queue = getStyleQueue(tracks, currentTrack as Track | null);
    return currentTrack ? [currentTrack as Track, ...upNextFrom(queue, currentTrack as Track, 34)] : queue.slice(0, 35);
  }, [tracks, sessionTracks, isFinalMode, currentTrack]);

  // 1. Recently Played Tracks — re-read whenever a track starts
  const [recentIds, setRecentIds] = useState<string[]>(() => getRecentlyPlayedTrackIds());
  useEffect(() => {
    const refresh = () => setRecentIds(getRecentlyPlayedTrackIds());
    window.addEventListener('4andone_recently_played_updated', refresh);
    return () => window.removeEventListener('4andone_recently_played_updated', refresh);
  }, []);
  const recentTracks = React.useMemo(
    () => recentIds.map(id => tracks.find(t => t.id === id)).filter(Boolean) as Track[],
    [recentIds, tracks]
  );

  // 2. ALBUM = the same album; 3. ARTIST = the same performer. Empty values
  //    and the generic "Bulk upload" album never match ("x".includes("")
  //    used to match every track).
  const norm = (v?: string) => (v || '').toLowerCase().trim();
  const currentAlbum = norm(currentTrack?.album);
  const hasRealAlbum = !!currentAlbum && currentAlbum !== 'bulk upload';
  const albumTracks = React.useMemo(() => {
    if (!currentTrack || !hasRealAlbum) return [];
    return tracks.filter(t => norm(t.album) === currentAlbum);
  }, [tracks, currentTrack, hasRealAlbum, currentAlbum]);
  const artistTracks = React.useMemo(() => {
    const artist = norm(currentTrack?.artist);
    if (!artist) return [];
    return tracks.filter(t => norm(t.artist) === artist);
  }, [tracks, currentTrack]);

  const popoverRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close popovers on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(event.target as Node)) {
        setIsSpeedPopoverOpen(false);
      }
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false);
      }
    };
    if (isSpeedPopoverOpen || isMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isSpeedPopoverOpen, isMenuOpen]);

  const liveTrack = tracks.find((t) => t.id === currentTrack?.id) || currentTrack;
  const isFavorite = liveTrack?.isFavorite || false;
  const coverImg = getTrackCover(currentTrack, albums);
  // Final Mode: whole-session bar, read-only
  const totalDur = isFinalMode && sessionDuration > 0 ? sessionDuration : duration;
  const progressPercent = totalDur > 0 ? Math.min(100, (currentTime / totalDur) * 100) : 0;

  const handleSeekClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (isFinalMode) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const ratio = clickX / rect.width;
    seek(ratio * duration);
  };

  const handleBpmChange = (delta: number) => {
    const currentVal = bpm || 100;
    const newBpm = Math.min(150, Math.max(50, currentVal + delta));
    setBpm(newBpm, true);
  };

  const resetBpm = () => {
    setBpm(100, true);
  };

  const handleToggleFavorite = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (currentTrack?.id) {
      await toggleFavorite(currentTrack.id);
    }
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

  const currentBpm = bpm || 100;
  const bpmDelta = currentBpm - 100;
  const isBpmChanged = currentBpm !== 100;
  const bpmDisplay = bpmDelta === 0 ? '0%' : (bpmDelta > 0 ? `+${bpmDelta}%` : `${bpmDelta}%`);

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
              className={`yt-panel-tab ${activeTab === 'recent' ? 'active' : ''}`}
              onClick={() => setActiveTab('recent')}
            >
              RECENT
            </button>
            <button
              type="button"
              className={`yt-panel-tab ${activeTab === 'album' ? 'active' : ''}`}
              onClick={() => setActiveTab('album')}
            >
              ALBUM
            </button>
            <button
              type="button"
              className={`yt-panel-tab ${activeTab === 'artist' ? 'active' : ''}`}
              onClick={() => setActiveTab('artist')}
            >
              ARTIST
            </button>
          </div>

          {/* Tab 1: UP NEXT Track Queue */}
          {activeTab === 'upnext' && (
            <div className="yt-panel-queue-list">
              {upNextTracks.map((track: Track) => {
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

          {/* Tab 2: RECENT Tracks */}
          {activeTab === 'recent' && (
            <div className="yt-panel-queue-list">
              {recentTracks.length === 0 ? (
                <div className="yt-panel-info-content">
                  <p className="yt-info-text-box">No recently played tracks yet. Listen to music to build your history!</p>
                </div>
              ) : (
                recentTracks.map((track: Track) => {
                  const isThisPlaying = currentTrack?.id === track.id;
                  const trkCover = getTrackCover(track, albums);
                  return (
                    <div
                      key={`rec-${track.id}`}
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
                })
              )}
            </div>
          )}

          {/* Tab 3: ALBUM — same album · Tab 4: ARTIST — same performer */}
          {(activeTab === 'album' || activeTab === 'artist') && (() => {
            const isAlbum = activeTab === 'album';
            const list = isAlbum ? albumTracks : artistTracks;
            const heading = isAlbum
              ? (hasRealAlbum ? currentTrack?.album : null)
              : (currentTrack?.artist || null);
            return (
              <div className="yt-panel-queue-list">
                <div style={{ padding: '12px 16px', borderBottom: '1px solid rgba(255, 255, 255, 0.08)', background: 'rgba(255, 255, 255, 0.03)' }}>
                  <div style={{ fontSize: '11px', fontWeight: 700, color: '#a855f7', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    {isAlbum ? 'Album' : 'Artist'}
                  </div>
                  <div style={{ fontSize: '14px', fontWeight: 800, color: '#ffffff', marginTop: '2px' }}>
                    {heading || (isAlbum ? 'This track is not part of an album' : 'Unknown artist')}
                  </div>
                  {heading && (
                    <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '1px' }}>
                      {list.length} {list.length === 1 ? 'track' : 'tracks'}
                    </div>
                  )}
                </div>
                {list.map((track: Track) => {
                  const isThisPlaying = currentTrack?.id === track.id;
                  return (
                    <div
                      key={`${activeTab}-${track.id}`}
                      className={`yt-queue-item ${isThisPlaying ? 'active' : ''}`}
                      onClick={() => loadTrack(track)}
                    >
                      <div className="yt-queue-thumb-box">
                        <img src={getTrackCover(track, albums)} alt={track.title} className="yt-queue-thumb" />
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
                        {track.duration ? formatTime(track.duration) : ''}
                      </span>
                    </div>
                  );
                })}
              </div>
            );
          })()}
        </div>
      </div>

      {/* Bottom Full Player Bar */}
      <div className="yt-player-bar-container yt-full-player-bar-override">
        {/* Progress Line */}
        <div className="yt-progress-line-track" onClick={handleSeekClick} style={isFinalMode ? { cursor: 'default' } : undefined}>
          <div className="yt-progress-line-fill" style={{ width: `${progressPercent}%`, ...(isFinalMode ? { background: '#ef4444' } : {}) }} />
        </div>

        <div className="yt-player-bar-content">
          {/* LEFT: Album Cover Thumb, Track Title, Subtitle, Heart (Liked), 3-Dots Menu */}
          <div className="yt-player-left-meta">
            <img
              src={coverImg}
              alt={title}
              className="yt-player-thumb"
            />
            <div className="yt-player-meta">
              <span className="yt-player-title">{title}</span>
              <span className="yt-player-artist">
                {artist}
                {currentTrack?.style && <span className="yt-style-highlight"> • {currentTrack.style}</span>}
              </span>
            </div>

            <div className="yt-player-actions" onClick={(e) => e.stopPropagation()}>
              {/* Heart Save Button */}
              <button
                type="button"
                className={`yt-player-icon-btn ${isFavorite ? 'active-heart' : ''}`}
                onClick={handleToggleFavorite}
                title={isFavorite ? 'Remove from Liked Music' : 'Save to Liked Music'}
              >
                <Heart
                  size={18}
                  fill={isFavorite ? '#ef4444' : 'none'}
                  color={isFavorite ? '#ef4444' : 'currentColor'}
                />
              </button>

              {/* 3-Dots Menu Button & Popover Menu */}
              <div className="yt-menu-wrapper" ref={menuRef}>
                <button
                  type="button"
                  className={`yt-player-icon-btn ${isMenuOpen ? 'active' : ''}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsMenuOpen(!isMenuOpen);
                  }}
                  title="More options"
                >
                  <MoreVertical size={18} />
                </button>

                {/* Toast for link copy */}
                {showCopiedToast && (
                  <div className="yt-copied-toast">
                    Link copied to clipboard!
                  </div>
                )}

                {/* YouTube Music Style 3-Dots Context Menu */}
                {isMenuOpen && (
                  <div className="yt-context-menu-popover">
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
          </div>

          {/* CENTER: Prev, Play/Pause, Next & Time Display */}
          <div className="yt-player-center-controls">
            <button type="button" className="yt-player-icon-btn" onClick={playPrevious} title="Previous" disabled={isFinalMode} style={isFinalMode ? { opacity: 0.3, cursor: 'not-allowed' } : undefined}>
              <SkipBack size={20} fill="currentColor" />
            </button>
            <button type="button" className="yt-player-icon-btn yt-main-play-btn" onClick={togglePlay} title={isPlaying ? 'Pause' : 'Play'}>
              {isPlaying ? <Pause size={22} fill="currentColor" color="currentColor" /> : <Play size={22} fill="currentColor" color="currentColor" style={{ marginLeft: 2 }} />}
            </button>
            <button type="button" className="yt-player-icon-btn" onClick={playNext} title="Next" disabled={isFinalMode} style={isFinalMode ? { opacity: 0.3, cursor: 'not-allowed' } : undefined}>
              <SkipForward size={20} fill="currentColor" />
            </button>
            {isFinalMode ? (
              <FinalStopButton onStop={endFinal} className="yt-player-icon-btn" iconSize={20} />
            ) : (
              // Final Mode for the current track: cuts at 1:45 (Viennese 1:25) with a fade, like main
              <button
                type="button"
                className="yt-player-icon-btn"
                onClick={toggleFinalMode}
                disabled={!!activeMode}
                title="Final Mode (1:45 Timer)"
                aria-label="Final Mode"
              >
                <Trophy size={20} />
              </button>
            )}
            {isPauseCountdown ? (
              <span className="yt-player-time-display" style={{ color: '#ef4444', fontWeight: 800 }} aria-live="polite">Rest {pauseTime}s</span>
            ) : (
              <span className="yt-player-time-display" style={isFinalMode ? { color: '#ef4444' } : undefined}>
                {formatTime(currentTime)} / {formatTime(totalDur)}
              </span>
            )}
          </div>

          {/* Right: Speedometer Popover, Volume, Repeat, Shuffle, Collapse Chevron */}
          <div className="yt-player-right-controls" ref={popoverRef}>
            {/* Speed Popover Card */}
            {isSpeedPopoverOpen && (
              <div className="yt-speed-popover-card">
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

            {/* Single Speed Icon Button */}
            <button
              type="button"
              className={`yt-player-icon-btn yt-speed-icon-btn ${isBpmChanged || isSpeedPopoverOpen ? 'active-speed' : ''}`}
              onClick={() => setIsSpeedPopoverOpen(!isSpeedPopoverOpen)}
              title="Playback Speed"
            >
              <Gauge size={20} />
              {isBpmChanged && <span className="yt-speed-badge-dot" />}
            </button>

            {/* Volume control */}
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

            <button type="button" className="yt-bar-btn yt-collapse-btn" onClick={onClose} title="Collapse player">
              <ChevronDown size={22} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
