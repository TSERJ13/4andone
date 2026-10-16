"use client";

import React from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  LayoutDashboard,
  Music,
  Disc,
  Folders,
  Settings,
  BarChart3,
  LogOut,
  ChevronLeft,
  ChevronRight,
  Users,
  Coins,
  Gift,
  Crown,
  Tag,
  Send,
  Upload
} from 'lucide-react';
import { useNewInquiries } from '@/hooks/useNewInquiries';

type NavItem = { icon: React.ReactNode; label: string; href: string; badge?: string };
type NavSection = { title?: string; items: NavItem[] };

const AdminSidebar = ({ isCollapsed, onToggle }: { isCollapsed: boolean, onToggle: () => void }) => {
  const pathname = usePathname();
  const router = useRouter();
  const unreadCount = useNewInquiries();

  const handleLogout = async () => {
    localStorage.removeItem('studio_auth'); // legacy flag
    try { await fetch('/api/admin/session', { method: 'DELETE', credentials: 'same-origin' }); } catch { /* ignore */ }
    router.push('/sa-login');
  };

  const sections: NavSection[] = [
    { items: [{ icon: <LayoutDashboard size={20} />, label: 'Overview', href: '/admin/dashboard' }] },
    {
      title: 'Music',
      items: [
        { icon: <Music size={20} />, label: 'Music Library', href: '/admin/library' },
        { icon: <Upload size={20} />, label: 'Upload Music', href: '/admin/upload' },
        { icon: <Disc size={20} />, label: 'Album Builder', href: '/admin/albums' },
        { icon: <Folders size={20} />, label: 'Dance Styles', href: '/admin/taxonomy' },
      ],
    },
    {
      title: 'Audience',
      items: [
        { icon: <Users size={20} />, label: 'Users', href: '/admin/users' },
        {
          icon: <Send size={20} />,
          label: 'Telegram Bot',
          href: '/admin/messages',
          badge: unreadCount > 0 ? String(unreadCount) : undefined,
        },
        { icon: <BarChart3 size={20} />, label: 'Statistics', href: '/admin/analytics' },
      ],
    },
    {
      title: 'Money',
      items: [
        { icon: <Coins size={20} />, label: 'Earn', href: '/admin/earn' },
        { icon: <Crown size={20} />, label: 'Premium', href: '/admin/premium' },
        { icon: <Tag size={20} />, label: 'Promo Codes', href: '/admin/promos' },
        { icon: <Gift size={20} />, label: 'Affiliates', href: '/admin/affiliates' },
      ],
    },
    { title: 'System', items: [{ icon: <Settings size={20} />, label: 'System & Settings', href: '/admin/settings' }] },
  ];

  return (
    <aside className={`admin-sidebar ${isCollapsed ? 'collapsed' : ''}`}>
      <div className="sidebar-header">
        <button className="toggle-btn" onClick={onToggle} aria-label={isCollapsed ? 'Expand menu' : 'Collapse menu'}>
          {isCollapsed ? <ChevronRight size={22} /> : <ChevronLeft size={22} />}
        </button>
      </div>

      <nav className="nav-list">
        {sections.map((section, i) => (
          <div key={section.title || `s${i}`} className="nav-section">
            {section.title && (isCollapsed ? <div className="nav-section-rule" /> : <div className="nav-section-title">{section.title}</div>)}
            {section.items.map((item) => {
              const active = pathname === item.href || (item.href !== '/admin/dashboard' && pathname.startsWith(item.href + '/'));
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  prefetch={false}
                  className={`nav-button ${active ? 'active' : ''}`}
                  title={isCollapsed ? item.label : undefined}
                  aria-current={active ? 'page' : undefined}
                >
                  <div className="icon-container" style={{ position: 'relative' }}>
                    {item.icon}
                    {isCollapsed && item.badge && <span className="sidebar-badge-dot" />}
                  </div>
                  {!isCollapsed && (
                    <>
                      <span className="nav-label">{item.label}</span>
                      {item.badge && <span className="nav-badge-pill" title="New inquiries">{item.badge}</span>}
                    </>
                  )}
                </Link>
              );
            })}
          </div>
        ))}
      </nav>

      <div className="sidebar-footer">
        <button onClick={handleLogout} className="logout-button" title={isCollapsed ? "Logout" : undefined}>
          <div className="icon-container"><LogOut size={20} /></div>
          {!isCollapsed && <span className="nav-label">Logout</span>}
        </button>
      </div>
    </aside>
  );
};

export default AdminSidebar;
