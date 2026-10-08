"use client";

import React from 'react';
import { Square } from 'lucide-react';

// Fired before stopping so the Final page knows the user ended the session
export const FINAL_USER_STOP_EVENT = 'final-mode-user-stop';

/**
 * "Stop Final Mode" — replaces playback controls while Final Mode runs.
 * Clean, non-flickering Stop button.
 */
export const FinalStopButton: React.FC<{
  onStop: () => void;
  className?: string;
  iconSize?: number;
  style?: React.CSSProperties;
}> = ({ onStop, className = '', iconSize = 18, style }) => (
  <button
    type="button"
    className={`final-exit-btn ${className}`}
    onClick={() => {
      window.dispatchEvent(new Event(FINAL_USER_STOP_EVENT));
      onStop();
    }}
    title="Stop Final Mode Session"
    aria-label="Stop Final Mode Session"
    style={{ lineHeight: 0, ...style }}
  >
    <Square size={iconSize} fill="#ef4444" color="#ef4444" />
  </button>
);

export default FinalStopButton;
