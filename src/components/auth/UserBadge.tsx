"use client";

import React, { useState } from 'react';
import { User, LogOut, ShieldCheck } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { TelegramLogin } from '@/components/auth/TelegramLogin';

export const UserBadge: React.FC<{ textColor?: string }> = ({ textColor = 'white' }) => {
  const { user, logout, isAuthenticated } = useAuth();
  const [showPopup, setShowPopup] = useState(false);
  const [showLoginPopover, setShowLoginPopover] = useState(false);

  return (
    <div className="user-badge-wrapper">
      {!isAuthenticated ? (
        <div className="login-trigger" onClick={() => setShowLoginPopover(!showLoginPopover)}>
          <div className="silhouette-wrapper glass">
            <User size={20} />
          </div>
          {showLoginPopover && (
            <div className="login-popover glass animate-in-popup" onClick={(e) => e.stopPropagation()}>
               <p className="login-hint">Log in to sync your data</p>
               <TelegramLogin />
            </div>
          )}
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
        .login-trigger:hover .login-popover {
          display: flex;
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

        .login-popover {
          position: absolute;
          top: calc(100% + 12px);
          right: 0;
          width: 200px;
          padding: 16px;
          border-radius: 16px;
          display: none;
          flex-direction: column;
          gap: 12px;
          box-shadow: 0 10px 30px rgba(0,0,0,0.4);
          border: 1px solid rgba(255,255,255,0.05);
        }
        .login-hint { font-size: 11px; font-weight: 700; opacity: 0.6; text-align: center; }

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
          width: 240px;
          padding: 20px;
          border-radius: 20px;
          display: flex;
          flex-direction: column;
          gap: 16px;
          box-shadow: 0 20px 60px rgba(0,0,0,0.6);
          border: 1px solid rgba(255,255,255,0.1);
          color: white;
        }
        .popup-header { display: flex; justify-content: space-between; align-items: center; }
        .user-name { font-weight: 800; font-size: 14px; margin-bottom: 2px; }
        .user-meta { font-size: 11px; opacity: 0.6; }

        .popup-actions { display: flex; flex-direction: column; gap: 12px; }
        .sync-status { font-size: 10px; font-weight: 700; color: #1db954; opacity: 0.8; }
        .logout-btn {
          display: flex; align-items: center; gap: 8px;
          padding: 10px; border-radius: 10px; background: rgba(255, 75, 43, 0.1);
          color: #ff4b2b; border: none; font-weight: 700; font-size: 12px; cursor: pointer;
          transition: all 0.2s;
        }
        .logout-btn:hover { background: rgba(255, 75, 43, 0.2); }

        @keyframes popupFade { from { opacity: 0; transform: scale(0.95); } to { opacity: 1; transform: scale(1); } }
        .animate-in-popup { animation: popupFade 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275); }
      `}</style>
    </div>
  );
};
