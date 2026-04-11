"use client";

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Music,
  Folders,
  Settings,
  BarChart3,
  LogOut,
  ChevronLeft,
  ChevronRight,
  Users
} from 'lucide-react';
import { useStudio } from './StudioProvider';
import { useRouter } from 'next/navigation';

const AdminSidebar = ({ isCollapsed, onToggle }: { isCollapsed: boolean, onToggle: () => void }) => {
  const pathname = usePathname();
  const router = useRouter();
  const { tracks, stats } = useStudio();

  const handleLogout = () => {
    localStorage.removeItem('studio_auth');
    router.push('/sa-login');
  };

  const menuItems = [
    { icon: <LayoutDashboard size={24} />, label: 'Overview', href: '/admin/dashboard' },
    { icon: <Music size={24} />, label: 'Music Library', href: '/admin/library' },
    { icon: <Folders size={24} />, label: 'Dance Styles', href: '/admin/taxonomy' },
    { icon: <Users size={24} />, label: 'Users', href: '/admin/users' },
    { icon: <BarChart3 size={24} />, label: 'Statistics', href: '/admin/analytics' },
    { icon: <Settings size={24} />, label: 'Studio Settings', href: '/admin/settings' },
  ];

  return (
    <aside className={`admin-sidebar ${isCollapsed ? 'collapsed' : ''}`}>
      <div className="sidebar-header">
        <button className="toggle-btn" onClick={onToggle}>
          {isCollapsed ? <ChevronRight size={22} /> : <ChevronLeft size={22} />}
        </button>
      </div>

      <nav className="nav-list">
        {menuItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={`nav-button ${pathname === item.href ? 'active' : ''}`}
            title={isCollapsed ? item.label : undefined}
          >
            <div className="icon-container">{item.icon}</div>
            {!isCollapsed && <span className="nav-label">{item.label}</span>}
          </Link>
        ))}
      </nav>

      <div className="sidebar-footer">
        <button onClick={handleLogout} className="logout-button" title={isCollapsed ? "Logout" : undefined}>
          <div className="icon-container"><LogOut size={24} /></div>
          {!isCollapsed && <span className="nav-label">Logout</span>}
        </button>
      </div>

    </aside>
  );
};

export default AdminSidebar;
