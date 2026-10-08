"use client";

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Trophy, Library, Sparkles, Plus, Heart, Pin, X } from 'lucide-react';

import { useAuth } from '@/context/AuthContext';

interface YtSidebarProps {
  isCollapsed?: boolean;
  isOpenMobile?: boolean;
  onCloseMobile?: () => void;
}

const DANCE_PLAYLISTS = [
  { slug: 'cha-cha-cha', name: 'Cha Cha Cha Music' },
  { slug: 'samba', name: 'Samba Music' },
  { slug: 'rumba', name: 'Rumba Music' },
  { slug: 'paso-doble', name: 'Paso Doble Music' },
  { slug: 'jive', name: 'Jive Music' },
  { slug: 'slow-waltz', name: 'Slow Waltz Music' },
  { slug: 'tango', name: 'Tango Music' },
  { slug: 'viennese-waltz', name: 'Viennese Waltz' },
  { slug: 'slow-foxtrot', name: 'Slow Foxtrot' },
  { slug: 'quickstep', name: 'Quickstep' },
];

export default function YtSidebar({ isCollapsed = false, isOpenMobile = false, onCloseMobile }: YtSidebarProps) {
  const pathname = usePathname();

  const navItems = [
    { label: 'Home', href: '/', icon: Home },
    { label: 'Final Mode', href: '/library/finals', icon: Trophy },
    { label: 'Library', href: '/library', icon: Library },
    { label: 'Upgrade', href: '/upgrade', icon: Sparkles },
  ];

  return (
    <>
      {/* Mobile Drawer Dark Backdrop Overlay */}
      <div
        className={`yt-sidebar-backdrop ${isOpenMobile ? 'active' : ''}`}
        onClick={onCloseMobile}
      />

      <aside className={`yt-sidebar ${isCollapsed ? 'collapsed' : ''} ${isOpenMobile ? 'mobile-open' : ''}`}>
        {/* Mobile Header Inside Drawer */}
        {isOpenMobile && (
          <div className="yt-sidebar-mobile-header">
            <Link href="/" className="yt-logo-brand-link" onClick={onCloseMobile}>
              <img
                src="/logo-3d.png"
                alt="4and.one Music"
                style={{ height: '44px', width: 'auto', objectFit: 'contain' }}
              />
            </Link>
            <button
              type="button"
              className="yt-icon-btn"
              onClick={onCloseMobile}
              aria-label="Close menu"
            >
              <X size={22} />
            </button>
          </div>
        )}

        {/* Top Nav Links */}
        <nav className="yt-sidebar-main-nav">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.label}
                href={item.href}
                className={`yt-nav-item ${isActive ? 'active' : ''}`}
                onClick={onCloseMobile}
              >
                <Icon size={20} className="yt-nav-icon" />
                <span className="yt-nav-label">{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {(!isCollapsed || isOpenMobile) && (
          <>
            <div className="yt-sidebar-divider" />

            {/* New Playlist Action */}
            <div className="yt-sidebar-action-row">
              <button type="button" className="yt-btn-new-playlist">
                <Plus size={18} />
                <span>New playlist</span>
              </button>
            </div>

            {/* Playlists & Dance Categories List */}
            <div className="yt-sidebar-playlist-section">
              <Link
                href="/library/favorites"
                className={`yt-playlist-item ${pathname === '/library/favorites' ? 'active' : ''}`}
                onClick={onCloseMobile}
              >
                <div className="yt-playlist-icon-pin">
                  <Heart size={14} fill="#ffffff" color="#ffffff" />
                </div>
                <div className="yt-playlist-meta">
                  <span className="yt-playlist-title">Liked Music</span>
                  <span className="yt-playlist-sub">Auto playlist • <Pin size={10} className="inline-pin" /></span>
                </div>
              </Link>

              {DANCE_PLAYLISTS.map((pl) => {
                const href = `/style/${pl.slug}`;
                const isActive = pathname === href;
                return (
                  <Link
                    key={pl.slug}
                    href={href}
                    className={`yt-playlist-item ${isActive ? 'active' : ''}`}
                    onClick={onCloseMobile}
                  >
                    <div className="yt-playlist-meta">
                      <span className="yt-playlist-title">{pl.name}</span>
                      <span className="yt-playlist-sub">4andone Music</span>
                    </div>
                  </Link>
                );
              })}
            </div>
          </>
        )}
      </aside>
    </>
  );
}
