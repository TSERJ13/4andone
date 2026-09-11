"use client";

import React, { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import Sidebar from "@/components/layout/Sidebar";
import MobileNav from "@/components/layout/MobileNav";
import PlayerBar from "@/components/layout/PlayerBar";
import { useAuth } from '@/context/AuthContext';
import { useAudio } from '@/components/audio/AudioProvider';
import { useVisitTracker } from '@/hooks/useVisitTracker';
import { AuthModal } from '@/components/auth/AuthModal';
import { KofiModal } from '@/components/kofi/KofiModal';
import MobileFullPlayer from './MobileFullPlayer';
import DesktopFullPlayer from './DesktopFullPlayer';
import OfflineBanner from './OfflineBanner';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);
  const [isFullPlayerOpen, setIsFullPlayerOpen] = useState(false);
  const [isDesktopExpanded, setIsDesktopExpanded] = useState(false);

  // Hooks must ALWAYS be at the top level and in the same order
  useVisitTracker(); // Track one visit per session
  const { title } = useAudio();
  const { isAuthModalOpen, setIsAuthModalOpen } = useAuth();
  
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
      const CURRENT_VERSION = '4andone-cache-v6';
      const lastVersion = localStorage.getItem('4andone_pwa_version');
      if (lastVersion !== CURRENT_VERSION) {
        caches.keys().then((keys) => {
          return Promise.all(
            keys.map((key) => {
              if (
                key.includes('static-style-assets') ||
                key.includes('start-url') ||
                key.includes('others') ||
                key.includes('next-data')
              ) {
                return caches.delete(key);
              }
            })
          );
        }).then(() => {
          localStorage.setItem('4andone_pwa_version', CURRENT_VERSION);
        });
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

      <KofiModal />
      
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
