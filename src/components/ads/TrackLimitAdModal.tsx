"use client";

import React, { useState, useEffect } from 'react';
import { X, Sparkles, Volume2, ShieldCheck } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { AdBanner } from '@/components/ads/AdBanner';

interface TrackLimitAdModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const TrackLimitAdModal: React.FC<TrackLimitAdModalProps> = ({ isOpen, onClose }) => {
  const { setIsSubscriptionModalOpen } = useAuth();
  const [countdown, setCountdown] = useState(5);

  useEffect(() => {
    if (isOpen) {
      setCountdown(5);
      const timer = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(timer);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleOpenSubscription = () => {
    onClose();
    setIsSubscriptionModalOpen(true);
  };

  return (
    <div className="track-ad-modal-overlay">
      <div className="track-ad-card animate-in-popup">
        {/* Skip button appears after countdown */}
        <div className="track-ad-top">
          <span className="track-ad-badge">Sponsored Intermission</span>
          {countdown > 0 ? (
            <span className="track-ad-timer">Skip in {countdown}s</span>
          ) : (
            <button className="track-ad-skip-btn" onClick={onClose}>
              <span>Skip</span>
              <X size={16} />
            </button>
          )}
        </div>

        <div className="track-ad-heading">
          <h3>You've enjoyed 10 tracks!</h3>
          <p>Music will continue shortly. Or go ad-free with Premium.</p>
        </div>

        {/* Clean Ad Container */}
        <div className="track-ad-banner-box">
          <AdBanner slot="9997722559" width={320} height={100} />
        </div>

        {/* Premium Upgrade Promotion Banner */}
        <div className="track-ad-premium-cta" onClick={handleOpenSubscription}>
          <div className="cta-left">
            <div className="cta-icon">
              <Sparkles size={18} className="text-emerald" />
            </div>
            <div className="cta-text">
              <strong>Remove all ads with Premium</strong>
              <span>Only $1.99/mo • Instant activation</span>
            </div>
          </div>
          <button className="cta-btn" type="button">Upgrade</button>
        </div>
      </div>

      <style jsx>{`
        .track-ad-modal-overlay {
          position: fixed;
          inset: 0;
          background: rgba(0, 0, 0, 0.88);
          backdrop-filter: blur(12px);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 10000;
          padding: 16px;
        }

        .track-ad-card {
          background: #121214;
          border: 1px solid rgba(255, 255, 255, 0.12);
          width: 100%;
          max-width: 420px;
          border-radius: 24px;
          padding: 24px;
          display: flex;
          flex-direction: column;
          gap: 16px;
          color: white;
          box-shadow: 0 30px 70px rgba(0, 0, 0, 0.95);
        }

        .track-ad-top {
          display: flex;
          align-items: center;
          justify-content: space-between;
          width: 100%;
        }

        .track-ad-badge {
          font-size: 0.72rem;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          color: #a1a1aa;
          background: rgba(255, 255, 255, 0.05);
          padding: 4px 10px;
          border-radius: 12px;
          border: 1px solid rgba(255, 255, 255, 0.08);
        }

        .track-ad-timer {
          font-size: 0.8rem;
          color: #a1a1aa;
          font-weight: 600;
        }

        .track-ad-skip-btn {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          background: #10b981;
          color: black;
          border: none;
          font-weight: 700;
          font-size: 0.85rem;
          padding: 6px 14px;
          border-radius: 16px;
          cursor: pointer;
          transition: all 0.15s;
        }
        .track-ad-skip-btn:hover {
          background: #34d399;
          transform: scale(1.02);
        }

        .track-ad-heading {
          text-align: center;
        }
        .track-ad-heading h3 {
          margin: 0;
          font-size: 1.25rem;
          font-weight: 700;
        }
        .track-ad-heading p {
          margin: 4px 0 0;
          font-size: 0.85rem;
          color: #a1a1aa;
        }

        .track-ad-banner-box {
          width: 100%;
          min-height: 100px;
          background: rgba(0, 0, 0, 0.3);
          border-radius: 16px;
          border: 1px dashed rgba(255, 255, 255, 0.1);
          display: flex;
          align-items: center;
          justify-content: center;
          overflow: hidden;
        }

        .track-ad-premium-cta {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          padding: 12px 14px;
          background: linear-gradient(135deg, rgba(16, 185, 129, 0.15), rgba(16, 185, 129, 0.05));
          border: 1px solid rgba(16, 185, 129, 0.3);
          border-radius: 16px;
          cursor: pointer;
          transition: all 0.2s;
        }
        .track-ad-premium-cta:hover {
          border-color: rgba(16, 185, 129, 0.6);
          background: linear-gradient(135deg, rgba(16, 185, 129, 0.22), rgba(16, 185, 129, 0.08));
        }

        .cta-left {
          display: flex;
          align-items: center;
          gap: 10px;
          text-align: left;
        }
        .cta-icon {
          width: 32px;
          height: 32px;
          border-radius: 50%;
          background: rgba(16, 185, 129, 0.2);
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }
        .cta-text {
          display: flex;
          flex-direction: column;
        }
        .cta-text strong {
          font-size: 0.88rem;
          color: white;
        }
        .cta-text span {
          font-size: 0.75rem;
          color: #10b981;
        }

        .cta-btn {
          background: #10b981;
          color: black;
          font-weight: 700;
          font-size: 0.82rem;
          border: none;
          padding: 8px 14px;
          border-radius: 14px;
          cursor: pointer;
          flex-shrink: 0;
        }
      `}</style>
    </div>
  );
};

export default TrackLimitAdModal;
