"use client";

import React from 'react';

interface LiveShareIconProps {
  size?: number;
  className?: string;
  color?: string;
}

export const LiveShareIcon: React.FC<LiveShareIconProps> = ({
  size = 16,
  className = '',
  color = '#1db954'
}) => {
  return (
    <span className={`live-share-container ${className}`}>
      <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        stroke={color}
        strokeWidth="1.4"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="live-share-svg"
      >
        {/* Animated Connecting Lines (Thin & Delicate) */}
        <line x1="8.2" y1="13.3" x2="15.8" y2="17.7" className="share-line line-bottom" strokeWidth="1.4" />
        <line x1="15.8" y1="6.3" x2="8.2" y2="10.7" className="share-line line-top" strokeWidth="1.4" />

        {/* Outer Top Node (Hollow, light line) */}
        <circle cx="18" cy="5" r="2.3" className="node-top share-node" strokeWidth="1.4" />
        {/* Outer Bottom Node (Hollow, light line) */}
        <circle cx="18" cy="19" r="2.3" className="node-bottom share-node" strokeWidth="1.4" />
        {/* Main Origin Node (Hollow, light line) */}
        <circle cx="6" cy="12" r="2.3" className="node-main share-node" strokeWidth="1.4" />

        {/* Delicate, fine signal waves (Super light 0.9px stroke, no fill) */}
        <circle cx="6" cy="12" r="4" className="delicate-wave wave-1" strokeWidth="0.9" />
        <circle cx="18" cy="5" r="4" className="delicate-wave wave-2" strokeWidth="0.9" />
        <circle cx="18" cy="19" r="4" className="delicate-wave wave-3" strokeWidth="0.9" />
      </svg>

      <style jsx>{`
        .live-share-container {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          line-height: 0;
          vertical-align: middle;
        }

        .live-share-svg {
          overflow: visible;
          filter: drop-shadow(0 0 3px rgba(29, 185, 84, 0.4));
          transition: filter 0.2s ease;
        }

        /* Hollow delicate nodes with subtle breathing */
        .share-node {
          fill: rgba(29, 185, 84, 0.08);
          transition: fill 0.2s ease;
        }

        .node-main {
          transform-origin: 6px 12px;
          animation: nodeBreathe 2.8s ease-in-out infinite;
        }

        .node-top {
          transform-origin: 18px 5px;
          animation: nodeBreathe 2.8s ease-in-out infinite;
          animation-delay: 0.9s;
        }

        .node-bottom {
          transform-origin: 18px 19px;
          animation: nodeBreathe 2.8s ease-in-out infinite;
          animation-delay: 1.8s;
        }

        @keyframes nodeBreathe {
          0%, 100% {
            transform: scale(1);
            stroke-opacity: 0.8;
          }
          50% {
            transform: scale(1.1);
            stroke-opacity: 1;
            fill: rgba(29, 185, 84, 0.18);
          }
        }

        /* Fine signal pulses radiating outward gently */
        .delicate-wave {
          stroke: #1db954;
          fill: none;
          opacity: 0;
        }

        .wave-1 {
          transform-origin: 6px 12px;
          animation: waveRadiate 2.8s cubic-bezier(0.2, 0.8, 0.2, 1) infinite;
        }

        .wave-2 {
          transform-origin: 18px 5px;
          animation: waveRadiate 2.8s cubic-bezier(0.2, 0.8, 0.2, 1) infinite;
          animation-delay: 0.9s;
        }

        .wave-3 {
          transform-origin: 18px 19px;
          animation: waveRadiate 2.8s cubic-bezier(0.2, 0.8, 0.2, 1) infinite;
          animation-delay: 1.8s;
        }

        @keyframes waveRadiate {
          0% {
            transform: scale(0.75);
            opacity: 0.7;
          }
          100% {
            transform: scale(1.55);
            opacity: 0;
          }
        }

        /* Subtle delicate signal flowing along lines */
        .share-line {
          stroke-dasharray: 3 2.5;
          animation: lineSignal 2.5s linear infinite;
        }

        @keyframes lineSignal {
          from {
            stroke-dashoffset: 11;
          }
          to {
            stroke-dashoffset: 0;
          }
        }
      `}</style>
    </span>
  );
};

export default LiveShareIcon;
