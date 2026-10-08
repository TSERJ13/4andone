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
import { ListAdAnchorTracker } from '@/components/ads/ListAd';
import AdDebugPanel from '@/components/ads/AdDebugPanel';
import '@/styles/ytmusic.css';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);
  const [isFullPlayerOpen, setIsFullPlayerOpen] = useState(false);
  const [isDesktopExpanded, setIsDesktopExpanded] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  const { title, isAdModalOpen, setIsAdModalOpen } = useAudioControls();
  const { isAuthModalOpen, setIsAuthModalOpen, isSubscriptionModalOpen, setIsSubscriptionModalOpen } = useAuth();

  useEffect(() => {
    setMounted(true);
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

  return (
    <div className="yt-app-layout yt-music-app-body">
      <AdSenseLoader />
      <ListAdAnchorTracker />
      <AdDebugPanel />
      <OfflineBanner />

      {/* YouTube Music Header */}
      <YtHeader
        onToggleSidebar={() => setIsSidebarCollapsed((prev) => !prev)}
      />

      {/* Main Body Wrap: Sidebar + Main Content Page */}
      <div className="yt-app-body-wrap">
        <YtSidebar isCollapsed={isSidebarCollapsed} />

        <main className="yt-main-content-scroll">
          {children}
        </main>
      </div>

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
