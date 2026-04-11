"use client";

import React, { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import Sidebar from "@/components/layout/Sidebar";
import MobileNav from "@/components/layout/MobileNav";
import PlayerBar from "@/components/layout/PlayerBar";
import { useAuth } from '@/context/AuthContext';
import { useAudio } from '@/components/audio/AudioProvider';
import { TelegramLogin } from '@/components/auth/TelegramLogin';
import { User, LogOut, ShieldCheck } from 'lucide-react';
import { useVisitTracker } from '@/hooks/useVisitTracker';
import { AuthModal } from '@/components/auth/AuthModal';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);
  
  useEffect(() => {
    setMounted(true);
  }, []);

  useVisitTracker(); // Track one visit per session

  const { title } = useAudio();
  const { isAuthModalOpen, setIsAuthModalOpen } = useAuth();

  const isNoLayout = pathname?.startsWith('/admin') || pathname === '/sa-login';
  const isPlayerActive = title !== "No Track Selected";

  // Prevent hydration "jitter" - Restoring the beautiful loading sequence
  if (!mounted) {
    return <div className="layout-stabilizer" style={{ background: '#000', height: '100vh', width: '100vw' }} />;
  }

  // Bypass public site layout for Admin pages
  // This allows the Admin layout to take 100% width and manage its own sidebar
  if (isNoLayout) {
    return <>{children}</>;
  }

  return (
    <div className={`app-container ${mounted && isPlayerActive ? 'player-active' : ''}`}>
      <Sidebar />
      <main className="main-content">
        {children}
      </main>
      <PlayerBar />
      <MobileNav />
      <AuthModal 
        isOpen={isAuthModalOpen} 
        onClose={() => setIsAuthModalOpen(false)} 
      />
    </div>
  );
}
