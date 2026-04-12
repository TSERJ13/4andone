"use client";

import React, { useState, useRef, useEffect, useCallback } from 'react';
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
  Heart
} from 'lucide-react';
import { useAudio } from '@/components/audio/AudioProvider';
import { useStudio } from '@/components/admin/StudioProvider';
import { useAuth } from '@/context/AuthContext';
import ConfirmModal from '@/components/admin/ConfirmModal';
import SpeedSelector from '@/components/audio/SpeedSelector';
import { formatDuration } from '@/utils/format';
import { Marquee } from '@/components/layout/Marquee';

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
    playNext,
    playPrevious,
    isShuffle,
    isRepeat,
    toggleShuffle,
    toggleRepeat,
    sessionDuration,
    sessionTracks,
    isPauseCountdown,
    pauseTime
  } = useAudio();

  const { tracks, toggleFavorite } = useStudio();
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

  const handleInteractionMove = useCallback((e: MouseEvent | TouchEvent) => {
    if (!isDragging) return;
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    handleSeek(clientX);
  }, [isDragging]);

  const handleInteractionEnd = useCallback((e: MouseEvent | TouchEvent) => {
    if (!isDragging) return;
    const clientX = 'touches' in e ? (e.changedTouches[0]?.clientX || 0) : e.clientX;
    const newTime = handleSeek(clientX);
    if (newTime !== undefined) {
      seek(newTime);
    }
    setIsDragging(false);
  }, [isDragging, seek]);

  useEffect(() => {
    if (isDragging && !isFinalMode) {
      window.addEventListener('mousemove', handleInteractionMove);
      window.addEventListener('mouseup', handleInteractionEnd);
      window.addEventListener('touchmove', handleInteractionMove, { passive: false });
      window.addEventListener('touchend', handleInteractionEnd);
    }
    return () => {
      window.removeEventListener('mousemove', handleInteractionMove);
      window.removeEventListener('mouseup', handleInteractionEnd);
      window.removeEventListener('touchmove', handleInteractionMove);
      window.removeEventListener('touchend', handleInteractionEnd);
    };
  }, [isDragging, isFinalMode, handleInteractionMove, handleInteractionEnd]);

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

  // Determine the correct effective duration for the progress bar
  let activeDuration = duration;
  if (isFinalMode) {
    const isTrackInSession = sessionTracks && sessionTracks.some((t: any) => t.title === title);
    
    if (sessionDuration > 0 && isTrackInSession) {
      activeDuration = sessionDuration;
    } else {
      // Single track fallback logic (Not in a queue, but Final Mode is manually toggled)
      const lowerTitle = title?.toLowerCase() || '';
      const isPaso = lowerTitle.includes('paso');
      const isVW = lowerTitle.includes('viennese') || lowerTitle.includes('waltz') && lowerTitle.includes('v');
      activeDuration = isPaso ? duration : (isVW ? 85 : 105);
    }
  }

  const effectiveDuration = activeDuration;
  const displayProgress = isDragging ? dragProgress : (currentTime / (effectiveDuration || 1)) * 100;


  return (
    <div className="mfp-overlay animate-slide-up">
      <div className="mfp-header">
        <button onClick={onClose} className="mfp-header-btn"><ChevronDown size={32} /></button>
        <span className="mfp-now-playing-label">Now Playing</span>
        <div className="mfp-header-btn-placeholder" />
      </div>

      <div className="mfp-content">
        <div className="mfp-album-art-container" style={{ position: 'relative' }}>
          <div className={`mfp-disc-art glass ${isFinalMode ? 'mfp-final-active' : ''}`} style={isPlaying && !isFinalMode && !isPauseCountdown ? { animation: 'mfp-rotate 10s linear infinite' } : {}}>
            <div className="mfp-disc-center"></div>
          </div>
          {isPauseCountdown && (
            <div className="mfp-rest-timer">
              {pauseTime}
            </div>
          )}
        </div>

        <div className="mfp-track-meta">
          <div className="mfp-meta-top">
            <div className="mfp-header-btn-placeholder" />
            <div className="mfp-text-center">
              <Marquee text={title} className="mfp-title" isActive={isPlaying} />
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
            >
              <Heart size={32} fill={tracks.find(t => t.title === title)?.isFavorite ? "currentColor" : "none"} />
            </button>
          </div>

          <button 
            className={`mfp-speed-tag ${bpm !== 100 ? 'active' : ''}`}
            onClick={handleToggleSpeed}
          >
            <Gauge size={14} />
            <span>{bpm}% BPM</span>
          </button>
        </div>

        <div className="mfp-progress-section">
          <div 
            className="mfp-progress-bar-container" 
            ref={progressRef}
            onMouseDown={handleInteractionStart}
            onTouchStart={handleInteractionStart}
            style={{ 
               cursor: isFinalMode ? 'not-allowed' : 'pointer',
               opacity: isFinalMode ? 0.7 : 1,
               pointerEvents: isFinalMode ? 'none' : 'auto'
            }}
          >
            <div className={`mfp-progress-fill ${isFinalMode ? 'mfp-final-active' : ''}`} style={{ width: `${displayProgress}%` }}></div>
            <div className={`mfp-progress-knob ${isDragging ? 'active' : ''} ${isFinalMode ? 'mfp-final-active' : ''}`} style={{ left: `${displayProgress}%` }}></div>
          </div>
          <div className="mfp-time-labels">
            <span>{formatDuration(isDragging ? (dragProgress / 100) * (effectiveDuration || 0) : currentTime)}</span>
            <span>{formatDuration(effectiveDuration)}</span>
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
          
          <div className="mfp-play-pause-btn" onClick={togglePlay}>
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
        </div>

        <div className="mfp-practice-mode glass">
          <div className="mfp-practice-info">
            <Timer size={20} />
            <span>Final Mode</span>
          </div>
          <label className="mfp-switch">
            <input type="checkbox" checked={isFinalMode} onChange={toggleFinalMode} />
            <span className="mfp-slider mfp-round"></span>
          </label>
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
    </div>
  );
};

export default MobileFullPlayer;
