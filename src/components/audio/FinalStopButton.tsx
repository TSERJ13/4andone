"use client";

import React from 'react';
import { X } from 'lucide-react';

// Fired before stopping so the Final page knows the user ended the session
// (no "Final Mode is Over / Replay" popup in that case).
export const FINAL_USER_STOP_EVENT = 'final-mode-user-stop';

/**
 * "Stop Final Mode" — replaces the download button while Final Mode runs.
 * Red ring with an ✕ so it reads as "exit", not as a media stop square.
 */
export const FinalStopButton: React.FC<{ onStop: () => void; size?: number; style?: React.CSSProperties }> = ({
  onStop,
  size = 40,
  style,
}) => (
  <button
    type="button"
    className="final-exit-btn"
    onClick={() => {
      window.dispatchEvent(new Event(FINAL_USER_STOP_EVENT));
      onStop();
    }}
    title="Stop Final Mode"
    aria-label="Stop Final Mode"
    style={{ width: size, height: size, ...style }}
  >
    <X size={Math.round(size * 0.5)} strokeWidth={2.75} />
    <style jsx>{`
      .final-exit-btn {
        flex-shrink: 0;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        padding: 0;
        border-radius: 50%;
        border: 1.5px solid rgba(239, 68, 68, 0.75);
        background: rgba(239, 68, 68, 0.14);
        color: #ef4444;
        cursor: pointer;
        transition: background-color 0.15s, transform 0.15s;
        -webkit-tap-highlight-color: transparent;
      }
      .final-exit-btn:hover { background: rgba(239, 68, 68, 0.26); }
      .final-exit-btn:active { transform: scale(0.92); }
    `}</style>
  </button>
);

export default FinalStopButton;
