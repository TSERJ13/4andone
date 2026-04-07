"use client";

import React, { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import Sidebar from "@/components/layout/Sidebar";
import MobileNav from "@/components/layout/MobileNav";
import PlayerBar from "@/components/layout/PlayerBar";
import { AuthProvider, useAuth } from '@/context/AuthContext';
import { TelegramLogin } from '@/components/auth/TelegramLogin';
import { User, LogOut, ShieldCheck } from 'lucide-react';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);
  
  useEffect(() => {
    setMounted(true);
  }, []);

  const isNoLayout = pathname.startsWith('/admin') || pathname === '/sa-login';

  // Prevent hydration "jitter"
  if (!mounted) {
    return <div className="layout-stabilizer" style={{ background: '#000', height: '100vh', width: '100vw' }} />;
  }

  if (isNoLayout) {
    return <div className="admin-root-wrapper">{children}</div>;
  }

  return (
    <AuthProvider>
      <div className="app-container">
        <UserBadge />
        <Sidebar />
        <main className="main-content">
          {children}
        </main>
        <PlayerBar />
        <MobileNav />
      </div>
    </AuthProvider>
  );
}

function UserBadge() {
  const { user, logout, isAuthenticated } = useAuth();
  const [showPopup, setShowPopup] = useState(false);

  return (
    <div className="auth-badge-container">
      {!isAuthenticated ? (
        <div className="login-prompt glass animate-in-fade">
          <p className="prompt-text">Log in to save your playlists and folders</p>
          <TelegramLogin />
        </div>
      ) : (
        <div className="user-profile-trigger" onClick={() => setShowPopup(!showPopup)}>
          {user?.photo_url ? (
            <img src={user.photo_url} alt="Profile" className="profile-img shadow-xl" />
          ) : (
            <div className="profile-img-placeholder"><User size={20} /></div>
          )}
          
          {showPopup && (
            <div className="user-popup glass animate-in-popup" onClick={(e) => e.stopPropagation()}>
              <div className="popup-header">
                <div className="user-info">
                  <p className="user-name">{user?.first_name} {user?.last_name}</p>
                  <p className="user-meta text-secondary">@{user?.username || 'user'}</p>
                </div>
                <ShieldCheck size={20} className="text-primary" />
              </div>
              <div className="popup-actions">
                <p className="sync-status">✓ Syncing with Cloud</p>
                <button className="logout-btn" onClick={logout}>
                  <LogOut size={16} />
                  <span>Logout</span>
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      <style jsx>{`
        .auth-badge-container {
          position: fixed;
          top: 0;
          right: 0;
          padding: 60px 24px 24px; /* SAFE AREA FOR IPHONE ISLAND */
          z-index: 1000;
          display: flex;
          justify-content: flex-end;
          align-items: flex-start;
          pointer-events: none;
        }
        .login-prompt, .user-profile-trigger { pointer-events: auto; }

        .login-prompt {
          padding: 16px 20px;
          border-radius: 20px;
          display: flex;
          flex-direction: column;
          gap: 12px;
          border: 1px solid rgba(255,255,255,0.08);
          max-width: 240px;
          box-shadow: 0 10px 40px rgba(0,0,0,0.4);
        }
        .prompt-text { font-size: 11px; font-weight: 700; text-align: center; opacity: 0.6; line-height: 1.3; }

        .profile-img, .profile-img-placeholder {
          width: 44px;
          height: 44px;
          border-radius: 50%;
          cursor: pointer;
          border: 2px solid rgba(255,255,255,0.1);
          transition: all 0.2s;
        }
        .profile-img:hover { border-color: var(--primary); transform: scale(1.05); }
        .profile-img-placeholder { 
          background: #1a1a1a; display: flex; align-items: center; justify-content: center;
        }

        .user-popup {
          position: absolute;
          top: calc(100% + 12px);
          right: 0;
          width: 260px;
          padding: 24px;
          border-radius: 24px;
          display: flex;
          flex-direction: column;
          gap: 20px;
          box-shadow: 0 20px 60px rgba(0,0,0,0.6);
          border: 1px solid rgba(255,255,255,0.1);
        }
        .popup-header { display: flex; justify-content: space-between; align-items: center; }
        .user-name { font-weight: 800; font-size: 16px; margin-bottom: 2px; }
        .user-meta { font-size: 12px; }

        .popup-actions { display: flex; flex-direction: column; gap: 12px; }
        .sync-status { font-size: 11px; font-weight: 700; color: #1db954; opacity: 0.8; }
        .logout-btn {
          display: flex; align-items: center; gap: 10px;
          padding: 12px; border-radius: 12px; background: rgba(255, 75, 43, 0.1);
          color: #ff4b2b; border: none; font-weight: 700; font-size: 13px; cursor: pointer;
          transition: all 0.2s;
        }
        .logout-btn:hover { background: rgba(255, 75, 43, 0.2); }

        @keyframes fadeIn { from { opacity: 0; transform: translateY(-10px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes popupFade { from { opacity: 0; transform: scale(0.95); } to { opacity: 1; transform: scale(1); } }
        .animate-in-fade { animation: fadeIn 0.4s ease-out; }
        .animate-in-popup { animation: popupFade 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275); }
      `}</style>
    </div>
  );
}
