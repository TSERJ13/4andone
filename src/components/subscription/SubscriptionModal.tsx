"use client";

import React, { useState, useEffect } from 'react';
import { PayPalScriptProvider, PayPalButtons } from '@paypal/react-paypal-js';
import { X, Sparkles, Check, ShieldCheck, Music } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { TelegramLogin } from '@/components/auth/TelegramLogin';

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

  useEffect(() => {
    if (!isOpen) {
      setSuccess(false);
      setErrorMsg(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="sub-modal-overlay">
      <div className="sub-modal-card animate-in-popup">
        <button className="sub-close-btn" onClick={onClose} aria-label="Close">
          <X size={20} />
        </button>

        <div className="sub-badge">
          <Sparkles size={16} className="text-emerald" />
          <span>4and.one Premium</span>
        </div>

        <div className="sub-header">
          <h2 className="sub-title">Listen Without Limits</h2>
          <p className="sub-subtitle">Enjoy uninterrupted music, high quality audio & support creators.</p>
        </div>

        <div className="pricing-box">
          <div className="pricing-top">
            <span className="price-val">$1.99</span>
            <span className="price-period">/ month</span>
          </div>
          <span className="pricing-tag">Cancel anytime • No commitment</span>
        </div>

        <div className="perks-list">
          <div className="perk-item">
            <div className="perk-icon"><Check size={16} /></div>
            <span><strong>100% Ad-Free Experience</strong> (Zero popups or banners)</span>
          </div>
          <div className="perk-item">
            <div className="perk-icon"><Check size={16} /></div>
            <span><strong>Continuous Flow</strong> without 5-track interruptions</span>
          </div>
          <div className="perk-item">
            <div className="perk-icon"><Check size={16} /></div>
            <span><strong>Sync across devices</strong> via Telegram</span>
          </div>
        </div>

        {/* Step 1: Must be logged in via Telegram first to link subscription */}
        {!isAuthenticated ? (
          <div className="sub-auth-step">
            <div className="step-label">
              <span>Step 1: Sign in with Telegram to link subscription</span>
            </div>
            <div className="tg-login-box">
              <TelegramLogin />
            </div>
          </div>
        ) : isPremium || success ? (
          <div className="sub-success-box">
            <ShieldCheck size={40} className="text-emerald" />
            <h3>You are a Premium Member!</h3>
            <p>Thank you for supporting 4and.one. Enjoy unlimited music!</p>
            <button className="sub-done-btn" onClick={onClose}>Continue Listening</button>
          </div>
        ) : (
          <div className="sub-payment-step">
            <div className="step-label">
              <span>Logged in as <strong>@{user?.username || user?.first_name}</strong></span>
            </div>
            {errorMsg && <div className="sub-err">{errorMsg}</div>}

            <div className="paypal-btn-wrap">
              <PayPalScriptProvider options={{
                clientId: PAYPAL_CLIENT_ID,
                components: "buttons",
                intent: "subscription",
                vault: true
              }}>
                <PayPalButtons
                  style={{
                    shape: 'rect',
                    color: 'gold',
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
          </div>
        )}

        <div className="sub-footer-note">
          <ShieldCheck size={14} />
          <span>Secured by PayPal • 256-bit SSL encrypted</span>
        </div>
      </div>

      <style jsx>{`
        .sub-modal-overlay {
          position: fixed;
          inset: 0;
          background: rgba(0, 0, 0, 0.82);
          backdrop-filter: blur(10px);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 10001;
          padding: 16px;
        }

        .sub-modal-card {
          background: #111113;
          border: 1px solid rgba(255, 255, 255, 0.12);
          width: 100%;
          max-width: 440px;
          border-radius: 24px;
          padding: 28px 24px;
          position: relative;
          color: white;
          box-shadow: 0 25px 60px -15px rgba(0, 0, 0, 0.9);
          display: flex;
          flex-direction: column;
          align-items: center;
          text-align: center;
          gap: 18px;
        }

        .sub-close-btn {
          position: absolute;
          top: 18px;
          right: 18px;
          background: rgba(255, 255, 255, 0.06);
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 50%;
          width: 34px;
          height: 34px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #a1a1aa;
          cursor: pointer;
          transition: all 0.2s;
        }
        .sub-close-btn:hover {
          background: rgba(255, 255, 255, 0.12);
          color: white;
        }

        .sub-badge {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          background: rgba(16, 185, 129, 0.12);
          border: 1px solid rgba(16, 185, 129, 0.3);
          color: #10b981;
          padding: 4px 12px;
          border-radius: 20px;
          font-size: 0.8rem;
          font-weight: 700;
          letter-spacing: 0.5px;
          text-transform: uppercase;
        }

        .sub-header {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }
        .sub-title {
          font-size: 1.5rem;
          font-weight: 800;
          letter-spacing: -0.5px;
          margin: 0;
          background: linear-gradient(135deg, #fff 40%, #a1a1aa 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }
        .sub-subtitle {
          font-size: 0.88rem;
          color: #a1a1aa;
          margin: 0;
          line-height: 1.4;
        }

        .pricing-box {
          background: linear-gradient(180deg, rgba(255, 255, 255, 0.05), rgba(255, 255, 255, 0.02));
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 16px;
          padding: 14px 20px;
          width: 100%;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 4px;
        }
        .pricing-top {
          display: flex;
          align-items: baseline;
          gap: 4px;
        }
        .price-val {
          font-size: 2rem;
          font-weight: 800;
          color: #fff;
        }
        .price-period {
          font-size: 0.95rem;
          color: #a1a1aa;
        }
        .pricing-tag {
          font-size: 0.75rem;
          color: #10b981;
          font-weight: 600;
        }

        .perks-list {
          display: flex;
          flex-direction: column;
          gap: 10px;
          width: 100%;
          text-align: left;
        }
        .perk-item {
          display: flex;
          align-items: center;
          gap: 10px;
          font-size: 0.88rem;
          color: #e4e4e7;
        }
        .perk-icon {
          width: 22px;
          height: 22px;
          border-radius: 50%;
          background: rgba(16, 185, 129, 0.15);
          color: #10b981;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }

        .sub-auth-step, .sub-payment-step {
          width: 100%;
          display: flex;
          flex-direction: column;
          gap: 10px;
        }
        .step-label {
          font-size: 0.82rem;
          color: #a1a1aa;
        }
        .tg-login-box {
          width: 100%;
          min-height: 44px;
          display: flex;
          justify-content: center;
        }

        .paypal-btn-wrap {
          width: 100%;
          min-height: 48px;
        }

        .sub-success-box {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 10px;
          padding: 12px;
        }
        .sub-success-box h3 {
          margin: 0;
          font-size: 1.2rem;
        }
        .sub-success-box p {
          margin: 0;
          color: #a1a1aa;
          font-size: 0.88rem;
        }
        .sub-done-btn {
          margin-top: 8px;
          background: #10b981;
          color: black;
          font-weight: 700;
          border: none;
          padding: 10px 24px;
          border-radius: 20px;
          cursor: pointer;
        }

        .sub-err {
          background: rgba(239, 68, 68, 0.15);
          border: 1px solid rgba(239, 68, 68, 0.3);
          color: #f87171;
          font-size: 0.82rem;
          padding: 8px 12px;
          border-radius: 8px;
        }

        .sub-footer-note {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 0.72rem;
          color: #71717a;
        }
      `}</style>
    </div>
  );
};

export default SubscriptionModal;
