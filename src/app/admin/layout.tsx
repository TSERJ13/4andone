"use client";

import React, { useState } from 'react';
import Sidebar from "@/components/admin/AdminSidebar";
import { usePathname } from 'next/navigation';
import { Menu, X } from 'lucide-react';
export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const pathParts = pathname.split('/').filter(Boolean);
  const breadcrumbs = pathParts.map((part: string, index: number) => {
    const href = '/' + pathParts.slice(0, index + 1).join('/');
    const label = part.charAt(0).toUpperCase() + part.slice(1).replace(/-/g, ' ');
    return { label, href };
  });

  const toggleSidebar = () => setIsSidebarOpen(!isSidebarOpen);

  return (
    <div className="admin-layout">
        {/* Sidebar Overlay for Mobile */}
        {isSidebarOpen && <div className="sidebar-overlay" onClick={toggleSidebar}></div>}

        <div className={`sidebar-wrapper ${isSidebarOpen ? 'open' : ''}`}>
          <Sidebar />
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

        <style jsx>{`
        .admin-layout {
          display: flex;
          height: 100vh;
          width: 100vw;
          background: #000000;
          color: white;
          overflow: hidden;
        }

        .sidebar-wrapper {
          width: 280px;
          height: 100vh;
          flex-shrink: 0;
          transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
          z-index: 100;
        }

        .admin-content {
          flex: 1;
          display: flex;
          flex-direction: column;
          height: 100vh;
          min-width: 0;
          position: relative;
        }

        .admin-header {
          height: 72px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0 40px;
          border-bottom: 1px solid rgba(255, 255, 255, 0.05);
          background: rgba(9, 9, 11, 0.6);
          backdrop-filter: blur(20px);
          z-index: 50;
        }

        .header-left { display: flex; align-items: center; gap: 20px; }
        
        .sidebar-toggle-btn {
          width: 44px;
          height: 44px;
          display: none;
          align-items: center;
          justify-content: center;
          border-radius: 12px;
          transition: all 0.2s;
        }

        .admin-breadcrumb {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 13px;
          font-weight: 500;
        }

        .bc-link { color: #71717a; }
        .bc-current { color: white; font-weight: 700; }
        .bc-separator { color: #3f3f46; font-size: 10px; }

        .admin-user-profile {
          display: flex;
          align-items: center;
          gap: 16px;
        }

        .user-info { display: flex; flex-direction: column; align-items: flex-end; }
        .user-email { font-size: 13px; font-weight: 600; }
        .user-role { font-size: 10px; color: #1db954; text-transform: uppercase; font-weight: 800; letter-spacing: 0.5px; }

        .user-avatar {
          width: 36px;
          height: 36px;
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 14px;
          background: #1db954;
          color: black;
          font-weight: 900;
        }

        .admin-main {
          flex: 1;
          overflow-y: auto;
          background: radial-gradient(circle at top right, rgba(29, 185, 84, 0.04), transparent 800px);
          padding: 40px;
          padding-bottom: 140px;
        }


        @media (max-width: 1100px) {
          .sidebar-toggle-btn { display: flex; }
          .sidebar-wrapper {
            position: fixed;
            left: -280px;
            top: 0;
            background: #09090b;
            box-shadow: 20px 0 50px rgba(0,0,0,0.5);
          }
          .sidebar-wrapper.open { left: 0; }
          .sidebar-overlay {
            position: fixed;
            inset: 0;
            background: rgba(0,0,0,0.6);
            backdrop-filter: blur(4px);
            z-index: 90;
          }
          .admin-header { padding: 0 24px; }
          .admin-container { padding: 24px; }
        }

        @media (max-width: 768px) {
        }
      `}</style>
    </div>
  );
}
