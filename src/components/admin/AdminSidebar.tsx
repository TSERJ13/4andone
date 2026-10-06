"use client";

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
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
  Mail,
  Coins
} from 'lucide-react';
import { useStudio } from './StudioProvider';
import { useRouter } from 'next/navigation';
import { supabase } from '@/utils/supabase';
import { adminDb } from '@/lib/admin-db';

const AdminSidebar = ({ isCollapsed, onToggle }: { isCollapsed: boolean, onToggle: () => void }) => {
  const pathname = usePathname();
  const router = useRouter();
  const { tracks, stats } = useStudio();
  const [unreadCount, setUnreadCount] = useState<number>(0);

  const fetchUnreadMessagesCount = useCallback(async () => {
    try {
      const [{ data: rawMessages }, { data: delRows }] = await Promise.all([
        adminDb
          .from('track_plays')
          .select('id')
          .eq('event_type', 'contact_message'),
        supabase
          .from('folders')
          .select('color')
          .eq('name', '__deleted_msg__')
      ]);

      const deletedIds = new Set((delRows || []).map(r => r.color));
      const activeCount = (rawMessages || []).filter((m: { id: string }) => !deletedIds.has(m.id)).length;
      setUnreadCount(activeCount);
    } catch (err) {
      console.error('Failed to fetch unread messages count:', err);
    }
  }, []);

  useEffect(() => {
    fetchUnreadMessagesCount();
    const interval = setInterval(fetchUnreadMessagesCount, 20000);

    // Subscribe to realtime changes on track_plays and folders
    const channel = supabase
      .channel('admin_sidebar_messages')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'track_plays' }, () => {
        fetchUnreadMessagesCount();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'folders' }, () => {
        fetchUnreadMessagesCount();
      })
      .subscribe();

    return () => {
      clearInterval(interval);
      supabase.removeChannel(channel);
    };
  }, [fetchUnreadMessagesCount]);

  const handleLogout = async () => {
    localStorage.removeItem('studio_auth'); // legacy flag
    try { await fetch('/api/admin/session', { method: 'DELETE', credentials: 'same-origin' }); } catch { /* ignore */ }
    router.push('/sa-login');
  };

  const menuItems = [
    { icon: <LayoutDashboard size={24} />, label: 'Overview', href: '/admin/dashboard' },
    { icon: <Coins size={24} />, label: 'EARN', href: '/admin/earn' },
    { icon: <Music size={24} />, label: 'Music Library', href: '/admin/library' },
    { icon: <Disc size={24} />, label: 'Album Builder', href: '/admin/albums' },
    { icon: <Folders size={24} />, label: 'Dance Styles', href: '/admin/taxonomy' },
    { icon: <Users size={24} />, label: 'Users', href: '/admin/users' },
    { 
      icon: <Mail size={24} />, 
      label: 'Messages', 
      href: '/admin/messages',
      badge: unreadCount > 0 ? `+${unreadCount}` : undefined
    },
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
            <div className="icon-container" style={{ position: 'relative' }}>
              {item.icon}
              {isCollapsed && item.badge && (
                <span className="sidebar-badge-dot" />
              )}
            </div>
            {!isCollapsed && (
              <>
                <span className="nav-label">{item.label}</span>
                {item.badge && (
                  <span className="nav-badge-pill">{item.badge}</span>
                )}
              </>
            )}
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
