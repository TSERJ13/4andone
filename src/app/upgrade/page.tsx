"use client";

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { PayPalScriptProvider, PayPalButtons } from '@paypal/react-paypal-js';
import { ShieldCheck, ArrowLeft, Check, Play, Music2 } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { TelegramLogin } from '@/components/auth/TelegramLogin';

const PAYPAL_CLIENT_ID = process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID || 'AR7DFDs4W3LqJNeFTELaFs06b8vuc3tcE6FZSmloQgAmtM05ZaR2_cRJosyOFGWF5ZEsXRAGNQVlFkDn';
const PAYPAL_PLAN_ID = process.env.NEXT_PUBLIC_PAYPAL_PLAN_ID || 'P-2P321243C53094157NLCL5WI';

export default function UpgradePage() {
  const router = useRouter();
  const { user, isAuthenticated, isPremium, activatePremium } = useAuth();
  const [success, setSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [showPayment, setShowPayment] = useState(false);

  return (
    <div className="yt-prem-canvas">
      {/* Mesh Ambient Glow Layers matching official YT Music Premium */}
      <div className="glow-mesh glow-top-right" />
      <div className="glow-mesh glow-top-left" />
      <div className="glow-mesh glow-center" />

      {/* Top Header Bar */}
      <header className="yt-prem-top-bar">
        <button
          type="button"
          className="yt-prem-back-chip"
          onClick={() => router.back()}
        >
          <ArrowLeft size={18} />
          <span>Back</span>
        </button>
      </header>

      {/* Main Content Area */}
      <main className="yt-prem-hero-content">
        {/* Green Play Badge Brand Header */}
        <div className="yt-prem-hero-brand">
          <div className="yt-prem-hero-play-badge">
            <Play size={22} fill="#ffffff" color="#ffffff" style={{ marginLeft: '2px' }} />
          </div>
          <span className="yt-prem-hero-brand-title">4ANDONE Music</span>
        </div>

        {/* Main Headline */}
        <h1 className="yt-prem-title">
          Get Music Premium to listen to music ad-free, offline &amp; with your screen off
        </h1>

        {/* Pricing Text */}
        <p className="yt-prem-subtitle">
          1-month trial for $0 • Then $1.99/month • Cancel anytime
        </p>

        {/* Action Buttons & Auth */}
        <div className="yt-prem-buttons-wrap">
          {!isAuthenticated ? (
            <div className="yt-prem-auth-pill-box">
              <p className="yt-prem-auth-hint">Sign in with Telegram first to activate your Premium</p>
              <TelegramLogin />
            </div>
          ) : isPremium || success ? (
            <div className="yt-prem-active-box">
              <ShieldCheck size={52} color="#10b981" />
              <h2 className="yt-active-title">You have 4ANDONE Premium!</h2>
              <p className="yt-active-sub">Enjoy unlimited ad-free music, offline downloads, and uninterrupted Final Mode.</p>
              <Link href="/library" className="yt-prem-btn-primary">
                Listen Now
              </Link>
            </div>
          ) : !showPayment ? (
            <div className="yt-prem-pill-stack">
              <button
                type="button"
                className="yt-prem-btn-primary"
                onClick={() => setShowPayment(true)}
              >
                Try 1 month for $0
              </button>
            </div>
          ) : (
            <div className="yt-prem-paypal-wrap">
              <p className="yt-prem-auth-hint">Logged in as <strong>@{user?.username || user?.first_name}</strong></p>
              {errorMsg && <div className="yt-prem-error">{errorMsg}</div>}
              
              <PayPalScriptProvider options={{
                clientId: PAYPAL_CLIENT_ID,
                components: "buttons",
                intent: "subscription",
                vault: true
              }}>
                <PayPalButtons
                  style={{
                    shape: 'pill',
                    color: 'gold',
                    layout: 'vertical',
                    label: 'subscribe',
                    height: 52
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
                    } else {
                      setErrorMsg("Subscription approved, but no subscription ID returned.");
                    }
                  }}
                  onError={(err) => {
                    console.error("PayPal Subscription Error:", err);
                    setErrorMsg("Payment processing failed. Please try again.");
                  }}
                />
              </PayPalScriptProvider>
            </div>
          )}

          <p className="yt-prem-disclaimer">
            You'll be reminded 7 days before your trial ends. Recurring billing. <span className="yt-prem-link">Restrictions apply.</span>
          </p>
        </div>

        {/* Floating Feature Cards */}
        <div className="yt-prem-features">
          <div className="yt-prem-feature-item">
            <div className="yt-feature-icon">
              <Check size={22} color="#10b981" />
            </div>
            <div className="yt-feature-text">
              <h3>Ad-free music</h3>
              <p>Listen to your favorite dance tracks without interruption.</p>
            </div>
          </div>

          <div className="yt-prem-feature-item">
            <div className="yt-feature-icon">
              <Check size={22} color="#10b981" />
            </div>
            <div className="yt-feature-text">
              <h3>Offline downloads</h3>
              <p>Download music directly to your device and practice anywhere.</p>
            </div>
          </div>

          <div className="yt-prem-feature-item">
            <div className="yt-feature-icon">
              <Check size={22} color="#10b981" />
            </div>
            <div className="yt-feature-text">
              <h3>Background play</h3>
              <p>Keep the music playing with your screen locked or while using other apps.</p>
            </div>
          </div>
        </div>
      </main>

      <style jsx>{`
        .yt-prem-canvas {
          position: relative;
          min-height: 100vh;
          width: 100%;
          background: #030303;
          color: #ffffff;
          overflow-x: hidden;
          padding-bottom: 120px;
        }

        /* Ambient Multi-color Mesh Gradient Glows */
        .glow-mesh {
          position: absolute;
          border-radius: 50%;
          pointer-events: none;
          z-index: 0;
          filter: blur(80px);
          opacity: 0.85;
        }

        .glow-top-right {
          top: -60px;
          right: -10%;
          width: 600px;
          height: 600px;
          background: radial-gradient(circle, rgba(236, 72, 153, 0.35) 0%, rgba(168, 85, 247, 0.25) 40%, rgba(3, 3, 3, 0) 70%);
        }

        .glow-top-left {
          top: -40px;
          left: -10%;
          width: 650px;
          height: 650px;
          background: radial-gradient(circle, rgba(16, 185, 129, 0.4) 0%, rgba(6, 182, 212, 0.25) 45%, rgba(3, 3, 3, 0) 75%);
        }

        .glow-center {
          top: 300px;
          left: 50%;
          transform: translateX(-50%);
          width: 800px;
          height: 500px;
          background: radial-gradient(circle, rgba(5, 150, 105, 0.2) 0%, rgba(3, 3, 3, 0) 70%);
        }

        /* Header Bar */
        .yt-prem-top-bar {
          position: sticky;
          top: 0;
          z-index: 50;
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 16px 28px;
          background: rgba(3, 3, 3, 0.4);
          backdrop-filter: blur(16px);
          -webkit-backdrop-filter: blur(16px);
        }

        .yt-prem-back-chip {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          background: rgba(255, 255, 255, 0.1);
          border: 1px solid rgba(255, 255, 255, 0.15);
          color: #ffffff;
          font-size: 13px;
          font-weight: 600;
          padding: 8px 18px;
          border-radius: 20px;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .yt-prem-back-chip:hover {
          background: rgba(255, 255, 255, 0.2);
          transform: translateY(-1px);
        }

        /* Hero Content */
        .yt-prem-hero-content {
          position: relative;
          z-index: 10;
          width: 100%;
          max-width: 800px;
          margin: 40px auto 0;
          padding: 0 24px;
          display: flex;
          flex-direction: column;
          align-items: center;
          text-align: center;
        }

        .yt-prem-hero-brand {
          display: flex;
          align-items: center;
          gap: 10px;
          margin-bottom: 24px;
        }

        .yt-prem-hero-play-badge {
          width: 44px;
          height: 44px;
          border-radius: 50%;
          background: linear-gradient(135deg, #10b981 0%, #059669 100%);
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 6px 20px rgba(16, 185, 129, 0.45);
          border: 1px solid rgba(255, 255, 255, 0.2);
        }

        .yt-prem-hero-brand-title {
          font-size: 26px;
          font-weight: 900;
          letter-spacing: -0.5px;
          color: #ffffff;
        }

        .yt-logo-img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .yt-logo-subtext {
          font-size: 26px;
          font-weight: 900;
          letter-spacing: -0.5px;
          color: #ffffff;
        }

        .yt-prem-title {
          font-size: 2.75rem;
          font-weight: 900;
          line-height: 1.15;
          letter-spacing: -1.2px;
          margin: 0 0 20px 0;
          color: #ffffff;
          max-width: 720px;
          text-shadow: 0 4px 30px rgba(0, 0, 0, 0.5);
        }

        .yt-prem-subtitle {
          font-size: 16px;
          font-weight: 500;
          color: rgba(255, 255, 255, 0.85);
          margin: 0 0 36px 0;
          max-width: 600px;
          line-height: 1.4;
        }

        /* Buttons & CTA Stack */
        .yt-prem-buttons-wrap {
          width: 100%;
          max-width: 420px;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 16px;
          margin-bottom: 60px;
        }

        .yt-prem-pill-stack {
          width: 100%;
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .yt-prem-btn-primary {
          width: 100%;
          height: 52px;
          border-radius: 9999px;
          background: #38bdf8;
          color: #030303;
          font-size: 16px;
          font-weight: 700;
          border: none;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          text-decoration: none;
          box-shadow: 0 6px 25px rgba(56, 189, 248, 0.4);
          transition: all 0.2s ease;
        }

        .yt-prem-btn-primary:hover {
          background: #7dd3fc;
          transform: scale(1.02);
          box-shadow: 0 8px 30px rgba(56, 189, 248, 0.6);
        }

        .yt-prem-auth-pill-box, .yt-prem-paypal-wrap, .yt-prem-active-box {
          width: 100%;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 16px;
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.12);
          border-radius: 24px;
          padding: 24px;
          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
        }

        .yt-prem-auth-hint {
          font-size: 14px;
          color: rgba(255, 255, 255, 0.9);
          margin: 0;
        }

        .yt-prem-error {
          background: rgba(255, 0, 51, 0.2);
          border: 1px solid rgba(255, 0, 51, 0.4);
          color: #ff6b6b;
          font-size: 13px;
          padding: 10px 16px;
          border-radius: 12px;
          width: 100%;
        }

        .yt-active-title {
          font-size: 20px;
          font-weight: 800;
          margin: 0;
        }
        .yt-active-sub {
          font-size: 14px;
          color: rgba(255, 255, 255, 0.7);
          margin: 0;
        }

        .yt-prem-disclaimer {
          font-size: 12px;
          color: rgba(255, 255, 255, 0.55);
          margin: 12px 0 0 0;
          line-height: 1.5;
          max-width: 400px;
        }

        .yt-prem-link {
          color: #38bdf8;
          cursor: pointer;
          text-decoration: underline;
        }

        /* Features List */
        .yt-prem-features {
          width: 100%;
          max-width: 720px;
          display: flex;
          flex-direction: column;
          gap: 20px;
          text-align: left;
        }

        .yt-prem-feature-item {
          display: flex;
          align-items: flex-start;
          gap: 16px;
          padding: 16px;
          border-radius: 16px;
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid rgba(255, 255, 255, 0.06);
          backdrop-filter: blur(12px);
          transition: background 0.2s ease;
        }

        .yt-prem-feature-item:hover {
          background: rgba(255, 255, 255, 0.06);
        }

        .yt-feature-icon {
          width: 40px;
          height: 40px;
          border-radius: 50%;
          background: rgba(16, 185, 129, 0.15);
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }

        .yt-feature-text h3 {
          font-size: 16px;
          font-weight: 700;
          margin: 0 0 4px 0;
          color: #ffffff;
        }

        .yt-feature-text p {
          font-size: 14px;
          color: rgba(255, 255, 255, 0.65);
          margin: 0;
          line-height: 1.4;
        }

        @media (max-width: 768px) {
          .yt-prem-top-bar {
            padding: 12px 16px;
          }
          .yt-prem-hero-content {
            margin-top: 20px;
            padding: 0 16px;
          }
          .yt-prem-title {
            font-size: 1.85rem;
            letter-spacing: -0.5px;
          }
          .yt-prem-subtitle {
            font-size: 14px;
          }
          .yt-prem-features {
            gap: 12px;
          }
        }
      `}</style>
    </div>
  );
}
