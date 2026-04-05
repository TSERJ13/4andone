"use client";

import React from 'react';
import {
  Flag,
  Play,
  Trash2,
  GripVertical,
  Music2,
  Disc
} from 'lucide-react';
import { useStudio } from '@/components/admin/StudioProvider';
import { useAudio } from '@/components/audio/AudioProvider';

const FinalsPage = () => {
  const { finalTracks, removeFromFinal, reorderFinalTracks } = useStudio();
  const { loadTrack, isPlaying, title: playingTitle } = useAudio();

  const handleDragStart = (e: React.DragEvent, index: number) => {
    e.dataTransfer.setData('draggedIndex', index.toString());
  };

  const handleDrop = (e: React.DragEvent, dropIndex: number) => {
    const dragIndex = parseInt(e.dataTransfer.getData('draggedIndex'));
    if (dragIndex !== dropIndex) {
      reorderFinalTracks(dragIndex, dropIndex);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  return (
    <div className="finals-container animate-in">
      <header className="finals-header">
        <div className="header-icon glass">
          <Flag size={32} className="text-primary" />
        </div>
        <div className="header-text">
          <h1 className="text-gradient">Final Mode Playlist</h1>
          <p className="text-secondary">{finalTracks.length} tracks selected for sequential 1:45 playback.</p>
        </div>
      </header>

      <div className="tracks-list glass">
        {finalTracks.length > 0 ? (
          <div className="finals-grid">
            {finalTracks.map((track, i) => (
              <div
                key={track.id}
                className={`final-row glass ${playingTitle === track.title ? 'is-playing' : ''}`}
                draggable
                onDragStart={(e) => handleDragStart(e, i)}
                onDragOver={handleDragOver}
                onDrop={(e) => handleDrop(e, i)}
              >
                <div className="drag-handle">
                  <GripVertical size={20} />
                </div>
                <div className="track-index">{i + 1}</div>
                <div className="track-info" onClick={() => loadTrack(track)}>
                  <div className="track-art glass">
                    <Disc size={18} />
                  </div>
                  <div className="track-meta">
                    <span className="title truncate">{track.title}</span>
                    <span className="artist truncate">{track.artist}</span>
                  </div>
                </div>
                <div className="track-actions">
                  <button className="play-btn" onClick={() => loadTrack(track)}>
                    {isPlaying && playingTitle === track.title ? (
                      <div className="playing-bars"><span></span><span></span><span></span></div>
                    ) : (
                      <Play size={20} fill="currentColor" />
                    )}
                  </button>
                  <button className="remove-btn" onClick={() => removeFromFinal(track.id)}>
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="empty-state">
            <Flag size={64} className="text-secondary opacity-30" />
            <h3>Your Final Playlist is empty</h3>
            <p className="text-secondary">Click the flag icon on any track to add it here for race-day practice.</p>
          </div>
        )}
      </div>

      <style jsx>{`
        .finals-container {
          padding: 20px;
          padding-bottom: 120px;
        }

        .finals-header {
          display: flex;
          align-items: center;
          gap: 24px;
          margin-bottom: 40px;
        }

        .header-icon {
          width: 80px;
          height: 80px;
          border-radius: 20px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .header-text h1 { font-size: 2.5rem; font-weight: 900; margin-bottom: 4px; }

        .tracks-list {
          border-radius: 24px;
          padding: 8px;
          background: rgba(255,255,255,0.02);
        }

        .final-row {
          display: flex;
          align-items: center;
          padding: 12px 16px;
          gap: 20px;
          margin-bottom: 8px;
          transition: all 0.2s;
          cursor: pointer;
        }
        .final-row:hover { background: rgba(255,255,255,0.05); transform: scale(1.01); }
        .final-row:active { cursor: grabbing; }
        .final-row.is-playing { background: rgba(29, 185, 84, 0.1); border-color: rgba(29, 185, 84, 0.3); }

        .drag-handle { color: #555; cursor: grab; }
        .track-index { font-size: 14px; font-weight: 800; color: #555; min-width: 24px; }
        
        .track-info { display: flex; align-items: center; gap: 16px; flex: 1; min-width: 0; }
        .track-art { width: 44px; height: 44px; border-radius: 10px; display: flex; align-items: center; justify-content: center; color: var(--primary); }
        .track-meta { display: flex; flex-direction: column; min-width: 0; }
        .title { font-weight: 700; font-size: 14px; color: white; }
        .artist { font-size: 12px; color: #b3b3b3; }

        .track-actions { display: flex; align-items: center; gap: 20px; }
        .play-btn { color: white; }
        .remove-btn { color: #555; transition: color 0.2s; }
        .remove-btn:hover { color: #ff4444; }

        .empty-state {
          padding: 80px 20px;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 20px;
          text-align: center;
        }
        .empty-state h3 { font-size: 1.5rem; font-weight: 800; }

        .playing-bars {
          display: flex;
          align-items: flex-end;
          gap: 3px;
          width: 20px;
          height: 20px;
        }

        .playing-bars span {
          width: 3px;
          background: var(--primary);
          animation: dance 1s infinite ease-in-out;
        }

        .playing-bars span:nth-child(1) { height: 60%; animation-delay: -0.4s; }
        .playing-bars span:nth-child(2) { height: 100%; animation-delay: -0.2s; }
        .playing-bars span:nth-child(3) { height: 80%; animation-delay: 0s; }

        @keyframes dance {
          0%, 100% { transform: scaleY(0.5); }
          50% { transform: scaleY(1); }
        }

        .animate-in { animation: fadeIn 0.4s ease; }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }

        @media (max-width: 768px) {
          .finals-header h1 { font-size: 1.8rem; }
          .final-row { padding: 10px; gap: 12px; }
          .track-art, .drag-handle { display: none; }
        }

        .text-primary { color: var(--primary); }
        .text-secondary { color: var(--text-secondary); }
      `}</style>
    </div>
  );
};

export default FinalsPage;
