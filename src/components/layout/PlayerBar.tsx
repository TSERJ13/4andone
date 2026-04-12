"use client";

import React, { useState, useRef, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Repeat,
  Shuffle,
  Volume2,
  Tally3,
  Gauge,
  Heart,
  VolumeX,
  ListMusic
} from 'lucide-react';
import { useAudio } from '@/components/audio/AudioProvider';
import SpeedSelector from '@/components/audio/SpeedSelector';
import { useStudio, Track } from '@/components/admin/StudioProvider';
import { useAuth } from '@/context/AuthContext';
import ConfirmModal from '@/components/admin/ConfirmModal';
import { getMPMFromBPM } from '@/utils/audio';

const PlayerBar = () => {
  const pathname = usePathname();
  const isAdmin = pathname.startsWith('/admin');

  const {
    currentTime,
    duration,
    isPlaying,
    isLoaded,
    togglePlay,
    bpm,
    setBpm,
    volume,
    setVolume,
    playNext,
    playPrevious,
    error,
    title,
    artist,
    isRepeat,
    isShuffle,
    toggleRepeat,
    toggleShuffle,
    seek,
    isLoading,
    isFinalMode,
    sessionDuration
  } = useAudio();

  const [showSpeedSelector, setShowSpeedSelector] = useState(false);
  const speedSelectorRef = useRef<HTMLDivElement>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [lastVolume, setLastVolume] = useState(1);
  const [isDragging, setIsDragging] = useState(false);
  const [dragProgress, setDragProgress] = useState(0);
  const progressRef = useRef<HTMLDivElement>(null);
  const lastSeekRef = useRef<number>(0);

  const { isAuthenticated, setIsAuthModalOpen } = useAuth();
  const [authPrompt, setAuthPrompt] = useState({ isOpen: false, action: '' });

  const togglePlaybackMode = () => {
    if (!isShuffle && !isRepeat) {
      toggleRepeat(); // List -> Repeat
    } else if (isRepeat) {
      toggleRepeat(); // Turn off repeat
      toggleShuffle(); // Turn on shuffle
    } else if (isShuffle) {
      toggleShuffle(); // Turn off shuffle -> List
    }
  };

  const checkAuthAndExecute = (action: () => void, actionName: string) => {
    if (!isAuthenticated) {
      setAuthPrompt({ isOpen: true, action: actionName });
      return;
    }
    action();
  };

  const handleSeekUpdate = (clientX: number) => {
    if (!progressRef.current || !duration) return;
    const rect = progressRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(clientX - rect.left, rect.width));
    const percentage = x / rect.width;
    setDragProgress(percentage * 100);
    return percentage * duration;
  };

  const getClientX = (e: React.MouseEvent | React.TouchEvent | MouseEvent | TouchEvent) => {
    if ('touches' in e) {
      return e.touches[0]?.clientX || (e as any).changedTouches?.[0]?.clientX || 0;
    }
    return (e as MouseEvent).clientX;
  };

  const handleInteractionStart = (e: React.MouseEvent | React.TouchEvent) => {
    if (isFinalMode) return;
    setIsDragging(true);
    handleSeekUpdate(getClientX(e));
  };

  useEffect(() => {
    const handleMove = (e: MouseEvent | TouchEvent) => {
      if (!isDragging || isFinalMode) return;
      const newTime = handleSeekUpdate(getClientX(e));

      // LIVE SCRUBBING: If playing, update position in real-time but with throttling for Safari stability
      if (isPlaying && newTime !== undefined) {
        const now = Date.now();
        if (now - lastSeekRef.current > 150) { // Throttle to ~6.6fps for audio engine safety on iPad
          seek(newTime);
          lastSeekRef.current = now;
        }
      }
    };
    const handleUp = (e: MouseEvent | TouchEvent) => {
      if (!isDragging || isFinalMode) return;
      const newTime = handleSeekUpdate(getClientX(e));
      if (newTime !== undefined) seek(newTime);
      setIsDragging(false);
    };

    if (isDragging && !isFinalMode) {
      window.addEventListener('mousemove', handleMove);
      window.addEventListener('mouseup', handleUp);
      window.addEventListener('touchmove', handleMove, { passive: false });
      window.addEventListener('touchend', handleUp);
    }
    return () => {
      window.removeEventListener('mousemove', handleMove);
      window.removeEventListener('mouseup', handleUp);
      window.removeEventListener('touchmove', handleMove);
      window.removeEventListener('touchend', handleUp);
    };
  }, [isDragging, isPlaying, duration, seek, isFinalMode]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (speedSelectorRef.current && !speedSelectorRef.current.contains(event.target as Node)) {
        // Also check if trigger button was clicked (it has its own toggle)
        const target = event.target as HTMLElement;
        if (!target.closest('.action-btn-speed') && !target.closest('.feature-btn')) {
          setShowSpeedSelector(false);
        }
      }
    };

    if (showSpeedSelector) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showSpeedSelector]);

  const totalDur = isFinalMode ? sessionDuration : duration;
  const displayProgress = isDragging ? dragProgress : (currentTime / (totalDur || 1)) * 100;

  const { finalTracks, addToFinal, removeFromFinal, tracks, toggleFavorite } = useStudio();
  const currentTrack = tracks.find(t => t.title === title) || finalTracks.find(t => t.title === title);

  if (isAdmin) return null;

  const formatTime = (time: number) => {
    const mins = Math.floor(time / 60);
    const secs = Math.floor(time % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const [isDraggingSpeed, setIsDraggingSpeed] = useState(false);
  const handleCloseSpeed = React.useCallback(() => setShowSpeedSelector(false), []);
  const onSelectSpeed = React.useCallback((val: number, persistent?: boolean) => {
    setBpm(val, persistent);
  }, [setBpm]);

  return (
    <>
      <footer className={`player-bar glass ${title === "No Track Selected" ? 'is-hidden' : ''} ${isDraggingSpeed ? 'optimizing-gpu' : ''}`}>
        {/* Track Info */}
        <div className="track-info">
          <div className="album-art glass">
            <Tally3 size={24} className="text-primary" />
          </div>
          <div className="track-details">
            <div className="track-row-header">
              <p className="track-title truncate">
                {title}
              </p>
            </div>
            <p className="track-artist truncate">
              {error ? (
                <span className="error-text text-red-500 font-bold">{error}</span>
              ) : (
                artist
              )}
              {currentTrack && currentTrack.bpm && (
                <span className="track-tempo-inline ml-2 text-primary font-bold">
                  • {getMPMFromBPM(Number(currentTrack.bpm), currentTrack.style)} BPM
                </span>
              )}
            </p>
          </div>
        </div>

        {/* Main Controls */}
        <div className="player-controls">
          <div className="control-buttons">
            {/* Heart/Favorite - Pro Glass Style */}
            <button
              className={`feature-btn glass ${tracks.find(t => t.title === title)?.isFavorite ? 'active active-heart' : ''}`}
              onClick={() => {
                checkAuthAndExecute(() => {
                  const currTrack = tracks.find(t => t.title === title);
                  if (currTrack && typeof toggleFavorite === 'function') {
                    toggleFavorite(currTrack.id);
                  }
                }, 'favorite tracks');
              }}
              style={{ marginRight: '48px' }} /* Increased distance to the triplet */
            >
              <Heart size={18} fill={tracks.find(t => t.title === title)?.isFavorite ? "currentColor" : "none"} />
            </button>

            <button
              className="control-btn"
              onClick={playPrevious}
              disabled={isFinalMode}
              style={{ opacity: isFinalMode ? 0.3 : 1, cursor: isFinalMode ? 'not-allowed' : 'pointer', marginRight: '4px' }}
            ><SkipBack size={24} fill="currentColor" /></button>

            <div className="play-btn-wrapper">
              <div className={`play-btn ${error ? 'error' : ''}`} onClick={togglePlay}>
                {!isLoaded && !isFinalMode ? (
                  <div className="loading-spinner"></div>
                ) : isPlaying ? (
                  <Pause fill="currentColor" size={28} />
                ) : (
                  <Play fill="currentColor" size={28} className="play-icon-offset" />
                )}
              </div>
            </div>

            <button
              className="control-btn"
              onClick={playNext}
              disabled={isFinalMode}
              style={{ opacity: isFinalMode ? 0.3 : 1, cursor: isFinalMode ? 'not-allowed' : 'pointer', marginLeft: '4px' }}
            ><SkipForward size={24} fill="currentColor" /></button>

            {/* Universal Mode Toggle - Pro Glass Style */}
            <button
              className={`feature-btn glass ${isShuffle || isRepeat ? 'active' : ''}`}
              onClick={togglePlaybackMode}
              title={isShuffle ? "Shuffle" : isRepeat ? "Repeat One" : "List Order"}
              style={{ marginLeft: '48px' }} /* Increased distance from the triplet */
            >
              {isShuffle ? <Shuffle size={18} /> : isRepeat ? <Repeat size={18} /> : <ListMusic size={18} />}
            </button>
          </div>

          <div className="progress-container">
            <span className="time-text">{formatTime(isDragging ? (dragProgress / 100) * (totalDur || 0) : currentTime)}</span>
            <div
              className={`progress-bar-bg ${isDragging ? 'is-dragging' : ''}`}
              ref={progressRef}
              onMouseDown={handleInteractionStart}
              onTouchStart={handleInteractionStart}
              style={{
                cursor: isFinalMode ? 'not-allowed' : 'pointer',
                opacity: isFinalMode ? 0.7 : 1,
                pointerEvents: isFinalMode ? 'none' : 'auto',
                touchAction: 'none'
              }}
            >
              <div
                className={`progress-bar-fill ${error ? 'error' : ''}`}
                style={{ width: `${displayProgress}%` }}
              ></div>
              <div
                className={`progress-knob ${isDragging ? 'active' : ''}`}
                style={{ left: `${displayProgress}%` }}
              ></div>
            </div>
            <span className="time-text">{formatTime(totalDur)}</span>
          </div>
        </div>

        <div className="extra-controls">
          <div className="special-features">
            <div className="speed-control-wrapper">
              <button
                className={`action-btn-speed icon-only ${bpm !== 100 ? 'active' : ''}`}
                onClick={() => setShowSpeedSelector(!showSpeedSelector)}
                title={`Playback Speed: ${bpm}%`}
              >
                <div className="flex flex-col items-center">
                  <Gauge size={28} strokeWidth={2.5} />
                  <span style={{ fontSize: '9px', marginTop: '-15px', lineHeight: 1, color: 'white' }} className="font-bold opacity-90 tracking-wide uppercase">SPEED</span>
                </div>
                {bpm !== 100 && <span className="speed-badge">{bpm}%</span>}
              </button>

              {showSpeedSelector && (
                <div ref={speedSelectorRef}>
                  <SpeedSelector
                    currentBpm={bpm}
                    onSelect={onSelectSpeed}
                    onClose={handleCloseSpeed}
                    onDragStateChange={setIsDraggingSpeed}
                  />
                </div>
              )}
            </div>
          </div>

          <div className="volume-control">
            <button
              className="mute-toggle-btn"
              onClick={() => {
                if (isMuted) {
                  setVolume(lastVolume);
                  setIsMuted(false);
                } else {
                  setLastVolume(volume);
                  setVolume(0);
                  setIsMuted(true);
                }
              }}
            >
              {isMuted || volume === 0 ? <VolumeX size={18} /> : <Volume2 size={18} />}
            </button>
            <input
              type="range"
              min="0"
              max="1"
              step="0.01"
              value={volume}
              onChange={(e) => {
                const newVol = parseFloat(e.target.value);
                setVolume(newVol);
                if (newVol > 0) setIsMuted(false);
              }}
              className="volume-slider"
            />
          </div>
        </div>
      </footer>

      <ConfirmModal
        isOpen={authPrompt.isOpen}
        title="Authentication Required"
        message={`Please log in with Telegram to ${authPrompt.action} and sync your studio data.`}
        confirmText="Login Now"
        variant="primary"
        onClose={() => setAuthPrompt(prev => ({ ...prev, isOpen: false }))}
        onConfirm={() => {
          setAuthPrompt(prev => ({ ...prev, isOpen: false }))
          setIsAuthModalOpen(true);
        }}
      />

      <style jsx>{`
        .player-bar {
          display: grid;
          grid-template-columns: 1fr 2.2fr 1fr;
          align-items: center;
          padding: 0 60px; /* Symmetrical padding for balanced look */
          height: 110px; 
          background: rgba(10, 10, 10, 0.85);
          backdrop-filter: blur(28px);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 28px;
          position: fixed;
          bottom: 12px;
          left: 12px;
          right: 12px;
          z-index: 1000;
          transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
          padding-bottom: env(safe-area-inset-bottom);
        }

        .player-bar.optimizing-gpu {
          backdrop-filter: none !important;
          background: rgba(10, 10, 10, 0.95);
        }

        .player-bar.optimizing-gpu :global(.speed-container) {
          backdrop-filter: none !important;
          background: rgba(18, 18, 18, 1);
        }

        .player-bar.is-hidden {
           transform: translateY(calc(100% + 24px));
           opacity: 0;
           pointer-events: none;
        }

        .track-info {
          display: flex;
          align-items: center;
          gap: 20px;
          min-width: 0;
        }

        .metadata-actions-group {
          display: flex;
          align-items: center;
          gap: 12px;
          margin-left: 4px;
          padding-left: 16px;
          border-left: 1px solid rgba(255,255,255,0.1);
          height: 32px;
        }
        .album-art {
          width: 56px;
          height: 56px;
          border-radius: 4px;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .track-title {
          font-weight: 600;
          font-size: 14px;
        }
        .track-artist {
          font-size: 12px;
          color: var(--text-secondary);
        }
        .track-row-header { display: flex; align-items: center; gap: 8px; }
        .quick-actions { display: flex; gap: 8px; }
        .action-btn { color: #555; transition: color 0.2s; }
        .action-btn:hover { color: #888; }
        .action-btn.active-flag { color: var(--primary); }
        .track-artist.error-text {
          color: #ff4444;
          font-weight: 700;
        }

        .player-controls {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 8px;
        }
        .control-buttons {
          display: flex;
          align-items: center;
          gap: 16px;
        }
        .control-btn.secondary-action {
          color: var(--text-secondary);
          opacity: 0.6;
        }
        .control-btn.secondary-action:hover {
          color: var(--text);
          opacity: 1;
        }
        .control-btn.active-heart { color: var(--primary); opacity: 1; }
        .control-btn {
          color: var(--text-secondary);
          transition: all 0.2s;
          position: relative;
        }
        .control-btn:hover {
          color: var(--text);
        }
        .control-btn.active { color: var(--primary); }
        .control-btn.active::after {
          content: '';
          position: absolute;
          bottom: -6px;
          left: 50%;
          transform: translateX(-50%);
          width: 4px;
          height: 4px;
          border-radius: 50%;
          background: var(--primary);
        }
        .play-btn-wrapper {
          display: flex;
          align-items: center;
          justify-content: center;
          padding-bottom: 4px; /* Move up slightly from the visual "floor" */
        }
        .play-btn {
          width: 52px;
          height: 52px;
          border-radius: 50%;
          border: 2px solid var(--primary);
          display: flex;
          align-items: center;
          justify-content: center;
          background: transparent;
          color: var(--primary);
          cursor: pointer;
          transition: all 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275);
          outline: none !important;
          -webkit-tap-highlight-color: transparent;
        }
        .play-btn:focus { outline: none !important; }
        .play-btn:hover {
          transform: scale(1.05);
          background: rgba(29, 185, 84, 0.1);
          border-color: #3ae071;
          color: #3ae071;
          box-shadow: 0 0 20px rgba(29, 185, 84, 0.3);
        }
        .play-icon-offset { margin-left: 4px; }
        .loading-spinner {
          width: 20px;
          height: 20px;
          border: 2px solid var(--background);
          border-top: 2px solid var(--text-secondary);
          border-radius: 50%;
          animation: spin 1s linear infinite;
        }
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }

        .progress-container {
          display: flex;
          align-items: center;
          gap: 8px;
          width: 100%;
          max-width: 500px;
        }
        .progress-bar-bg {
          flex: 1;
          height: 6px;
          background: rgba(255,255,255,0.1);
          border-radius: 3px;
          position: relative;
          cursor: pointer;
          display: flex;
          align-items: center;
        }
        /* Increased hit area */
        .progress-bar-bg::after {
          content: '';
          position: absolute;
          top: -12px;
          bottom: -12px;
          left: 0;
          right: 0;
          z-index: 10;
        }
        .progress-bar-fill {
          height: 100%;
          background: var(--primary);
          border-radius: 3px;
          transition: width 0.1s linear;
        }
        .progress-bar-bg.is-dragging .progress-bar-fill {
          transition: none !important;
        }
        .progress-bar-fill.error {
          background: #ef4444;
        }
        .progress-knob {
          width: 12px;
          height: 12px;
          background: white;
          border-radius: 50%;
          position: absolute;
          top: 50%;
          transform: translate(-50%, -50%);
          box-shadow: 0 2px 4px rgba(0,0,0,0.5);
          transition: transform 0.2s, background 0.2s;
          pointer-events: none;
        }
        .progress-bar-bg:hover .progress-knob {
          transform: translate(-50%, -50%) scale(1.2);
        }
        .progress-knob.active {
          transform: translate(-50%, -50%) scale(1.4);
          background: var(--primary);
        }
        .play-btn.error {
          color: #ff4444;
          border-color: #ff4444;
        }
        .time-text {
          font-size: 11px;
          color: var(--text-secondary);
          min-width: 32px;
        }

        .extra-controls {
          display: flex;
          align-items: center;
          justify-content: flex-end; /* Volume stays at the right edge */
          gap: 64px; /* Significantly increased gap to shift Speed further left */
          padding-left: 0;
          margin-left: 0;
        }
        .special-features {
          display: flex;
          align-items: center;
          gap: 12px;
        }
        .feature-btn {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          padding: 8px 16px;
          border-radius: 24px;
          font-size: 13px;
          font-weight: 700;
          color: var(--text-secondary);
          cursor: pointer;
          transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
          background: rgba(255, 255, 255, 0.04);
          border: 1px solid rgba(255, 255, 255, 0.08);
        }
        .feature-btn.active {
          color: var(--primary);
          border-color: rgba(29, 185, 84, 0.6);
          background: rgba(29, 185, 84, 0.1);
          box-shadow: 0 0 15px rgba(29, 185, 84, 0.4);
        }
        .feature-btn.active-heart {
          color: #ff4b2b;
          border-color: rgba(255, 75, 43, 0.4);
          background: rgba(255, 75, 43, 0.05);
          box-shadow: 0 0 15px rgba(255, 75, 43, 0.3);
        }
        .speed-container {
          position: relative;
        }
        .speed-control-wrapper {
          position: relative;
        }

        .speed-control-wrapper :global(.speed-container) {
          position: fixed;
          bottom: 120px;
          right: 24px;
          width: 320px;
          background: rgba(18, 18, 18, 0.95);
          backdrop-filter: blur(20px);
          border: 1px solid rgba(29, 185, 84, 0.5);
          border-radius: 20px;
          padding: 24px;
          box-shadow: 0 40px 100px rgba(0,0,0,1);
          z-index: 999999;
          animation: slideUpPopup 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
        }
        @keyframes slideUpPopup {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .bpm-control {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 6px 12px;
          border-radius: 20px;
        }
        .bpm-label {
          font-size: 12px;
          font-weight: 800;
          min-width: 36px;
        }
        .volume-slider {
          flex: 1;
          height: 4px;
          -webkit-appearance: none;
          background: var(--border);
          border-radius: 2px;
          outline: none;
        }
        .volume-slider::-webkit-slider-thumb {
          -webkit-appearance: none;
          width: 12px;
          height: 12px;
          border-radius: 50%;
          background: var(--primary);
          cursor: pointer;
        }

        .quick-actions-bar {
          display: flex;
          align-items: center;
          gap: 12px;
          margin: 0 12px;
        }

        .action-btn-large {
          padding: 8px;
          color: var(--text-secondary);
          transition: all 0.2s ease;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .action-btn-large:hover {
          color: var(--primary);
          transform: scale(1.1);
        }

        .extra-controls {
          display: flex;
          align-items: center;
          justify-content: flex-end;
          gap: 20px;
          margin-right: 60px !important; /* PERFECT BALANCE: No hitting wall or player */
        }

        .action-btn-speed.icon-only {
          width: 52px;
          height: 52px;
          padding: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 50%;
          position: relative;
        }

        .speed-badge {
          position: absolute;
          top: -4px;
          right: -4px;
          background: rgb(34, 197, 94);
          color: black;
          font-size: 9px;
          font-weight: 800;
          padding: 2px 4px;
          border-radius: 6px;
          line-height: 1;
        }

        .action-btn-speed.active {
          background: rgba(34, 197, 94, 0.15);
          border-color: rgba(34, 197, 94, 0.5);
          color: rgb(34, 197, 94) !important;
        }

        .action-btn-speed:hover {
          background: rgba(255, 255, 255, 0.1);
          transform: translateY(-1px);
        }

        .volume-control {
          display: flex;
          align-items: center;
          gap: 12px;
          flex: none; /* Let it take its natural width */
          margin-left: 0;
          padding-left: 0;
          border-left: none; /* Removing the divider as requested */
        }

        .mute-toggle-btn {
          color: var(--text-secondary);
          transition: color 0.2s;
          display: flex;
          align-items: center;
          justify-content: center;
          background: transparent;
          border: none;
          cursor: pointer;
          padding: 4px;
        }

        .mute-toggle-btn:hover {
          color: white;
          transform: scale(1.1);
        }
        .volume-bar-bg {
          flex: 1;
          height: 4px;
          background-color: var(--border);
          border-radius: 2px;
        }
        .volume-bar-fill {
          height: 100%;
          background-color: var(--primary);
          border-radius: 2px;
        }
        .text-primary { color: var(--primary); }
        @media (max-width: 1400px) and (orientation: landscape) {
          .player-bar {
            grid-template-columns: 1fr 2fr 1fr;
            padding: 0 40px;
            height: 160px; /* PRO SPACIOUS HEIGHT: increased for iPad per user request */
            bottom: 24px;
            left: 24px;
            right: 24px;
            border-radius: 40px;
          }
          .play-btn-wrapper { padding-bottom: 0px !important; }
          .player-controls { 
             justify-self: center; 
             gap: 16px; 
             padding-top: 14px; /* HEADROOM: More space from the "ceiling" */
             padding-bottom: 8px;
          } 
          .track-info { justify-self: start; gap: 16px; min-width: 0; padding-top: 8px; }
          .album-art { width: 52px; height: 52px; }
          .track-title { font-size: 15px; }
          .track-artist { font-size: 12px; }
          .progress-container { max-width: 500px; margin-top: 4px; }
          .control-buttons { gap: 24px; margin-bottom: 4px; }
          .play-btn { width: 54px; height: 54px; } /* Slightly more balanced size */
          .play-btn-wrapper { padding-bottom: 0px !important; margin-bottom: 8px; }
          .extra-controls { gap: 24px; margin-right: 80px; padding-top: 8px; }
          .volume-control { width: 120px; gap: 12px; }
          .feature-btn { padding: 10px 18px; }
        }

        @media (max-width: 1024px) {
          .player-bar {
            height: 180px; /* Even taller for portrait tablets to avoid crowded controls */
            padding: 24px;
            grid-template-columns: 1fr;
            grid-template-rows: auto auto auto;
            gap: 16px;
          }
          .track-info { justify-self: center; text-align: center; }
          .player-controls { width: 100%; order: 1; }
          .extra-controls { display: none; } /* Hide extra side controls on small portrait to keep main clean */
          .progress-container { max-width: 100%; }
        }

        @media (max-width: 768px) {
          .player-bar {
            display: flex;
            justify-content: space-between;
            height: auto;
            min-height: 80px;
            padding: 12px 16px;
            padding-bottom: calc(12px + env(safe-area-inset-bottom));
            bottom: 0;
            left: 0;
            right: 0;
            border-radius: 0;
            border-left: none;
            border-right: none;
            border-bottom: none;
          }
          .track-info {
            flex: 1;
            min-width: 0;
          }
          .extra-controls {
            display: none;
          }
          .player-controls {
            width: auto;
            flex-direction: row;
            gap: 12px;
          }
          .control-buttons {
            gap: 12px;
          }
          .control-btn:not(.play-btn) {
            display: none;
          }
          .progress-container {
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 3px;
            padding: 0;
            max-width: none;
            display: flex !important;
          }
          .time-text {
            display: none;
          }
          .progress-bar-bg {
            height: 3px;
            border-radius: 0;
          }
          .progress-bar-fill {
            border-radius: 0;
          }
        }

        /* iPad specific optimizations */
        @media (min-width: 769px) and (max-width: 1180px) {
          .player-bar {
            padding: 0 16px;
            padding-bottom: env(safe-area-inset-bottom);
            grid-template-columns: 1fr 1.6fr 1fr;
            height: 80px;
          }
          .track-info { gap: 10px; }
          .album-art { width: 44px; height: 44px; }
          .track-title { font-size: 13px; }
          .track-artist { font-size: 11px; }
          .metadata-actions-group { padding-left: 8px; margin-left: 4px; }
          .progress-container { max-width: 360px; }
          .control-buttons { gap: 16px; }
          .play-btn { width: 44px; height: 44px; }
          .extra-controls { gap: 12px; }
          .feature-btn .label { font-size: 0; }
          .feature-btn .label::after { content: attr(data-bpm) "%"; font-size: 11px; }
          .volume-control { width: 120px; margin-left: 8px; gap: 10px; }
          .volume-slider { height: 6px; }
          .volume-slider::-webkit-slider-thumb { width: 16px; height: 16px; }
        }
      `}</style>
    </>
  );
};

export default PlayerBar;
