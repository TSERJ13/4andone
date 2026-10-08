"use client";

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Trophy, Search, Library, Sparkles } from 'lucide-react';

export default function YtMobileNav() {
  const pathname = usePathname();

  const tabs = [
    { label: 'Home', href: '/', icon: Home },
    { label: 'Finals', href: '/library/finals', icon: Trophy },
    { label: 'Search', href: '/search', icon: Search },
    { label: 'Library', href: '/library', icon: Library },
    { label: 'Upgrade', href: '/#upgrade', icon: Sparkles },
  ];

  return (
    <nav className="yt-mobile-bottom-nav">
      {tabs.map((tab) => {
        const Icon = tab.icon;
        const isActive = pathname === tab.href;
        return (
          <Link
            key={tab.label}
            href={tab.href}
            className={`yt-mobile-tab-btn ${isActive ? 'active' : ''}`}
          >
            <Icon size={22} className="yt-mobile-tab-icon" />
            <span className="yt-mobile-tab-label">{tab.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
