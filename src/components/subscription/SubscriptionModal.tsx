"use client";

import React, { useState, useEffect } from 'react';
import { PayPalScriptProvider, PayPalButtons } from '@paypal/react-paypal-js';
import { X, ShieldCheck, Check } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { TelegramLogin } from '@/components/auth/TelegramLogin';
import Logo from '@/components/brand/Logo';

const PAYPAL_CLIENT_ID = process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID || 'AR7DFDs4W3LqJNeFTELaFs06b8vuc3tcE6FZSmloQgAmtM05ZaR2_cRJosyOFGWF5ZEsXRAGNQVlFkDn';
const PAYPAL_PLAN_ID = process.env.NEXT_PUBLIC_PAYPAL_PLAN_ID || 'P-2P321243C53094157NLCL5WI';

interface SubscriptionModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SubscriptionModal: React.FC<SubscriptionModalProps> = ({ isOpen, onClose }) => {
  const { user, isAuthenticated, isPremium, activatePremium } = useAuth();
  const [success, setSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [showPayment, setShowPayment] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      setSuccess(false);
      setErrorMsg(null);
      setShowPayment(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="yt-prem-modal-overlay">
      <div className="yt-prem-card animate-in-popup">
        <button className="yt-prem-close-btn" onClick={onClose} aria-label="Close">
          <X size={20} />
        </button>

        {/* Brand Header */}
        <div className="yt-prem-brand">
          <Logo size={28} />
        </div>

        {/* Hero Title */}
        <h2 className="yt-prem-title">
          Get Music Premium to listen to music ad-free, offline &amp; with your screen off
        </h2>

        {/* Pricing Subtitle */}
        <p className="yt-prem-price-sub">
          $1.99/month • Cancel anytime
        </p>

        {/* Perks List */}
        <div className="yt-prem-perks">
          <div className="yt-prem-perk-item">
            <Check size={16} className="yt-prem-check" />
            <span>Ad-free music listening</span>
          </div>
          <div className="yt-prem-perk-item">
            <Check size={16} className="yt-prem-check" />
            <span>Download tracks to listen offline</span>
          </div>
          <div className="yt-prem-perk-item">
            <Check size={16} className="yt-prem-check" />
            <span>Background play &amp; continuous Final Mode</span>
          </div>
        </div>

        {/* Main CTA / Authentication & Payment Step */}
        {!isAuthenticated ? (
          <div className="yt-prem-auth-step">
            <p className="yt-prem-step-hint">Sign in with Telegram first to link your Premium subscription</p>
            <div className="yt-prem-tg-box">
              <TelegramLogin />
            </div>
          </div>
        ) : isPremium || success ? (
          <div className="yt-prem-success">
            <ShieldCheck size={44} style={{ color: '#3ea6ff' }} />
            <h3>You have 4and.one Premium!</h3>
            <p>Enjoy unlimited ad-free music across all your devices.</p>
            <button className="yt-prem-cta-btn" onClick={onClose}>Continue Listening</button>
          </div>
        ) : !showPayment ? (
          <div className="yt-prem-action-wrap">
            <button 
              className="yt-prem-cta-btn"
              onClick={() => setShowPayment(true)}
            >
              Get 4and.one Premium
            </button>
          </div>
        ) : (
          <div className="yt-prem-payment-wrap">
            <p className="yt-prem-step-hint">Logged in as <strong>@{user?.username || user?.first_name}</strong></p>
            {errorMsg && <div className="yt-prem-err">{errorMsg}</div>}
            
            <PayPalScriptProvider options={{
              clientId: PAYPAL_CLIENT_ID,
              components: "buttons",
              intent: "subscription",
              vault: true
            }}>
              <PayPalButtons
                style={{
                  shape: 'pill',
                  color: 'blue',
                  layout: 'vertical',
                  label: 'subscribe',
                  height: 44
                }}
                createSubscription={(data, actions) => {
                  return actions.subscription.create({
                    plan_id: PAYPAL_PLAN_ID
                  });
                }}
                onApprove={async (data) => {
                  if (data.subscriptionID) {
                    await activatePremium(data.subscriptionID);
                    setSuccess(true);
                  }
                }}
                onError={(err) => {
                  console.error("[PAYPAL-ERROR]", err);
                  setErrorMsg("Subscription processing failed. Please try again.");
                }}
              />
            </PayPalScriptProvider>
          </div>
        )}

        <p className="yt-prem-footer-disclaimer">
          Recurring billing. Cancel anytime in account settings. Secured by PayPal 256-bit SSL.
        </p>
      </div>

      <style jsx>{`
        .yt-prem-modal-overlay {
          position: fixed;
          inset: 0;
          background: rgba(0, 0, 0, 0.86);
          backdrop-filter: blur(12px);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 10001;
          padding: 16px;
        }

        .yt-prem-card {
          background: radial-gradient(circle at 85% 20%, #3d1248 0%, #0c0c0e 65%);
          border: 1px solid rgba(255, 255, 255, 0.12);
          width: 100%;
          max-width: 500px;
          border-radius: 20px;
          padding: 36px 32px;
          position: relative;
          color: white;
          box-shadow: 0 30px 70px rgba(0, 0, 0, 0.95);
          display: flex;
          flex-direction: column;
          align-items: center;
          text-align: center;
          gap: 16px;
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

        .yt-prem-brand {
          margin-bottom: 4px;
        }

        .yt-prem-title {
          font-size: 1.75rem;
          font-weight: 800;
          line-height: 1.25;
          letter-spacing: -0.5px;
          color: #ffffff;
          margin: 0;
          max-width: 420px;
        }

        .yt-prem-price-sub {
          font-size: 14px;
          color: #aaaaaa;
          margin: 0;
          font-weight: 500;
        }

        .yt-prem-perks {
          display: flex;
          flex-direction: column;
          gap: 8px;
          margin: 6px 0;
          text-align: left;
          width: 100%;
          max-width: 340px;
        }

        .yt-prem-perk-item {
          display: flex;
          align-items: center;
          gap: 10px;
          font-size: 13.5px;
          color: #dddddd;
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
          margin-top: 6px;
        }

        .yt-prem-cta-btn {
          background: #3ea6ff;
          color: #030303;
          font-size: 14px;
          font-weight: 700;
          padding: 12px 32px;
          border-radius: 20px;
          border: none;
          cursor: pointer;
          transition: background-color 0.15s, transform 0.15s;
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
          color: #717171;
          margin: 4px 0 0 0;
          line-height: 1.4;
          max-width: 360px;
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
