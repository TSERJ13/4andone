"use client";

import React, { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import Sidebar from "@/components/layout/Sidebar";
import MobileNav from "@/components/layout/MobileNav";
import PlayerBar from "@/components/layout/PlayerBar";
import { AuthProvider, useAuth } from '@/context/AuthContext';
import { useAudio } from '@/components/audio/AudioProvider';
import { TelegramLogin } from '@/components/auth/TelegramLogin';
import { User, LogOut, ShieldCheck } from 'lucide-react';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);
  
  useEffect(() => {
    setMounted(true);
  }, []);

  const { isLoaded } = useAudio();

  const isNoLayout = pathname.startsWith('/admin') || pathname === '/sa-login';

  // Prevent hydration "jitter"
  if (!mounted) {
    return <div className="layout-stabilizer" style={{ background: '#000', height: '100vh', width: '100vw' }} />;
  }

  if (isNoLayout) {
    return <div className="admin-root-wrapper">{children}</div>;
  }

  return (
    <AuthProvider>
      <div className={`app-container ${isLoaded ? 'player-active' : ''}`}>
        <Sidebar />
        <main className="main-content">
          {children}
        </main>
        <PlayerBar />
        <MobileNav />
      </div>
    </AuthProvider>
  );
}
