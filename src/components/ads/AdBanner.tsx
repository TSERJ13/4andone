"use client";

import React, { useEffect, useState, useRef } from 'react';

export type AdDeviceType = 'desktop' | 'tablet' | 'mobile';

interface AdBannerProps {
  variant?: 'auto' | 'desktop' | 'tablet' | 'mobile';
  slot?: string;
  width?: number;
  height?: number;
  className?: string;
  style?: React.CSSProperties;
  /** Responsive unit: fills the container width (data-ad-format="auto"). */
  responsive?: boolean;
  /** Reports AdSense's fill result (from the data-ad-status attribute). */
  onStatusChange?: (status: 'filled' | 'unfilled') => void;
}

const AD_CONFIGS = {
  desktop: {
    slot: '9997722559',
    width: 468,
    height: 60,
    style: { display: 'inline-block', width: '468px', height: '60px' } as React.CSSProperties,
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
  if (width < 640) return 'mobile';
  if (width <= 1024) return 'tablet';
  return 'desktop';
}

export function AdBanner({
  variant = 'auto',
  slot,
  width,
  height,
  className = '',
  style,
  responsive = false,
  onStatusChange
}: AdBannerProps) {
  const [deviceType, setDeviceType] = useState<AdDeviceType>('desktop');
  const containerRef = useRef<HTMLDivElement | null>(null);
  const adRef = useRef<HTMLModElement | null>(null);
  const pushedRef = useRef(false);

  useEffect(() => {
    const updateDevice = () => {
      if (variant !== 'auto') {
        setDeviceType(variant);
        return;
      }
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
  }, [variant]);

  const activeType: AdDeviceType = variant === 'auto' ? deviceType : variant;
  const config = AD_CONFIGS[activeType];

  const slotToUse = slot || config.slot;
  const widthToUse = width || config.width;
  const heightToUse = height || config.height;
  const styleToUse = responsive
    ? ({ display: 'block', width: '100%', minHeight: `${heightToUse}px` } as React.CSSProperties)
    : (width && height)
    ? { display: 'inline-block', width: `${widthToUse}px`, height: `${heightToUse}px` }
    : config.style;

  useEffect(() => {
    pushedRef.current = false;

    const tryPush = () => {
      try {
        if (typeof window !== 'undefined' && adRef.current) {
          // If the element is hidden (display: none), offsetParent is null; do not push
          if (adRef.current.offsetParent === null) return;
          const isDone = adRef.current.getAttribute('data-adsbygoogle-status') === 'done';
          if (!isDone && !pushedRef.current) {
            ((window as any).adsbygoogle = (window as any).adsbygoogle || []).push({});
            pushedRef.current = true;
          }
        }
      } catch (err) {
        // Silently catch adblock
      }
    };

    const timer = setTimeout(tryPush, 100);
    window.addEventListener('resize', tryPush);

    return () => {
      clearTimeout(timer);
      window.removeEventListener('resize', tryPush);
    };
  }, [slotToUse, activeType]);

  // AdSense marks the <ins> with data-ad-status="filled" | "unfilled".
  const onStatusRef = useRef(onStatusChange);
  useEffect(() => { onStatusRef.current = onStatusChange; }, [onStatusChange]);
  useEffect(() => {
    const el = adRef.current;
    if (!el || typeof MutationObserver === 'undefined') return;
    const report = () => {
      const status = el.getAttribute('data-ad-status');
      if (status === 'filled' || status === 'unfilled') onStatusRef.current?.(status);
    };
    const observer = new MutationObserver(report);
    observer.observe(el, { attributes: true, attributeFilter: ['data-ad-status'] });
    report();
    return () => observer.disconnect();
  }, [slotToUse, activeType]);

  const containerMinHeight = `${heightToUse}px`;

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
        ref={adRef}
        className="adsbygoogle"
        style={styleToUse}
        data-ad-client="ca-pub-2697205988789699"
        data-ad-slot={slotToUse}
        {...(responsive ? { 'data-ad-format': 'auto', 'data-full-width-responsive': 'true' } : {})}
      />
    </div>
  );
}

export default AdBanner;
