"use client";

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Search, Library, User, Flag } from 'lucide-react';
import MobileMiniPlayer from './MobileMiniPlayer';

const MobileNav = () => {
  const pathname = usePathname();
  const isAdmin = pathname.startsWith('/admin');

  if (isAdmin) return null;

  const navItems = [
    { icon: <Home size={24} />, label: 'Home', href: '/' },
    { icon: <Search size={24} />, label: 'Search', href: '/search' },
    { icon: <Flag size={24} />, label: 'Finals', href: '/library/finals' },
    { icon: <Library size={24} />, label: 'Library', href: '/library' },
  ];

  return (
    <>
      <MobileMiniPlayer />
      <nav className="mobile-nav">
        {navItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={`mobile-nav-item ${pathname === item.href ? 'active' : ''}`}
          >
            {item.icon}
            <span>{item.label}</span>
          </Link>
        ))}
      </nav>

      <style jsx>{`
        .mobile-nav {
          display: none; /* Hidden by default (Desktop) */
          position: fixed;
          bottom: 0;
          left: 0;
          right: 0;
          height: 80px;
          z-index: 1000;
          padding: 0 16px;
          padding-bottom: env(safe-area-inset-bottom, 12px);
          align-items: center;
          justify-content: space-around;
          background: #000000;
          box-shadow: 0 -1px 0 rgba(255, 255, 255, 0.05);
        }

        @media (max-width: 768px) {
          .mobile-nav {
            display: flex; /* Visible on mobile */
          }
        }

        .mobile-nav-item {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 4px;
          color: var(--text-secondary);
          transition: all 0.2s;
        }

        .mobile-nav-item span {
          font-size: 10px;
          font-weight: 600;
          text-transform: uppercase;
        }

        .mobile-nav-item.active {
          color: var(--primary);
        }
      `}</style>
    </>
  );
};

export default MobileNav;
