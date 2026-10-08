"use client";

import React, { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { 
  User, 
  LogOut, 
  Sparkles, 
  Crown, 
  Users, 
  History, 
  Settings, 
  ShieldCheck, 
  HelpCircle, 
  MessageSquare, 
  ChevronRight,
  Upload,
  LogIn
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

export const UserBadge: React.FC<{ textColor?: string }> = ({ textColor = 'white' }) => {
  const { user, logout, isAuthenticated, setIsAuthModalOpen, isPremium, setIsSubscriptionModalOpen } = useAuth();
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
    <div className="yt-user-menu-wrapper" ref={popupRef}>
      {!isAuthenticated ? (
        <button 
          type="button" 
          className="yt-signin-btn" 
          onClick={() => setIsAuthModalOpen(true)}
        >
          <div className="yt-signin-icon">
            <User size={18} />
          </div>
          <span>Sign in</span>
        </button>
      ) : (
        <div className="yt-profile-trigger" onClick={() => setShowPopup(!showPopup)}>
          {user?.photo_url ? (
            <img src={user.photo_url} alt="Profile" className="yt-avatar-img" />
          ) : (
            <div className="yt-avatar-placeholder">
              <User size={20} />
            </div>
          )}
        </div>
      )}

      {showPopup && isAuthenticated && (
        <div className="yt-dropdown-menu animate-in-dropdown">
          {/* Top User Info Header */}
          <div className="yt-menu-header">
            {user?.photo_url ? (
              <img src={user.photo_url} alt="Profile" className="yt-menu-avatar" />
            ) : (
              <div className="yt-menu-avatar-placeholder">
                <User size={22} />
              </div>
            )}
            <div className="yt-menu-user-details">
              <p className="yt-menu-user-name">
                {user?.first_name} {user?.last_name || ''}
              </p>
              <p className="yt-menu-user-handle">
                @{user?.username || 'user'}
              </p>
              <a 
                href="https://t.me" 
                target="_blank" 
                rel="noreferrer" 
                className="yt-menu-manage-link"
              >
                Manage your Telegram Account
              </a>
            </div>
          </div>

          <div className="yt-menu-divider" />

          {/* Section 1: Core Account Actions */}
          <div className="yt-menu-section">
            <Link 
              href="/library" 
              className="yt-menu-item"
              onClick={() => setShowPopup(false)}
            >
              <User size={20} className="yt-menu-icon" />
              <span>Your profile</span>
            </Link>

            <Link
              href="/upgrade"
              className="yt-menu-item"
              onClick={() => setShowPopup(false)}
            >
              {isPremium ? (
                <>
                  <Crown size={20} className="yt-menu-icon text-amber-400" />
                  <span>Premium Member</span>
                </>
              ) : (
                <>
                  <Sparkles size={20} className="yt-menu-icon text-primary" />
                  <span>Get 4and.one Premium</span>
                </>
              )}
            </Link>

            <button 
              type="button"
              className="yt-menu-item"
              onClick={() => {
                setShowPopup(false);
                setIsAuthModalOpen(true);
              }}
            >
              <Users size={20} className="yt-menu-icon" />
              <span style={{ flex: 1, textAlign: 'left' }}>Switch account</span>
              <ChevronRight size={16} className="yt-menu-arrow" />
            </button>

            <button 
              type="button"
              className="yt-menu-item"
              onClick={() => {
                setShowPopup(false);
                logout();
              }}
            >
              <LogOut size={20} className="yt-menu-icon" />
              <span>Sign out</span>
            </button>
          </div>

          <div className="yt-menu-divider" />

          {/* Section 2: History & Preferences */}
          <div className="yt-menu-section">
            <Link 
              href="/library/favorites" 
              className="yt-menu-item"
              onClick={() => setShowPopup(false)}
            >
              <History size={20} className="yt-menu-icon" />
              <span>History</span>
            </Link>

            <Link 
              href="/library/finals" 
              className="yt-menu-item"
              onClick={() => setShowPopup(false)}
            >
              <Settings size={20} className="yt-menu-icon" />
              <span>Settings</span>
            </Link>

            <Link 
              href="/learn-final-mode" 
              className="yt-menu-item"
              onClick={() => setShowPopup(false)}
            >
              <HelpCircle size={20} className="yt-menu-icon" />
              <span>Help</span>
            </Link>

            <button
              type="button"
              className="yt-menu-item"
              onClick={() => {
                setShowPopup(false);
                // Opens the contact form; messages land in Admin → Messages
                window.dispatchEvent(new CustomEvent('open-contact-modal'));
              }}
            >
              <MessageSquare size={20} className="yt-menu-icon" />
              <span>Send feedback</span>
            </button>
          </div>
        </div>
      )}

      <style jsx>{`
        .yt-user-menu-wrapper {
          position: relative;
          z-index: 500;
        }

        .yt-signin-btn {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 6px 14px;
          border-radius: 18px;
          background: rgba(16, 185, 129, 0.08);
          border: 1px solid rgba(16, 185, 129, 0.6);
          color: #10b981;
          font-size: 14px;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .yt-signin-btn:hover {
          background: rgba(16, 185, 129, 0.18);
          border-color: #10b981;
          box-shadow: 0 0 12px rgba(16, 185, 129, 0.25);
        }

        .yt-signin-icon {
          display: flex;
          align-items: center;
          justify-content: center;
          color: #10b981;
        }

        .yt-profile-trigger {
          cursor: pointer;
          display: flex;
          align-items: center;
        }

        .yt-avatar-img, .yt-avatar-placeholder {
          width: 34px;
          height: 34px;
          border-radius: 50%;
          transition: opacity 0.2s;
        }

        .yt-avatar-img {
          object-fit: cover;
        }

        .yt-avatar-placeholder {
          background: #272727;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #ffffff;
        }

        .yt-profile-trigger:hover .yt-avatar-img,
        .yt-profile-trigger:hover .yt-avatar-placeholder {
          opacity: 0.85;
        }

        .yt-dropdown-menu {
          position: absolute;
          top: calc(100% + 8px);
          right: 0;
          width: 300px;
          background: #212121;
          border-radius: 12px;
          border: 1px solid rgba(255, 255, 255, 0.1);
          box-shadow: 0 16px 40px rgba(0, 0, 0, 0.85);
          padding: 12px 0;
          color: #ffffff;
          z-index: 1000;
        }

        .yt-menu-header {
          display: flex;
          gap: 14px;
          padding: 12px 16px 14px 16px;
          align-items: flex-start;
        }

        .yt-menu-avatar, .yt-menu-avatar-placeholder {
          width: 40px;
          height: 40px;
          border-radius: 50%;
          flex-shrink: 0;
        }

        .yt-menu-avatar-placeholder {
          background: #333333;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #aaaaaa;
        }

        .yt-menu-user-details {
          display: flex;
          flex-direction: column;
          gap: 2px;
          overflow: hidden;
        }

        .yt-menu-user-name {
          font-size: 15px;
          font-weight: 700;
          color: #ffffff;
          margin: 0;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .yt-menu-user-handle {
          font-size: 13px;
          color: rgba(255, 255, 255, 0.6);
          margin: 0 0 4px 0;
        }

        .yt-menu-manage-link {
          font-size: 13px;
          color: #10b981;
          text-decoration: none;
          font-weight: 500;
        }
        .yt-menu-manage-link:hover {
          text-decoration: underline;
        }

        .yt-menu-divider {
          height: 1px;
          background: rgba(255, 255, 255, 0.1);
          margin: 4px 0;
        }

        .yt-menu-section {
          display: flex;
          flex-direction: column;
        }

        :global(.yt-menu-item) {
          display: flex !important;
          align-items: center !important;
          gap: 16px !important;
          padding: 10px 16px !important;
          font-size: 14px !important;
          font-weight: 500 !important;
          color: #ffffff !important;
          background: none !important;
          border: none !important;
          text-decoration: none !important;
          cursor: pointer !important;
          width: 100% !important;
          text-align: left !important;
          transition: background-color 0.15s ease !important;
        }

        :global(.yt-menu-item:hover) {
          background: rgba(255, 255, 255, 0.08) !important;
        }

        :global(.yt-menu-icon) {
          color: rgba(255, 255, 255, 0.7);
          flex-shrink: 0;
        }

        :global(.yt-menu-arrow) {
          color: rgba(255, 255, 255, 0.4);
        }

        @keyframes dropdownFade {
          from { opacity: 0; transform: translateY(-8px); }
          to { opacity: 1; transform: translateY(0); }
        }

        .animate-in-dropdown {
          animation: dropdownFade 0.2s cubic-bezier(0.19, 1, 0.22, 1);
        }
      `}</style>
    </div>
  );
};
