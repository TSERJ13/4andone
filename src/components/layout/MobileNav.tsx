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
          bottom: 20px;
          left: 20px;
          right: 20px;
          height: 68px;
          z-index: 1000;
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          align-items: center;
          background: rgba(18, 18, 18, 0.75);
          backdrop-filter: blur(25px);
          -webkit-backdrop-filter: blur(25px);
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 24px;
          box-shadow: 0 12px 40px rgba(0, 0, 0, 0.5);
          padding: 0 4px;
        }

        @media (max-width: 768px) {
          .mobile-nav {
            display: grid; /* Visible on mobile */
          }
        }

        .mobile-nav-item {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          height: 100%;
          color: rgba(255, 255, 255, 0.4);
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          text-decoration: none;
          position: relative;
          gap: 6px;
        }

        .mobile-nav-item :global(svg) {
          transition: transform 0.3s ease;
          z-index: 2;
        }

        .mobile-nav-item span {
          font-size: 10px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.8px;
          transition: color 0.3s ease;
          z-index: 2;
        }

        /* The Button/Pill Highlight */
        .mobile-nav-item::before {
          content: '';
          position: absolute;
          top: 10%;
          left: 10%;
          right: 10%;
          bottom: 10%;
          background: rgba(255, 255, 255, 0.05);
          border-radius: 16px;
          opacity: 0;
          transform: scale(0.8);
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          z-index: 1;
        }

        .mobile-nav-item.active {
          color: var(--primary);
        }

        .mobile-nav-item.active::before {
          opacity: 1;
          transform: scale(1);
          background: rgba(29, 185, 84, 0.12);
        }

        .mobile-nav-item.active :global(svg) {
          transform: translateY(-2px);
          filter: drop-shadow(0 0 8px rgba(29, 185, 84, 0.4));
        }

        .mobile-nav-item.active span {
          color: var(--primary);
        }
      `}</style>
    </>
  );
};

export default MobileNav;
