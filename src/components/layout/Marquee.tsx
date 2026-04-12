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
  const [containerWidth, setContainerWidth] = useState(0);

  useEffect(() => {
    let timeoutId: NodeJS.Timeout;
    
    const checkOverflow = () => {
      if (containerRef.current && textRef.current) {
        const currentContainerWidth = containerRef.current.offsetWidth;
        const textWidth = textRef.current.offsetWidth;
        
        setContainerWidth(currentContainerWidth);
        
        // Scroll if either globally active OR locally hovered
        if (textWidth > currentContainerWidth + 5 && (isActive || isHovered)) {
          setShouldScroll(true);
          const safeSpeed = Math.max(1, speed);
          const diff = textWidth - currentContainerWidth;
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
          '--container-width': `${containerWidth}px`
        } as React.CSSProperties}
      >
        <span ref={textRef} className="marquee-text">{text}</span>
      </div>
    </div>
  );
};
