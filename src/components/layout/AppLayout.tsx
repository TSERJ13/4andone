"use client";

import React, { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import Sidebar from "@/components/layout/Sidebar";
import MobileNav from "@/components/layout/MobileNav";
import PlayerBar from "@/components/layout/PlayerBar";
import { useAuth } from '@/context/AuthContext';
import { useAudioControls } from '@/components/audio/AudioProvider';
import { AuthModal } from '@/components/auth/AuthModal';
import { KofiModal } from '@/components/kofi/KofiModal';
import { ContactModal } from '@/components/modals/ContactModal';
import MobileFullPlayer from './MobileFullPlayer';
import DesktopFullPlayer from './DesktopFullPlayer';
import OfflineBanner from './OfflineBanner';
import { SubscriptionModal } from '@/components/subscription/SubscriptionModal';
import { TrackLimitAdModal } from '@/components/ads/TrackLimitAdModal';
import AdSenseLoader from '@/components/ads/AdSenseLoader';
import { ListAdAnchorTracker } from '@/components/ads/ListAd';
import AdDebugPanel from '@/components/ads/AdDebugPanel';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);
  const [isFullPlayerOpen, setIsFullPlayerOpen] = useState(false);
  const [isDesktopExpanded, setIsDesktopExpanded] = useState(false);

  // Hooks must ALWAYS be at the top level and in the same order
  // Page visits are recorded once by <AnalyticsTracker>. useVisitTracker() used to
  // insert a second row for the same visit, so every visit was counted twice.
  const { title, isAdModalOpen, setIsAdModalOpen } = useAudioControls();
  const { isAuthModalOpen, setIsAuthModalOpen, isSubscriptionModalOpen, setIsSubscriptionModalOpen } = useAuth();
  
  // SCROLL GUARD: AdSense responsive ads set inline "height: auto !important"
  // (and similar) on the elements above them. On this app the page scrolls
  // inside .main-content while html/body are locked, so that inline height
  // made the whole page impossible to scroll. Strip only those inline
  // sizing rules from the app shell whenever they appear.
  useEffect(() => {
    if (!mounted) return; // the app shell isn't rendered before mount
    const HEIGHT_PROPS = ['height', 'min-height', 'max-height'];
    const SHELL_PROPS = [...HEIGHT_PROPS, 'overflow', 'overflow-y'];
    const shell = [document.querySelector('.app-container'), document.querySelector('.main-content')]
      .filter(Boolean) as HTMLElement[];
    // html/body: only sizing (modals legitimately set body overflow)
    const targets = [document.documentElement, document.body, ...shell];
    const clean = (el: HTMLElement) => {
      const props = shell.includes(el) ? SHELL_PROPS : HEIGHT_PROPS;
      for (const prop of props) {
        if (el.style.getPropertyValue(prop)) el.style.removeProperty(prop);
      }
    };
    targets.forEach(clean);
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((m) => clean(m.target as HTMLElement));
    });
    targets.forEach((el) => observer.observe(el, { attributes: true, attributeFilter: ['style'] }));
    return () => observer.disconnect();
  }, [mounted]);

  useEffect(() => {
    setMounted(true);
    // Detect PWA standalone mode (more reliable than CSS media query on iOS)
    const isPWA = window.matchMedia('(display-mode: standalone)').matches
      || (window.navigator as { standalone?: boolean }).standalone === true;
    if (isPWA) {
      document.body.classList.add('pwa-standalone');
    }

    // Force service worker update and purge stale cached styles from previous builds
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
      navigator.serviceWorker.getRegistrations().then((registrations) => {
        for (const reg of registrations) {
          reg.update();
        }
      });
    }

    if (typeof window !== 'undefined' && 'caches' in window) {
      const CURRENT_VERSION = '4andone-cache-v35';
      let lastVersion: string | null = null;
      try {
        lastVersion = localStorage.getItem('4andone_pwa_version');
      } catch (e) {
        // localStorage inaccessible (private mode / storage disabled) — treat
        // as "already current" rather than looping forever on every load.
        lastVersion = CURRENT_VERSION;
      }
      if (lastVersion !== CURRENT_VERSION) {
        // Record the new version BEFORE attempting the reload. This is the
        // circuit breaker: once the flag is written, next load's
        // lastVersion check short-circuits regardless of whether
        // cache-clearing itself succeeded, so a caches-API failure can
        // never turn into a reload loop.
        let flagPersisted = true;
        try {
          localStorage.setItem('4andone_pwa_version', CURRENT_VERSION);
        } catch (e) {
          flagPersisted = false;
        }
        if (flagPersisted) {
          caches.keys()
            .then((keys) => Promise.all(keys.map((key) => caches.delete(key))))
            .catch(() => {})
            .then(() => {
              window.location.reload();
            });
        }
        // If the flag couldn't be persisted, skip the reload entirely
        // rather than risk repeating it on every subsequent load.
      }
    }
  }, []);

  useEffect(() => {
    const handleOpenFullPlayer = () => {
      if (window.innerWidth > 1024) {
        setIsDesktopExpanded(true);
      } else {
        setIsFullPlayerOpen(true);
      }
    };
    window.addEventListener('open-full-player', handleOpenFullPlayer);

    if (pathname?.startsWith('/track/')) {
      handleOpenFullPlayer();
    }

    return () => window.removeEventListener('open-full-player', handleOpenFullPlayer);
  }, [pathname]);

  // Orientation/Resize-Aware State Synchronization - MUST be before conditional returns
  useEffect(() => {
    const handleResize = () => {
      const isMobile = window.innerWidth <= 1024;
      if (isMobile && isDesktopExpanded) {
        setIsDesktopExpanded(false);
        setIsFullPlayerOpen(true);
      } else if (!isMobile && isFullPlayerOpen) {
        setIsFullPlayerOpen(false);
        setIsDesktopExpanded(true);
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [isDesktopExpanded, isFullPlayerOpen]);

  const isNoLayout = pathname?.startsWith('/admin') || pathname === '/sa-login';
  const isPlayerActive = title !== "No Track Selected";

  if (!mounted) {
    return <div className="layout-stabilizer" style={{ background: '#000', height: '100vh', width: '100vw' }} />;
  }

  if (isNoLayout) {
    return <>{children}</>;
  }

  const handleExpand = () => {
    if (window.innerWidth > 1024) {
      setIsDesktopExpanded(!isDesktopExpanded);
    } else {
      setIsFullPlayerOpen(true);
    }
  };

  return (
    <>
      <AdSenseLoader />
      <ListAdAnchorTracker />
      <AdDebugPanel />
      <div className={`app-container ${mounted && isPlayerActive ? 'player-active' : ''}`}>
        <OfflineBanner />
        <Sidebar />
        <main className="main-content">
          {children}
        </main>
        <PlayerBar onExpand={handleExpand} />
      </div>

      <MobileNav onExpand={() => setIsFullPlayerOpen(true)} />
      
      <AuthModal 
        isOpen={isAuthModalOpen} 
        onClose={() => setIsAuthModalOpen(false)} 
      />

      <SubscriptionModal
        isOpen={isSubscriptionModalOpen}
        onClose={() => setIsSubscriptionModalOpen(false)}
      />

      <TrackLimitAdModal
        isOpen={isAdModalOpen}
        onClose={() => setIsAdModalOpen(false)}
      />

      <KofiModal />
      <ContactModal />
      
      <MobileFullPlayer 
        isOpen={isFullPlayerOpen}
        onClose={() => setIsFullPlayerOpen(false)}
      />

      {/* Desktop/iPad Full Player Overlay */}
      {isDesktopExpanded && (
        <DesktopFullPlayer
            onClose={() => setIsDesktopExpanded(false)}
        />
      )}
    </>
  );
}
