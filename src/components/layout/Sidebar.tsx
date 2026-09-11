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
  ArrowDownToLine,
  Music2,
  Zap,
  Info
} from 'lucide-react';
import { useStudio } from "@/components/admin/StudioProvider";
import { useAuth } from '@/context/AuthContext';
import ConfirmModal from '@/components/admin/ConfirmModal';
import CreatePlaylistModal from '@/components/library/CreatePlaylistModal';
import { useRouter } from 'next/navigation';

const Sidebar = () => {
  const pathname = usePathname();
  const router = useRouter();
  const isAdmin = pathname.startsWith('/admin');
  const { folders } = useStudio();
  const { isAuthenticated, setIsAuthModalOpen } = useAuth();
  const [showAuthPrompt, setShowAuthPrompt] = React.useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = React.useState(false);

  const handleCreatePlaylist = () => {
    if (!isAuthenticated) {
      setShowAuthPrompt(true);
      return;
    }
    setIsCreateModalOpen(true);
  };

  if (isAdmin) return null;

  const navItems = [
    { icon: <Home size={24} />, label: 'Home', href: '/' },
    { icon: <Search size={24} />, label: 'Search', href: '/search' },
    { icon: <Zap size={24} />, label: 'Final Mode', href: '/library/finals' },
    { icon: <Library size={24} />, label: 'Your Library', href: '/library' },
  ];

  const danceStyles = [
    { label: 'Samba', href: '/style/samba' },
    { label: 'Cha-Cha-Cha', href: '/style/cha-cha-cha' },
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
        <Link href="/library/favorites" className={`nav-item ${pathname === '/library/favorites' ? 'active' : ''}`}>
          <Heart size={24} className="text-secondary" />
          <span>Liked Songs</span>
        </Link>
        <Link href="/library/downloaded" className={`nav-item ${pathname === '/library/downloaded' ? 'active' : ''}`}>
          <ArrowDownToLine size={24} className="text-secondary" />
          <span>Downloaded</span>
        </Link>
        <button className="nav-item no-bg" onClick={handleCreatePlaylist} style={{ background: 'none', border: 'none', width: '100%', textAlign: 'left', padding: '12px' }}>
          <PlusSquare size={24} className="text-secondary" />
          <span>Create Playlist</span>
        </button>
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

      <CreatePlaylistModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSuccess={(newFolder) => router.push(`/library/${newFolder.id}`)}
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

        .nav-item.sub-nav {
          margin-left: 20px;
          opacity: 0.7;
          font-size: 13px;
          padding: 8px 12px;
        }

        .nav-item.sub-nav:hover {
          opacity: 1;
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
