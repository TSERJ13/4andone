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
import { useRecentlyPlayed } from '@/hooks/useRecentlyPlayed';
import { playOrder, upNextFrom } from '@/utils/playQueue';
import { albumOfTrack } from '@/utils/albumMatch';
import { displayStyleName } from '@/utils/styleNames';
import { SeekBar } from '@/components/audio/SeekBar';
import FullPlayerAd from '@/components/ads/FullPlayerAd';
import { QueuePanelList } from '@/components/layout/QueuePanelList';

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
    shuffleSeed,
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
  const [activeTab, setActiveTab] = useState<'recent' | 'style' | 'album' | 'artist'>('recent');
  const [scrubTime, setScrubTime] = useState<number | null>(null);
  const [isSpeedPopoverOpen, setIsSpeedPopoverOpen] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [showCopiedToast, setShowCopiedToast] = useState(false);

  // STYLE = what Next will actually play: the Final program's list while one
  // runs (from the current dance), otherwise every song of the same dance —
  // the exact queue playNext() follows (Shuffle's order when Shuffle is on),
  // starting at the current song and wrapping around.
  const styleTracks = React.useMemo(() => {
    if (isFinalMode && sessionTracks.length > 0) {
      const idx = currentTrack ? sessionTracks.findIndex(t => t.id === currentTrack.id) : -1;
      return idx === -1 ? sessionTracks : sessionTracks.slice(idx);
    }
    const queue = playOrder(tracks, currentTrack as Track | null, shuffleSeed);
    return currentTrack ? [currentTrack as Track, ...upNextFrom(queue, currentTrack as Track, Infinity)] : queue;
  }, [tracks, sessionTracks, isFinalMode, currentTrack, shuffleSeed]);
  const styleLabel = isFinalMode && sessionTracks.length > 0 ? 'Final program' : displayStyleName(currentTrack?.style || '');

  const recentIds = useRecentlyPlayed(100);
  const recentTracks = React.useMemo(
    () => recentIds.map(id => tracks.find(t => t.id === id)).filter(Boolean) as Track[],
    [recentIds, tracks]
  );

  // ALBUM = the album page this song is on (same matching as the album pages —
  // most songs have no "album" text, they belong by band/tag); ARTIST = the
  // same performer.
  const norm = (v?: string) => (v || '').toLowerCase().trim();
  const currentAlbum = React.useMemo(() => albumOfTrack(currentTrack, albums), [currentTrack, albums]);
  const albumTracks = React.useMemo(() => {
    if (currentAlbum) return tracks.filter(t => albumOfTrack(t, albums)?.id === currentAlbum.id);
    const own = norm(currentTrack?.album);
    if (!own || own === 'bulk upload') return [];
    return tracks.filter(t => norm(t.album) === own);
  }, [tracks, albums, currentAlbum, currentTrack]);
  const albumTitle = currentAlbum?.title || (albumTracks.length ? currentTrack?.album : null);
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
          {/* Ad at the top of the stage, away from the player bar (free plan) */}
          <FullPlayerAd className="yt-desktop-full-ad" />
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
          <div className="yt-panel-tabs-bar" role="tablist">
            {([
              ['recent', 'RECENT'],
              ['style', isFinalMode && sessionTracks.length > 0 ? 'FINAL' : 'STYLE'],
              ['album', 'ALBUM'],
              ['artist', 'ARTIST'],
            ] as const).map(([key, label]) => (
              <button
                key={key}
                type="button"
                role="tab"
                aria-selected={activeTab === key}
                className={`yt-panel-tab ${activeTab === key ? 'active' : ''}`}
                onClick={() => setActiveTab(key)}
              >
                {label}
              </button>
            ))}
          </div>

          {activeTab === 'recent' && (
            <QueuePanelList
              key="recent"
              tracks={recentTracks}
              albums={albums}
              currentTrackId={currentTrack?.id}
              isPlaying={isPlaying}
              onSelect={loadTrack}
              emptyText="No recently played tracks yet. Listen to music to build your history!"
            />
          )}
          {activeTab === 'style' && (
            <QueuePanelList
              key={`style-${styleLabel}`}
              tracks={styleTracks}
              albums={albums}
              currentTrackId={currentTrack?.id}
              isPlaying={isPlaying}
              onSelect={loadTrack}
              kicker={isShuffle && !isFinalMode ? 'Style · Shuffle' : 'Style'}
              heading={styleLabel || 'Up next'}
              emptyText="Play a song to see the songs of its dance."
            />
          )}
          {activeTab === 'album' && (
            <QueuePanelList
              key={`album-${albumTitle}`}
              tracks={albumTracks}
              albums={albums}
              currentTrackId={currentTrack?.id}
              isPlaying={isPlaying}
              onSelect={loadTrack}
              kicker="Album"
              heading={albumTitle || 'This track is not part of an album'}
              emptyText=""
            />
          )}
          {activeTab === 'artist' && (
            <QueuePanelList
              key={`artist-${currentTrack?.artist}`}
              tracks={artistTracks}
              albums={albums}
              currentTrackId={currentTrack?.id}
              isPlaying={isPlaying}
              onSelect={loadTrack}
              kicker="Artist"
              heading={currentTrack?.artist || 'Unknown artist'}
              emptyText=""
            />
          )}
        </div>
      </div>

      {/* Bottom Full Player Bar */}
      <div className="yt-player-bar-container yt-full-player-bar-override">
        {/* Progress Line */}
        <div className="yt-full-seek-row">
          <SeekBar
            current={currentTime}
            total={totalDur}
            onSeek={seek}
            disabled={isFinalMode}
            color={isFinalMode ? '#ef4444' : undefined}
            onScrub={setScrubTime}
          />
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

                    {currentAlbum && (
                      <button
                        type="button"
                        className="yt-context-menu-item"
                        onClick={() => {
                          setIsMenuOpen(false);
                          router.push(`/album/${currentAlbum.slug}`);
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
                {formatTime(scrubTime ?? currentTime)} / {formatTime(totalDur)}
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

            <button type="button" className={`yt-bar-btn ${isRepeat ? 'active' : ''}`} aria-pressed={isRepeat} onClick={toggleRepeat} title="Repeat">
              <Repeat size={18} />
            </button>
            <button type="button" className={`yt-bar-btn ${isShuffle ? 'active' : ''}`} aria-pressed={isShuffle} onClick={toggleShuffle} title="Shuffle">
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
