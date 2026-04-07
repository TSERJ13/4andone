"use client";

import React, { useState } from 'react';
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
    seekRelative,
    isShuffle,
    isRepeat,
    toggleShuffle,
    toggleRepeat
  } = useAudio();

  const { tracks, finalTracks, addToFinal, removeFromFinal, toggleFavorite } = useStudio();

  const [showSpeed, setShowSpeed] = useState(false);

  if (!isOpen) return null;

  const formatTime = (time: number) => {
    return formatDuration(time);
  };

  const progress = (currentTime / (duration || 1)) * 100;

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
            <button 
              className={`meta-btn favorite ${tracks.find(t => t.title === title)?.isFavorite ? 'active' : ''}`}
              onClick={() => {
                const track = tracks.find(t => t.title === title);
                if (track) toggleFavorite(track.id);
              }}
            >
              <Heart size={28} fill={tracks.find(t => t.title === title)?.isFavorite ? "currentColor" : "none"} />
            </button>

            <div className="text-center">
              <h2 className="title truncate">{title}</h2>
              <p className="artist truncate">{artist}</p>
            </div>

            <button 
              className={`meta-btn flag ${finalTracks.find(t => t.title === title) ? 'active' : ''}`}
              onClick={() => {
                const track = tracks.find(t => t.title === title);
                if (track) {
                  if (finalTracks.find(t => t.id === track.id)) removeFromFinal(track.id);
                  else addToFinal(track);
                }
              }}
            >
              <Flag size={28} fill={finalTracks.find(t => t.title === title) ? "currentColor" : "none"} />
            </button>
          </div>

          <button 
            className={`speed-tag ${bpm !== 100 ? 'active' : ''}`}
            onClick={() => setShowSpeed(true)}
          >
            <Gauge size={14} />
            <span>{bpm}% Speed</span>
          </button>
        </div>

        <div className="progress-section">
          <div className="progress-bar-container">
            <div className="progress-fill" style={{ width: `${progress}%` }}></div>
            <div className="progress-knob" style={{ left: `${progress}%` }}></div>
          </div>
          <div className="time-labels">
            <span>{formatTime(currentTime)}</span>
            <span>{formatTime(duration)}</span>
          </div>
        </div>

        <div className="main-controls">
          <button 
            className={`secondary-ctrl ${isShuffle ? 'active' : ''}`} 
            onClick={toggleShuffle}
          >
            <Shuffle size={24} />
          </button>

          <button className="secondary-ctrl" onClick={() => seekRelative(-10)}>
            <SkipBack size={32} fill="currentColor" />
          </button>
          
          <button 
            className="play-pause-btn" 
            onClick={togglePlay}
          >
            {isPlaying ? <Pause size={42} fill="currentColor" /> : <Play size={42} fill="currentColor" style={{marginLeft: 4}} />}
          </button>

          <button className="secondary-ctrl" onClick={() => seekRelative(10)}>
            <SkipForward size={32} fill="currentColor" />
          </button>

          <button 
            className={`secondary-ctrl ${isRepeat ? 'active' : ''}`} 
            onClick={toggleRepeat}
          >
            <Repeat size={24} />
          </button>
        </div>

        <div className="practice-mode glass">
          <div className="practice-info">
            <Timer size={20} />
            <span>Final Mode Practice</span>
          </div>
          <label className="switch">
            <input type="checkbox" checked={isFinalMode} onChange={toggleFinalMode} />
            <span className="slider round"></span>
          </label>
        </div>
      </div>

      {showSpeed && (
        <div className="speed-overlay glass animate-in">
          <div className="speed-modal glass">
            <div className="modal-header">
              <h3>Playback Speed</h3>
              <button onClick={() => setShowSpeed(false)}><X size={20} /></button>
            </div>
            <SpeedSelector 
              currentBpm={bpm} 
              onSelect={(val) => { setBpm(val); setShowSpeed(false); }} 
              onClose={() => setShowSpeed(false)} 
            />
          </div>
        </div>
      )}

      <style jsx>{`
        .full-player-overlay {
          position: fixed;
          inset: 0;
          background: #000;
          z-index: 5000;
          display: flex;
          flex-direction: column;
          padding: 20px;
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
          gap: 20px;
          justify-content: center;
        }

        .album-art-container {
          width: 220px;
          height: 220px;
          margin-bottom: 10px;
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
          animation: ${isPlaying ? 'rotate 10s linear infinite' : 'none'};
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
        .meta-btn:active { transform: scale(1.2); }

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
          height: 4px;
          background: #333;
          border-radius: 2px;
          position: relative;
          margin-bottom: 12px;
        }
        .progress-fill {
          height: 100%;
          background: white;
          border-radius: 2px;
        }
        .progress-knob {
          width: 12px;
          height: 12px;
          background: white;
          border-radius: 50%;
          position: absolute;
          top: 50%;
          transform: translate(-50%, -50%);
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
        }

        .speed-modal {
          width: 100%;
          border-radius: 30px 30px 0 0;
          padding: 24px;
          background: #121212;
        }

        .modal-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 24px;
        }

        .animate-in { animation: fadeIn 0.3s ease; }
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
      `}</style>
    </div>
  );
};

export default MobileFullPlayer;
