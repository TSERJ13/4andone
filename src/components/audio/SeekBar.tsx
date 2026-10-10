"use client";

import React, { useRef, useState } from 'react';

const formatTime = (seconds: number): string => {
  if (!seconds || isNaN(seconds)) return '0:00';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

interface SeekBarProps {
  current: number;
  total: number;
  onSeek: (time: number) => void;
  /** Final Mode: the bar shows the whole program and can't be dragged. */
  disabled?: boolean;
  color?: string;
  /** Called with the time under the finger while dragging, null when released. */
  onScrub?: (time: number | null) => void;
  className?: string;
}

/**
 * Track timeline with a white handle: tap anywhere to jump, or drag the
 * handle — the time under the finger shows above it, and the song jumps when
 * the finger is lifted. The touch area is taller than the thin line, so it is
 * easy to hit on a phone.
 */
export function SeekBar({ current, total, onSeek, disabled, color = 'var(--yt-red, #ff0000)', onScrub, className }: SeekBarProps) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [dragRatio, setDragRatio] = useState<number | null>(null);

  const ratioAt = (clientX: number) => {
    const rect = trackRef.current?.getBoundingClientRect();
    if (!rect || rect.width <= 0) return 0;
    return Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
  };

  const canSeek = !disabled && total > 0;
  const ratio = dragRatio ?? (total > 0 ? Math.min(1, current / total) : 0);
  const pct = `${ratio * 100}%`;

  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!canSeek) return;
    e.preventDefault();
    e.stopPropagation();
    try { e.currentTarget.setPointerCapture(e.pointerId); } catch { /* ignore */ }
    const r = ratioAt(e.clientX);
    setDragRatio(r);
    onScrub?.(r * total);
  };
  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (dragRatio === null) return;
    e.preventDefault();
    const r = ratioAt(e.clientX);
    setDragRatio(r);
    onScrub?.(r * total);
  };
  const finish = (e: React.PointerEvent<HTMLDivElement>, commit: boolean) => {
    if (dragRatio === null) return;
    try { e.currentTarget.releasePointerCapture(e.pointerId); } catch { /* ignore */ }
    if (commit) onSeek(ratioAt(e.clientX) * total);
    setDragRatio(null);
    onScrub?.(null);
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (!canSeek) return;
    if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
      e.preventDefault();
      e.stopPropagation();
      onSeek(Math.max(0, Math.min(total, current + (e.key === 'ArrowRight' ? 5 : -5))));
    }
  };

  return (
    <div
      className={`seekbar ${canSeek ? '' : 'is-disabled'} ${dragRatio !== null ? 'is-dragging' : ''} ${className || ''}`}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={(e) => finish(e, true)}
      onPointerCancel={(e) => finish(e, false)}
      onClick={(e) => e.stopPropagation()}
      onKeyDown={onKeyDown}
      role="slider"
      tabIndex={canSeek ? 0 : -1}
      aria-label="Seek"
      aria-valuemin={0}
      aria-valuemax={Math.round(total)}
      aria-valuenow={Math.round(ratio * total)}
      aria-valuetext={formatTime(ratio * total)}
      aria-disabled={!canSeek}
    >
      <div ref={trackRef} className="seekbar-track">
        <div className="seekbar-fill" style={{ width: pct, background: color }} />
        {canSeek && (
          <div className="seekbar-thumb" style={{ left: pct }}>
            {dragRatio !== null && <span className="seekbar-bubble">{formatTime(dragRatio * total)}</span>}
          </div>
        )}
      </div>
      <style jsx>{`
        .seekbar {
          position: relative;
          width: 100%;
          height: 24px;
          display: flex;
          align-items: center;
          cursor: pointer;
          touch-action: none;
          -webkit-tap-highlight-color: transparent;
          outline: none;
        }
        .seekbar.is-disabled {
          cursor: default;
        }
        .seekbar-track {
          position: relative;
          width: 100%;
          height: 4px;
          border-radius: 999px;
          background: rgba(255, 255, 255, 0.18);
          transition: height 0.12s ease;
        }
        .seekbar:hover .seekbar-track,
        .seekbar.is-dragging .seekbar-track {
          height: 6px;
        }
        .seekbar.is-disabled .seekbar-track {
          height: 4px;
        }
        .seekbar-fill {
          position: absolute;
          left: 0;
          top: 0;
          bottom: 0;
          border-radius: inherit;
        }
        .seekbar-thumb {
          position: absolute;
          top: 50%;
          width: 14px;
          height: 14px;
          margin-left: -7px;
          margin-top: -7px;
          border-radius: 50%;
          background: #ffffff;
          box-shadow: 0 1px 4px rgba(0, 0, 0, 0.5);
          transition: transform 0.12s ease;
        }
        .seekbar.is-dragging .seekbar-thumb {
          transform: scale(1.3);
        }
        .seekbar:focus-visible .seekbar-thumb {
          outline: 2px solid #ffffff;
          outline-offset: 3px;
        }
        .seekbar-bubble {
          position: absolute;
          bottom: 22px;
          left: 50%;
          transform: translateX(-50%) scale(0.77);
          transform-origin: bottom center;
          padding: 4px 8px;
          border-radius: 6px;
          background: #ffffff;
          color: #000000;
          font-size: 13px;
          font-weight: 700;
          font-variant-numeric: tabular-nums;
          white-space: nowrap;
          pointer-events: none;
        }
      `}</style>
    </div>
  );
}
