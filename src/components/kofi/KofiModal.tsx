"use client";

import React, { useState, useEffect, useRef } from 'react';
import { X, Coffee, ExternalLink, Loader2 } from 'lucide-react';

export const KofiModal: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleOpen = () => {
      setIsLoading(true);
      setIsOpen(true);
    };
    const handleClose = () => setIsOpen(false);

    window.addEventListener('open-kofi-modal', handleOpen);
    window.addEventListener('close-kofi-modal', handleClose);

    return () => {
      window.removeEventListener('open-kofi-modal', handleOpen);
      window.removeEventListener('close-kofi-modal', handleClose);
    };
  }, []);

  // Close when pressing ESC
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleKeyDown);
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  // Click outside to close
  const handleOverlayClick = (e: React.MouseEvent) => {
    if (modalRef.current && !modalRef.current.contains(e.target as Node)) {
      setIsOpen(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="kofi-modal-overlay" onClick={handleOverlayClick}>
      <div className="kofi-modal-content animate-in-kofi" ref={modalRef}>
        {/* Modal Header */}
        <div className="kofi-modal-header">
          <div className="kofi-brand">
            <div className="kofi-icon-box">
              <Coffee size={18} className="text-primary" />
            </div>
            <div className="kofi-title-box">
              <h3>Support 4and.one</h3>
              <p>Buy a coffee & keep the ballroom dance beats flowing</p>
            </div>
          </div>
          <div className="kofi-header-actions">
            <a
              href="https://ko-fi.com/4andone"
              target="_blank"
              rel="noopener noreferrer"
              className="kofi-action-btn"
              title="Open in new tab"
            >
              <ExternalLink size={16} />
            </a>
            <button
              className="kofi-action-btn close"
              onClick={() => setIsOpen(false)}
              aria-label="Close"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Modal Body / Iframe */}
        <div className="kofi-iframe-container">
          {isLoading && (
            <div className="kofi-loader">
              <Loader2 size={28} className="spin text-primary" />
              <span>Loading Ko-fi checkout...</span>
            </div>
          )}
          <iframe
            id="kofiframe"
            src="https://ko-fi.com/4andone/?hidefeed=true&widget=true&embed=true&preview=true"
            title="4andone"
            allow="payment"
            onLoad={() => setIsLoading(false)}
          />
        </div>
      </div>

      <style jsx>{`
        .kofi-modal-overlay {
          position: fixed;
          inset: 0;
          background: rgba(0, 0, 0, 0.82);
          backdrop-filter: blur(10px);
          -webkit-backdrop-filter: blur(10px);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 9999;
          padding: 16px;
          cursor: pointer;
        }

        .kofi-modal-content {
          width: 100%;
          max-width: 480px;
          height: 90vh;
          max-height: 760px;
          background: #111111;
          border-radius: 24px;
          border: 1px solid rgba(255, 255, 255, 0.12);
          box-shadow: 0 40px 100px rgba(0, 0, 0, 0.9), 0 0 0 1px rgba(29, 185, 84, 0.15);
          display: flex;
          flex-direction: column;
          overflow: hidden;
          cursor: default;
          position: relative;
        }

        .kofi-modal-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 14px 18px;
          border-bottom: 1px solid rgba(255, 255, 255, 0.08);
          background: #161616;
        }

        .kofi-brand {
          display: flex;
          align-items: center;
          gap: 12px;
          min-width: 0;
        }

        .kofi-icon-box {
          width: 36px;
          height: 36px;
          border-radius: 10px;
          background: rgba(29, 185, 84, 0.15);
          border: 1px solid rgba(29, 185, 84, 0.3);
          display: flex;
          align-items: center;
          justify-content: center;
          color: #1db954;
          flex-shrink: 0;
        }

        .kofi-title-box h3 {
          margin: 0;
          font-size: 15px;
          font-weight: 800;
          color: #ffffff;
          line-height: 1.2;
          letter-spacing: -0.3px;
        }

        .kofi-title-box p {
          margin: 2px 0 0;
          font-size: 11.5px;
          color: #888;
          line-height: 1.2;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .kofi-header-actions {
          display: flex;
          align-items: center;
          gap: 8px;
          flex-shrink: 0;
        }

        .kofi-action-btn {
          width: 32px;
          height: 32px;
          border-radius: 50%;
          background: rgba(255, 255, 255, 0.06);
          border: 1px solid rgba(255, 255, 255, 0.08);
          color: #aaa;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: all 0.2s ease;
          text-decoration: none;
        }

        .kofi-action-btn:hover {
          background: rgba(255, 255, 255, 0.12);
          color: #fff;
        }

        .kofi-action-btn.close:hover {
          background: rgba(255, 75, 43, 0.15);
          color: #ff4b2b;
          border-color: rgba(255, 75, 43, 0.3);
        }

        .kofi-iframe-container {
          position: relative;
          flex: 1;
          width: 100%;
          background: #f9f9f9;
          overflow: hidden;
        }

        .kofi-loader {
          position: absolute;
          inset: 0;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 12px;
          background: #111111;
          color: #aaa;
          font-size: 13px;
          font-weight: 600;
          z-index: 1;
        }

        .spin {
          animation: spin 1s linear infinite;
        }

        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }

        iframe#kofiframe {
          width: 100%;
          height: 100%;
          border: none;
          display: block;
          background: #f9f9f9;
        }

        @keyframes kofiModalFadeIn {
          from {
            opacity: 0;
            transform: scale(0.94) translateY(20px);
          }
          to {
            opacity: 1;
            transform: scale(1) translateY(0);
          }
        }

        .animate-in-kofi {
          animation: kofiModalFadeIn 0.3s cubic-bezier(0.16, 1, 0.3, 1);
        }

        @media (max-width: 640px) {
          .kofi-modal-overlay {
            padding: 8px;
          }
          .kofi-modal-content {
            height: 94vh;
            max-height: none;
            border-radius: 20px;
          }
          .kofi-title-box p {
            max-width: 190px;
          }
        }
      `}</style>
    </div>
  );
};

export default KofiModal;
