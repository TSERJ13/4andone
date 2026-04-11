"use client";

import React from 'react';
import { Minus, Plus } from 'lucide-react';

interface SpeedSelectorProps {
  currentBpm: number;
  onSelect: (bpm: number) => void;
  onClose: () => void;
}

const SpeedSelector: React.FC<SpeedSelectorProps> = ({ currentBpm, onSelect, onClose }) => {
  const displayValue = currentBpm - 100;

  const handleAdjust = (delta: number) => {
    const newVal = Math.max(50, Math.min(150, currentBpm + delta));
    onSelect(newVal);
  };

  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onSelect(parseInt(e.target.value));
  };

  return (
    <div className="speed-container animate-in">
      <div className="speed-header">
        <span className="current-display">{displayValue > 0 ? `+${displayValue}` : displayValue}%</span>
        <button className="reset-btn glass" onClick={() => onSelect(100)}>Reset</button>
      </div>

      <div className="slider-wrapper">
        <button className="adjust-btn glass" onClick={() => handleAdjust(-5)}>
          <Minus size={18} />
        </button>
        
        <input 
          type="range" 
          min="50" 
          max="150" 
          step="1"
          value={currentBpm} 
          onChange={handleSliderChange}
          className="speed-slider"
        />

        <button className="adjust-btn glass" onClick={() => handleAdjust(5)}>
          <Plus size={18} />
        </button>
      </div>
      
      <div className="speed-labels">
        <span>-50%</span>
        <span>Normal</span>
        <span>+50%</span>
      </div>

      <style jsx>{`
        .speed-container {
          width: 100%;
          padding: 8px 0;
        }

        .speed-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 24px;
        }

        .current-display {
          font-size: 24px;
          font-weight: 900;
          color: var(--primary);
          letter-spacing: -1px;
        }

        .reset-btn {
          font-size: 11px;
          font-weight: 800;
          text-transform: uppercase;
          padding: 6px 12px;
          border-radius: 8px;
          opacity: 0.6;
          transition: all 0.2s;
        }
        .reset-btn:hover { opacity: 1; color: var(--primary); }

        .slider-wrapper {
          display: flex;
          align-items: center;
          gap: 16px;
          margin-bottom: 12px;
        }

        .adjust-btn {
          width: 44px;
          height: 44px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.2s;
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.1);
        }

        .adjust-btn:active { transform: scale(0.9); }
        .adjust-btn:hover { background: rgba(255, 255, 255, 0.1); border-color: var(--primary); color: var(--primary); }

        .speed-slider {
          flex: 1;
          -webkit-appearance: none;
          height: 6px;
          background: rgba(255, 255, 255, 0.1);
          border-radius: 3px;
          outline: none;
        }

        .speed-slider::-webkit-slider-thumb {
          -webkit-appearance: none;
          width: 20px;
          height: 20px;
          border-radius: 50%;
          background: var(--primary);
          cursor: pointer;
          border: 4px solid #121212;
          box-shadow: 0 0 10px rgba(0,0,0,0.5);
          transition: scale 0.2s;
        }

        .speed-slider::-webkit-slider-thumb:hover { scale: 1.2; }

        .speed-labels {
          display: flex;
          justify-content: space-between;
          padding: 0 60px;
          font-size: 10px;
          font-weight: 800;
          text-transform: uppercase;
          opacity: 0.4;
        }

        @media (max-width: 768px) {
          .speed-labels { padding: 0 54px; }
        }
      `}</style>
    </div>
  );
};

export default SpeedSelector;
