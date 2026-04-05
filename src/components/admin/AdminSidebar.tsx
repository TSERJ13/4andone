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
  Cpu,
  LogOut,
  Activity,
  Database
} from 'lucide-react';
import { useStudio } from './StudioProvider';

const AdminSidebar = () => {
  const pathname = usePathname();
  const { tracks, stats } = useStudio();

  const menuItems = [
    { icon: <LayoutDashboard size={22} />, label: 'Dashboard', href: '/admin/dashboard' },
    { icon: <Music size={22} />, label: 'Library', href: '/admin/library' },
    { icon: <Folders size={22} />, label: 'Folders', href: '/admin/folders' },
    { icon: <Cpu size={22} />, label: 'AI Processing', href: '/admin/ai' },
    { icon: <BarChart3 size={22} />, label: 'Analytics', href: '/admin/analytics' },
    { icon: <Settings size={22} />, label: 'Settings', href: '/admin/settings' },
  ];

  return (
    <aside className="admin-sidebar glass">

      <nav className="admin-nav">
        {menuItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={`admin-nav-item ${pathname === item.href ? 'active' : ''}`}
          >
            <div className="icon-box">{item.icon}</div>
            <span>{item.label}</span>
          </Link>
        ))}
      </nav>

      <div className="admin-status-modules">
        <div className="status-item glass">
          <div className="status-icon"><Activity size={14} className="text-primary" /></div>
          <div className="status-info">
            <span className="s-label">Studio Status</span>
            <span className="s-value">Operational</span>
          </div>
        </div>
        <div className="status-item glass">
          <div className="status-icon"><Database size={14} className="text-primary" /></div>
          <div className="status-info">
            <span className="s-label">Storage</span>
            <span className="s-value">{stats.storageUsed} • {tracks.length} Tracks</span>
          </div>
        </div>
      </div>

      <div className="admin-sidebar-footer">
        <Link href="/" className="admin-nav-item logout">
          <LogOut size={20} />
          <span>Exit Studio</span>
        </Link>
      </div>

      <style jsx>{`
        .admin-sidebar {
          padding: 32px 16px;
          display: flex;
          flex-direction: column;
          gap: 32px;
          background: rgba(9, 9, 11, 0.4);
        }

        .admin-nav-header {
          padding: 0 12px;
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .brand-text { display: flex; flex-direction: column; }
        .admin-brand-main { font-size: 20px; font-weight: 900; letter-spacing: -1px; color: white; line-height: 1; }
        .admin-brand-sub { font-size: 10px; font-weight: 700; color: #1db954; text-transform: uppercase; letter-spacing: 1px; }

        .admin-nav { display: flex; flex-direction: column; gap: 4px; }
        .admin-nav-item {
          display: flex; align-items: center; gap: 14px; padding: 12px 16px; border-radius: 12px;
          color: #a1a1aa; font-size: 14px; font-weight: 600; transition: all 0.2s;
        }
        .admin-nav-item:hover { color: white; background: rgba(255, 255, 255, 0.05); }
        .admin-nav-item.active { color: #1db954; background: rgba(29, 185, 84, 0.1); }

        .admin-status-modules { display: flex; flex-direction: column; gap: 12px; margin-top: auto; padding: 0 8px; }
        .status-item { display: flex; align-items: center; gap: 12px; padding: 12px; border-radius: 14px; border: 1px solid rgba(255,255,255,0.03); }
        .status-icon { width: 32px; height: 32px; border-radius: 10px; background: rgba(255,255,255,0.03); display: flex; align-items: center; justify-content: center; }
        .status-info { display: flex; flex-direction: column; }
        .s-label { font-size: 10px; font-weight: 800; color: #71717a; text-transform: uppercase; letter-spacing: 0.5px; }
        .s-value { font-size: 12px; font-weight: 700; color: white; }

        .admin-sidebar-footer { border-top: 1px solid rgba(255, 255, 255, 0.05); padding-top: 24px; }
        .logout { color: #ef4444; }
        .logout:hover { color: white; background: #ef4444; }
        .text-primary { color: #1db954; }
      `}</style>
    </aside>
  );
};

export default AdminSidebar;
