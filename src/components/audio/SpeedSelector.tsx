"use client";

import React from 'react';
import { X, Gauge } from 'lucide-react';

interface SpeedSelectorProps {
  currentBpm: number;
  onSelect: (bpm: number) => void;
  onClose: () => void;
}

const SpeedSelector: React.FC<SpeedSelectorProps> = ({ currentBpm, onSelect, onClose }) => {
  const speeds = [80, 85, 90, 95, 100, 105, 110, 115, 120, 125];

  return (
    <div className="speed-selector-overlay" onClick={onClose}>
      <div className="speed-selector-popup glass animate-in" onClick={(e) => e.stopPropagation()}>
        <header className="popup-header">
          <div className="title">
            <Gauge size={20} className="text-primary" />
            <h3>Playback Speed</h3>
          </div>
          <button className="close-btn" onClick={onClose}><X size={20} /></button>
        </header>

        <div className="speed-grid">
          {speeds.map((speed) => (
            <button 
              key={speed}
              className={`speed-option glass-item ${currentBpm === speed ? 'active' : ''}`}
              onClick={() => {
                onSelect(speed);
                onClose();
              }}
            >
              <span className="value">{speed}%</span>
              <span className="label">{speed === 100 ? 'Normal' : speed > 100 ? 'Faster' : 'Slower'}</span>
            </button>
          ))}
        </div>

        <p className="speed-footer text-secondary">
          Adjust the BPM to match your practice tempo. Selection is saved automatically.
        </p>
      </div>

      <style jsx>{`
        .speed-selector-overlay {
          position: fixed;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          background: rgba(0, 0, 0, 0.4);
          backdrop-filter: blur(4px);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 2000;
        }

        .speed-selector-popup {
          width: 90%;
          max-width: 400px;
          padding: 32px;
          border-radius: 24px;
          display: flex;
          flex-direction: column;
          gap: 24px;
          box-shadow: 0 20px 40px rgba(0, 0, 0, 0.4);
        }

        .popup-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
        }

        .title {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .title h3 {
          font-size: 20px;
          font-weight: 800;
          letter-spacing: -0.5px;
        }

        .close-btn {
          color: #71717a;
          transition: color 0.2s;
        }

        .close-btn:hover {
          color: white;
        }

        .speed-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 12px;
        }

        .speed-option {
          padding: 16px;
          border-radius: 12px;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 4px;
          transition: all 0.2s;
        }

        .speed-option.active {
          background: var(--primary);
          color: black;
          border-color: var(--primary);
        }

        .speed-option:not(.active):hover {
          background: rgba(255, 255, 255, 0.1);
        }

        .value {
          font-size: 18px;
          font-weight: 800;
        }

        .label {
          font-size: 11px;
          font-weight: 600;
          text-transform: uppercase;
          opacity: 0.7;
        }

        .speed-footer {
          font-size: 13px;
          text-align: center;
          line-height: 1.5;
        }

        @keyframes animate-in {
          from { opacity: 0; transform: scale(0.95) translateY(10px); }
          to { opacity: 1; transform: scale(1) translateY(0); }
        }

        .animate-in {
          animation: animate-in 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }
      `}</style>
    </div>
  );
};

export default SpeedSelector;
