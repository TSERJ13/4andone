"use client";

import React from 'react';
import { Minus, Plus } from 'lucide-react';

interface SpeedSelectorProps {
  currentBpm: number;
  onSelect: (bpm: number, persistent?: boolean) => void;
  onClose: () => void;
  onDragStateChange?: (isDragging: boolean) => void;
  isFinalMode?: boolean;
}

const SpeedSelector: React.FC<SpeedSelectorProps> = React.memo(({ currentBpm, onSelect, onClose, onDragStateChange, isFinalMode }) => {
  // OPTIMIZATION: Use local state for immediate slider feedback to avoid iPad lag
  const [localBpm, setLocalBpm] = React.useState(currentBpm);
  const displayRef = React.useRef<HTMLSpanElement>(null);
  const lastUpdateRef = React.useRef(0);

  // Sync internal state when external prop changes (e.g. on Reset)
  React.useEffect(() => {
    setLocalBpm(currentBpm);
    if (displayRef.current) {
      const displayValue = currentBpm - 100;
      displayRef.current.textContent = `${displayValue > 0 ? `+${displayValue}` : displayValue}%`;
    }
  }, [currentBpm]);

  const handleAdjust = (delta: number) => {
    const newVal = Math.max(50, Math.min(150, localBpm + delta));
    setLocalBpm(newVal);
    onSelect(newVal);
  };

  const handleInteractionStart = () => {
    onDragStateChange?.(true);
  };

  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVal = parseInt(e.target.value);
    
    // ZERO-BLOCK: Update the DOM directly to bypass React re-render cycle
    // This keeps the UI thread free for perfectly smooth movement.
    if (displayRef.current) {
        const displayValue = newVal - 100;
        displayRef.current.textContent = `${displayValue > 0 ? `+${displayValue}` : displayValue}%`;
    }

    // Still update the local state but do NOT use it for the primary display during drag
    // setLocalBpm(newVal); // Commented out to reduce React overhead during drag

    // SMART THROTTLE: Audio Engine is throttled to 60ms
    const now = Date.now();
    if (now - lastUpdateRef.current > 60) {
      onSelect(newVal, false);
      lastUpdateRef.current = now;
    }
  };

  // Ensure the final value is synced when the user stops dragging
  const handleSliderEnd = (e: React.ChangeEvent<HTMLInputElement> | any) => {
    const finalVal = parseInt(e.target.value || localBpm);
    setLocalBpm(finalVal);
    onSelect(finalVal);
    onDragStateChange?.(false);
  };

  return (
    <div className="speed-container animate-in">
      <div className="speed-header">
        <span ref={displayRef} className="current-display">
           {localBpm - 100 > 0 ? `+${localBpm - 100}` : localBpm - 100}%
        </span>
        <button className="reset-btn glass" onClick={() => { setLocalBpm(100); onSelect(100); }}>Reset</button>
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
          defaultValue={localBpm}
          onChange={handleSliderChange}
          onMouseDown={handleInteractionStart}
          onTouchStart={handleInteractionStart}
          onMouseUp={handleSliderEnd}
          onTouchEnd={handleSliderEnd}
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
          --accent: ${isFinalMode ? '#ef4444' : 'var(--primary, #1db954)'};
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
          color: var(--accent);
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
        .reset-btn:hover { opacity: 1; color: var(--accent); }

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
        .adjust-btn:hover { background: rgba(255, 255, 255, 0.1); border-color: var(--accent); color: var(--accent); }

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
          width: 24px;
          height: 24px;
          border-radius: 50%;
          background: var(--accent);
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
});

export default SpeedSelector;
