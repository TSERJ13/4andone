"use client";

import React, { useState, useEffect, useRef } from 'react';
import { X, ExternalLink, Loader2 } from 'lucide-react';
import { LiveCoffeeIcon } from './LiveCoffeeIcon';
import { trackKofiClick } from '@/utils/tracking';

export const KofiModal: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedAmount, setSelectedAmount] = useState<number>(3);
  const [customAmount, setCustomAmount] = useState<string>('');
  const [isCustom, setIsCustom] = useState<boolean>(false);
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleOpen = () => {
      setIsLoading(true);
      setIsOpen(true);
      // Restore or set default
      const saved = typeof window !== 'undefined' ? sessionStorage.getItem('4andone_last_kofi_amount') : null;
      if (saved) {
        const num = parseInt(saved, 10);
        if (!isNaN(num) && num > 0) setSelectedAmount(num);
      }
    };
    const handleClose = () => setIsOpen(false);

    window.addEventListener('open-kofi-modal', handleOpen);
    window.addEventListener('close-kofi-modal', handleClose);

    return () => {
      window.removeEventListener('open-kofi-modal', handleOpen);
      window.removeEventListener('close-kofi-modal', handleClose);
    };
  }, []);

  const handleSelectAmount = (amt: number) => {
    setIsCustom(false);
    setSelectedAmount(amt);
    trackKofiClick('modal_amount', amt);
  };

  const handleCustomSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const val = parseInt(customAmount, 10);
    if (!isNaN(val) && val > 0) {
      setSelectedAmount(val);
      trackKofiClick('modal_amount', val);
    }
  };

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
              <LiveCoffeeIcon size={18} />
            </div>
            <div className="kofi-title-box">
              <h3>Support 4and.one</h3>
              <p>Choose amount & support ballroom dance beats</p>
            </div>
          </div>
          <div className="kofi-header-actions">
            <a
              href={`https://ko-fi.com/4andone`}
              target="_blank"
              rel="noopener noreferrer"
              className="kofi-action-btn"
              title="Open in new tab"
              onClick={() => trackKofiClick('modal_external', selectedAmount)}
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

        {/* Amount Selector Bar */}
        <div className="kofi-amount-selector-strip">
          <div className="kofi-amount-label">
            <span className="kofi-amount-heading">Select Amount:</span>
            <span className="kofi-amount-badge">✓ ${selectedAmount} USD chosen</span>
          </div>
          <div className="kofi-chips-grid">
            {[
              { amt: 3, label: '$3', desc: '1 ☕ Coffee' },
              { amt: 5, label: '$5', desc: '2 ☕ Double' },
              { amt: 10, label: '$10', desc: '4 ☕ Studio' },
              { amt: 25, label: '$25', desc: '🌟 VIP' },
            ].map(tier => (
              <button
                key={tier.amt}
                type="button"
                className={`kofi-amount-chip ${selectedAmount === tier.amt && !isCustom ? 'active' : ''}`}
                onClick={() => handleSelectAmount(tier.amt)}
              >
                <span className="chip-amt">{tier.label}</span>
                <span className="chip-desc">{tier.desc}</span>
              </button>
            ))}
            <button
              type="button"
              className={`kofi-amount-chip custom-btn ${isCustom ? 'active' : ''}`}
              onClick={() => setIsCustom(!isCustom)}
            >
              <span className="chip-amt">Custom</span>
              <span className="chip-desc">✏️ Any $</span>
            </button>
          </div>

          {isCustom && (
            <form className="kofi-custom-form" onSubmit={handleCustomSubmit}>
              <div className="kofi-custom-input-wrap">
                <span className="kofi-currency-prefix">$</span>
                <input
                  type="number"
                  min="1"
                  max="1000"
                  step="1"
                  placeholder="Enter USD amount"
                  value={customAmount}
                  onChange={(e) => setCustomAmount(e.target.value)}
                  autoFocus
                  className="kofi-custom-input"
                />
              </div>
              <button type="submit" className="kofi-custom-submit">
                Apply ${customAmount || '0'}
              </button>
            </form>
          )}
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
          height: 90dvh;
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
          flex-shrink: 0;
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

        /* Amount Selector Strip */
        .kofi-amount-selector-strip {
          padding: 12px 18px;
          background: #141414;
          border-bottom: 1px solid rgba(255, 255, 255, 0.08);
          flex-shrink: 0;
          display: flex;
          flex-direction: column;
          gap: 10px;
        }

        .kofi-amount-label {
          display: flex;
          align-items: center;
          justify-content: space-between;
          font-size: 11.5px;
        }

        .kofi-amount-heading {
          font-weight: 700;
          color: #a1a1aa;
          text-transform: uppercase;
          letter-spacing: 0.6px;
        }

        .kofi-amount-badge {
          background: rgba(245, 158, 11, 0.15);
          border: 1px solid rgba(245, 158, 11, 0.35);
          color: #fbbf24;
          font-size: 11px;
          font-weight: 700;
          padding: 2px 8px;
          border-radius: 999px;
          letter-spacing: 0.2px;
        }

        .kofi-chips-grid {
          display: grid;
          grid-template-columns: repeat(5, 1fr);
          gap: 6px;
        }

        .kofi-amount-chip {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 7px 4px;
          background: rgba(255, 255, 255, 0.04);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 12px;
          cursor: pointer;
          transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
          color: #e4e4e7;
        }

        .kofi-amount-chip:hover {
          background: rgba(255, 255, 255, 0.09);
          border-color: rgba(255, 255, 255, 0.25);
          transform: translateY(-1px);
        }

        .kofi-amount-chip.active {
          background: linear-gradient(135deg, rgba(245, 158, 11, 0.25), rgba(217, 119, 6, 0.3));
          border-color: #f59e0b;
          color: #ffffff;
          box-shadow: 0 4px 14px rgba(245, 158, 11, 0.25), inset 0 0 0 1px #f59e0b;
          transform: scale(1.02);
        }

        .chip-amt {
          font-size: 13px;
          font-weight: 800;
          line-height: 1.1;
        }

        .chip-desc {
          font-size: 10px;
          color: #888888;
          margin-top: 2px;
          font-weight: 500;
          white-space: nowrap;
        }

        .kofi-amount-chip.active .chip-desc {
          color: #fed7aa;
        }

        .kofi-custom-form {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-top: 2px;
        }

        .kofi-custom-input-wrap {
          position: relative;
          flex: 1;
          display: flex;
          align-items: center;
        }

        .kofi-currency-prefix {
          position: absolute;
          left: 10px;
          color: #a1a1aa;
          font-weight: 700;
          font-size: 13px;
          pointer-events: none;
        }

        .kofi-custom-input {
          width: 100%;
          padding: 6px 10px 6px 22px;
          background: rgba(0, 0, 0, 0.4);
          border: 1px solid rgba(255, 255, 255, 0.15);
          border-radius: 10px;
          color: #fff;
          font-size: 13px;
          font-weight: 700;
          outline: none;
        }

        .kofi-custom-input:focus {
          border-color: #f59e0b;
          box-shadow: 0 0 0 2px rgba(245, 158, 11, 0.2);
        }

        .kofi-custom-submit {
          padding: 6px 14px;
          background: #f59e0b;
          color: #000;
          border: none;
          border-radius: 10px;
          font-size: 12px;
          font-weight: 700;
          cursor: pointer;
          transition: background 0.2s ease;
          white-space: nowrap;
        }

        .kofi-custom-submit:hover {
          background: #fbbf24;
        }

        .kofi-iframe-container {
          position: relative;
          flex: 1;
          width: 100%;
          background: #f9f9f9;
          overflow-y: auto;
          -webkit-overflow-scrolling: touch;
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
          min-height: 680px;
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
            padding: 8px 6px;
            padding-top: max(env(safe-area-inset-top, 0px), 16px);
            padding-bottom: 0;
            align-items: flex-end;
          }
          .kofi-modal-content {
            height: auto;
            max-height: calc(100dvh - env(safe-area-inset-top, 0px) - 24px);
            border-radius: 24px 24px 0 0;
            margin-bottom: 0;
            padding-bottom: max(env(safe-area-inset-bottom, 0px), 16px);
          }
          .kofi-modal-header {
            padding: 12px 14px;
          }
          .kofi-title-box p {
            max-width: 190px;
          }
          .kofi-amount-selector-strip {
            padding: 8px 12px;
          }
          .kofi-chips-grid {
            gap: 4px;
          }
          .kofi-amount-chip {
            padding: 5px 2px;
            border-radius: 9px;
          }
          .chip-amt {
            font-size: 11.5px;
          }
          .chip-desc {
            font-size: 8.5px;
          }
        }

        @media (max-height: 700px) {
          .kofi-modal-overlay {
            padding: 4px;
          }
          .kofi-modal-content {
            height: 98vh;
            height: 98dvh;
            max-height: 98dvh;
            border-radius: 16px;
          }
        }
      `}</style>
    </div>
  );
};

export default KofiModal;
