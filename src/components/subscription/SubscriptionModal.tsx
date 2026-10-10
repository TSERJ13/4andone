"use client";

import React, { useState, useEffect } from 'react';
import { PayPalPreload, PayPalSubscribeButton } from '@/components/subscription/PayPalCheckout';
import { X, ShieldCheck, Check, Play } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { TelegramLogin } from '@/components/auth/TelegramLogin';


interface SubscriptionModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SubscriptionModal: React.FC<SubscriptionModalProps> = ({ isOpen, onClose }) => {
  const { user, isAuthenticated, isPremium, activatePremium, cancelSubscription } = useAuth();
  const [success, setSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [showPayment, setShowPayment] = useState(false);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      setSuccess(false);
      setErrorMsg(null);
      setShowPayment(false);
      setShowCancelConfirm(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="yt-prem-modal-overlay" onClick={onClose}>
      <div className="yt-prem-card animate-in-popup" onClick={(e) => e.stopPropagation()}>
        <button className="yt-prem-close-btn" onClick={onClose} aria-label="Close">
          <X size={20} />
        </button>

        {/* Brand Header */}
        <div className="yt-prem-brand-header">
          <div className="yt-prem-logo-circle">
            <Play size={16} fill="#ffffff" color="#ffffff" style={{ marginLeft: '2px' }} />
          </div>
          <span className="yt-prem-logo-text">4and.one Music</span>
        </div>

        {/* Hero Title */}
        <h2 className="yt-prem-title">
          Get Music Premium to listen to music ad-free, offline &amp; with your screen off
        </h2>

        {/* Pricing Subtitle */}
        <p className="yt-prem-price-sub">
          $1.99/month • Cancel anytime
        </p>

        {/* Main CTA / Authentication & Payment Step */}
        <PayPalPreload enabled={isAuthenticated && !isPremium}>
        {!isAuthenticated ? (
          <div className="yt-prem-auth-step">
            <p className="yt-prem-step-hint">Sign in with Telegram first to link your Premium subscription</p>
            <div className="yt-prem-tg-box">
              <TelegramLogin />
            </div>
          </div>
        ) : isPremium || success ? (
          <div className="yt-prem-success">
            <ShieldCheck size={48} style={{ color: '#3ea6ff' }} />
            <h3>You have 4and.one Premium!</h3>
            <p>Enjoy unlimited ad-free music across all your devices.</p>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', width: '100%' }}>
              <button className="yt-prem-cta-btn" onClick={onClose}>Continue Listening</button>
              
              {!showCancelConfirm ? (
                <button
                  type="button"
                  style={{
                    background: 'transparent',
                    border: '1px solid rgba(239, 68, 68, 0.4)',
                    color: '#ef4444',
                    fontSize: '13px',
                    fontWeight: 600,
                    padding: '8px 16px',
                    borderRadius: '20px',
                    cursor: 'pointer',
                    marginTop: '4px'
                  }}
                  onClick={() => setShowCancelConfirm(true)}
                >
                  Cancel Subscription
                </button>
              ) : (
                <div style={{
                  background: 'rgba(239, 68, 68, 0.1)',
                  border: '1px solid rgba(239, 68, 68, 0.3)',
                  borderRadius: '14px',
                  padding: '12px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px',
                  width: '100%'
                }}>
                  <p style={{ fontSize: '12px', color: '#fca5a5', margin: 0 }}>
                    Are you sure you want to cancel your Premium subscription?
                  </p>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                      type="button"
                      style={{ flex: 1, background: '#ef4444', color: '#fff', border: 'none', borderRadius: '8px', padding: '6px 12px', fontSize: '12px', fontWeight: 700, cursor: 'pointer' }}
                      onClick={async () => {
                        await cancelSubscription();
                        setShowCancelConfirm(false);
                        onClose();
                      }}
                    >
                      Cancel Subscription
                    </button>
                    <button
                      type="button"
                      style={{ flex: 1, background: 'rgba(255,255,255,0.1)', color: '#fff', border: '1px solid rgba(255,255,255,0.2)', borderRadius: '8px', padding: '6px 12px', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}
                      onClick={() => setShowCancelConfirm(false)}
                    >
                      Keep Premium
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        ) : !showPayment ? (
          <div className="yt-prem-action-wrap">
            <button 
              className="yt-prem-cta-btn"
              onClick={() => setShowPayment(true)}
            >
              Get Premium · $1.99/month
            </button>
          </div>
        ) : (
          <div className="yt-prem-payment-wrap">
            <p className="yt-prem-step-hint">Logged in as <strong>@{user?.username || user?.first_name}</strong></p>
            {errorMsg && <div className="yt-prem-err">{errorMsg}</div>}
            
            <PayPalSubscribeButton
              color="blue"
              height={44}
              onApproved={async (id) => { await activatePremium(id); setSuccess(true); }}
              onError={setErrorMsg}
            />
          </div>
        )}
        </PayPalPreload>

        {/* Perks List */}
        <div className="yt-prem-perks">
          <div className="yt-prem-perk-item">
            <Check size={16} className="yt-prem-check" />
            <span>Ad-free music listening &amp; uninterrupted practice</span>
          </div>
          <div className="yt-prem-perk-item">
            <Check size={16} className="yt-prem-check" />
            <span>Download tracks to listen offline anytime</span>
          </div>
          <div className="yt-prem-perk-item">
            <Check size={16} className="yt-prem-check" />
            <span>Continuous Final Mode &amp; background playback</span>
          </div>
        </div>

        <p className="yt-prem-footer-disclaimer">
          Recurring billing. Cancel anytime.
        </p>
      </div>

      <style jsx>{`
        .yt-prem-modal-overlay {
          position: fixed;
          inset: 0;
          background: rgba(0, 0, 0, 0.85);
          backdrop-filter: blur(16px);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 10001;
          padding: 16px;
        }

        .yt-prem-card {
          background: radial-gradient(circle at 50% 25%, #461752 0%, #1c0a24 50%, #0c0c0e 90%);
          border: 1px solid rgba(255, 255, 255, 0.12);
          width: 100%;
          max-width: 520px;
          border-radius: 24px;
          padding: 36px 32px;
          position: relative;
          color: white;
          box-shadow: 0 30px 80px rgba(0, 0, 0, 0.95);
          display: flex;
          flex-direction: column;
          align-items: center;
          text-align: center;
          gap: 14px;
        }

        .yt-prem-close-btn {
          position: absolute;
          top: 16px;
          right: 16px;
          background: rgba(255, 255, 255, 0.08);
          border: none;
          border-radius: 50%;
          width: 36px;
          height: 36px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #aaaaaa;
          cursor: pointer;
          transition: background-color 0.15s, color 0.15s;
        }

        .yt-prem-close-btn:hover {
          background: rgba(255, 255, 255, 0.16);
          color: #ffffff;
        }

        .yt-prem-brand-header {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-bottom: 4px;
        }

        .yt-prem-logo-circle {
          width: 28px;
          height: 28px;
          border-radius: 50%;
          background: #ff0033;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .yt-prem-logo-text {
          font-size: 18px;
          font-weight: 800;
          color: #ffffff;
        }

        .yt-prem-title {
          font-size: 1.6rem;
          font-weight: 800;
          line-height: 1.25;
          letter-spacing: -0.5px;
          color: #ffffff;
          margin: 0;
          max-width: 440px;
        }

        .yt-prem-price-sub {
          font-size: 14px;
          color: rgba(255, 255, 255, 0.8);
          margin: 0 0 4px 0;
          font-weight: 500;
        }

        .yt-prem-perks {
          display: flex;
          flex-direction: column;
          gap: 8px;
          margin: 10px 0 4px 0;
          text-align: left;
          width: 100%;
          max-width: 380px;
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid rgba(255, 255, 255, 0.06);
          border-radius: 14px;
          padding: 14px 18px;
        }

        .yt-prem-perk-item {
          display: flex;
          align-items: center;
          gap: 10px;
          font-size: 13px;
          color: rgba(255, 255, 255, 0.85);
        }

        :global(.yt-prem-check) {
          color: #3ea6ff;
          flex-shrink: 0;
        }

        .yt-prem-action-wrap, .yt-prem-auth-step, .yt-prem-payment-wrap, .yt-prem-success {
          width: 100%;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 10px;
          margin-top: 4px;
        }

        .yt-prem-cta-btn {
          background: #3ea6ff;
          color: #030303;
          font-size: 15px;
          font-weight: 700;
          padding: 12px 32px;
          border-radius: 24px;
          border: none;
          cursor: pointer;
          transition: background-color 0.15s, transform 0.15s, box-shadow 0.15s;
          box-shadow: 0 4px 18px rgba(62, 166, 255, 0.35);
        }

        .yt-prem-cta-btn:hover {
          background: #65b8ff;
          transform: scale(1.02);
        }

        .yt-prem-step-hint {
          font-size: 13px;
          color: #aaaaaa;
          margin: 0;
        }

        .yt-prem-tg-box {
          display: flex;
          justify-content: center;
          width: 100%;
        }

        .yt-prem-err {
          background: rgba(255, 0, 51, 0.15);
          border: 1px solid rgba(255, 0, 51, 0.3);
          color: #ff4b2b;
          font-size: 12.5px;
          padding: 8px 14px;
          border-radius: 8px;
        }

        .yt-prem-footer-disclaimer {
          font-size: 11.5px;
          color: rgba(255, 255, 255, 0.5);
          margin: 4px 0 0 0;
          line-height: 1.4;
          max-width: 380px;
        }

        @media (max-width: 768px) {
          .yt-prem-card {
            padding: 28px 20px;
          }
          .yt-prem-title {
            font-size: 1.35rem;
          }
        }
      `}</style>
    </div>
  );
};

export default SubscriptionModal;
