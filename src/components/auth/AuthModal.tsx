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
        <button className="close-btn" onClick={onClose}>
          <X size={20} />
        </button>

        <div className="modal-header">
          <div className="icon-badge">
            <Send size={24} className="text-primary" />
          </div>
          <h2>SIGN IN</h2>
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
          background: rgba(0, 0, 0, 0.8);
          backdrop-filter: blur(8px);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 6001;
          cursor: pointer;
        }

        .auth-modal-content {
          background: #0d0d0d;
          width: 100%;
          max-width: 440px;
          padding: 32px;
          border-radius: 28px;
          position: relative;
          border: 1px solid rgba(255, 255, 255, 0.1);
          color: white;
          text-align: center;
          cursor: default;
          box-shadow: 0 50px 100px rgba(0, 0, 0, 0.9), 0 0 0 1px rgba(255, 255, 255, 0.05);
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 28px;
        }

        .close-btn {
          position: absolute;
          top: 24px;
          right: 24px;
          background: rgba(255, 255, 255, 0.05);
          width: 32px;
          height: 32px;
          border-radius: 50%;
          border: none;
          color: #888;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: all 0.2s;
        }
        .close-btn:hover { background: rgba(255, 255, 255, 0.1); color: white; }

        .icon-badge {
          width: 64px;
          height: 64px;
          border-radius: 18px;
          background: rgba(29, 185, 84, 0.15);
          display: flex;
          align-items: center;
          justify-content: center;
          margin-bottom: 0px;
          border: 1px solid rgba(29, 185, 84, 0.2);
        }

        h2 { font-size: 2rem; font-weight: 950; color: white; margin: 0; letter-spacing: -1px; }
        p { font-size: 15px; color: #aaa; line-height: 1.6; font-weight: 500; }

        .login-widget-container {
          width: 100%;
          display: flex;
          justify-content: center;
          min-height: 40px;
          transform: scale(1.1);
          margin-top: 10px;
        }

        .footer-note {
          font-size: 11px;
          opacity: 0.3;
          letter-spacing: 0.5px;
          font-weight: 600;
        }

        @keyframes popupOpen {
          from { opacity: 0; transform: scale(0.9) translateY(40px); }
          to { opacity: 1; transform: scale(1) translateY(0); }
        }
        .animate-in-popup { animation: popupOpen 0.5s cubic-bezier(0.19, 1, 0.22, 1); }

        @media (max-width: 480px) {
          .auth-modal-content {
             width: 90%;
             max-width: 320px;
             padding: 40px 20px 32px;
             gap: 20px;
             border-radius: 32px;
          }
          .icon-badge {
            width: 56px;
            height: 56px;
            border-radius: 18px;
          }
          .icon-badge :global(svg) {
            width: 20px;
            height: 20px;
          }
          h2 { font-size: 1.5rem; letter-spacing: -0.5px; }
          p { font-size: 13px; opacity: 0.8; }
          .login-widget-container { transform: scale(1); margin-top: 5px; }
        }
      `}</style>
    </div>
  );
};
