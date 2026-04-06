"use client";

import React, { useState } from 'react';
import Sidebar from "@/components/admin/AdminSidebar";
import { usePathname, useRouter } from 'next/navigation';
import { Menu, X } from 'lucide-react';
import { useEffect } from 'react';
import './admin.css';
export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isAuthChecking, setIsAuthChecking] = useState(true);

  const isLoginPage = pathname === '/sa-login';

  useEffect(() => {
    const auth = localStorage.getItem('studio_auth');
    if (!auth && !isLoginPage) {
      router.push('/sa-login');
    } else {
      setIsAuthChecking(false);
    }
  }, [pathname, isLoginPage, router]);

  const pathParts = pathname.split('/').filter(Boolean);
  const breadcrumbs = pathParts.map((part: string, index: number) => {
    const href = '/' + pathParts.slice(0, index + 1).join('/');
    const label = part.charAt(0).toUpperCase() + part.slice(1).replace(/-/g, ' ');
    return { label, href };
  });

  const toggleSidebar = () => setIsSidebarOpen(!isSidebarOpen);
  const toggleCollapse = () => setIsCollapsed(!isCollapsed);

  if (isAuthChecking && !isLoginPage) {
    return <div className="auth-loader"><div className="loader"></div></div>;
  }

  // If we are on the login page, don't show the sidebar or header
  if (isLoginPage) {
    return <div className="admin-login-layout">{children}</div>;
  }

  return (
    <div className="admin-layout">
        {/* Sidebar Overlay for Mobile */}
        {isSidebarOpen && <div className="sidebar-overlay" onClick={toggleSidebar}></div>}

        <div className={`sidebar-wrapper ${isSidebarOpen ? 'open' : ''} ${isCollapsed ? 'collapsed' : ''}`}>
          <Sidebar isCollapsed={isCollapsed} onToggle={toggleCollapse} />
        </div>

        <div className="admin-content">
          <header className="admin-header glass">
            <div className="header-left">
              <button className="sidebar-toggle-btn glass" onClick={toggleSidebar}>
                {isSidebarOpen ? <X size={20} /> : <Menu size={20} />}
              </button>
              <div className="admin-breadcrumb">
                {breadcrumbs.map((bc: any, i: number) => (
                  <React.Fragment key={bc.href}>
                    <span className={i === breadcrumbs.length - 1 ? 'bc-current' : 'bc-link'}>
                      {bc.label}
                    </span>
                    {i < breadcrumbs.length - 1 && <span className="bc-separator">/</span>}
                  </React.Fragment>
                ))}
              </div>
            </div>
            <div className="admin-user-profile">
              <div className="user-info">
                <span className="user-email">4andonestudio@gmail.com</span>
                <span className="user-role">Studio Administrator</span>
              </div>
              <div className="user-avatar glass">A</div>
            </div>
          </header>
          <main className="admin-main">
              {children}
          </main>
        </div>

// css imported above
    </div>
  );
}
