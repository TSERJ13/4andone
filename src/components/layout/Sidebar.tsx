"use client";

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Home,
  Search,
  Library,
  PlusSquare,
  Heart,
  Music2,
  Flag
} from 'lucide-react';
import { useStudio } from "@/components/admin/StudioProvider";
import { useAuth } from '@/context/AuthContext';
import ConfirmModal from '@/components/admin/ConfirmModal';
import { useRouter } from 'next/navigation';

const Sidebar = () => {
  const pathname = usePathname();
  const router = useRouter();
  const isAdmin = pathname.startsWith('/admin');
  const { folders } = useStudio();
  const { isAuthenticated, setIsAuthModalOpen } = useAuth();
  const [showAuthPrompt, setShowAuthPrompt] = React.useState(false);

  const handleCreatePlaylist = () => {
    if (!isAuthenticated) {
      setShowAuthPrompt(true);
      return;
    }
    // If authenticated, we redirect to library where they can manage folders
    // or trigger a specific folder creation logic if we add it globally
    router.push('/library');
  };

  if (isAdmin) return null;

  const navItems = [
    { icon: <Home size={24} />, label: 'Home', href: '/' },
    { icon: <Search size={24} />, label: 'Search', href: '/search' },
    { icon: <Flag size={24} />, label: 'Final Mode', href: '/library/finals' },
    { icon: <Library size={24} />, label: 'Your Library', href: '/library' },
  ];

  const danceStyles = [
    { label: 'Samba', href: '/style/samba' },
    { label: 'Cha-cha-cha', href: '/style/cha-cha-cha' },
    { label: 'Rumba', href: '/style/rumba' },
    { label: 'Paso Doble', href: '/style/paso-doble' },
    { label: 'Jive', href: '/style/jive' },
  ];

  return (
    <aside className="sidebar">

      <nav className="nav-group">
        {navItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={`nav-item ${pathname === item.href ? 'active' : ''}`}
          >
            <div className="icon-box">{item.icon}</div>
            <span>{item.label}</span>
          </Link>
        ))}
      </nav>

      <nav className="nav-group" style={{ marginTop: '32px' }}>
        <p className="group-label">Library Highlights</p>
        <Link href="/library/favorites" className="nav-item">
          <Heart size={24} className="text-secondary" />
          <span>Liked Songs</span>
        </Link>
        {folders.map((folder) => (
          <Link
            key={folder.id}
            href={`/library/${folder.id}`}
            className={`nav-item ${pathname === `/library/${folder.id}` ? 'active' : ''}`}
          >
            <Music2 size={24} className="text-secondary" />
            <span>{folder.name}</span>
          </Link>
        ))}
      </nav>

      <div className="sidebar-footer">
        <button 
          className="create-playlist-btn glass"
          onClick={handleCreatePlaylist}
        >
          <PlusSquare size={20} />
          <span>Create Playlist</span>
        </button>
      </div>

      <ConfirmModal 
        isOpen={showAuthPrompt}
        title="Connect Telegram"
        message="Please sign in with Telegram to create playlists and sync your dance library across all your devices."
        confirmText="Login with Telegram"
        variant="primary"
        onClose={() => setShowAuthPrompt(false)}
        onConfirm={() => {
          setShowAuthPrompt(false);
          setIsAuthModalOpen(true);
        }}
      />

      <style jsx>{`
        .sidebar {
          display: flex;
          flex-direction: column;
          height: 100%;
          gap: 0;
        }

        .sidebar-header {
          padding: 8px 12px 24px;
        }

        .sidebar-footer {
          margin-top: auto;
          padding: 12px;
        }

        .create-playlist-btn {
          width: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 12px;
          padding: 14px;
          border-radius: 12px;
          font-weight: 700;
          font-size: 14px;
          color: white;
          border: 1px solid rgba(255, 255, 255, 0.1);
          transition: all 0.2s;
        }

        .create-playlist-btn:hover {
          background: rgba(255, 255, 255, 0.05);
          transform: translateY(-2px);
          border-color: var(--primary);
        }

        .group-label {
          padding: 0 12px;
          font-size: 11px;
          font-weight: 800;
          color: var(--text-secondary);
          text-transform: uppercase;
          letter-spacing: 1.5px;
          margin-bottom: 12px;
        }

        .icon-box {
          display: flex;
          align-items: center;
          justify-content: center;
          transition: transform 0.2s;
        }

        .nav-item:hover .icon-box {
          transform: scale(1.1);
        }

        .text-secondary {
          color: var(--text-secondary);
        }
      `}</style>
    </aside>
  );
};

export default Sidebar;
