"use client";

import React, { useState } from 'react';
import Link from 'next/link';
import { PayPalScriptProvider, PayPalButtons } from '@paypal/react-paypal-js';
import { ShieldCheck, ArrowLeft, Play, Check } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { TelegramLogin } from '@/components/auth/TelegramLogin';

const PAYPAL_CLIENT_ID = process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID || 'AR7DFDs4W3LqJNeFTELaFs06b8vuc3tcE6FZSmloQgAmtM05ZaR2_cRJosyOFGWF5ZEsXRAGNQVlFkDn';
const PAYPAL_PLAN_ID = process.env.NEXT_PUBLIC_PAYPAL_PLAN_ID || 'P-2P321243C53094157NLCL5WI';

export default function UpgradePage() {
  const { user, isAuthenticated, isPremium, activatePremium } = useAuth();
  const [success, setSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [showPayment, setShowPayment] = useState(false);

  return (
    <div className="yt-premium-landing-page">
      {/* Top Header Bar */}
      <header className="yt-prem-nav">
        <Link href="/library" className="yt-prem-back-btn">
          <ArrowLeft size={20} />
          <span>Back</span>
        </Link>
      </header>

      {/* Main Hero Container */}
      <main className="yt-prem-hero-container">
        {/* YouTube Music Red Logo */}
        <div className="yt-prem-brand-header">
          <div className="yt-prem-logo-circle">
            <Play size={20} fill="#ffffff" color="#ffffff" style={{ marginLeft: '2px' }} />
          </div>
          <span className="yt-prem-logo-text">4and.one Music</span>
        </div>

        {/* Hero Title */}
        <h1 className="yt-prem-hero-headline">
          Get Music Premium to listen to music ad-free, offline &amp; with your screen off
        </h1>

        {/* Pricing Subtitle */}
        <p className="yt-prem-pricing-sub">
          1-month trial for GEL 0 • Then GEL 14.49/month • Cancel anytime
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
              <ShieldCheck size={56} style={{ color: '#3ea6ff' }} />
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
              Try 1 month for GEL 0
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
                    color: 'blue',
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
        </div>

        {/* Secondary Links & Disclaimers */}
        <div className="yt-prem-secondary-links">
          <button type="button" className="yt-prem-link-btn" onClick={() => !isPremium && !isAuthenticated ? null : setShowPayment(true)}>
            Or save money with a family or student plan
          </button>
          <p className="yt-prem-disclaimer">
            You'll be reminded 7 days before your trial ends. Recurring billing. <span className="yt-prem-link-span">Restrictions apply.</span>
          </p>
        </div>

        {/* Perks Grid */}
        <div className="yt-prem-features-grid">
          <div className="yt-prem-feature-card">
            <Check size={20} className="yt-prem-feature-check" />
            <div>
              <h4>Ad-free listening</h4>
              <p>Enjoy uninterrupted music while practicing or listening to your favorite playlists.</p>
            </div>
          </div>
          <div className="yt-prem-feature-card">
            <Check size={20} className="yt-prem-feature-check" />
            <div>
              <h4>Offline downloads</h4>
              <p>Download your tracks and take your dance music everywhere without internet connection.</p>
            </div>
          </div>
          <div className="yt-prem-feature-card">
            <Check size={20} className="yt-prem-feature-check" />
            <div>
              <h4>Uninterrupted Final Mode</h4>
              <p>Run full Latin &amp; Standard finals practice sessions with zero interruptions or ads.</p>
            </div>
          </div>
        </div>
      </main>

      <style jsx>{`
        .yt-premium-landing-page {
          min-height: 100vh;
          width: 100%;
          background: radial-gradient(circle at 50% 25%, #461752 0%, #1c0a24 45%, #030303 90%);
          color: #ffffff;
          display: flex;
          flex-direction: column;
          align-items: center;
          position: relative;
          overflow-x: hidden;
          padding-bottom: 80px;
        }

        .yt-prem-nav {
          width: 100%;
          max-width: 1200px;
          padding: 24px 32px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          z-index: 10;
        }

        .yt-prem-back-btn {
          display: flex;
          align-items: center;
          gap: 8px;
          color: rgba(255, 255, 255, 0.7);
          font-size: 14px;
          font-weight: 600;
          text-decoration: none;
          transition: color 0.2s;
        }
        .yt-prem-back-btn:hover { color: #ffffff; }

        .yt-prem-hero-container {
          width: 100%;
          max-width: 900px;
          margin: 40px auto 0;
          display: flex;
          flex-direction: column;
          align-items: center;
          text-align: center;
          padding: 0 24px;
        }

        .yt-prem-brand-header {
          display: flex;
          align-items: center;
          gap: 10px;
          margin-bottom: 28px;
        }

        .yt-prem-logo-circle {
          width: 38px;
          height: 38px;
          border-radius: 50%;
          background: #ff0033;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 4px 15px rgba(255, 0, 51, 0.4);
        }

        .yt-prem-logo-text {
          font-size: 24px;
          font-weight: 800;
          letter-spacing: -0.5px;
          color: #ffffff;
        }

        .yt-prem-hero-headline {
          font-size: 3rem;
          font-weight: 800;
          line-height: 1.2;
          letter-spacing: -1px;
          max-width: 820px;
          margin: 0 0 20px 0;
          color: #ffffff;
        }

        .yt-prem-pricing-sub {
          font-size: 16px;
          font-weight: 500;
          color: rgba(255, 255, 255, 0.85);
          margin: 0 0 36px 0;
        }

        .yt-prem-cta-section {
          display: flex;
          flex-direction: column;
          align-items: center;
          width: 100%;
          max-width: 420px;
          margin-bottom: 32px;
        }

        .yt-prem-main-btn {
          background: #3ea6ff;
          color: #030303;
          font-size: 16px;
          font-weight: 700;
          padding: 14px 36px;
          border-radius: 28px;
          border: none;
          cursor: pointer;
          transition: background-color 0.15s, transform 0.15s, box-shadow 0.15s;
          box-shadow: 0 4px 20px rgba(62, 166, 255, 0.35);
          text-decoration: none;
          display: inline-block;
        }

        .yt-prem-main-btn:hover {
          background: #65b8ff;
          transform: scale(1.03);
          box-shadow: 0 6px 25px rgba(62, 166, 255, 0.5);
        }

        .yt-prem-auth-box, .yt-prem-paypal-box, .yt-prem-success-box {
          width: 100%;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 16px;
          background: rgba(255, 255, 255, 0.04);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 20px;
          padding: 24px;
        }

        .yt-prem-hint {
          font-size: 14px;
          color: rgba(255, 255, 255, 0.8);
          margin: 0;
        }

        .yt-prem-err {
          background: rgba(255, 0, 51, 0.15);
          border: 1px solid rgba(255, 0, 51, 0.3);
          color: #ff4b2b;
          font-size: 13px;
          padding: 10px 16px;
          border-radius: 10px;
          width: 100%;
        }

        .yt-prem-secondary-links {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 12px;
          margin-bottom: 60px;
        }

        .yt-prem-link-btn {
          background: none;
          border: none;
          color: #3ea6ff;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          transition: color 0.2s;
        }
        .yt-prem-link-btn:hover { text-decoration: underline; color: #65b8ff; }

        .yt-prem-disclaimer {
          font-size: 12px;
          color: rgba(255, 255, 255, 0.5);
          margin: 0;
          max-width: 480px;
          line-height: 1.5;
        }

        .yt-prem-link-span {
          color: #3ea6ff;
          cursor: pointer;
        }

        .yt-prem-features-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 24px;
          width: 100%;
          max-width: 960px;
          margin-top: 20px;
          text-align: left;
        }

        .yt-prem-feature-card {
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid rgba(255, 255, 255, 0.06);
          border-radius: 16px;
          padding: 24px;
          display: flex;
          gap: 16px;
          align-items: flex-start;
        }

        .yt-prem-feature-check {
          color: #3ea6ff;
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
          color: rgba(255, 255, 255, 0.6);
          margin: 0;
          line-height: 1.4;
        }

        @media (max-width: 768px) {
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
            margin-top: 20px;
            padding: 0 16px;
          }
        }
      `}</style>
    </div>
  );
}
