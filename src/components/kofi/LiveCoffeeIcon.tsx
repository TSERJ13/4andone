"use client";

import React from 'react';

interface LiveCoffeeIconProps {
  size?: number;
  className?: string;
  color?: string;
}

export const LiveCoffeeIcon: React.FC<LiveCoffeeIconProps> = ({
  size = 20,
  className = '',
  color = '#1db954'
}) => {
  return (
    <span className={`live-coffee-container ${className}`}>
      <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        stroke={color}
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="live-coffee-svg"
      >
        {/* Animated Steam Line 1 (Left) */}
        <path
          d="M6 7.5c-.8-1.3 .8-2.5 0-3.8"
          className="steam steam-1"
          strokeWidth="1.8"
        />
        {/* Animated Steam Line 2 (Center) */}
        <path
          d="M10 7.5c-.8-1.3 .8-2.5 0-3.8"
          className="steam steam-2"
          strokeWidth="1.8"
        />
        {/* Animated Steam Line 3 (Right) */}
        <path
          d="M14 7.5c-.8-1.3 .8-2.5 0-3.8"
          className="steam steam-3"
          strokeWidth="1.8"
        />

        {/* Cup Handle */}
        <path d="M17 10h1.5a2.5 2.5 0 0 1 0 5H17" />
        {/* Cup Body */}
        <path d="M3 9.5h14v5a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4v-5Z" />
        {/* Saucer Line */}
        <line x1="2.5" y1="21.5" x2="18.5" y2="21.5" strokeWidth="2" />
      </svg>

      <style jsx>{`
        .live-coffee-container {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          line-height: 0;
          vertical-align: middle;
        }

        .live-coffee-svg {
          overflow: visible;
          filter: drop-shadow(0 0 5px rgba(29, 185, 84, 0.45));
          transition: filter 0.25s ease, transform 0.25s ease;
        }

        .steam {
          transform-origin: bottom center;
          animation: steamRise 2.2s cubic-bezier(0.4, 0, 0.2, 1) infinite;
        }

        .steam-1 {
          animation-delay: 0s;
        }

        .steam-2 {
          animation-delay: 0.75s;
        }

        .steam-3 {
          animation-delay: 1.45s;
        }

        @keyframes steamRise {
          0% {
            transform: translateY(2px) scaleY(0.7);
            opacity: 0;
          }
          30% {
            opacity: 0.95;
          }
          70% {
            opacity: 0.6;
          }
          100% {
            transform: translateY(-5.5px) scaleY(1.3);
            opacity: 0;
          }
        }
      `}</style>
    </span>
  );
};

export default LiveCoffeeIcon;
