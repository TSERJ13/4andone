"use client";

import React from 'react';
import { X, AlertTriangle } from 'lucide-react';

interface ConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText?: string;
  variant?: 'danger' | 'primary';
  showCancel?: boolean;
}

const ConfirmModal = ({ 
  isOpen, 
  onClose, 
  onConfirm, 
  title, 
  message, 
  confirmText = "Confirm",
  variant = 'danger',
  showCancel = true
}: ConfirmModalProps) => {
  if (!isOpen) return null;

  return (
    <div className="modal-overlay">
      <div className="modal-content glass animate-in">
        <header className="modal-header">
          <div className="header-title">
            <div className={`icon-box glass ${variant === 'danger' ? 'danger-icon' : ''}`}>
              <AlertTriangle size={20} />
            </div>
            <div>
              <h3>{title}</h3>
              <p>{message}</p>
            </div>
          </div>
          <button className="close-btn" onClick={onClose}><X size={20} /></button>
        </header>

        <div className="modal-footer">
          {showCancel && <button type="button" className="btn-secondary" onClick={onClose}>Cancel</button>}
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
          background: rgba(0,0,0,0.8);
          backdrop-filter: blur(8px);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 5001; /* Above mobile player and everything else */
          padding: 20px;
        }

        .modal-content {
          width: 100%;
          max-width: 440px;
          border-radius: 28px;
          padding: 32px;
          position: relative;
        }

        .modal-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 24px; }
        .header-title { display: flex; gap: 16px; align-items: center; }
        .header-title h3 { font-size: 20px; font-weight: 800; letter-spacing: -0.5px; }
        .header-title p { font-size: 13px; color: #71717a; margin-top: 4px; line-height: 1.5; }

        .icon-box { 
          width: 44px; 
          height: 44px; 
          border-radius: 14px; 
          display: flex; 
          align-items: center; 
          justify-content: center; 
          color: #1db954;
          flex-shrink: 0;
        }
        .danger-icon { color: #ef4444; background: rgba(239, 68, 68, 0.1); }

        .close-btn { color: #71717a; transition: color 0.2s; }
        .close-btn:hover { color: white; }

        .modal-footer { display: flex; justify-content: flex-end; gap: 12px; margin-top: 8px; }

        .btn-danger {
          background: #ef4444;
          color: white;
          padding: 10px 24px;
          border-radius: 12px;
          font-weight: 700;
          font-size: 14px;
          transition: all 0.2s;
        }
        .btn-danger:hover { background: #dc2626; transform: scale(1.02); }

        @media (max-width: 768px) {
          .modal-overlay { 
            align-items: center; 
            padding: 24px; 
            z-index: 6000;
          }
          .modal-content { 
            border-radius: 24px; 
            max-width: 100%; 
          }
        }
      `}</style>
    </div>
  );
};

export default ConfirmModal;
