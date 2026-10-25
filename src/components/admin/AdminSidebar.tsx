"use client";

import React, { useState, useEffect, useCallback } from 'react';
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
  Tag,
  Send,
  Upload,
  HardDrive,
  RefreshCw
} from 'lucide-react';
import { useNewInquiries } from '@/hooks/useNewInquiries';

type NavItem = { icon: React.ReactNode; label: string; href: string; badge?: string };
type NavSection = { title?: string; items: NavItem[] };

interface StorageInfo {
  usedGb: number;
  totalGb: number;
  percent: number;
  freeGb: number;
  fileCount: number;
}

const AdminSidebar = ({ isCollapsed, onToggle }: { isCollapsed: boolean, onToggle: () => void }) => {
  const pathname = usePathname();
  const router = useRouter();
  const unreadCount = useNewInquiries();
  const [storage, setStorage] = useState<StorageInfo | null>(null);
  const [isRefreshingStorage, setIsRefreshingStorage] = useState(false);

  const fetchStorage = useCallback(async (refresh = false) => {
    try {
      if (refresh) setIsRefreshingStorage(true);
      const res = await fetch(`/api/admin/storage${refresh ? '?refresh=1' : ''}`, {
        credentials: 'same-origin',
        cache: 'no-store'
      });
      if (res.ok) {
        const data = await res.json();
        setStorage(data);
      }
    } catch (err) {
      console.error('Failed to fetch storage info:', err);
    } finally {
      setIsRefreshingStorage(false);
    }
  }, []);

  useEffect(() => {
    fetchStorage();
  }, [fetchStorage]);

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
        { icon: <Coins size={20} />, label: 'Earn & Premium', href: '/admin/earn' },
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
        {/* Storage Indicator */}
        {!isCollapsed ? (
          <div className="sidebar-storage">
            <div className="storage-header">
              <div className="storage-title-wrap">
                <HardDrive size={13} style={{ color: '#a1a1aa' }} />
                <span>Cloud Storage</span>
              </div>
              <button
                type="button"
                className={`storage-refresh-btn ${isRefreshingStorage ? 'spinning' : ''}`}
                onClick={() => fetchStorage(true)}
                title="Refresh storage size"
              >
                <RefreshCw size={11} />
              </button>
            </div>

            <div className="storage-bar-bg">
              <div
                className="storage-bar-fill"
                style={{
                  width: `${storage ? Math.max(3, storage.percent) : 0}%`,
                  background:
                    !storage || storage.percent < 80
                      ? 'linear-gradient(90deg, #1db954 0%, #10b981 100%)'
                      : storage.percent < 90
                      ? 'linear-gradient(90deg, #f59e0b 0%, #fbbf24 100%)'
                      : 'linear-gradient(90deg, #ef4444 0%, #f87171 100%)',
                }}
              />
            </div>

            <div className="storage-footer">
              <span className="storage-used">
                {storage ? `${storage.usedGb} GB` : '—'} / {storage?.totalGb ?? 10} GB
              </span>
              <span className="storage-percent">
                {storage ? `${storage.percent}%` : '...'}
              </span>
            </div>
          </div>
        ) : (
          <div
            className="sidebar-storage-collapsed"
            onClick={() => fetchStorage(true)}
            title={storage ? `Storage: ${storage.usedGb} GB / ${storage.totalGb} GB (${storage.percent}% used)` : 'Cloud Storage'}
          >
            <div className="icon-container" style={{ position: 'relative' }}>
              <HardDrive size={20} />
              {storage && (
                <span
                  className="storage-collapsed-dot"
                  style={{
                    backgroundColor:
                      storage.percent < 80 ? '#10b981' : storage.percent < 90 ? '#f59e0b' : '#ef4444',
                  }}
                />
              )}
            </div>
          </div>
        )}

        <button onClick={handleLogout} className="logout-button" title={isCollapsed ? "Logout" : undefined}>
          <div className="icon-container"><LogOut size={20} /></div>
          {!isCollapsed && <span className="nav-label">Logout</span>}
        </button>
      </div>
    </aside>
  );
};

export default AdminSidebar;
