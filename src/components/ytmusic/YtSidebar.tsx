"use client";

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Home, Trophy, Library, Sparkles, Plus, Heart, Pin, X, ListMusic, Download, MessageSquare, Smartphone } from 'lucide-react';

import { useAuth } from '@/context/AuthContext';
import { useStudio } from '@/components/admin/StudioProvider';
import CreatePlaylistModal from '@/components/library/CreatePlaylistModal';

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
  const router = useRouter();
  const { isAuthenticated, setIsAuthModalOpen } = useAuth();
  const { folders } = useStudio();
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  // Playlists are saved to the user's account, so creating one needs sign-in
  const handleNewPlaylist = () => {
    if (!isAuthenticated) {
      setIsAuthModalOpen(true);
      return;
    }
    setIsCreateOpen(true);
  };

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

            {/* New Playlist & Install App Action */}
            <div className="yt-sidebar-action-row" style={{ display: 'flex', gap: '8px' }}>
              <button type="button" className="yt-btn-new-playlist" onClick={handleNewPlaylist} style={{ flex: 1 }}>
                <Plus size={18} />
                <span>New playlist</span>
              </button>
              <button 
                type="button" 
                className="yt-btn-new-playlist" 
                title="Add 4ANDONE to Home Screen"
                onClick={() => {
                  window.dispatchEvent(new CustomEvent('open-pwa-install'));
                  if (onCloseMobile) onCloseMobile();
                }}
                style={{ background: 'rgba(168, 85, 247, 0.15)', border: '1px solid rgba(168, 85, 247, 0.3)', color: '#c084fc' }}
              >
                <Smartphone size={16} />
                <span>App</span>
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

              <Link
                href="/library/downloaded"
                className={`yt-playlist-item ${pathname === '/library/downloaded' ? 'active' : ''}`}
                onClick={onCloseMobile}
              >
                <div className="yt-playlist-icon-pin">
                  <Download size={14} color="#ffffff" />
                </div>
                <div className="yt-playlist-meta">
                  <span className="yt-playlist-title">Downloaded</span>
                  <span className="yt-playlist-sub">Offline on this device</span>
                </div>
              </Link>

              {/* The user's own playlists */}
              {isAuthenticated && folders.map((folder) => {
                const href = `/library/${folder.id}`;
                return (
                  <Link
                    key={folder.id}
                    href={href}
                    className={`yt-playlist-item ${pathname === href ? 'active' : ''}`}
                    onClick={onCloseMobile}
                  >
                    <div className="yt-playlist-icon-pin" style={{ background: folder.color || undefined }}>
                      <ListMusic size={14} color="#ffffff" />
                    </div>
                    <div className="yt-playlist-meta">
                      <span className="yt-playlist-title">{folder.name}</span>
                      <span className="yt-playlist-sub">Your playlist</span>
                    </div>
                  </Link>
                );
              })}

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

            <div className="yt-sidebar-divider" />
            <div className="yt-sidebar-action-row">
              <button
                type="button"
                className="yt-btn-new-playlist"
                onClick={() => {
                  onCloseMobile?.();
                  window.dispatchEvent(new CustomEvent('open-contact-modal'));
                }}
              >
                <MessageSquare size={18} />
                <span>Contact us</span>
              </button>
            </div>
          </>
        )}
      </aside>

      <CreatePlaylistModal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        onSuccess={(folder) => { onCloseMobile?.(); router.push(`/library/${folder.id}`); }}
      />
    </>
  );
}
