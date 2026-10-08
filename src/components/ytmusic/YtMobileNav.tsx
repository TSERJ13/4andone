"use client";

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Trophy, Search, Library, Sparkles } from 'lucide-react';

import { useAuth } from '@/context/AuthContext';

export default function YtMobileNav() {
  const pathname = usePathname();
  const { setIsSubscriptionModalOpen } = useAuth();

  const tabs = [
    { label: 'Home', href: '/', icon: Home },
    { label: 'Finals', href: '/library/finals', icon: Trophy },
    { label: 'Search', href: '/search', icon: Search },
    { label: 'Library', href: '/library', icon: Library },
    { label: 'Upgrade', href: '#upgrade', icon: Sparkles, onClick: () => setIsSubscriptionModalOpen(true) },
  ];

  return (
    <nav className="yt-mobile-bottom-nav">
      {tabs.map((tab) => {
        const Icon = tab.icon;
        const isActive = tab.href !== '#upgrade' && pathname === tab.href;
        if (tab.onClick) {
          return (
            <button
              key={tab.label}
              type="button"
              onClick={tab.onClick}
              className="yt-mobile-tab-btn"
            >
              <Icon size={22} className="yt-mobile-tab-icon" />
              <span className="yt-mobile-tab-label">{tab.label}</span>
            </button>
          );
        }
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
