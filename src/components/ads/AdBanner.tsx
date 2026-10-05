"use client";

import React, { useEffect, useRef } from 'react';

interface AdBannerProps {
  slot?: string;
  format?: 'auto' | 'fluid' | 'horizontal' | 'rectangle';
  responsive?: boolean;
  className?: string;
  style?: React.CSSProperties;
}

export function AdBanner({
  slot,
  format = 'auto',
  responsive = true,
  className = '',
  style
}: AdBannerProps) {
  const adRef = useRef<HTMLModElement | null>(null);
  const pushedRef = useRef(false);

  useEffect(() => {
    // Avoid double-pushing to the same ins element in React 18 strict mode
    if (pushedRef.current) return;

    const timer = setTimeout(() => {
      try {
        if (typeof window !== 'undefined' && adRef.current) {
          const isDone = adRef.current.getAttribute('data-adsbygoogle-status') === 'done';
          if (!isDone) {
            ((window as any).adsbygoogle = (window as any).adsbygoogle || []).push({});
            pushedRef.current = true;
          }
        }
      } catch (err) {
        // Silently handle adblock or ad loading exceptions
      }
    }, 150);

    return () => clearTimeout(timer);
  }, []);

  return (
    <div
      className={`adsense-banner-container ${className}`}
      style={{
        width: '100%',
        minHeight: '60px',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        margin: '0 auto 16px auto',
        overflow: 'hidden',
        position: 'relative',
        zIndex: 10,
        ...style
      }}
    >
      <ins
        ref={adRef}
        className="adsbygoogle"
        style={{
          display: 'block',
          width: '100%',
          textAlign: 'center',
          ...style
        }}
        data-ad-client="ca-pub-2697205988789699"
        {...(slot ? { 'data-ad-slot': slot } : {})}
        data-ad-format={format}
        data-full-width-responsive={responsive ? 'true' : 'false'}
      />
    </div>
  );
}

export default AdBanner;
