"use client";

import React from 'react';
import { usePathname } from 'next/navigation';
import Sidebar from "@/components/layout/Sidebar";
import MobileNav from "@/components/layout/MobileNav";
import PlayerBar from "@/components/layout/PlayerBar";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isNoLayout = pathname.startsWith('/admin') || pathname === '/sa-login';

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
