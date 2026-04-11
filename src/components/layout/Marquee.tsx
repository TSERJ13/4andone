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

  useEffect(() => {
    const checkOverflow = () => {
      if (containerRef.current && textRef.current) {
        const containerWidth = containerRef.current.offsetWidth;
        const textWidth = textRef.current.offsetWidth;
        
        if (textWidth > containerWidth && isActive) {
          setShouldScroll(true);
          // Calculate duration based on text width to keep speed consistent
          setDuration(textWidth / speed);
        } else {
          setShouldScroll(false);
        }
      }
    };

    checkOverflow();
    window.addEventListener('resize', checkOverflow);
    
    // Check again after a small delay to ensure fonts/layout are ready
    const timer = setTimeout(checkOverflow, 100);

    return () => {
      window.removeEventListener('resize', checkOverflow);
      clearTimeout(timer);
    };
  }, [text, speed, isActive]);

  return (
    <div className={`marquee-container ${className}`} ref={containerRef}>
      <div 
        className={`marquee-content ${shouldScroll ? 'is-scrolling' : ''}`}
        style={{ 
          animationDuration: shouldScroll ? `${duration}s` : '0s'
        } as React.CSSProperties}
      >
        <span ref={textRef}>{text}</span>
        {shouldScroll && <span className="marquee-spacer"></span>}
        {shouldScroll && <span>{text}</span>}
      </div>

      <style jsx>{`
        .marquee-container {
          overflow: hidden;
          white-space: nowrap;
          width: 100%;
          position: relative;
        }

        .marquee-content {
          display: inline-flex;
          align-items: center;
          width: max-content;
        }

        .is-scrolling {
          animation: marquee-scroll linear infinite;
        }

        .marquee-spacer {
          display: inline-block;
          width: 40px;
        }

        @keyframes marquee-scroll {
          from { transform: translateX(0); }
          to { transform: translateX(calc(-50% - 20px)); }
        }

        /* Stop scrolling when not hovering if you want, but user asked for "everyone scrolling" */
        /* .marquee-container:hover .is-scrolling { animation-play-state: running; } */
      `}</style>
    </div>
  );
};
