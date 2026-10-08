"use client";

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { PayPalScriptProvider, PayPalButtons } from '@paypal/react-paypal-js';
import { ShieldCheck, ArrowLeft, Check, Sparkles } from 'lucide-react';
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
    <div className="yt-premium-landing-page">
      {/* Top Header Bar */}
      <header className="yt-prem-nav">
        <button
          type="button"
          className="yt-prem-back-btn"
          onClick={() => router.back()}
        >
          <ArrowLeft size={18} />
          <span>Back</span>
        </button>
      </header>

      {/* Main Hero Container */}
      <main className="yt-prem-hero-container">
        {/* Ambient Glow */}
        <div className="yt-prem-glow" />

        {/* Site 4ANDONE Official Brand Logo */}
        <div className="yt-prem-brand-header">
          <img
            src="/logo-square.png"
            alt="4ANDONE Logo"
            className="yt-prem-site-logo"
          />
          <span className="yt-prem-logo-text">4ANDONE MUSIC</span>
        </div>

        {/* Hero Title */}
        <h1 className="yt-prem-hero-headline">
          Get Music Premium to listen to music ad-free, offline &amp; with your screen off
        </h1>

        {/* Pricing Subtitle */}
        <p className="yt-prem-pricing-sub">
          1-month trial for $0 • Then $1.99/month • Cancel anytime
        </p>

        {/* Action Button & Payment Flow */}
        <div className="yt-prem-cta-section">
          {!isAuthenticated ? (
            <div className="yt-prem-auth-box">
              <p className="yt-prem-hint">Sign in with Telegram first to activate your Premium</p>
              <TelegramLogin />
            </div>
          ) : isPremium || success ? (
            <div className="yt-prem-success-box">
              <ShieldCheck size={56} style={{ color: '#10b981' }} />
              <h2>You have 4and.one Premium!</h2>
              <p>Enjoy unlimited ad-free music, offline downloads, and uninterrupted Final Mode.</p>
              <Link href="/library" className="yt-prem-main-btn">
                Listen Now
              </Link>
            </div>
          ) : !showPayment ? (
            <button
              type="button"
              className="yt-prem-main-btn"
              onClick={() => setShowPayment(true)}
            >
              Try 1 month for $0
            </button>
          ) : (
            <div className="yt-prem-paypal-box">
              <p className="yt-prem-hint">Logged in as <strong>@{user?.username || user?.first_name}</strong></p>
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
                    color: 'gold',
                    layout: 'vertical',
                    label: 'subscribe',
                    height: 48
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
        </div>

        {/* Disclaimer */}
        <div className="yt-prem-secondary-links">
          <p className="yt-prem-disclaimer">
            You'll be reminded 7 days before your trial ends. Recurring billing. <span className="yt-prem-link-span">Restrictions apply.</span>
          </p>
        </div>

        {/* 3 Key Features Grid */}
        <div className="yt-prem-features-grid">
          <div className="yt-prem-feature-card">
            <div className="yt-prem-feature-check"><Check size={24} /></div>
            <div>
              <h4>Ad-free music</h4>
              <p>Listen to your favorite dance tracks without interruption.</p>
            </div>
          </div>

          <div className="yt-prem-feature-card">
            <div className="yt-prem-feature-check"><Check size={24} /></div>
            <div>
              <h4>Offline downloads</h4>
              <p>Download music directly to your device and practice anywhere.</p>
            </div>
          </div>

          <div className="yt-prem-feature-card">
            <div className="yt-prem-feature-check"><Check size={24} /></div>
            <div>
              <h4>Background play</h4>
              <p>Keep the music playing with your screen locked or while using other apps.</p>
            </div>
          </div>
        </div>
      </main>

      <style jsx>{`
        .yt-premium-landing-page {
          min-height: 100vh;
          width: 100%;
          background: linear-gradient(180deg, #0f3d2e 0%, #0a2d22 45%, #08261c 100%);
          color: #ffffff;
          padding-bottom: 120px;
        }

        .yt-prem-nav {
          padding: 16px 24px;
          display: flex;
          align-items: center;
          position: sticky;
          top: 0;
          z-index: 50;
          background: rgba(15, 61, 46, 0.75);
          border-bottom: 1px solid rgba(52, 211, 153, 0.15);
          backdrop-filter: blur(16px);
          -webkit-backdrop-filter: blur(16px);
        }

        .yt-prem-back-btn {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          background: rgba(255, 255, 255, 0.12);
          border: 1px solid rgba(255, 255, 255, 0.2);
          color: #ffffff;
          font-size: 13px;
          font-weight: 600;
          padding: 8px 18px;
          border-radius: 20px;
          text-decoration: none;
          cursor: pointer;
          transition: all 0.2s ease;
          box-shadow: 0 4px 14px rgba(0, 0, 0, 0.25);
        }

        .yt-prem-back-btn:hover {
          background: rgba(255, 255, 255, 0.22);
          border-color: rgba(255, 255, 255, 0.35);
          transform: translateY(-1px);
        }

        .yt-prem-hero-container {
          position: relative;
          width: 100%;
          max-width: 900px;
          margin: 20px auto 0;
          display: flex;
          flex-direction: column;
          align-items: center;
          text-align: center;
          padding: 0 24px;
        }

        .yt-prem-glow {
          position: absolute;
          top: -40px;
          left: 50%;
          transform: translateX(-50%);
          width: 600px;
          height: 350px;
          background: radial-gradient(circle, rgba(52, 211, 153, 0.25) 0%, rgba(16, 185, 129, 0) 70%);
          pointer-events: none;
          z-index: 0;
        }

        .yt-prem-brand-header {
          position: relative;
          z-index: 1;
          display: flex;
          align-items: center;
          gap: 12px;
          margin-bottom: 24px;
        }

        .yt-prem-site-logo {
          width: 46px;
          height: 46px;
          border-radius: 12px;
          object-fit: cover;
          border: 1px solid rgba(52, 211, 153, 0.5);
          box-shadow: 0 6px 20px rgba(16, 185, 129, 0.4);
        }

        .yt-prem-logo-text {
          font-size: 24px;
          font-weight: 800;
          letter-spacing: -0.5px;
          color: #ffffff;
        }

        .yt-prem-hero-headline {
          position: relative;
          z-index: 1;
          font-size: 2.5rem;
          font-weight: 900;
          line-height: 1.15;
          letter-spacing: -1px;
          max-width: 720px;
          margin: 0 0 16px 0;
          text-shadow: 0 2px 20px rgba(0, 0, 0, 0.3);
        }

        .yt-prem-pricing-sub {
          position: relative;
          z-index: 1;
          font-size: 15px;
          color: rgba(255, 255, 255, 0.85);
          margin: 0 0 32px 0;
          font-weight: 500;
        }

        .yt-prem-cta-section {
          position: relative;
          z-index: 1;
          width: 100%;
          max-width: 380px;
          margin-bottom: 24px;
        }

        .yt-prem-main-btn {
          width: 100%;
          background: #10b981;
          color: #ffffff;
          font-size: 16px;
          font-weight: 700;
          padding: 14px 36px;
          border-radius: 28px;
          border: none;
          cursor: pointer;
          transition: background-color 0.15s, transform 0.15s, box-shadow 0.15s;
          box-shadow: 0 6px 24px rgba(16, 185, 129, 0.45);
          text-decoration: none;
          display: inline-block;
        }

        .yt-prem-main-btn:hover {
          background: #059669;
          transform: scale(1.03);
          box-shadow: 0 8px 30px rgba(16, 185, 129, 0.65);
        }

        .yt-prem-auth-box, .yt-prem-paypal-box, .yt-prem-success-box {
          width: 100%;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 16px;
          background: rgba(255, 255, 255, 0.07);
          border: 1px solid rgba(52, 211, 153, 0.35);
          border-radius: 20px;
          padding: 24px;
          box-shadow: 0 12px 36px rgba(0, 0, 0, 0.35);
          backdrop-filter: blur(12px);
          -webkit-backdrop-filter: blur(12px);
        }

        .yt-prem-hint {
          font-size: 14px;
          color: rgba(255, 255, 255, 0.9);
          margin: 0;
        }

        .yt-prem-err {
          background: rgba(255, 0, 51, 0.2);
          border: 1px solid rgba(255, 0, 51, 0.4);
          color: #ff6b6b;
          font-size: 13px;
          padding: 10px 16px;
          border-radius: 10px;
          width: 100%;
        }

        .yt-prem-secondary-links {
          position: relative;
          z-index: 1;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 12px;
          margin-bottom: 60px;
        }

        .yt-prem-disclaimer {
          font-size: 12px;
          color: rgba(255, 255, 255, 0.65);
          margin: 0;
          max-width: 480px;
          line-height: 1.5;
        }

        .yt-prem-link-span {
          color: #34d399;
          cursor: pointer;
          text-decoration: underline;
        }

        .yt-prem-features-grid {
          position: relative;
          z-index: 1;
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 24px;
          width: 100%;
          max-width: 960px;
          margin-top: 20px;
          text-align: left;
        }

        .yt-prem-feature-card {
          background: rgba(255, 255, 255, 0.06);
          border: 1px solid rgba(52, 211, 153, 0.25);
          border-radius: 18px;
          padding: 24px;
          display: flex;
          gap: 16px;
          align-items: flex-start;
          backdrop-filter: blur(10px);
          -webkit-backdrop-filter: blur(10px);
          transition: all 0.2s ease;
        }

        .yt-prem-feature-card:hover {
          background: rgba(255, 255, 255, 0.09);
          border-color: rgba(52, 211, 153, 0.45);
          transform: translateY(-2px);
        }

        .yt-prem-feature-check {
          color: #34d399;
          flex-shrink: 0;
          margin-top: 2px;
        }

        .yt-prem-feature-card h4 {
          font-size: 16px;
          font-weight: 700;
          margin: 0 0 6px 0;
          color: #ffffff;
        }

        .yt-prem-feature-card p {
          font-size: 13px;
          color: rgba(255, 255, 255, 0.7);
          margin: 0;
          line-height: 1.4;
        }

        @media (max-width: 768px) {
          .yt-prem-nav {
            padding: 12px 16px;
          }
          .yt-prem-hero-headline {
            font-size: 1.8rem;
            letter-spacing: -0.5px;
          }
          .yt-prem-pricing-sub {
            font-size: 14px;
          }
          .yt-prem-features-grid {
            grid-template-columns: 1fr;
            gap: 16px;
          }
          .yt-prem-hero-container {
            margin-top: 10px;
            padding: 0 16px;
          }
        }
      `}</style>
    </div>
  );
}
