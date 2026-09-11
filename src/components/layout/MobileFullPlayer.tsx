"use client";

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import {
  Play,
  Pause,
  X,
  Gauge,
  Timer,
  ChevronDown,
  SkipBack,
  SkipForward,
  Shuffle,
  Repeat,
  Heart,
  Disc,
  Tally3,
  Share2,
  Plus
} from 'lucide-react';
import { useAudio } from '@/components/audio/AudioProvider';
import { useStudio } from '@/components/admin/StudioProvider';
import { useAuth } from '@/context/AuthContext';
import ConfirmModal from '@/components/admin/ConfirmModal';
import SpeedSelector from '@/components/audio/SpeedSelector';
import { formatDuration } from '@/utils/format';
import { Marquee } from '@/components/layout/Marquee';
import AddToPlaylistModal from '@/components/audio/AddToPlaylistModal';
import OfflineDownloadButton from '@/components/audio/OfflineDownloadButton';

interface MobileFullPlayerProps {
  isOpen: boolean;
  onClose: () => void;
}

const MobileFullPlayer = ({ isOpen, onClose }: MobileFullPlayerProps) => {
  const {
    isPlaying,
    togglePlay,
    bpm,
    setBpm,
    isLoaded,
    title,
    artist,
    currentTime,
    duration,
    seek,
    playNext,
    playPrevious,
    isShuffle,
    isRepeat,
    toggleShuffle,
    toggleRepeat,
    sessionDuration,
    volume,
    setVolume,
    isFinalMode,
    toggleFinalMode,
    sessionTracks,
    isPauseCountdown,
    pauseTime,
    loadTrack,
    activeMode
  } = useAudio();

  const { tracks, styles, toggleFavorite } = useStudio();
  const { isAuthenticated, setIsAuthModalOpen } = useAuth();

  const [showSpeed, setShowSpeed] = useState(false);
  const [isExitingSpeed, setIsExitingSpeed] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [dragProgress, setDragProgress] = useState(0);
  const [authPrompt, setAuthPrompt] = useState({ isOpen: false, action: '' });
  const [isAddToPlaylistOpen, setIsAddToPlaylistOpen] = useState(false);
  const progressRef = useRef<HTMLDivElement>(null);
  const lastSeekRef = useRef<number>(0);

  const handleShareTrack = () => {
    const currentTrack = tracks.find(t => t.title === title);
    const trackParam = currentTrack?.id || encodeURIComponent(title);
    const shareUrl = `${window.location.origin}/track/${trackParam}`;
    if (typeof navigator !== 'undefined' && navigator.share) {
      navigator.share({
        title: `4and.one - ${title}`,
        text: `Listen to ${title} on 4and.one Free Web Music Player!`,
        url: shareUrl,
      }).catch(() => {});
    } else if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(shareUrl);
      alert('Track link copied to clipboard!');
    }
  };

  const checkAuthAndExecute = (action: () => void, actionName: string) => {
    if (!isAuthenticated) {
      setAuthPrompt({ isOpen: true, action: actionName });
      return;
    }
    action();
  };

  const handleSeek = (clientX: number) => {
    const activeDur = isFinalMode ? sessionDuration : duration;
    if (!progressRef.current || !activeDur) return;
    const rect = progressRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(clientX - rect.left, rect.width));
    const percentage = rect.width > 0 ? x / rect.width : 0;
    const newTime = percentage * activeDur;
    setDragProgress(percentage * 100);
    return newTime;
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (isFinalMode) return;
    e.preventDefault();
    e.stopPropagation();
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {}
    setIsDragging(true);
    const newTime = handleSeek(e.clientX);
    if (newTime !== undefined && !isPlaying) {
      seek(newTime);
    }
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDragging || isFinalMode) return;
    e.preventDefault();
    e.stopPropagation();
    const newTime = handleSeek(e.clientX);
    if (isPlaying && newTime !== undefined) {
      const now = Date.now();
      if (now - lastSeekRef.current > 120) {
        seek(newTime);
        lastSeekRef.current = now;
      }
    }
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDragging || isFinalMode) return;
    e.preventDefault();
    e.stopPropagation();
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {}
    const newTime = handleSeek(e.clientX);
    if (newTime !== undefined) {
      seek(newTime);
    }
    setIsDragging(false);
  };

  const handlePointerCancel = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDragging) return;
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {}
    setIsDragging(false);
  };

  useEffect(() => {
    if (!isDragging || isFinalMode) return;

    const handleWindowPointerMove = (e: PointerEvent) => {
      e.preventDefault();
      const newTime = handleSeek(e.clientX);
      if (isPlaying && newTime !== undefined) {
        const now = Date.now();
        if (now - lastSeekRef.current > 120) {
          seek(newTime);
          lastSeekRef.current = now;
        }
      }
    };

    const handleWindowPointerUp = (e: PointerEvent) => {
      const newTime = handleSeek(e.clientX);
      if (newTime !== undefined) seek(newTime);
      setIsDragging(false);
    };

    window.addEventListener('pointermove', handleWindowPointerMove, { passive: false });
    window.addEventListener('pointerup', handleWindowPointerUp);
    window.addEventListener('pointercancel', handleWindowPointerUp);

    return () => {
      window.removeEventListener('pointermove', handleWindowPointerMove);
      window.removeEventListener('pointerup', handleWindowPointerUp);
      window.removeEventListener('pointercancel', handleWindowPointerUp);
    };
  }, [isDragging, isPlaying, duration, sessionDuration, seek, isFinalMode]);

  const handleToggleSpeed = () => {
    if (showSpeed) {
      setIsExitingSpeed(true);
      setTimeout(() => {
        setShowSpeed(false);
        setIsExitingSpeed(false);
      }, 300);
    } else {
      setShowSpeed(true);
    }
  };

  if (!isOpen) return null;

  let activeDuration = duration;
  if (isFinalMode) {
    const isTrackInSession = sessionTracks && sessionTracks.some((t: any) => t.title === title);

    if (sessionDuration > 0 && isTrackInSession) {
      activeDuration = sessionDuration;
    } else {
      const lowerTitle = title?.toLowerCase() || '';
      const isPaso = lowerTitle.includes('paso');
      const isVW = lowerTitle.includes('viennese') || lowerTitle.includes('waltz') && lowerTitle.includes('v');
      activeDuration = isPaso ? duration : (isVW ? 85 : 105);
    }
  }

  const totalDur = isFinalMode ? (sessionTracks && sessionTracks.length > 0 ? sessionDuration : activeDuration) : duration;
  const displayProgress = isDragging ? dragProgress : (Math.min(currentTime, totalDur) / (totalDur || 1)) * 100;
  const currentTrack = tracks.find(t => t.title === title);

  return createPortal(
    <div className="mfp-overlay animate-slide-up" style={{ zIndex: 9999, background: '#121212' }}>
      <div className="mfp-header">
        <button onClick={onClose} className="mfp-header-btn"><ChevronDown size={32} /></button>
        <span className={`mfp-now-playing-label ${isFinalMode ? 'final-active-text' : ''}`}>
          {isFinalMode ? 'Final Mode On' : 'Now Playing'}
        </span>
        <button onClick={handleShareTrack} className="mfp-header-btn" aria-label="Share Track Link" title="Share Track Link">
          <Share2 size={24} />
        </button>
      </div>

      <div className="mfp-content">
        <div className="art-container">
          <div
            className={`vinyl-disc-v8 ${isFinalMode ? 'final-active' : 'standard-active'}`}
            style={isPlaying && !isPauseCountdown ? { animation: 'spin 12s linear infinite' } : {}}
          >
            {currentTrack?.artworkUrl && (
              <img src={currentTrack.artworkUrl} alt="Artwork" className="disc-art-img-v8" />
            )}
            {isFinalMode && <div className="disc-final-overlay-red"></div>}
            <div className="disc-inner-glow-v8"></div>
          </div>
          {isPauseCountdown && (
            <div className="countdown-ring-mobile">
              <span className="count">{pauseTime}</span>
              <span className="label">Next Round</span>
            </div>
          )}
        </div>

        <div className="mfp-track-meta">
          <div className="mfp-meta-top">
            <button
              className={`mfp-meta-btn mfp-final-toggle ${isFinalMode ? 'active-final' : ''}`}
              onClick={toggleFinalMode}
              disabled={!!activeMode}
              title="Final Mode"
            >
              <Timer size={28} />
            </button>

            <div className="mfp-text-center">
              <div className="mfp-title-wrapper">
                <Marquee text={title || ''} speed={30} isActive={isPlaying} className="mfp-title-marquee" />
              </div>
              <p className="mfp-artist truncate">{artist}</p>
            </div>

            <button
              className={`mfp-meta-btn mfp-favorite ${tracks.find(t => t.title === title)?.isFavorite ? 'active' : ''}`}
              onClick={() => {
                checkAuthAndExecute(() => {
                  const track = tracks.find(t => t.title === title);
                  if (track) toggleFavorite(track.id);
                }, 'favorite tracks');
              }}
              title="Favorite"
            >
              <Heart size={28} fill={tracks.find(t => t.title === title)?.isFavorite ? "currentColor" : "none"} />
            </button>

            {/* Speed Button for Landscape */}
            <button className="mfp-landscape-speed-btn" onClick={handleToggleSpeed}>
              <Gauge size={32} />
            </button>
          </div>

          <div className="mfp-sub-actions-row">
            {/* Left: Offline Download */}
            <div className="mfp-sub-action-btn">
              <OfflineDownloadButton track={currentTrack} iconSize={18} />
            </div>

            {/* Center: Speed Tag */}
            <button
              className={`mfp-speed-tag ${bpm !== 100 ? 'active' : ''}`}
              onClick={handleToggleSpeed}
            >
              <Gauge size={14} />
              <span>{bpm}% BPM</span>
            </button>

            {/* Right: Add to playlist (+) */}
            <button
              className="mfp-sub-action-btn"
              onClick={() => {
                checkAuthAndExecute(() => setIsAddToPlaylistOpen(true), 'manage playlists');
              }}
              title="Add to Playlist"
              aria-label="Add to Playlist"
            >
              <Plus size={20} />
            </button>
          </div>
        </div>

        <div className="mfp-progress-section">
          <div
            className="mfp-progress-bar-container"
            ref={progressRef}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerCancel}
            style={{
              cursor: isFinalMode ? 'not-allowed' : 'pointer',
              opacity: isFinalMode ? 0.7 : 1,
              pointerEvents: isFinalMode ? 'none' : 'auto',
              touchAction: 'none'
            }}
          >
            <div className={`mfp-progress-fill ${isFinalMode ? 'mfp-final-active' : ''}`} style={{ width: `${displayProgress}%` }}></div>
            <div className={`mfp-progress-knob ${isDragging ? 'active' : ''} ${isFinalMode ? 'mfp-final-active' : ''}`} style={{ left: `${displayProgress}%` }}></div>
          </div>
          <div className="mfp-time-labels">
            <span>{formatDuration(isDragging ? (dragProgress / 100) * (totalDur || 0) : Math.min(currentTime, totalDur))}</span>
            <span>{formatDuration(totalDur)}</span>
          </div>
        </div>

        <div className="mfp-main-controls">
          <button
            className={`mfp-secondary-ctrl ${isShuffle ? 'active' : ''}`}
            onClick={toggleShuffle}
            disabled={isFinalMode}
            style={{ opacity: isFinalMode ? 0.2 : 1, cursor: isFinalMode ? 'not-allowed' : 'pointer' }}
          >
            <Shuffle size={24} />
          </button>

          <button
            className="mfp-secondary-ctrl"
            onClick={playPrevious}
            disabled={isFinalMode}
            style={{ opacity: isFinalMode ? 0.2 : 1, cursor: isFinalMode ? 'not-allowed' : 'pointer' }}
          >
            <SkipBack size={32} fill="currentColor" />
          </button>

          <div
            className={`mfp-play-pause-btn ${isFinalMode ? 'mfp-final-active' : ''}`}
            onClick={togglePlay}
          >
            {!isLoaded && !isFinalMode ? (
              <div className="mfp-loading-spinner"></div>
            ) : isPlaying ? (
              <Pause fill="currentColor" size={32} />
            ) : (
              <Play fill="currentColor" size={32} className="mfp-play-icon-offset" />
            )}
          </div>

          <button
            className="mfp-secondary-ctrl"
            onClick={playNext}
            disabled={isFinalMode}
            style={{ opacity: isFinalMode ? 0.2 : 1, cursor: isFinalMode ? 'not-allowed' : 'pointer' }}
          >
            <SkipForward size={32} fill="currentColor" />
          </button>

          <button
            className={`mfp-secondary-ctrl ${isRepeat ? 'active' : ''}`}
            onClick={toggleRepeat}
            disabled={isFinalMode}
            style={{ opacity: isFinalMode ? 0.2 : 1, cursor: isFinalMode ? 'not-allowed' : 'pointer' }}
          >
            <Repeat size={24} />
          </button>

          {/* New Volume Section for Landscape */}
          <div className="mfp-landscape-volume">
            <Tally3 size={18} className="mfp-volume-icon" />
            <input
              type="range"
              min="0"
              max="1"
              step="0.01"
              value={volume}
              onChange={(e) => setVolume(parseFloat(e.target.value))}
              className="mfp-volume-slider"
            />
          </div>
        </div>


      </div>

      {showSpeed && (
        <div className={`mfp-speed-overlay ${isExitingSpeed ? 'exit' : 'animate-in'}`} onClick={handleToggleSpeed}>
          <div className="mfp-speed-modal glass" onClick={(e) => e.stopPropagation()}>
            <div className="mfp-modal-header">
              <div className="mfp-modal-title">
                <Gauge size={20} className="text-primary" />
                <h3>Playback Speed</h3>
              </div>
              <button className="mfp-close-btn" onClick={handleToggleSpeed}><X size={20} /></button>
            </div>
            <SpeedSelector
              currentBpm={bpm}
              onSelect={(val) => { setBpm(val); }}
              onClose={handleToggleSpeed}
              isFinalMode={isFinalMode}
            />
          </div>
        </div>
      )}

      <ConfirmModal
        isOpen={authPrompt.isOpen}
        title="Authentication Required"
        message={`Please log in with Telegram to ${authPrompt.action} and sync your studio data.`}
        confirmText="Login Now"
        variant="primary"
        onClose={() => setAuthPrompt(prev => ({ ...prev, isOpen: false }))}
        onConfirm={() => {
          setAuthPrompt(prev => ({ ...prev, isOpen: false }));
          setIsAuthModalOpen(true);
        }}
      />

      <AddToPlaylistModal
        isOpen={isAddToPlaylistOpen}
        onClose={() => setIsAddToPlaylistOpen(false)}
        track={currentTrack || null}
      />

      <style jsx>{`
        .mfp-title-wrapper {
          font-size: 28px;
          font-weight: 900;
          color: white;
          text-align: center;
          max-width: 85vw;
          line-height: 1.2;
          margin: 0 auto;
          overflow: hidden;
          width: 100%;
          height: 1.3em;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .mfp-title-marquee {
          font-size: inherit;
          font-weight: inherit;
          color: inherit;
          text-align: center;
          width: 100%;
        }
        .mfp-title-marquee :global(.marquee-text) {
          font-weight: inherit;
          display: inline-block;
        }
        .mfp-title-marquee :global(.marquee-content) {
          font-weight: inherit;
        }

        .mfp-sub-actions-row {
          display: flex !important;
          flex-direction: row !important;
          align-items: center !important;
          justify-content: space-between !important;
          width: 100% !important;
          padding: 0 16px !important;
          margin-top: 8px !important;
          box-sizing: border-box !important;
        }

        .mfp-sub-action-btn {
          width: 38px !important;
          height: 38px !important;
          border-radius: 50% !important;
          background: rgba(255, 255, 255, 0.05) !important;
          border: 1px solid rgba(255, 255, 255, 0.08) !important;
          display: flex !important;
          align-items: center !important;
          justify-content: center !important;
          color: rgba(255, 255, 255, 0.75) !important;
          transition: all 0.2s !important;
          cursor: pointer !important;
          flex-shrink: 0 !important;
        }

        .mfp-sub-action-btn:hover {
          background: rgba(255, 255, 255, 0.1) !important;
          color: white !important;
          transform: scale(1.08) !important;
        }

        .disc-final-overlay-red {
          position: absolute;
          inset: 0;
          background: radial-gradient(circle at center, rgba(239, 68, 68, 0.4) 0%, rgba(239, 68, 68, 0.2) 100%);
          mix-blend-mode: color;
          z-index: 1;
          pointer-events: none;
        }

        :global(.mfp-header) {
          margin-bottom: 20px !important;
        }

        :global(.mfp-content) {
          justify-content: center !important;
          gap: 15px !important;
        }

        .mfp-practice-mode {
          margin-top: 4px;
        }
        
        /* Volume section is hidden in portrait */
        .mfp-landscape-volume { display: none; }
        .mfp-landscape-speed-btn { display: none; }
        .mfp-header-btn-placeholder { display: block !important; width: 32px; visibility: hidden; }

        /* TABLET / iPad FIX (portrait & large landscape).
           The player content was grouped near the top, leaving a large black void
           at the bottom on tall iPad screens. We cap the width for tidiness but
           distribute the elements evenly across the FULL available height so the
           layout fills the screen instead of clustering up top. */
        @media screen and (min-width: 700px) and (min-height: 600px) {
          :global(.mfp-content) {
            justify-content: space-evenly !important;
            gap: 0 !important;
            max-width: 560px;
            margin: 0 auto;
            width: 100%;
            height: 100%;
            padding: 24px 0 32px !important;
            box-sizing: border-box;
          }
          .vinyl-disc-v8 {
            width: min(340px, 42vh);
            height: min(340px, 42vh);
          }
          .countdown-ring-mobile {
            width: min(340px, 42vh) !important;
            height: min(340px, 42vh) !important;
          }
          :global(.mfp-progress-section) {
            margin-top: 0 !important;
          }
          :global(.mfp-main-controls) {
            margin: 0 !important;
          }
          .mfp-practice-mode {
            margin-top: 0;
          }
        }

        .art-container {
          position: relative;
          display: flex;
          justify-content: center;
          margin-bottom: 8px;
          margin-top: -50px !important;
        }

        @media screen and (max-height: 500px) and (orientation: landscape) {
          .vinyl-disc-v8 { display: none !important; }
          .art-container { margin-top: 0 !important; margin-bottom: 0 !important; }
        }

        .vinyl-disc-v8 { 
          width: 212px; 
          height: 212px; 
          border-radius: 50%; 
          background: #121212; 
          position: relative; 
          box-shadow: 0 15px 45px rgba(0,0,0,0.5), inset 0 0 0 1px rgba(255,255,255,0.1); 
          overflow: hidden; 
          transition: all 0.5s cubic-bezier(0.16, 1, 0.3, 1);
          border: 4px solid var(--accent);
          --accent: #1db954;
        }

        .vinyl-disc-v8.final-active { --accent: #ef4444; border-color: #ef4444; box-shadow: 0 20px 60px rgba(0,0,0,0.6), inset 0 0 0 1px rgba(255,255,255,0.1); }
        .vinyl-disc-v8.standard-active { border-color: #1db954; box-shadow: 0 20px 60px rgba(0,0,0,0.6), inset 0 0 0 1px rgba(255,255,255,0.1); }

        .disc-inner-glow-v8 {
          position: absolute;
          inset: 0;
          background: radial-gradient(circle at center, rgba(29, 185, 84, 0.3) 0%, transparent 70%);
          z-index: 2;
        }
        .final-active .disc-inner-glow-v8 { background: radial-gradient(circle at center, rgba(239, 68, 68, 0.3) 0%, transparent 70%); }

        .disc-art-img-v8 { width: 100%; height: 100%; object-fit: cover; opacity: 0.9; position: relative; z-index: 1; }
        
        .countdown-ring-mobile {
          position: absolute;
          inset: 0;
          background: rgba(0,0,0,0.92);
          border-radius: 50%;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          z-index: 10;
          backdrop-filter: blur(20px);
          border: 2px solid var(--accent);
          width: 212px;
          height: 212px;
          left: 50%;
          transform: translateX(-50%);
        }
        .countdown-ring-mobile .count { font-size: 80px; font-weight: 900; color: var(--accent); }
        .countdown-ring-mobile .label { font-size: 10px; font-weight: 900; text-transform: uppercase; letter-spacing: 5px; opacity: 0.3; }

        .mfp-now-playing-label { font-size: 10px; font-weight: 800; text-transform: uppercase; letter-spacing: 2px; opacity: 0.4; }
        .mfp-now-playing-label.final-active-text { color: #ef4444; opacity: 1; }
        .mfp-meta-btn.mfp-final-toggle.active-final { color: #ef4444; opacity: 1; }
        
        .mfp-play-pause-btn {
          width: 80px;
          height: 80px;
          background: #1db954; /* Default Green */
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          color: black;
          box-shadow: 0 12px 32px rgba(0,0,0,0.4);
          transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
        }
        .mfp-play-pause-btn.mfp-final-active { background: #ef4444; }
        .mfp-play-pause-btn:active { transform: scale(0.92); }

        .mfp-progress-fill.mfp-final-active { background: #ef4444; }
        .mfp-progress-knob.mfp-final-active { background: #ef4444; }
      `}</style>
    </div>,
    document.body
  );
};

export default MobileFullPlayer;
