"use client";

import React from 'react';
import { X } from 'lucide-react';

// Fired before stopping so the Final page knows the user ended the session
// (no "Final Mode is Over / Replay" popup in that case).
export const FINAL_USER_STOP_EVENT = 'final-mode-user-stop';

/**
 * "Stop Final Mode" — replaces the download button while Final Mode runs.
 * A plain red ✕ that takes the same class/size as the buttons next to it,
 * so it looks like one of them (no ring around it).
 */
export const FinalStopButton: React.FC<{
  onStop: () => void;
  className?: string;
  iconSize?: number;
  style?: React.CSSProperties;
}> = ({ onStop, className = '', iconSize = 24, style }) => (
  <button
    type="button"
    className={`final-exit-btn ${className}`}
    onClick={() => {
      window.dispatchEvent(new Event(FINAL_USER_STOP_EVENT));
      onStop();
    }}
    title="Stop Final Mode"
    aria-label="Stop Final Mode"
    style={{ lineHeight: 0, ...style }}
  >
    <X size={iconSize} strokeWidth={2.5} />
  </button>
);

export default FinalStopButton;
