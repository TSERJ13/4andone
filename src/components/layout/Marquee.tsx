"use client";

import React, { useState, useRef, useEffect } from 'react';

interface MarqueeProps {
  text: string;
  className?: string;
  speed?: number; // pixels per second
  isActive?: boolean;
}

export const Marquee: React.FC<MarqueeProps> = ({ text, className = '', speed = 30, isActive = false }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const textRef = useRef<HTMLSpanElement>(null);
  const [shouldScroll, setShouldScroll] = useState(false);
  const [duration, setDuration] = useState(0);
  const [isHovered, setIsHovered] = useState(false);

  useEffect(() => {
    let timeoutId: NodeJS.Timeout;
    
    const checkOverflow = () => {
      if (containerRef.current && textRef.current) {
        const containerWidth = containerRef.current.offsetWidth;
        const textWidth = textRef.current.offsetWidth;
        
        // Scroll if either globally active OR locally hovered
        if (textWidth > containerWidth + 5 && (isActive || isHovered)) {
          setShouldScroll(true);
          const safeSpeed = Math.max(1, speed);
          const diff = textWidth - containerWidth;
          const calculatedDuration = diff / safeSpeed;
          setDuration(Number.isFinite(calculatedDuration) ? Math.max(2, calculatedDuration) : 10);
        } else {
          setShouldScroll(false);
        }
      }
    };

    checkOverflow();
    window.addEventListener('resize', checkOverflow);
    timeoutId = setTimeout(checkOverflow, 200);

    return () => {
      window.removeEventListener('resize', checkOverflow);
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [text, speed, isActive, isHovered]);

  return (
    <div 
      className={`marquee-container ${className} ${shouldScroll ? 'can-scroll' : ''}`} 
      ref={containerRef}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div 
        className={`marquee-content ${shouldScroll ? 'is-scrolling' : ''}`}
        style={{ 
          animationDuration: shouldScroll && duration > 0 ? `${duration}s` : '0s',
          animationDelay: '1s',
          '--container-width': `${containerRef.current?.offsetWidth || 0}px`
        } as React.CSSProperties}
      >
        <span ref={textRef} className="marquee-text">{text}</span>
      </div>

      <style jsx>{`
        .marquee-container {
          overflow: hidden;
          width: 100%;
          position: relative;
          cursor: default;
        }

        /* Default state: Truncate with ellipsis if not scrolling */
        .marquee-container:not(.can-scroll) {
          white-space: nowrap;
          text-overflow: ellipsis;
          display: block;
          overflow: hidden;
        }

        .marquee-container.can-scroll {
          mask-image: linear-gradient(to right, transparent, black 5%, black 95%, transparent);
          -webkit-mask-image: linear-gradient(to right, transparent, black 5%, black 95%, transparent);
        }

        .marquee-content {
          display: inline-block;
          width: max-content;
          will-change: transform;
          white-space: nowrap;
        }

        /* Only allow scrolling when explicitly enabled by parent or hover */
        .is-scrolling {
          animation: marquee-yoyo linear infinite alternate;
        }

        .marquee-text {
          padding-right: 15px; /* Slight padding to ensure it doesn't touch the mask edge immediately */
        }

        @keyframes marquee-yoyo {
          0%, 15% { transform: translateX(0); }
          85%, 100% { transform: translateX(calc(-100% + var(--container-width, 100%))); }
        }
      `}</style>
    </div>
  );
};
