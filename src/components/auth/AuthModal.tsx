"use client";

import React from 'react';
import { X, Send } from 'lucide-react';
import { TelegramLogin } from './TelegramLogin';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="auth-modal-overlay" onClick={onClose}>
      <div className="auth-modal-content animate-in-popup" onClick={(e) => e.stopPropagation()}>
        <button className="close-btn" onClick={onClose}>
          <X size={20} />
        </button>

        <div className="modal-header">
          <div className="icon-badge">
            <Send size={24} className="text-primary" />
          </div>
          <h2>Sign In</h2>
          <p>Connect with Telegram to sync your studio data and music across devices.</p>
        </div>

        <div className="login-widget-container">
          <TelegramLogin />
        </div>

        <p className="footer-note italic">Secure login via official Telegram API</p>
      </div>

      <style jsx>{`
        .auth-modal-overlay {
          position: fixed;
          inset: 0;
          background: rgba(0, 0, 0, 0.85);
          backdrop-filter: blur(12px);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 2000;
        }

        .auth-modal-content {
          width: 90%;
          max-width: 360px;
          background: #111;
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 28px;
          padding: 32px;
          position: relative;
          box-shadow: 0 30px 100px rgba(0, 0, 0, 0.8);
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 24px;
          text-align: center;
        }

        .close-btn {
          position: absolute;
          top: 16px;
          right: 16px;
          background: transparent;
          border: none;
          color: #555;
          cursor: pointer;
          transition: color 0.2s;
        }
        .close-btn:hover { color: white; }

        .icon-badge {
          width: 64px;
          height: 64px;
          border-radius: 20px;
          background: rgba(29, 185, 84, 0.1);
          display: flex;
          align-items: center;
          justify-content: center;
          margin-bottom: 8px;
        }

        h2 { font-size: 1.5rem; font-weight: 900; color: white; margin: 0; }
        p { font-size: 13px; color: #888; line-height: 1.5; }

        .login-widget-container {
          width: 100%;
          display: flex;
          justify-content: center;
          min-height: 40px;
        }

        .footer-note {
          font-size: 10px;
          opacity: 0.4;
          letter-spacing: 0.5px;
        }

        @keyframes popupOpen {
          from { opacity: 0; transform: scale(0.9) translateY(20px); }
          to { opacity: 1; transform: scale(1) translateY(0); }
        }
        .animate-in-popup { animation: popupOpen 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275); }

        @media (max-width: 480px) {
          .auth-modal-content {
             padding: 40px 24px;
          }
        }
      `}</style>
    </div>
  );
};
