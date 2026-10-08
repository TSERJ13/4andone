"use client";

import React, { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import YtHeader from '@/components/ytmusic/YtHeader';
import YtSidebar from '@/components/ytmusic/YtSidebar';
import YtPlayerBar from '@/components/ytmusic/YtPlayerBar';
import YtMobileNav from '@/components/ytmusic/YtMobileNav';
import DesktopFullPlayer from './DesktopFullPlayer';
import MobileFullPlayer from './MobileFullPlayer';
import { useAuth } from '@/context/AuthContext';
import { useAudioControls } from '@/components/audio/AudioProvider';
import { AuthModal } from '@/components/auth/AuthModal';
import { ContactModal } from '@/components/modals/ContactModal';
import OfflineBanner from './OfflineBanner';
import { SubscriptionModal } from '@/components/subscription/SubscriptionModal';
import { TrackLimitAdModal } from '@/components/ads/TrackLimitAdModal';
import AdSenseLoader from '@/components/ads/AdSenseLoader';
import PlayerStickyAd from '@/components/ads/PlayerStickyAd';
import { ListAdAnchorTracker } from '@/components/ads/ListAd';
import AdDebugPanel from '@/components/ads/AdDebugPanel';
import AddToPlaylistModal from '@/components/audio/AddToPlaylistModal';
import { OPEN_ADD_TO_PLAYLIST_EVENT } from '@/components/audio/playerActions';
import type { Track } from '@/components/admin/StudioProvider';
import '@/styles/ytmusic.css';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);
  const [isFullPlayerOpen, setIsFullPlayerOpen] = useState(false);
  const [isDesktopExpanded, setIsDesktopExpanded] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMobileDrawerOpen, setIsMobileDrawerOpen] = useState(false);
  const [playlistTrack, setPlaylistTrack] = useState<Track | null>(null);

  const { title, isAdModalOpen, setIsAdModalOpen } = useAudioControls();
  const { isAuthModalOpen, setIsAuthModalOpen, isSubscriptionModalOpen, setIsSubscriptionModalOpen } = useAuth();

  useEffect(() => {
    setIsMobileDrawerOpen(false);
  }, [pathname]);

  // "Save to playlist" from any player menu
  useEffect(() => {
    const open = (e: Event) => setPlaylistTrack((e as CustomEvent<Track>).detail || null);
    window.addEventListener(OPEN_ADD_TO_PLAYLIST_EVENT, open);
    return () => window.removeEventListener(OPEN_ADD_TO_PLAYLIST_EVENT, open);
  }, []);

  // SCROLL GUARD: AdSense responsive ads set inline "height: auto !important"
  // (and overflow rules) on the elements above them. The page scrolls inside
  // .yt-main-content-scroll while html/body are locked, so those inline rules
  // froze scrolling. Strip only those inline sizing rules from the app shell.
  useEffect(() => {
    if (!mounted) return; // the app shell isn't rendered before mount
    const HEIGHT_PROPS = ['height', 'min-height', 'max-height'];
    const SHELL_PROPS = [...HEIGHT_PROPS, 'overflow', 'overflow-y'];
    const shell = ['.yt-app-layout', '.yt-app-body-wrap', '.yt-main-content-scroll']
      .map((sel) => document.querySelector(sel))
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
  }, [mounted, pathname]);

  useEffect(() => {
    setMounted(true);
    // Pick up a new service worker so old cached builds don't linger
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.getRegistrations().then((regs) => regs.forEach((reg) => reg.update())).catch(() => {});
    }
    const isPWA =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as { standalone?: boolean }).standalone === true;
    if (isPWA) {
      document.body.classList.add('pwa-standalone');
    }
  }, []);

  useEffect(() => {
    const checkUpgradeHash = () => {
      if (window.location.hash === '#upgrade') {
        setIsSubscriptionModalOpen(true);
      }
    };
    checkUpgradeHash();
    window.addEventListener('hashchange', checkUpgradeHash);
    return () => window.removeEventListener('hashchange', checkUpgradeHash);
  }, [setIsSubscriptionModalOpen]);

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

  const isNoLayout = pathname?.startsWith('/admin') || pathname === '/sa-login';

  if (!mounted) {
    return <div className="layout-stabilizer" style={{ background: '#030303', height: '100vh', width: '100vw' }} />;
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

  const handleToggleSidebar = () => {
    if (typeof window !== 'undefined' && window.innerWidth <= 768) {
      setIsMobileDrawerOpen((prev) => !prev);
    } else {
      setIsSidebarCollapsed((prev) => !prev);
    }
  };

  return (
    <div className="yt-app-layout yt-music-app-body">
      <AdSenseLoader />
      <ListAdAnchorTracker />
      <AdDebugPanel />
      <OfflineBanner />

      {/* YouTube Music Header */}
      <YtHeader
        onToggleSidebar={handleToggleSidebar}
      />

      {/* Main Body Wrap: Sidebar + Main Content Page */}
      <div className="yt-app-body-wrap">
        <YtSidebar
          isCollapsed={isSidebarCollapsed}
          isOpenMobile={isMobileDrawerOpen}
          onCloseMobile={() => setIsMobileDrawerOpen(false)}
        />

        <main className="yt-main-content-scroll">
          {children}
        </main>
      </div>

      {/* Sticky Ad Banner above Player Bar (Free Users) */}
      {!isFullPlayerOpen && !isDesktopExpanded && <PlayerStickyAd />}

      {/* YouTube Music Player Bar */}
      <YtPlayerBar onExpandPlayer={handleExpand} />

      {/* Mobile 5-Tab Navigation Bar */}
      <YtMobileNav />

      {/* Modals */}
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

      <ContactModal />
      <AddToPlaylistModal
        isOpen={!!playlistTrack}
        onClose={() => setPlaylistTrack(null)}
        track={playlistTrack}
      />

      {/* Mobile Full Screen Player */}
      <MobileFullPlayer
        isOpen={isFullPlayerOpen}
        onClose={() => setIsFullPlayerOpen(false)}
      />

      {/* Desktop Web Full Player Overlay */}
      {isDesktopExpanded && (
        <DesktopFullPlayer
          onClose={() => setIsDesktopExpanded(false)}
        />
      )}
    </div>
  );
}
