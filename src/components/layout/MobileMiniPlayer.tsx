"use client";

import React, { useState } from 'react';
import {
  Play,
  Pause,
  Heart,
  Disc
} from 'lucide-react';
import { useAudio } from '@/components/audio/AudioProvider';
import { useStudio } from '@/components/admin/StudioProvider';
import { useAuth } from '@/context/AuthContext';
import ConfirmModal from '@/components/admin/ConfirmModal';
import { getMPMFromBPM } from '@/utils/audio';
import MobileFullPlayer from './MobileFullPlayer';

const MobileMiniPlayer = () => {
  const {
    isPlaying,
    togglePlay,
    isLoaded,
    title,
    artist,
    currentTime,
    duration,
    sessionDuration,
    sessionTracks,
    isFinalMode,
    isExpanded,
    setIsExpanded,
    isLoading
  } = useAudio();

  const { tracks, finalTracks, toggleFavorite } = useStudio();
  const { isAuthenticated, setIsAuthModalOpen } = useAuth();
  const [authPrompt, setAuthPrompt] = useState({ isOpen: false, action: '' });

  const checkAuthAndExecute = (action: () => void, actionName: string) => {
    if (!isAuthenticated) {
      setAuthPrompt({ isOpen: true, action: actionName });
      return;
    }
    action();
  };

  // We no longer return null here to prevent unmounting the expanded player
  // if (!isLoaded) return null;

  // PERFORMANCE: Memoize the track to avoid searching the array on every render
  const currentTrack = React.useMemo(() => {
    if (!title || title === "No Track Selected") return null;
    return tracks?.find(t => t.title === title) || finalTracks?.find(t => t.title === title);
  }, [tracks, finalTracks, title]);

  const handleFavoriteToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!currentTrack) return;
    checkAuthAndExecute(() => {
      toggleFavorite?.(currentTrack.id);
    }, 'favorite tracks');
  };

  const isSessionActive = isFinalMode && sessionTracks && sessionTracks.length > 0;
  const rawDuration = isSessionActive ? sessionDuration : (isFinalMode ? 105 : duration);
  const effectiveDuration = Number.isFinite(rawDuration) && rawDuration > 0 ? rawDuration : 105;
  const rawProgress = (currentTime / effectiveDuration) * 100;
  const progress = Number.isFinite(rawProgress) ? Math.max(0, Math.min(100, rawProgress)) : 0;

  return (
    <>
      <div className="mini-player-outer-wrapper" 
           style={{ pointerEvents: isLoaded ? 'auto' : 'none' }} 
           onClick={() => setIsExpanded(true)}
      >
        {(isLoaded || isLoading) && (
          <div className="mini-player-wrapper animate-in">
            <div className="mini-player glass">
              <div className="track-info">
                <div className="mini-art glass">
                  <Disc size={20} className={isPlaying ? 'rotating' : ''} />
                </div>
                <div className="text-info">
                  <span className="title truncate">{title}</span>
                  <span className="artist truncate">
                    {artist}
                    {currentTrack && currentTrack.bpm && (
                      <span className="text-primary font-bold ml-1">({getMPMFromBPM(Number(currentTrack.bpm), currentTrack.style)} BPM)</span>
                    )}
                  </span>
                </div>
              </div>

              <div className="controls">
                <button
                  className={`favorite-btn ${currentTrack?.isFavorite ? 'active' : ''}`}
                  onClick={handleFavoriteToggle}
                >
                  <Heart size={20} fill={currentTrack?.isFavorite ? "currentColor" : "none"} />
                </button>
                <button
                  className="play-btn"
                  onClick={(e) => { e.stopPropagation(); togglePlay(); }}
                >
                  {isPlaying ? <Pause size={24} fill="currentColor" /> : <Play size={24} fill="currentColor" />}
                </button>
              </div>

              <div className="progress-bar">
                <div className="progress-fill" style={{ width: `${progress}%` }}></div>
              </div>
            </div>
          </div>
        )}
      </div>

      <MobileFullPlayer
        isOpen={isExpanded}
        onClose={() => setIsExpanded(false)}
      />

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
        .mini-player-outer-wrapper {
          position: fixed;
          bottom: calc(80px + 12px + env(safe-area-inset-bottom));
          left: 12px;
          right: 12px;
          z-index: 1000;
        }

        .mini-player-wrapper {
          cursor: pointer;
        }

        .mini-player {
          height: 64px;
          border-radius: 12px;
          padding: 0 16px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          background: rgba(18, 18, 18, 0.95);
          backdrop-filter: blur(20px);
          border: 1px solid rgba(255, 255, 255, 0.08);
          position: relative;
          overflow: hidden;
          box-shadow: 0 8px 32px rgba(0,0,0,0.5);
        }

        .track-info {
          display: flex;
          align-items: center;
          gap: 12px;
          flex: 1;
          min-width: 0;
        }

        .mini-art {
          width: 40px;
          height: 40px;
          border-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: rgba(255,255,255,0.05);
          color: var(--primary);
        }

        .rotating { animation: rotate 3s linear infinite; }
        @keyframes rotate { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }

        .text-info { display: flex; flex-direction: column; min-width: 0; }
        .title { font-size: 13px; font-weight: 700; color: white; }
        .artist { font-size: 11px; color: #b3b3b3; }

        .controls { display: flex; align-items: center; gap: 16px; }
        .favorite-btn { color: #555; transition: all 0.2s; }
        .favorite-btn.active { color: #f43f5e; transform: scale(1.1); }
        .play-btn { color: white; transition: transform 0.1s; }
        .play-btn:active { transform: scale(0.9); }

        .progress-bar {
          position: absolute;
          bottom: 0;
          left: 0;
          right: 0;
          height: 2px;
          background: rgba(255,255,255,0.05);
        }
        .progress-fill {
          height: 100%;
          background: var(--primary);
          transition: width 0.1s linear;
        }

        .animate-in {
          animation: slideIn 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }

        @keyframes slideIn {
          from { transform: translateY(20px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }

        @media (min-width: 769px) { .mini-player-wrapper { display: none; } }
      `}</style>
    </>
  );
};

export default MobileMiniPlayer;
