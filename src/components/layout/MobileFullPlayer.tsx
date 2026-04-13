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
  Tally3
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

  const totalDur = isFinalMode ? sessionDuration : duration;
  const displayProgress = isDragging ? dragProgress : (currentTime / (totalDur || 1)) * 100;
  const currentTrack = tracks.find(t => t.title === title);

  return createPortal(
    <div className="mfp-overlay animate-slide-up" style={{ zIndex: 9999, background: '#121212' }}>
      <div className="mfp-header">
        <button onClick={onClose} className="mfp-header-btn"><ChevronDown size={32} /></button>
        <span className="mfp-now-playing-label">Now Playing</span>
        <div className="mfp-header-btn-placeholder" />
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
            <div className="mfp-header-btn-placeholder" />
            <div className="mfp-text-center">
              <div className="mfp-title-wrapper truncate">
                {title}
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
            <span>{formatDuration(isDragging ? (dragProgress / 100) * (totalDur || 0) : currentTime)}</span>
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
            <input 
              type="checkbox" 
              checked={isFinalMode} 
              onChange={toggleFinalMode} 
              disabled={!!activeMode}
            />
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

      <style jsx>{`
        .art-container {
          position: relative;
          display: flex;
          justify-content: center;
          margin-bottom: 24px;
        }

        .vinyl-disc-v8 { 
          width: 280px; 
          height: 280px; 
          border-radius: 50%; 
          background: #121212; 
          position: relative; 
          box-shadow: 0 20px 60px rgba(0,0,0,0.6), inset 0 0 0 1px rgba(255,255,255,0.1); 
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
          width: 280px;
          height: 280px;
          left: 50%;
          transform: translateX(-50%);
        }
        .countdown-ring-mobile .count { font-size: 80px; font-weight: 900; color: var(--accent); }
        .countdown-ring-mobile .label { font-size: 10px; font-weight: 900; text-transform: uppercase; letter-spacing: 5px; opacity: 0.3; }

        .mfp-title-wrapper {
          font-size: 22.8px;
          font-weight: 800;
          color: white;
          text-align: center;
          max-width: 80vw;
        }
      `}</style>
    </div>,
    document.body
  );
};

export default MobileFullPlayer;
