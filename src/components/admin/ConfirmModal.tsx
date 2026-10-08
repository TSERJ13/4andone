"use client";

import React from 'react';
import { X, AlertTriangle, CheckCircle2 } from 'lucide-react';

interface ConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText?: string;
  variant?: 'danger' | 'primary';
  showCancel?: boolean;
  icon?: React.ReactNode;
}

const ConfirmModal = ({ 
  isOpen, 
  onClose, 
  onConfirm, 
  title, 
  message, 
  confirmText = "Confirm",
  variant = 'danger',
  showCancel = true,
  icon
}: ConfirmModalProps) => {
  if (!isOpen) return null;

  return (
    <div className="modal-overlay">
      <div className="modal-content glass animate-in">
        <header className="modal-header">
          <div className="header-title">
            <div className={`icon-box glass ${variant === 'danger' ? 'danger-icon' : 'primary-icon'}`}>
              {icon ? (
                icon
              ) : variant === 'danger' ? (
                <AlertTriangle size={20} />
              ) : (
                <CheckCircle2 size={22} color="#10b981" />
              )}
            </div>
            <div>
              <h3>{title}</h3>
              <p>{message}</p>
            </div>
          </div>
          <button type="button" className="close-btn" onClick={onClose} aria-label="Close">
            <X size={20} />
          </button>
        </header>

        <div className="modal-footer">
          {showCancel && (
            <button type="button" className="btn-secondary" onClick={onClose}>
              Cancel
            </button>
          )}
          <button 
            type="button" 
            className={variant === 'danger' ? 'btn-danger' : 'btn-primary'}
            onClick={() => {
              onConfirm();
              onClose();
            }}
          >
            {confirmText}
          </button>
        </div>
      </div>

      <style jsx>{`
        .modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          width: 100dvw;
          height: 100dvh;
          background: rgba(0, 0, 0, 0.75);
          backdrop-filter: blur(12px);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 5001;
          padding: 20px;
        }

        .modal-content {
          width: 100%;
          max-width: 420px;
          border-radius: 16px;
          background: #212121;
          border: 1px solid rgba(255, 255, 255, 0.1);
          box-shadow: 0 16px 40px rgba(0, 0, 0, 0.8);
          padding: 24px;
          position: relative;
        }

        .modal-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 24px; }
        .header-title { display: flex; gap: 16px; align-items: flex-start; }
        .header-title h3 { font-size: 18px; font-weight: 700; color: #ffffff; letter-spacing: -0.2px; margin: 0; }
        .header-title p { font-size: 14px; color: rgba(255, 255, 255, 0.7); margin-top: 6px; line-height: 1.5; margin-bottom: 0; }

        .icon-box { 
          width: 44px; 
          height: 44px; 
          border-radius: 50%; 
          display: flex; 
          align-items: center; 
          justify-content: center; 
          flex-shrink: 0;
        }
        .danger-icon { color: #ff0033; background: rgba(255, 0, 51, 0.15); border: 1px solid rgba(255, 0, 51, 0.2); }
        .primary-icon { color: #10b981; background: rgba(16, 185, 129, 0.15); border: 1px solid rgba(16, 185, 129, 0.2); }

        .close-btn { color: rgba(255, 255, 255, 0.5); transition: color 0.2s; background: none; border: none; cursor: pointer; padding: 4px; }
        .close-btn:hover { color: #ffffff; }

        .modal-footer { display: flex; justify-content: flex-end; gap: 12px; margin-top: 16px; }

        .btn-secondary {
          background: rgba(255, 255, 255, 0.08);
          color: rgba(255, 255, 255, 0.8);
          padding: 10px 20px;
          border-radius: 20px;
          font-weight: 600;
          font-size: 14px;
          border: none;
          cursor: pointer;
          transition: all 0.2s;
        }
        .btn-secondary:hover { background: rgba(255, 255, 255, 0.15); color: #ffffff; }

        .btn-danger {
          background: #ff0033;
          color: #ffffff;
          padding: 10px 24px;
          border-radius: 20px;
          font-weight: 700;
          font-size: 14px;
          border: none;
          cursor: pointer;
          transition: all 0.2s;
          box-shadow: 0 4px 14px rgba(255, 0, 51, 0.3);
        }
        .btn-danger:hover { background: #cc0029; transform: scale(1.02); }

        .btn-primary {
          background: #10b981;
          color: #ffffff;
          padding: 10px 24px;
          border-radius: 20px;
          font-weight: 700;
          font-size: 14px;
          border: none;
          cursor: pointer;
          transition: all 0.2s;
          box-shadow: 0 4px 14px rgba(16, 185, 129, 0.3);
        }
        .btn-primary:hover { background: #059669; transform: scale(1.02); }

        @media (max-width: 768px) {
          .modal-overlay { 
            align-items: center; 
            padding: 20px; 
            z-index: 6000;
          }
          .modal-content { 
            border-radius: 16px; 
            max-width: 100%; 
            padding: 20px;
          }
        }
      `}</style>
    </div>
  );
};

export default ConfirmModal;
