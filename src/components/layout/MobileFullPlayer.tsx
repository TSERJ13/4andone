"use client";

import React, { useState, useRef, useCallback, useEffect } from 'react';
import { 
  Play, 
  Pause, 
  X, 
  Gauge, 
  Timer,
  Flag,
  ChevronDown,
  SkipBack,
  SkipForward,
  Shuffle,
  Repeat,
  Heart
} from 'lucide-react';
import { useAudio } from '@/components/audio/AudioProvider';
import { useStudio } from '@/components/admin/StudioProvider';
import { useAuth } from '@/context/AuthContext';
import ConfirmModal from '@/components/admin/ConfirmModal';
import SpeedSelector from '@/components/audio/SpeedSelector';
import { formatDuration } from '@/utils/format';

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
    isFinalMode,
    toggleFinalMode,
    seek,
    seekRelative,
    playNext,
    playPrevious,
    isShuffle,
    isRepeat,
    toggleShuffle,
    toggleRepeat
  } = useAudio();

  const { tracks, finalTracks, addToFinal, removeFromFinal, toggleFavorite } = useStudio();
  const { isAuthenticated, setIsAuthModalOpen } = useAuth();

  const [showSpeed, setShowSpeed] = useState(false);
  const [isExitingSpeed, setIsExitingSpeed] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [dragProgress, setDragProgress] = useState(0);
  const [authPrompt, setAuthPrompt] = useState({ isOpen: false, action: '' });
  const progressRef = useRef<HTMLDivElement>(null);

  const checkAuthAndExecute = (action: () => void, actionName: string) => {
    if (!isAuthenticated) {
      setAuthPrompt({ isOpen: true, action: actionName });
      return;
    }
    action();
  };

  const handleSeek = (clientX: number) => {
    if (!progressRef.current || !duration) return;
    const rect = progressRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(clientX - rect.left, rect.width));
    const percentage = x / rect.width;
    const newTime = percentage * duration;
    setDragProgress(percentage * 100);
    return newTime;
  };

  const handleInteractionStart = (e: React.MouseEvent | React.TouchEvent) => {
    if (isFinalMode) return;
    setIsDragging(true);
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    handleSeek(clientX);
  };

  const handleInteractionMove = (e: MouseEvent | TouchEvent) => {
    if (!isDragging) return;
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    handleSeek(clientX);
  };

  const handleInteractionEnd = (e: MouseEvent | TouchEvent) => {
    if (!isDragging) return;
    const clientX = 'touches' in e ? (e.changedTouches[0]?.clientX || 0) : e.clientX;
    const newTime = handleSeek(clientX);
    if (newTime !== undefined) {
      seek(newTime); // Jump to absolute time
    }
    setIsDragging(false);
  };

  // Add global listeners for dragging outside the element
  useEffect(() => {
    if (isDragging && !isFinalMode) {
      window.addEventListener('mousemove', handleInteractionMove);
      window.addEventListener('mouseup', handleInteractionEnd);
      window.addEventListener('touchmove', handleInteractionMove);
      window.addEventListener('touchend', handleInteractionEnd);
    }
    return () => {
      window.removeEventListener('mousemove', handleInteractionMove);
      window.removeEventListener('mouseup', handleInteractionEnd);
      window.removeEventListener('touchmove', handleInteractionMove);
      window.removeEventListener('touchend', handleInteractionEnd);
    };
  }, [isDragging, isFinalMode]);

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

  const displayProgress = isDragging ? dragProgress : (currentTime / (duration || 1)) * 100;

  const formatTime = (time: number) => {
    return formatDuration(time);
  };

  return (
    <div className="full-player-overlay">
      <div className="player-header">
        <button onClick={onClose} className="header-btn"><ChevronDown size={32} /></button>
        <span className="now-playing-label">Now Playing</span>
        <div className="header-btn-placeholder" />
      </div>

      <div className="player-content">
        <div className="album-art-container">
          <div className="disc-art glass">
            <div className="disc-center"></div>
          </div>
        </div>

        <div className="track-meta">
          <div className="meta-top">
            <div className="header-btn-placeholder" />
            <div className="text-center">
              <h2 className="title truncate">{title}</h2>
              <p className="artist truncate">{artist}</p>
            </div>
            <button 
              className={`meta-btn favorite ${tracks.find(t => t.title === title)?.isFavorite ? 'active' : ''}`}
              onClick={() => {
                checkAuthAndExecute(() => {
                  const track = tracks.find(t => t.title === title);
                  if (track) toggleFavorite(track.id);
                }, 'favorite tracks');
              }}
            >
              <Heart size={32} fill={tracks.find(t => t.title === title)?.isFavorite ? "currentColor" : "none"} />
            </button>
          </div>

          <button 
            className={`speed-tag ${bpm !== 100 ? 'active' : ''}`}
            onClick={() => handleToggleSpeed()}
          >
            <Gauge size={14} />
            <span>{bpm}% BPM</span>
          </button>
        </div>

        <div className="progress-section">
          <div 
            className="progress-bar-container" 
            ref={progressRef}
            onMouseDown={handleInteractionStart}
            onTouchStart={handleInteractionStart}
            style={{ 
               cursor: isFinalMode ? 'not-allowed' : 'pointer',
               opacity: isFinalMode ? 0.7 : 1,
               pointerEvents: isFinalMode ? 'none' : 'auto'
            }}
          >
            <div className="progress-fill" style={{ width: `${displayProgress}%` }}></div>
            <div className={`progress-knob ${isDragging ? 'active' : ''}`} style={{ left: `${displayProgress}%` }}></div>
          </div>
          <div className="time-labels">
            <span>{formatTime(isDragging ? (dragProgress / 100) * (duration || 0) : currentTime)}</span>
            <span>{formatTime(duration)}</span>
          </div>
        </div>

        <div className="main-controls">
          <button 
            className={`secondary-ctrl ${isShuffle ? 'active' : ''}`} 
            onClick={toggleShuffle}
            disabled={isFinalMode}
            style={{ opacity: isFinalMode ? 0.2 : 1, cursor: isFinalMode ? 'not-allowed' : 'pointer' }}
          >
            <Shuffle size={24} />
          </button>

          <button 
            className="secondary-ctrl" 
            onClick={playPrevious}
            disabled={isFinalMode}
            style={{ opacity: isFinalMode ? 0.2 : 1, cursor: isFinalMode ? 'not-allowed' : 'pointer' }}
          >
            <SkipBack size={32} fill="currentColor" />
          </button>
          
          <div className="main-play-btn glass" onClick={togglePlay}>
            {!isLoaded && !isFinalMode ? (
              <div className="loading-spinner"></div>
            ) : isPlaying ? (
              <Pause fill="currentColor" size={32} />
            ) : (
              <Play fill="currentColor" size={32} className="play-icon-offset" />
            )}
          </div>

          <button 
            className="secondary-ctrl" 
            onClick={playNext}
            disabled={isFinalMode}
            style={{ opacity: isFinalMode ? 0.2 : 1, cursor: isFinalMode ? 'not-allowed' : 'pointer' }}
          >
            <SkipForward size={32} fill="currentColor" />
          </button>

          <button 
            className={`secondary-ctrl ${isRepeat ? 'active' : ''}`} 
            onClick={toggleRepeat}
            disabled={isFinalMode}
            style={{ opacity: isFinalMode ? 0.2 : 1, cursor: isFinalMode ? 'not-allowed' : 'pointer' }}
          >
            <Repeat size={24} />
          </button>
        </div>

        <div className="practice-mode glass">
          <div className="practice-info">
            <Timer size={20} />
            <span>Final Mode</span>
          </div>
          <label className="switch">
            <input type="checkbox" checked={isFinalMode} onChange={toggleFinalMode} />
            <span className="slider round"></span>
          </label>
        </div>
      </div>

      {showSpeed && (
        <div className={`speed-overlay ${isExitingSpeed ? 'exit' : 'animate-in'}`} onClick={handleToggleSpeed}>
          <div className="speed-modal glass" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title">
                <Gauge size={20} className="text-primary" />
                <h3>Playback Speed</h3>
              </div>
              <button className="close-btn" onClick={handleToggleSpeed}><X size={20} /></button>
            </div>
            <SpeedSelector 
              currentBpm={bpm} 
              onSelect={(val) => { setBpm(val); handleToggleSpeed(); }} 
              onClose={handleToggleSpeed} 
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

      <style jsx>{`
        .full-player-overlay {
          position: fixed;
          inset: 0;
          background: #000;
          z-index: 5000;
          display: flex;
          flex-direction: column;
          padding: 20px;
          padding-top: max(20px, env(safe-area-inset-top));
          padding-bottom: max(20px, env(safe-area-inset-bottom));
          height: 100dvh;
          overflow: hidden;
          animation: slideUp 0.4s cubic-bezier(0.4, 0, 0.2, 1);
        }

        @keyframes slideUp {
          from { transform: translateY(100%); }
          to { transform: translateY(0); }
        }

        .player-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 40px;
        }

        .now-playing-label {
          font-size: 13px;
          font-weight: 800;
          text-transform: uppercase;
          letter-spacing: 1px;
        }

        .header-btn { color: white; opacity: 0.8; }
        .header-btn-placeholder { width: 32px; }

        .player-content {
          flex: 1;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 12px;
          justify-content: space-around;
        }

        .album-art-container {
          width: 180px;
          height: 180px;
          margin-bottom: 5px;
        }

        .disc-art {
          width: 100%;
          height: 100%;
          border-radius: 50%;
          background: linear-gradient(135deg, #1db954 0%, #1e1e1e 100%);
          display: flex;
          align-items: center;
          justify-content: center;
          border: 4px solid rgba(255,255,255,0.1);
          animation: ${isPlaying && !isFinalMode ? 'rotate 10s linear infinite' : 'none'};
          box-shadow: 0 20px 40px rgba(0,0,0,0.5);
        }

        @keyframes rotate {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }

        .disc-center {
          width: 60px;
          height: 60px;
          background: #000;
          border-radius: 50%;
          border: 4px solid rgba(255,255,255,0.05);
        }

        .track-meta {
          text-align: center;
          width: 100%;
          display: flex;
          flex-direction: column;
          align-items: center;
        }

        .meta-top {
          display: flex;
          align-items: center;
          justify-content: space-between;
          width: 100%;
          margin-bottom: 8px;
        }

        .text-center {
          flex: 1;
          min-width: 0;
          padding: 0 12px;
        }

        .meta-btn { 
          color: rgba(255,255,255,0.4); 
          transition: all 0.2s; 
          padding: 8px;
        }
        .meta-btn.favorite.active { color: #f43f5e; }
        .meta-btn.flag.active { color: #1db954; }
        .main-play-btn:active { transform: scale(0.95); }
        .play-icon-offset { transform: translateX(2px); }

        .loading-spinner {
          width: 32px;
          height: 32px;
          border: 3px solid rgba(255,255,255,0.1);
          border-top-color: var(--primary);
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        .title { font-size: 22px; font-weight: 900; margin-bottom: 2px; }
        .artist { font-size: 15px; color: #b3b3b3; font-weight: 500; margin-bottom: 8px; }

        .speed-tag {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          background: rgba(255,255,255,0.1);
          padding: 6px 12px;
          border-radius: 20px;
          font-size: 12px;
          font-weight: 700;
          color: white;
          margin-bottom: 16px;
          border: 1px solid rgba(255,255,255,0.1);
        }

        .speed-tag.active {
          background: #1db954;
          color: black;
          border-color: #1db954;
        }

        .progress-section { width: 100%; margin-top: 10px; }
        .progress-bar-container {
          height: 6px;
          background: rgba(255,255,255,0.1);
          border-radius: 3px;
          position: relative;
          margin-bottom: 12px;
          cursor: pointer;
          touch-action: none;
        }
        .progress-fill {
          height: 100%;
          background: var(--primary, #1db954);
          border-radius: 3px;
        }
        .progress-knob {
          width: 14px;
          height: 14px;
          background: white;
          border-radius: 50%;
          position: absolute;
          top: 50%;
          transform: translate(-50%, -50%);
          transition: transform 0.1s;
          box-shadow: 0 2px 6px rgba(0,0,0,0.3);
        }
        .progress-knob.active {
          transform: translate(-50%, -50%) scale(1.5);
          background: var(--primary);
        }
        .time-labels {
          display: flex;
          justify-content: space-between;
          font-size: 11px;
          color: #b3b3b3;
          font-weight: 600;
        }

        .main-controls {
          display: flex;
          align-items: center;
          justify-content: space-between;
          width: 100%;
          padding: 0 10px;
          margin: 10px 0;
        }

        .play-pause-btn {
          width: 72px;
          height: 72px;
          background: white;
          color: black;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 4px 12px rgba(255,255,255,0.2);
        }

        .secondary-ctrl { color: white; opacity: 0.5; transition: all 0.2s; }
        .secondary-ctrl.active { color: #1db954; opacity: 1; }
        .secondary-ctrl:active { transform: scale(1.1); }

        .practice-mode {
          width: 100%;
          border-radius: 20px;
          padding: 16px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          background: rgba(255,255,255,0.03);
          border: 1px solid rgba(255,255,255,0.05);
        }

        .practice-info { display: flex; align-items: center; gap: 12px; font-weight: 600; font-size: 14px; }

        .speed-pill {
          background: #333;
          color: white;
          padding: 4px 16px;
          border-radius: 20px;
          font-size: 13px;
          font-weight: 800;
        }
        .speed-pill.active { background: #1db954; color: black; }

        .switch { position: relative; display: inline-block; width: 44px; height: 24px; }
        .switch input { opacity: 0; width: 0; height: 0; }
        .slider { position: absolute; cursor: pointer; inset: 0; background-color: #333; transition: .4s; border-radius: 34px; }
        .slider:before { position: absolute; content: ""; height: 18px; width: 18px; left: 3px; bottom: 3px; background-color: white; transition: .4s; border-radius: 50%; }
        input:checked + .slider { background-color: #1db954; }
        input:checked + .slider:before { transform: translateX(20px); }

        .speed-overlay {
          position: fixed;
          inset: 0;
          z-index: 6000;
          display: flex;
          align-items: flex-end;
          background: rgba(0, 0, 0, 0.6);
          backdrop-filter: blur(8px);
          padding: 10px;
        }

        .speed-modal {
          width: 100%;
          border-radius: 24px;
          padding: 24px;
          padding-bottom: max(24px, env(safe-area-inset-bottom));
          background: #121212;
          border: 1px solid rgba(255, 255, 255, 0.1);
          box-shadow: 0 -10px 40px rgba(0, 0, 0, 0.5);
          margin-bottom: 5px;
        }

        .modal-title {
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .close-btn {
          color: #71717a;
          padding: 4px;
        }

        .modal-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 24px;
        }

        .animate-in { animation: fadeIn 0.3s ease; }
        .speed-overlay.exit { animation: fadeOut 0.3s ease forwards; }
        .speed-overlay.exit .speed-modal { animation: slideDown 0.3s cubic-bezier(0.4, 0, 0.2, 1) forwards; }
        .speed-modal { animation: slideUpModal 0.3s cubic-bezier(0.4, 0, 0.2, 1); }

        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes fadeOut { from { opacity: 1; } to { opacity: 0; } }
        @keyframes slideUpModal { from { transform: translateY(100%); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
        @keyframes slideDown { from { transform: translateY(0); opacity: 1; } to { transform: translateY(100%); opacity: 0; } }
      `}</style>
    </div>
  );
};

export default MobileFullPlayer;
