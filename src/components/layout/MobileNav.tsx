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
          bottom: 16px;
          left: 16px;
          right: 16px;
          height: 64px;
          z-index: 1000;
          display: flex;
          align-items: center;
          justify-content: space-around;
          background: rgba(18, 18, 18, 0.8);
          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 20px;
          box-shadow: 0 10px 40px rgba(0, 0, 0, 0.3);
          padding: 0 8px;
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
          justify-content: center;
          gap: 4px;
          color: rgba(255, 255, 255, 0.5);
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          flex: 1;
          height: 100%;
          position: relative;
        }

        .mobile-nav-item span {
          font-size: 10px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .mobile-nav-item.active {
          color: var(--primary);
          transform: translateY(-4px);
        }

        .mobile-nav-item.active::after {
          content: '';
          position: absolute;
          bottom: 10px;
          width: 4px;
          height: 4px;
          background: var(--primary);
          border-radius: 50%;
          box-shadow: 0 0 10px var(--primary);
        }
      `}</style>
    </>
  );
};

export default MobileNav;
