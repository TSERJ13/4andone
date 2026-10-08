import React, { useRef, useEffect } from 'react';
import { X, Send } from 'lucide-react';
import { TelegramLogin } from './TelegramLogin';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose }) => {
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (modalRef.current && !modalRef.current.contains(event.target as Node)) {
        onClose();
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="auth-modal-overlay">
      <div className="auth-modal-content animate-in-popup" ref={modalRef}>
        <button className="close-btn" onClick={onClose} aria-label="Close">
          <X size={18} />
        </button>

        <div className="modal-header">
          <div className="icon-badge">
            <Send size={20} className="text-red" />
          </div>
          <h2>Sign in to 4and.one</h2>
          <p>Connect with Telegram to sync your practice data and music across devices.</p>
        </div>

        <div className="login-widget-container">
          <TelegramLogin />
        </div>

        <p className="footer-note">Secure login via official Telegram API</p>
      </div>

      <style jsx>{`
        .auth-modal-overlay {
          position: fixed;
          inset: 0;
          background: rgba(0, 0, 0, 0.75);
          backdrop-filter: blur(12px);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 6001;
          padding: 20px;
          cursor: pointer;
        }

        .auth-modal-content {
          background: #212121;
          width: 100%;
          max-width: 420px;
          padding: 28px;
          border-radius: 16px;
          position: relative;
          border: 1px solid rgba(255, 255, 255, 0.1);
          color: #ffffff;
          text-align: center;
          cursor: default;
          box-shadow: 0 16px 40px rgba(0, 0, 0, 0.85);
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 20px;
        }

        .close-btn {
          position: absolute;
          top: 16px;
          right: 16px;
          background: rgba(255, 255, 255, 0.08);
          width: 32px;
          height: 32px;
          border-radius: 50%;
          border: none;
          color: rgba(255, 255, 255, 0.6);
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: all 0.2s ease;
        }
        .close-btn:hover { background: rgba(255, 255, 255, 0.16); color: #ffffff; }

        .modal-header {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 8px;
        }

        .icon-badge {
          width: 44px;
          height: 44px;
          border-radius: 50%;
          background: rgba(255, 0, 51, 0.12);
          display: flex;
          align-items: center;
          justify-content: center;
          color: #ff0033;
          margin-bottom: 4px;
        }

        h2 { font-size: 20px; font-weight: 700; color: #ffffff; margin: 0; letter-spacing: -0.2px; }
        p { font-size: 14px; color: rgba(255, 255, 255, 0.7); line-height: 1.5; margin: 0; }

        .login-widget-container {
          width: 100%;
          display: flex;
          justify-content: center;
          min-height: 40px;
          margin-top: 4px;
        }

        .footer-note {
          font-size: 12px;
          color: rgba(255, 255, 255, 0.4);
          font-weight: 500;
          margin: 0;
        }

        @keyframes popupOpen {
          from { opacity: 0; transform: scale(0.95) translateY(10px); }
          to { opacity: 1; transform: scale(1) translateY(0); }
        }
        .animate-in-popup { animation: popupOpen 0.25s cubic-bezier(0.19, 1, 0.22, 1); }

        @media (max-width: 480px) {
          .auth-modal-content {
             width: 100%;
             padding: 24px 18px;
             gap: 16px;
             border-radius: 16px;
          }
        }
      `}</style>
    </div>
  );
};
