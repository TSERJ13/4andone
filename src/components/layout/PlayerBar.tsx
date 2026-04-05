"use client";

import React from 'react';
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
  Flag
} from 'lucide-react';
import { useAudio } from '@/components/audio/AudioProvider';
import SpeedSelector from '@/components/audio/SpeedSelector';
import { useStudio } from '@/components/admin/StudioProvider';

const PlayerBar = () => {
  const pathname = usePathname();
  const isAdmin = pathname.startsWith('/admin');

  const [showSpeedSelector, setShowSpeedSelector] = React.useState(false);
  const { 
    isPlaying,
    togglePlay,
    bpm,
    setBpm,
    isLoaded,
    title,
    artist,
    error,
    currentTime,
    duration,
    volume,
    setVolume,
    isShuffle,
    toggleShuffle,
    isRepeat,
    toggleRepeat,
    isFinalMode
  } = useAudio();
  
  const { finalTracks, addToFinal, removeFromFinal, tracks } = useStudio();

  if (isAdmin) return null;

  const formatTime = (time: number) => {
    const mins = Math.floor(time / 60);
    const secs = Math.floor(time % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <footer className="player-bar glass">
      {/* Track Info */}
      <div className="track-info">
        <div className="album-art glass">
          <Tally3 size={24} className="text-primary" />
        </div>
        <div className="track-details">
          <div className="track-row-header">
            <p className="track-title truncate max-w-[200px]">
              {title}
            </p>
          </div>
          <p className={`track-artist truncate max-w-[200px] ${error ? 'error-text' : ''}`}>
            {error || artist}
          </p>
        </div>
      </div>

      {/* Main Controls */}
      <div className="player-controls">
        <div className="control-buttons">
          <button 
            className={`control-btn ${isShuffle ? 'active' : ''}`} 
            onClick={toggleShuffle}
          >
            <Shuffle size={18} />
          </button>
          <button className="control-btn"><SkipBack size={24} fill="currentColor" /></button>
          <button 
            className={`play-btn glass ${(!isLoaded && !error) ? 'loading' : ''} ${error ? 'error' : ''}`} 
            onClick={togglePlay}
            disabled={!isLoaded || !!error}
          >
            {((!isLoaded && !error)) ? (
              <div className="loader"></div>
            ) : error ? (
              <span style={{ fontSize: '20px', fontWeight: 'bold' }}>!</span>
            ) : isPlaying ? (
              <Pause size={28} fill="currentColor" />
            ) : (
              <Play size={28} fill="currentColor" style={{ marginLeft: '4px' }} />
            )}
          </button>
          <button className="control-btn"><SkipForward size={24} fill="currentColor" /></button>
          <button 
            className={`control-btn ${isRepeat ? 'active' : ''}`} 
            onClick={toggleRepeat}
          >
            <Repeat size={18} />
          </button>
        </div>

        <div className="progress-container">
          <span className="time-text">{formatTime(currentTime)}</span>
          <div className="progress-bar-bg">
            <div className={`progress-bar-fill ${error ? 'error' : ''}`} 
                 style={{ width: `${(currentTime / (duration || 100)) * 100}%` }}>
            </div>
          </div>
          <span className="time-text">{formatTime(duration || 135)}</span>
        </div>
      </div>

      <div className="extra-controls">
        <div className="special-features">
          {/* Speed Selector */}
          <div className="speed-container">
            <button 
              className={`feature-btn glass ${bpm !== 100 ? 'active' : ''}`}
              onClick={() => setShowSpeedSelector(true)}
              title={`Playback Speed: ${bpm}%`}
            >
              <Gauge size={18} />
              <span className="label">Speed: {bpm}%</span>
            </button>

            {/* Quick Actions Restored & Enlarged */}
            <div className="quick-actions-bar">
              <button 
                className={`action-btn-large ${finalTracks.some(t => t.title === title) ? 'active-flag' : ''}`}
                onClick={() => {
                  const currentTrack = tracks.find(t => t.title === title);
                  if (currentTrack) {
                    finalTracks.some(t => t.id === currentTrack.id) ? (removeFromFinal(currentTrack.id)) : (addToFinal(currentTrack));
                  }
                }}
                title="Add to Final Mode"
              >
                <Flag size={20} fill={finalTracks.some(t => t.title === title) ? "currentColor" : "none"} />
              </button>
              <button className="action-btn-large" title="Add to Favorites">
                <Heart size={20} />
              </button>
            </div>

            {showSpeedSelector && (
              <SpeedSelector 
                currentBpm={bpm} 
                onSelect={setBpm} 
                onClose={() => (setShowSpeedSelector(false))} 
              />
            )}
          </div>
        </div>

        {/* Volume Control */}
        <div className="volume-control">
          <Volume2 size={20} className="text-secondary" />
          <input 
            type="range" 
            min="0" 
            max="1" 
            step="0.01" 
            value={volume}
            onChange={(e) => setVolume(parseFloat(e.target.value))}
            className="volume-slider"
          />
        </div>
      </div>

      <style jsx>{`
        .track-info {
          display: flex;
          align-items: center;
          gap: 12px;
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
          width: 42px;
          height: 42px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          background: var(--text);
          color: var(--background);
          border: none;
        }
        .play-btn:hover:not(:disabled) {
          transform: scale(1.05);
        }
        .play-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
        .play-btn.loading {
          cursor: wait;
        }
        .loader {
          width: 20px;
          height: 20px;
          border: 2px solid var(--background);
          border-top: 2px solid var(--text-secondary);
          border-radius: 50%;
          animation: spin 1s linear infinite;
        }
        .ai-loader {
          width: 28px;
          height: 28px;
          border: 3px solid rgba(168, 85, 247, 0.2);
          border-top: 3px solid #a855f7;
          border-radius: 50%;
          animation: spin 0.8s cubic-bezier(0.5, 0, 0.5, 1) infinite;
        }
        .feature-btn.purple-glow {
          background: rgba(168, 85, 247, 0.1);
          border-color: rgba(168, 85, 247, 0.4);
          box-shadow: 0 0 15px rgba(168, 85, 247, 0.2);
        }
        .text-purple {
          color: #a855f7;
        }
        .progress-bar-fill.processing {
          background: linear-gradient(90deg, #1db954, #a855f7);
          animation: pulse 2s infinite;
        }
        @keyframes pulse {
          0% { opacity: 0.8; }
          50% { opacity: 1; }
          100% { opacity: 0.8; }
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
          height: 4px;
          background-color: var(--border);
          border-radius: 2px;
          position: relative;
        }
        .progress-bar-fill {
          height: 100%;
          background-color: var(--text);
          border-radius: 2px;
        }
        .progress-bar-fill.error {
          background-color: #ff4444;
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
          width: 140px;
          margin-left: 20px;
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
        @media (max-width: 768px) {
          .player-bar {
            grid-template-columns: 1fr auto;
            height: 72px;
            padding: 0 16px;
            gap: 12px;
            position: fixed;
            bottom: 0;
            left: 0;
            width: 100%;
            z-index: 1000;
          }
          .track-info {
            flex: 1;
            overflow: hidden;
          }
          .extra-controls {
            display: none;
          }
          .player-controls {
            width: auto;
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
            height: 2px;
            padding: 0;
            max-width: none;
            display: flex !important;
          }
          .time-text {
            display: none;
          }
          .progress-bar-bg {
            height: 2px;
            border-radius: 0;
          }
          .progress-bar-fill {
            border-radius: 0;
          }
        }
      `}</style>
    </footer>
  );
};

export default PlayerBar;
