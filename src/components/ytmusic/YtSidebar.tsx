"use client";

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Compass, Library, Sparkles, Plus, Heart, Music2, Pin } from 'lucide-react';
import { displayStyleName } from '@/utils/styleNames';
import { normalizeDanceSlug } from '@/utils/seo';

interface YtSidebarProps {
  isCollapsed?: boolean;
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

export default function YtSidebar({ isCollapsed = false }: YtSidebarProps) {
  const pathname = usePathname();

  const navItems = [
    { label: 'Home', href: '/', icon: Home },
    { label: 'Explore', href: '/library', icon: Compass },
    { label: 'Library', href: '/library/favorites', icon: Library },
    { label: 'Upgrade', href: '/#upgrade', icon: Sparkles },
  ];

  return (
    <aside className={`yt-sidebar ${isCollapsed ? 'collapsed' : ''}`}>
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
            >
              <Icon size={20} className="yt-nav-icon" />
              {!isCollapsed && <span className="yt-nav-label">{item.label}</span>}
            </Link>
          );
        })}
      </nav>

      {!isCollapsed && (
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
  );
}
