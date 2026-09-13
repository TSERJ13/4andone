"use client";

import React from 'react';

interface LiveShareIconProps {
  size?: number;
  className?: string;
  color?: string;
}

export const LiveShareIcon: React.FC<LiveShareIconProps> = ({
  size = 18,
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
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="live-share-svg"
      >
        {/* Animated Connecting Lines */}
        <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" className="share-line line-bottom" />
        <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" className="share-line line-top" />

        {/* Outer Top Node */}
        <circle cx="18" cy="5" r="3" className="node-top share-node" />
        {/* Outer Bottom Node */}
        <circle cx="18" cy="19" r="3" className="node-bottom share-node" />
        {/* Origin / Main Node */}
        <circle cx="6" cy="12" r="3" className="node-main share-node" />

        {/* Live Signal Pulse Waves (matching LiveCoffee steam animation feel) */}
        <circle cx="6" cy="12" r="4.5" className="signal-wave wave-main" strokeWidth="1.2" />
        <circle cx="18" cy="5" r="4.5" className="signal-wave wave-top" strokeWidth="1.2" />
        <circle cx="18" cy="19" r="4.5" className="signal-wave wave-bottom" strokeWidth="1.2" />
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
          filter: drop-shadow(0 0 4px rgba(29, 185, 84, 0.5));
          transition: filter 0.25s ease, transform 0.25s ease;
        }

        /* Continuous live pulse for nodes */
        .share-node {
          fill: rgba(29, 185, 84, 0.25);
          transition: fill 0.2s ease;
        }

        .node-main {
          animation: pulseNodeMain 2.4s ease-in-out infinite;
        }

        .node-top {
          animation: pulseNodeTop 2.4s ease-in-out infinite;
          animation-delay: 0.8s;
        }

        .node-bottom {
          animation: pulseNodeBottom 2.4s ease-in-out infinite;
          animation-delay: 1.6s;
        }

        @keyframes pulseNodeMain {
          0%, 100% {
            transform-origin: 6px 12px;
            transform: scale(1);
            fill: rgba(29, 185, 84, 0.25);
          }
          50% {
            transform-origin: 6px 12px;
            transform: scale(1.15);
            fill: #1db954;
          }
        }

        @keyframes pulseNodeTop {
          0%, 100% {
            transform-origin: 18px 5px;
            transform: scale(1);
            fill: rgba(29, 185, 84, 0.25);
          }
          50% {
            transform-origin: 18px 5px;
            transform: scale(1.15);
            fill: #1db954;
          }
        }

        @keyframes pulseNodeBottom {
          0%, 100% {
            transform-origin: 18px 19px;
            transform: scale(1);
            fill: rgba(29, 185, 84, 0.25);
          }
          50% {
            transform-origin: 18px 19px;
            transform: scale(1.15);
            fill: #1db954;
          }
        }

        /* Signal radiating waves like radar/coffee steam */
        .signal-wave {
          stroke: #1db954;
          fill: none;
          opacity: 0;
        }

        .wave-main {
          transform-origin: 6px 12px;
          animation: signalRadiate 2.4s cubic-bezier(0.2, 0.8, 0.2, 1) infinite;
        }

        .wave-top {
          transform-origin: 18px 5px;
          animation: signalRadiate 2.4s cubic-bezier(0.2, 0.8, 0.2, 1) infinite;
          animation-delay: 0.8s;
        }

        .wave-bottom {
          transform-origin: 18px 19px;
          animation: signalRadiate 2.4s cubic-bezier(0.2, 0.8, 0.2, 1) infinite;
          animation-delay: 1.6s;
        }

        @keyframes signalRadiate {
          0% {
            transform: scale(0.7);
            opacity: 0.9;
          }
          100% {
            transform: scale(1.65);
            opacity: 0;
          }
        }

        /* Connecting lines flow */
        .share-line {
          stroke-dasharray: 4 2;
          animation: lineFlow 2.2s linear infinite;
        }

        @keyframes lineFlow {
          from {
            stroke-dashoffset: 12;
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
