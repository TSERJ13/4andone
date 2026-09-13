"use client";

import React from 'react';
import { LiveCoffeeIcon } from './LiveCoffeeIcon';
import { trackKofiClick } from '@/utils/tracking';

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

    // Track button click in analytics
    trackKofiClick(variant);

    // Open the official Ko-fi payment iframe modal directly on the same page
    window.dispatchEvent(new CustomEvent('open-kofi-modal'));
  };

  if (variant === 'sidebar') {
    return (
      <button
        onClick={handleClick}
        className={`kofi-sidebar-btn ${className}`}
        title="Support 4and.one on Ko-fi"
        aria-label="Support 4and.one on Ko-fi"
        type="button"
      >
        <LiveCoffeeIcon size={22} />

        <style jsx>{`
          .kofi-sidebar-btn {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            width: 44px;
            height: 44px;
            border-radius: 12px;
            color: #ffffff;
            background: rgba(255, 255, 255, 0.04);
            border: 1px solid rgba(255, 255, 255, 0.08);
            cursor: pointer;
            transition: background 0.2s ease, border-color 0.2s ease, box-shadow 0.2s ease;
            backdrop-filter: blur(12px);
            -webkit-backdrop-filter: blur(12px);
          }
          .kofi-sidebar-btn:hover {
            background: rgba(255, 255, 255, 0.09);
            border-color: rgba(255, 255, 255, 0.2);
            box-shadow: 0 4px 16px rgba(0, 0, 0, 0.4);
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
        <LiveCoffeeIcon size={16} />
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
          transition: background 0.2s ease, border-color 0.2s ease, box-shadow 0.2s ease;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.4);
          user-select: none;
        }

        .kofi-pill-btn:hover {
          background: rgba(29, 185, 84, 0.14);
          border-color: #1db954;
          color: #ffffff;
          box-shadow: 0 0 18px rgba(29, 185, 84, 0.35), 0 2px 8px rgba(0, 0, 0, 0.5);
        }

        .kofi-icon-wrapper {
          display: flex;
          align-items: center;
          justify-content: center;
          color: #1db954;
          filter: drop-shadow(0 0 4px rgba(29, 185, 84, 0.5));
        }

        .kofi-text {
          white-space: nowrap;
        }
      `}</style>
    </button>
  );
};
export default KofiButton;
