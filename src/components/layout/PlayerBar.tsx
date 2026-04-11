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
  VolumeX
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
    isFinalMode
  } = useAudio();

  const [showSpeedSelector, setShowSpeedSelector] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [lastVolume, setLastVolume] = useState(1);
  const [isDragging, setIsDragging] = useState(false);
  const [dragProgress, setDragProgress] = useState(0);
  const progressRef = useRef<HTMLDivElement>(null);
  
  const { isAuthenticated, setIsAuthModalOpen } = useAuth();
  const [authPrompt, setAuthPrompt] = useState({ isOpen: false, action: '' });

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

  const handleInteractionStart = (e: React.MouseEvent) => {
    if (isFinalMode) return;
    setIsDragging(true);
    handleSeekUpdate(e.clientX);
  };

  useEffect(() => {
    const handleMove = (e: MouseEvent) => {
      if (!isDragging || isFinalMode) return;
      handleSeekUpdate(e.clientX);
    };
    const handleUp = (e: MouseEvent) => {
      if (!isDragging || isFinalMode) return;
      const newTime = handleSeekUpdate(e.clientX);
      if (newTime !== undefined) seek(newTime);
      setIsDragging(false);
    };

    if (isDragging && !isFinalMode) {
      window.addEventListener('mousemove', handleMove);
      window.addEventListener('mouseup', handleUp);
    }
    return () => {
      window.removeEventListener('mousemove', handleMove);
      window.removeEventListener('mouseup', handleUp);
    };
  }, [isDragging, duration, seek]);

  const displayProgress = isDragging ? dragProgress : (currentTime / (duration || 1)) * 100;
  
  const { finalTracks, addToFinal, removeFromFinal, tracks, toggleFavorite } = useStudio();
  const currentTrack = tracks.find(t => t.title === title) || finalTracks.find(t => t.title === title);

  if (isAdmin) return null;

  const formatTime = (time: number) => {
    const mins = Math.floor(time / 60);
    const secs = Math.floor(time % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <>
      <footer className={`player-bar glass ${!isLoaded && !isLoading ? 'is-hidden' : ''}`}>
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

        {/* Repositioned Features: Metadata actions grouped with track info */}
        <div className="metadata-actions-group" style={{ marginLeft: '12px' }}>
          <div className="quick-actions-bar left-aligned">
            <button 
              className={`action-btn-large ${(tracks.find(t => t.title === title)?.isFavorite) ? 'active-heart' : ''}`} 
              title="Like Song"
              style={{ marginLeft: '8px' }}
              onClick={() => {
                checkAuthAndExecute(() => {
                   const currentTrack = tracks.find(t => t.title === title);
                   if (currentTrack && typeof toggleFavorite === 'function') {
                      toggleFavorite(currentTrack.id);
                   }
                }, 'favorite tracks');
              }}
            >
              <Heart size={20} fill={(tracks.find(t => t.title === title)?.isFavorite) ? "#ff4b2b" : "none"} color={(tracks.find(t => t.title === title)?.isFavorite) ? "#ff4b2b" : "currentColor"} />
            </button>
          </div>
        </div>
      </div>

      {/* Main Controls */}
      <div className="player-controls">
        <div className="control-buttons">
          <button 
            className={`control-btn ${isShuffle ? 'active' : ''}`} 
            onClick={toggleShuffle}
            disabled={isFinalMode}
            style={{ opacity: isFinalMode ? 0.3 : 1, cursor: isFinalMode ? 'not-allowed' : 'pointer' }}
          >
            <Shuffle size={18} />
          </button>
          <button 
            className="control-btn" 
            onClick={playPrevious}
            disabled={isFinalMode}
            style={{ opacity: isFinalMode ? 0.3 : 1, cursor: isFinalMode ? 'not-allowed' : 'pointer' }}
          ><SkipBack size={24} fill="currentColor" /></button>
          <div className="play-btn" onClick={togglePlay}>
            {!isLoaded && !isFinalMode ? (
              <div className="loading-spinner"></div>
            ) : isPlaying ? (
              <Pause fill="currentColor" size={28} />
            ) : (
              <Play fill="currentColor" size={28} className="play-icon-offset" />
            )}
          </div>
          <button 
            className="control-btn" 
            onClick={playNext}
            disabled={isFinalMode}
            style={{ opacity: isFinalMode ? 0.3 : 1, cursor: isFinalMode ? 'not-allowed' : 'pointer' }}
          ><SkipForward size={24} fill="currentColor" /></button>
          <button 
            className={`control-btn ${isRepeat ? 'active' : ''}`} 
            onClick={toggleRepeat}
            disabled={isFinalMode}
            style={{ opacity: isFinalMode ? 0.3 : 1, cursor: isFinalMode ? 'not-allowed' : 'pointer' }}
          >
            <Repeat size={18} />
          </button>
        </div>

        <div className="progress-container">
          <span className="time-text">{formatTime(isDragging ? (dragProgress / 100) * (duration || 0) : currentTime)}</span>
            <div 
              className="progress-bar-bg" 
              ref={progressRef}
              onMouseDown={handleInteractionStart}
              style={{ 
                cursor: isFinalMode ? 'not-allowed' : 'pointer',
                opacity: isFinalMode ? 0.7 : 1,
                pointerEvents: isFinalMode ? 'none' : 'auto'
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
          <span className="time-text">{formatTime(duration)}</span>
        </div>
      </div>

      <div className="extra-controls">
        <div className="special-features">
          <div className="speed-control-wrapper">
            <button 
              className={`feature-btn glass ${bpm !== 100 ? 'active' : ''}`}
              onClick={() => setShowSpeedSelector(!showSpeedSelector)}
              title={`Playback Speed: ${bpm}%`}
              style={{ marginRight: '8px' }}
            >
              <Gauge size={18} />
              <span className="label">Speed: {bpm}%</span>
            </button>

            {showSpeedSelector && (
              <SpeedSelector 
                currentBpm={bpm} 
                onSelect={setBpm} 
                onClose={() => (setShowSpeedSelector(false))} 
              />
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
            {isMuted || volume === 0 ? <VolumeX size={20} /> : <Volume2 size={20} />}
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
          setAuthPrompt(prev => ({ ...prev, isOpen: false }));
          setIsAuthModalOpen(true);
        }}
      />

      <style jsx>{`
        .player-bar {
          display: grid;
          grid-template-columns: 1fr 2fr 1fr;
          align-items: center;
          padding: 0 40px;
          height: 90px;
          background: rgba(18, 18, 18, 0.7);
          backdrop-filter: blur(20px);
          border-top: 1px solid rgba(255, 255, 255, 0.08);
          position: fixed;
          bottom: 0;
          left: 0;
          right: 0;
          z-index: 1000;
          transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
          padding-bottom: env(safe-area-inset-bottom);
        }
        .player-bar.is-hidden {
           transform: translateY(100%);
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
          gap: 24px;
        }
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
        .play-btn {
          width: 50px;
          height: 50px;
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
          transform: scale(1.1);
          background: rgba(29, 185, 84, 0.1);
          box-shadow: 0 0 15px rgba(29, 185, 84, 0.3);
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
        .progress-bar-fill {
          height: 100%;
          background: var(--primary);
          border-radius: 3px;
          transition: width 0.1s linear;
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
          justify-content: flex-end;
          gap: 32px;
        }
        .special-features {
          display: flex;
          align-items: center;
          gap: 12px;
        }
        .feature-btn {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 6px 12px;
          border-radius: 20px;
          font-size: 12px;
          font-weight: 700;
          color: var(--text-secondary);
          cursor: pointer;
          transition: all 0.2s;
        }
        .feature-btn.active {
          color: var(--primary);
          border-color: var(--primary);
          background: rgba(29, 185, 84, 0.1);
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

        .action-btn-large.active-flag {
          color: var(--primary);
        }

        .volume-control {
          display: flex;
          align-items: center;
          gap: 12px;
          width: 160px;
          margin-left: 20px;
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
        @media (max-width: 1024px) and (orientation: landscape) {
          .player-grid {
            grid-template-columns: 200px 1fr 200px;
            padding: 0 20px;
            height: 70px;
          }
          .play-btn { width: 44px; height: 44px; }
          .track-info-mini h3 { font-size: 13px; }
          .extra-controls { gap: 16px; }
          .feature-btn { padding: 4px 8px; font-size: 10px; }
        }

        @media (max-width: 768px) {
          .player-bar {
            display: flex;
            justify-content: space-between;
            height: auto;
            min-height: 80px;
            padding: 12px 16px;
            padding-bottom: calc(12px + env(safe-area-inset-bottom));
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
            padding: 0 24px;
            padding-bottom: env(safe-area-inset-bottom);
            grid-template-columns: 1.2fr 2fr 1.2fr;
          }
          .track-info { gap: 12px; }
          .metadata-actions-group { padding-left: 12px; }
          .extra-controls { gap: 16px; }
          .volume-control { width: 100px; margin-left: 10px; }
        }
      `}</style>
    </>
  );
};

export default PlayerBar;
