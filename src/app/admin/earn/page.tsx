"use client";

import React from 'react';
import { Coins, ExternalLink, Sparkles, TrendingUp, ShieldCheck } from 'lucide-react';
import AdSenseStatsCard from "@/components/admin/AdSenseStatsCard";
import SubscriptionManager from "@/components/admin/SubscriptionManager";

export default function AdminEarnPage() {
  return (
    <div className="earn-page animate-in">
      {/* Header */}
      <div className="page-header">
        <div className="header-info">
          <div className="title-row">
            <div className="earn-badge">
              <Coins size={22} className="earn-icon" />
            </div>
            <div>
              <h1 className="page-title">EARN</h1>
              <p className="page-subtitle">
                Google AdSense monetization, live revenue metrics &amp; audience performance
              </p>
            </div>
          </div>
        </div>

        <div className="header-actions">
          <a
            href="https://www.google.com/adsense"
            target="_blank"
            rel="noopener noreferrer"
            className="adsense-console-btn glass"
          >
            <span><span className="desktop-only">Open </span>AdSense Console</span>
            <ExternalLink size={14} />
          </a>
        </div>
      </div>

      {/* Main Content */}
      <div className="earn-content">
        <SubscriptionManager />
        <AdSenseStatsCard />

        {/* Monetization Insights & Tips */}
        <div className="monetization-grid">
          <div className="monetization-card glass">
            <div className="card-top">
              <div className="icon-wrapper green">
                <TrendingUp size={18} />
              </div>
              <h4>RPM &amp; Revenue Growth</h4>
            </div>
            <p>
              Your Page RPM reflects estimated revenue per 1,000 views. Music players typically see higher engagement and dwell times, which improves ad impressions and viewability.
            </p>
          </div>

          <div className="monetization-card glass">
            <div className="card-top">
              <div className="icon-wrapper blue">
                <Sparkles size={18} />
              </div>
              <h4>Auto Ads &amp; Placements</h4>
            </div>
            <p>
              AdSense Auto Ads are active on 4and.one. Ads are automatically placed in non-intrusive positions to keep the ballroom dance listening experience smooth and fluid.
            </p>
          </div>

          <div className="monetization-card glass">
            <div className="card-top">
              <div className="icon-wrapper amber">
                <ShieldCheck size={18} />
              </div>
              <h4>Payment Threshold</h4>
            </div>
            <p>
              Google AdSense releases monthly earnings around the 21st–26th of each month once your balance reaches Google&apos;s payout threshold (usually €70 / $100).
            </p>
          </div>
        </div>
      </div>

      <style jsx>{`
        .earn-page {
          padding: 32px 40px;
          max-width: 1400px;
          margin: 0 auto;
          width: 100%;
        }

        .page-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 28px;
          flex-wrap: wrap;
          gap: 16px;
        }

        .title-row {
          display: flex;
          align-items: center;
          gap: 16px;
        }

        .earn-badge {
          width: 48px;
          height: 48px;
          border-radius: 14px;
          background: linear-gradient(135deg, rgba(234, 179, 8, 0.2), rgba(202, 138, 4, 0.05));
          border: 1px solid rgba(234, 179, 8, 0.3);
          display: flex;
          align-items: center;
          justify-content: center;
          color: #eab308;
        }

        .page-title {
          font-size: 26px;
          font-weight: 900;
          letter-spacing: -0.5px;
          color: white;
          margin: 0;
          line-height: 1.2;
        }

        .page-subtitle {
          font-size: 13px;
          color: rgba(255, 255, 255, 0.5);
          margin: 4px 0 0 0;
        }

        .adsense-console-btn {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 10px 18px;
          border-radius: 12px;
          font-size: 13px;
          font-weight: 700;
          color: rgba(255, 255, 255, 0.9);
          text-decoration: none;
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.1);
          transition: all 0.2s ease;
        }

        .adsense-console-btn:hover {
          background: rgba(255, 255, 255, 0.1);
          border-color: rgba(255, 255, 255, 0.2);
          color: white;
          transform: translateY(-1px);
        }

        .earn-content {
          display: flex;
          flex-direction: column;
          gap: 24px;
        }

        .monetization-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
          gap: 16px;
          margin-top: 8px;
        }

        .monetization-card {
          padding: 20px 22px;
          border-radius: 16px;
          background: rgba(18, 18, 22, 0.5);
          border: 1px solid rgba(255, 255, 255, 0.06);
        }

        .card-top {
          display: flex;
          align-items: center;
          gap: 12px;
          margin-bottom: 10px;
        }

        .icon-wrapper {
          width: 32px;
          height: 32px;
          border-radius: 10px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .icon-wrapper.green {
          background: rgba(34, 197, 94, 0.15);
          color: #22c55e;
          border: 1px solid rgba(34, 197, 94, 0.2);
        }

        .icon-wrapper.blue {
          background: rgba(59, 130, 246, 0.15);
          color: #3b82f6;
          border: 1px solid rgba(59, 130, 246, 0.2);
        }

        .icon-wrapper.amber {
          background: rgba(245, 158, 11, 0.15);
          color: #f59e0b;
          border: 1px solid rgba(245, 158, 11, 0.2);
        }

        .card-top h4 {
          font-size: 14px;
          font-weight: 700;
          color: white;
          margin: 0;
        }

        .monetization-card p {
          font-size: 12.5px;
          line-height: 1.6;
          color: rgba(255, 255, 255, 0.55);
          margin: 0;
        }

        .desktop-only {
          display: inline;
        }

        @media (max-width: 640px) {
          .desktop-only {
            display: none;
          }

          .earn-page {
            padding: 4px 0 100px 0;
          }

          .page-header {
            flex-direction: row;
            align-items: center;
            justify-content: space-between;
            margin-bottom: 16px;
            gap: 10px;
          }

          .title-row {
            gap: 10px;
          }

          .earn-badge {
            width: 36px;
            height: 36px;
            border-radius: 10px;
          }

          .page-title {
            font-size: 20px;
            letter-spacing: -0.3px;
          }

          .page-subtitle {
            display: none;
          }

          .adsense-console-btn {
            padding: 7px 12px;
            font-size: 11.5px;
            border-radius: 10px;
            gap: 5px;
            white-space: nowrap;
          }

          .earn-content {
            gap: 14px;
          }

          .monetization-grid {
            grid-template-columns: 1fr;
            gap: 12px;
            margin-top: 2px;
          }

          .monetization-card {
            padding: 14px 16px;
            border-radius: 14px;
          }

          .monetization-card p {
            font-size: 12px;
            line-height: 1.5;
          }
        }
      `}</style>
    </div>
  );
}
