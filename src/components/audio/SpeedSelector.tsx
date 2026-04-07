"use client";

import React from 'react';

interface SpeedSelectorProps {
  currentBpm: number;
  onSelect: (bpm: number) => void;
  onClose: () => void;
}

const SpeedSelector: React.FC<SpeedSelectorProps> = ({ currentBpm, onSelect, onClose }) => {
  const speeds = [80, 85, 90, 95, 100, 105, 110, 115, 120, 125];

  return (
    <div className="speed-container">
      <div className="speed-grid">
        {speeds.map((speed) => (
          <button 
            key={speed}
            className={`speed-option glass ${currentBpm === speed ? 'active' : ''}`}
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
      
      <p className="speed-footer">
        Adjust the BPM to match your practice tempo.
      </p>

      <style jsx>{`
        .speed-container {
          width: 100%;
        }

        .speed-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 10px;
          width: 100%;
        }

        .speed-option {
          padding: 14px;
          border-radius: 12px;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 2px;
          transition: all 0.2s;
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.1);
          color: white;
        }

        .speed-option.active {
          background: #1db954;
          color: black;
          border-color: #1db954;
        }

        .speed-option:active {
          transform: scale(0.95);
        }

        .value {
          font-size: 16px;
          font-weight: 800;
        }

        .label {
          font-size: 10px;
          font-weight: 600;
          text-transform: uppercase;
          opacity: 0.7;
        }

        .speed-footer {
          font-size: 12px;
          text-align: center;
          margin-top: 16px;
          color: #b3b3b3;
          opacity: 0.8;
        }
      `}</style>
    </div>
  );
};

export default SpeedSelector;
