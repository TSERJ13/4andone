"use client";

import React, { useState } from 'react';
import { Coffee } from 'lucide-react';

interface KofiButtonProps {
  variant?: 'pill' | 'sidebar' | 'compact';
  className?: string;
  label?: string;
}

export const KofiButton: React.FC<KofiButtonProps> = ({
  variant = 'pill',
  className = '',
  label = 'Buy Me Coffee'
}) => {
  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    // Open the official Ko-fi payment iframe modal directly on the same page
    window.dispatchEvent(new CustomEvent('open-kofi-modal'));
  };

  if (variant === 'sidebar') {
    return (
      <button
        onClick={handleClick}
        className={`kofi-sidebar-btn ${className}`}
        title="Support 4and.one on Ko-fi"
        type="button"
      >
        <div className="icon-box">
          <Coffee size={20} className="kofi-icon" />
        </div>
        <span className="kofi-label">{label}</span>
        <span className="kofi-heart">☕</span>

        <style jsx>{`
          .kofi-sidebar-btn {
            display: flex;
            align-items: center;
            gap: 12px;
            padding: 12px 14px;
            border-radius: 10px;
            color: #ffffff;
            font-size: 13px;
            font-weight: 700;
            background: rgba(29, 185, 84, 0.08);
            border: 1px solid rgba(29, 185, 84, 0.25);
            cursor: pointer;
            width: 100%;
            text-align: left;
            transition: all 0.2s ease;
          }
          .kofi-sidebar-btn:hover {
            background: rgba(29, 185, 84, 0.18);
            border-color: #1db954;
            transform: translateY(-1px);
            box-shadow: 0 4px 15px rgba(29, 185, 84, 0.25);
          }
          .icon-box {
            display: flex;
            align-items: center;
            justify-content: center;
            color: #1db954;
          }
          .kofi-label {
            flex: 1;
            letter-spacing: -0.2px;
          }
          .kofi-heart {
            font-size: 14px;
            opacity: 0.9;
          }
        `}</style>
      </button>
    );
  }

  return (
    <button
      onClick={handleClick}
      className={`kofi-pill-btn ${className}`}
      title="Buy Me a Coffee - Support 4and.one"
      aria-label="Buy Me a Coffee on Ko-fi"
      type="button"
    >
      <span className="kofi-icon-wrapper">
        <Coffee size={15} strokeWidth={2.4} className="kofi-svg-icon" />
      </span>
      <span className="kofi-text">{label}</span>

      <style jsx>{`
        .kofi-pill-btn {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          height: 36px;
          padding: 0 14px;
          border-radius: 9999px;
          background: rgba(255, 255, 255, 0.05);
          backdrop-filter: blur(12px);
          -webkit-backdrop-filter: blur(12px);
          border: 1px solid rgba(29, 185, 84, 0.35);
          color: #ffffff;
          font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
          font-size: 12.5px;
          font-weight: 700;
          letter-spacing: -0.2px;
          cursor: pointer;
          transition: all 0.22s cubic-bezier(0.2, 0, 0, 1);
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.4);
          user-select: none;
        }

        .kofi-pill-btn:hover {
          background: rgba(29, 185, 84, 0.14);
          border-color: #1db954;
          color: #ffffff;
          box-shadow: 0 0 18px rgba(29, 185, 84, 0.35), 0 2px 8px rgba(0, 0, 0, 0.5);
          transform: translateY(-1.5px);
        }

        .kofi-pill-btn:active {
          transform: scale(0.96);
        }

        .kofi-icon-wrapper {
          display: flex;
          align-items: center;
          justify-content: center;
          color: #1db954;
          transition: transform 0.2s ease;
          filter: drop-shadow(0 0 4px rgba(29, 185, 84, 0.5));
        }

        .kofi-pill-btn:hover .kofi-icon-wrapper {
          transform: rotate(-10deg) scale(1.1);
        }

        .kofi-text {
          white-space: nowrap;
        }
      `}</style>
    </button>
  );
};
export default KofiButton;
