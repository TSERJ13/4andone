"use client";

import React, { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import Sidebar from "@/components/layout/Sidebar";
import MobileNav from "@/components/layout/MobileNav";
import PlayerBar from "@/components/layout/PlayerBar";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);
  
  useEffect(() => {
    setMounted(true);
  }, []);

  const isNoLayout = pathname.startsWith('/admin') || pathname === '/sa-login';

  // Prevent hydration "jitter" by delaying the layout render until the client state is ready
  if (!mounted) {
    return <div className="layout-stabilizer" style={{ background: '#000', height: '100vh', width: '100vw' }} />;
  }

  if (isNoLayout) {
    return <div className="admin-root-wrapper">{children}</div>;
  }

  return (
    <div className="app-container">
      <Sidebar />
      <main className="main-content">
        {children}
      </main>
      <PlayerBar />
      <MobileNav />
    </div>
  );
}
