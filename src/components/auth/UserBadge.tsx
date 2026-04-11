"use client";

import React, { useState, useRef, useEffect } from 'react';
import { User, LogOut, ShieldCheck } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { AuthModal } from '@/components/auth/AuthModal';

export const UserBadge: React.FC<{ textColor?: string }> = ({ textColor = 'white' }) => {
  const { user, logout, isAuthenticated, isAuthModalOpen, setIsAuthModalOpen } = useAuth();
  const [showPopup, setShowPopup] = useState(false);
  const popupRef = useRef<HTMLDivElement>(null);

  // Close popup when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (popupRef.current && !popupRef.current.contains(event.target as Node)) {
        setShowPopup(false);
      }
    };
    if (showPopup) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showPopup]);

  return (
    <div className="user-badge-wrapper">
      {!isAuthenticated ? (
        <>
          <div className="login-trigger" onClick={() => setIsAuthModalOpen(true)}>
            <div className="silhouette-wrapper glass">
              <User size={20} />
            </div>
          </div>
        </>
      ) : (
        <div className="user-profile-trigger" onClick={() => setShowPopup(!showPopup)}>
          {user?.photo_url ? (
            <img src={user.photo_url} alt="Profile" className="profile-img shadow-xl" />
          ) : (
            <div className="profile-img-placeholder"><User size={20} /></div>
          )}
          
          {showPopup && (
            <div className="user-popup glass animate-in-popup" ref={popupRef}>
              <div className="popup-header">
                  <div className="user-info">
                    <p className="user-name">{user?.first_name} {user?.last_name}</p>
                    <p className="user-meta">@{user?.username || 'user'}</p>
                  </div>
                  <ShieldCheck size={20} className="text-primary" />
                </div>
                <div className="popup-actions">
                  <p className="sync-status">✓ Cloud Synced</p>
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
        .user-badge-wrapper {
          position: relative;
          z-index: 100;
        }

        .login-trigger {
          position: relative;
          cursor: pointer;
        }

        .silhouette-wrapper {
          width: 40px;
          height: 40px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          opacity: 0.6;
          transition: all 0.2s;
        }
        .silhouette-wrapper:hover { opacity: 1; transform: scale(1.05); }

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
          width: 280px;
          padding: 32px 24px;
          border-radius: 24px;
          display: flex;
          flex-direction: column;
          gap: 20px;
          background: #0d0d0d;
          box-shadow: 0 40px 100px rgba(0,0,0,0.9), 0 0 0 1px rgba(255,255,255,0.1);
          color: white;
          z-index: 2000;
        }
        .popup-header { display: flex; justify-content: space-between; align-items: center; }
        .user-name { font-weight: 900; font-size: 16px; margin-bottom: 2px; }
        .user-meta { font-size: 12px; opacity: 0.6; font-weight: 600; }

        .popup-actions { display: flex; flex-direction: column; gap: 16px; }
        .sync-status { font-size: 11px; font-weight: 700; color: #1db954; opacity: 0.9; }
        .logout-btn {
          display: flex; align-items: center; justify-content: center; gap: 10px;
          padding: 14px; border-radius: 14px; background: rgba(255, 75, 43, 0.1);
          color: #ff4b2b; border: 1px solid rgba(255, 75, 43, 0.2); 
          font-weight: 800; font-size: 13px; cursor: pointer;
          transition: all 0.2s;
        }
        .logout-btn:hover { background: rgba(255, 75, 43, 0.2); transform: scale(1.02); }

        @keyframes popupFade { from { opacity: 0; transform: scale(0.95) translateY(10px); } to { opacity: 1; transform: scale(1) translateY(0); } }
        .animate-in-popup { animation: popupFade 0.3s cubic-bezier(0.19, 1, 0.22, 1); }

        @media (max-width: 768px) {
          .user-popup {
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            width: 90%;
            max-width: 300px;
            background: #0a0a0a;
            backdrop-filter: none;
            padding: 32px 20px;
            box-shadow: 0 0 0 100vh rgba(0,0,0,0.85), 0 40px 100px rgba(0,0,0,1);
            border: 1px solid rgba(255,255,255,0.15);
          }
          .logout-btn {
            background: #ff4b2b;
            color: white;
            border: none;
            box-shadow: 0 10px 20px rgba(255, 75, 43, 0.2);
          }
          @keyframes popupFadeMobile { from { opacity: 0; transform: translate(-50%, -40%) scale(0.9); } to { opacity: 1; transform: translate(-50%, -50%) scale(1); } }
          .animate-in-popup { animation: popupFadeMobile 0.4s cubic-bezier(0.19, 1, 0.22, 1); }
        }
      `}</style>
    </div>
  );
};
