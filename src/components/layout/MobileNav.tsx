"use client";

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Search, Library, User, Zap } from 'lucide-react';
import MobileMiniPlayer from './MobileMiniPlayer';

const MobileNav = ({ onExpand }: { onExpand: () => void }) => {
  const pathname = usePathname();
  const isAdmin = pathname.startsWith('/admin');

  if (isAdmin) return null;

  const navItems = [
    { icon: <Home size={20} />, label: 'Home', href: '/' },
    { icon: <Search size={20} />, label: 'Search', href: '/search' },
    { icon: <Zap size={20} />, label: 'Finals', href: '/library/finals' },
    { icon: <Library size={20} />, label: 'Library', href: '/library' },
  ];

  return (
    <>
      <MobileMiniPlayer onExpand={onExpand} />
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
    </>
  );
};

export default MobileNav;
