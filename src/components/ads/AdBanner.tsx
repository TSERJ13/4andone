"use client";

import React, { useEffect, useState, useRef } from 'react';

export type AdDeviceType = 'desktop' | 'tablet' | 'mobile';

interface AdBannerProps {
  variant?: 'auto' | 'desktop' | 'tablet' | 'mobile';
  className?: string;
  style?: React.CSSProperties;
}

const AD_CONFIGS = {
  desktop: {
    slot: '7499637445',
    width: 728,
    height: 90,
    style: { display: 'inline-block', width: '728px', height: '90px' } as React.CSSProperties,
  },
  tablet: {
    slot: '9997722559',
    width: 468,
    height: 60,
    style: { display: 'inline-block', width: '468px', height: '60px' } as React.CSSProperties,
  },
  mobile: {
    slot: '3269671833',
    width: 320,
    height: 50,
    style: { display: 'inline-block', width: '320px', height: '50px' } as React.CSSProperties,
  },
};

function resolveDeviceType(): AdDeviceType {
  if (typeof window === 'undefined') return 'desktop';
  const width = window.innerWidth;
  const height = window.innerHeight;
  const isLandscape = width > height;

  // Mobile: narrow screen (phones)
  if (width < 640) {
    return 'mobile';
  }

  // Tablet in vertical (portrait) position: width between 640 and 1024 and not landscape
  if (width <= 1024 && !isLandscape) {
    return 'tablet';
  }

  // Desktop and horizontal (landscape) tablet
  return 'desktop';
}

export function AdBanner({
  variant = 'auto',
  className = '',
  style
}: AdBannerProps) {
  const [deviceType, setDeviceType] = useState<AdDeviceType>('desktop');
  const [mounted, setMounted] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const adRef = useRef<HTMLModElement | null>(null);
  const pushedRef = useRef(false);

  useEffect(() => {
    setMounted(true);

    const updateDevice = () => {
      if (variant !== 'auto') {
        setDeviceType(variant);
        return;
      }
      // Pick the largest unit that actually fits in the available width,
      // otherwise Google auto-resizes the fixed unit into an odd format.
      const byDevice = resolveDeviceType();
      const available = containerRef.current?.clientWidth ?? window.innerWidth;
      let fit: AdDeviceType = 'mobile';
      if (available >= AD_CONFIGS.desktop.width) fit = 'desktop';
      else if (available >= AD_CONFIGS.tablet.width) fit = 'tablet';
      const order: AdDeviceType[] = ['mobile', 'tablet', 'desktop'];
      setDeviceType(order[Math.min(order.indexOf(byDevice), order.indexOf(fit))]);
    };

    updateDevice();
    window.addEventListener('resize', updateDevice);
    window.addEventListener('orientationchange', updateDevice);
    return () => {
      window.removeEventListener('resize', updateDevice);
      window.removeEventListener('orientationchange', updateDevice);
    };
  }, [variant, mounted]);

  const activeType: AdDeviceType = variant === 'auto' ? deviceType : variant;
  const config = AD_CONFIGS[activeType];

  useEffect(() => {
    if (!mounted) return;
    pushedRef.current = false;

    const timer = setTimeout(() => {
      try {
        if (typeof window !== 'undefined' && adRef.current) {
          const isDone = adRef.current.getAttribute('data-adsbygoogle-status') === 'done';
          if (!isDone && !pushedRef.current) {
            ((window as any).adsbygoogle = (window as any).adsbygoogle || []).push({});
            pushedRef.current = true;
          }
        }
      } catch (err) {
        // Silently catch adblock or ad loading issues
      }
    }, 100);

    return () => clearTimeout(timer);
  }, [mounted, activeType]);

  const containerMinHeight = `${config.height}px`;

  if (!mounted) {
    return (
      <div
        className={`adsense-banner-container ${className}`}
        style={{
          width: '100%',
          minHeight: containerMinHeight,
          height: containerMinHeight,
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          overflow: 'hidden',
          ...style
        }}
      />
    );
  }

  return (
    <div
      ref={containerRef}
      className={`adsense-banner-container ${className}`}
      style={{
        width: '100%',
        minHeight: containerMinHeight,
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        position: 'relative',
        zIndex: 10,
        ...style
      }}
    >
      <ins
        key={`${config.slot}-${activeType}`}
        ref={adRef}
        className="adsbygoogle"
        style={config.style}
        data-ad-client="ca-pub-2697205988789699"
        data-ad-slot={config.slot}
      />
    </div>
  );
}

export default AdBanner;
