"use client";

import React, { useState, useEffect } from 'react';
import { DollarSign, Eye, MousePointerClick, TrendingUp, RefreshCw, AlertCircle, CheckCircle2, ExternalLink } from 'lucide-react';

interface MetricData {
  earnings: string;
  impressions: number;
  clicks: number;
  ctr: string;
  rpm: string;
}

interface AdSenseData {
  connected: boolean;
  message?: string;
  error?: string;
  today?: MetricData;
  yesterday?: MetricData;
  last7Days?: MetricData;
  thisMonth?: MetricData;
  dailyTrend?: Array<{
    date: string;
    earnings: string;
    impressions: number;
    clicks: number;
  }>;
  updatedAt?: string;
}

export default function AdSenseStatsCard() {
  const [data, setData] = useState<AdSenseData | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'today' | 'yesterday' | 'last7Days' | 'thisMonth'>('today');

  const fetchStats = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/adsense');
      const json = await res.json();
      setData(json);
    } catch (e: any) {
      setData({ connected: false, error: e.message });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  const currentMetrics = data?.[activeTab] || {
    earnings: '0.00',
    impressions: 0,
    clicks: 0,
    ctr: '0.0%',
    rpm: '0.00',
  };

  return (
    <div className="adsense-stats-card glass">
      {/* Header */}
      <div className="card-top-bar">
        <div className="title-group">
          <div className="logo-badge">
            <span className="logo-text">G</span>
          </div>
          <div>
            <div className="card-heading">
              <h3>Google AdSense Performance</h3>
              {data?.connected ? (
                <span className="status-pill active">
                  <CheckCircle2 size={12} /> Connected
                </span>
              ) : (
                <span className="status-pill pending">
                  <AlertCircle size={12} /> Setup Required
                </span>
              )}
            </div>
            <p className="card-subtitle">Live impressions, clicks &amp; estimated revenue</p>
          </div>
        </div>

        <div className="actions-group">
          <button 
            onClick={fetchStats} 
            className={`refresh-btn glass ${loading ? 'spinning' : ''}`}
            title="Refresh statistics"
          >
            <RefreshCw size={15} />
          </button>
        </div>
      </div>

      {/* Main Body */}
      {data?.connected ? (
        <>
          {/* Period Tabs */}
          <div className="time-tabs">
            <button 
              className={`time-tab ${activeTab === 'today' ? 'active' : ''}`}
              onClick={() => setActiveTab('today')}
            >
              Today
            </button>
            <button 
              className={`time-tab ${activeTab === 'yesterday' ? 'active' : ''}`}
              onClick={() => setActiveTab('yesterday')}
            >
              Yesterday
            </button>
            <button 
              className={`time-tab ${activeTab === 'last7Days' ? 'active' : ''}`}
              onClick={() => setActiveTab('last7Days')}
            >
              Last 7 Days
            </button>
            <button 
              className={`time-tab ${activeTab === 'thisMonth' ? 'active' : ''}`}
              onClick={() => setActiveTab('thisMonth')}
            >
              This Month
            </button>
          </div>

          {/* Metrics Grid */}
          <div className="metrics-grid">
            <div className="metric-box earnings-box">
              <div className="metric-header">
                <span className="metric-title">Estimated Earnings</span>
                <span className="metric-icon earnings"><DollarSign size={18} /></span>
              </div>
              <div className="metric-value">€{currentMetrics.earnings}</div>
              <div className="metric-footer">Currency: EUR</div>
            </div>

            <div className="metric-box">
              <div className="metric-header">
                <span className="metric-title">Ad Impressions</span>
                <span className="metric-icon impressions"><Eye size={18} /></span>
              </div>
              <div className="metric-value">{currentMetrics.impressions.toLocaleString()}</div>
              <div className="metric-footer">Total ad renders</div>
            </div>

            <div className="metric-box">
              <div className="metric-header">
                <span className="metric-title">Clicks</span>
                <span className="metric-icon clicks"><MousePointerClick size={18} /></span>
              </div>
              <div className="metric-value">{currentMetrics.clicks.toLocaleString()}</div>
              <div className="metric-footer">CTR: {currentMetrics.ctr}</div>
            </div>

            <div className="metric-box">
              <div className="metric-header">
                <span className="metric-title">Page RPM</span>
                <span className="metric-icon rpm"><TrendingUp size={18} /></span>
              </div>
              <div className="metric-value">€{currentMetrics.rpm}</div>
              <div className="metric-footer">Revenue per 1k views</div>
            </div>
          </div>
        </>
      ) : (
        <div className="setup-banner">
          <div className="setup-info">
            <h4>Google AdSense API Integration Ready</h4>
            <p>
              Connect your Google Cloud Service Account to stream real-time AdSense revenue, clicks, and impressions directly to this dashboard.
            </p>
          </div>
          <div className="setup-steps-mini">
            <div className="step-item">
              <span className="step-num">1</span>
              <span>Enable <strong>AdSense Management API</strong> in Google Cloud</span>
            </div>
            <div className="step-item">
              <span className="step-num">2</span>
              <span>Create Service Account Key (JSON)</span>
            </div>
            <div className="step-item">
              <span className="step-num">3</span>
              <span>Add Service Account email to AdSense User Management</span>
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        .adsense-stats-card {
          padding: 24px;
          border-radius: 20px;
          margin-bottom: 28px;
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid rgba(255, 255, 255, 0.08);
          box-shadow: 0 10px 30px rgba(0, 0, 0, 0.35);
        }

        .card-top-bar {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 20px;
        }

        .title-group {
          display: flex;
          align-items: center;
          gap: 14px;
        }

        .logo-badge {
          width: 42px;
          height: 42px;
          border-radius: 12px;
          background: linear-gradient(135deg, #4285f4, #34a853, #fbbc05, #ea4335);
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 4px 14px rgba(66, 133, 244, 0.3);
        }

        .logo-text {
          font-size: 20px;
          font-weight: 900;
          color: white;
        }

        .card-heading {
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .card-heading h3 {
          font-size: 18px;
          font-weight: 800;
          color: #ffffff;
          margin: 0;
        }

        .status-pill {
          display: inline-flex;
          align-items: center;
          gap: 5px;
          font-size: 11px;
          font-weight: 700;
          padding: 3px 8px;
          border-radius: 20px;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .status-pill.active {
          background: rgba(34, 197, 94, 0.15);
          color: #4ade80;
          border: 1px solid rgba(34, 197, 94, 0.3);
        }

        .status-pill.pending {
          background: rgba(234, 179, 8, 0.15);
          color: #facc15;
          border: 1px solid rgba(234, 179, 8, 0.3);
        }

        .card-subtitle {
          font-size: 13px;
          color: rgba(255, 255, 255, 0.5);
          margin: 3px 0 0 0;
        }

        .refresh-btn {
          width: 36px;
          height: 36px;
          border-radius: 10px;
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.1);
          color: rgba(255, 255, 255, 0.7);
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .refresh-btn:hover {
          color: white;
          background: rgba(255, 255, 255, 0.1);
          transform: rotate(30deg);
        }

        .refresh-btn.spinning {
          animation: spin 1s linear infinite;
        }

        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }

        .time-tabs {
          display: flex;
          gap: 8px;
          margin-bottom: 20px;
          padding-bottom: 12px;
          border-bottom: 1px solid rgba(255, 255, 255, 0.06);
        }

        .time-tab {
          padding: 8px 16px;
          border-radius: 10px;
          font-size: 13px;
          font-weight: 700;
          background: rgba(255, 255, 255, 0.04);
          color: rgba(255, 255, 255, 0.6);
          border: 1px solid rgba(255, 255, 255, 0.08);
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .time-tab:hover {
          background: rgba(255, 255, 255, 0.08);
          color: white;
        }

        .time-tab.active {
          background: rgba(59, 130, 246, 0.2);
          color: #60a5fa;
          border-color: rgba(59, 130, 246, 0.4);
        }

        .metrics-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 16px;
        }

        @media (max-width: 900px) {
          .metrics-grid {
            grid-template-columns: repeat(2, 1fr);
          }
        }

        .metric-box {
          background: rgba(0, 0, 0, 0.3);
          border: 1px solid rgba(255, 255, 255, 0.06);
          border-radius: 14px;
          padding: 18px;
          display: flex;
          flex-direction: column;
          gap: 6px;
          transition: transform 0.2s ease, border-color 0.2s ease;
        }

        .metric-box:hover {
          transform: translateY(-2px);
          border-color: rgba(255, 255, 255, 0.15);
        }

        .metric-box.earnings-box {
          background: linear-gradient(135deg, rgba(34, 197, 94, 0.1), rgba(16, 185, 129, 0.03));
          border-color: rgba(34, 197, 94, 0.25);
        }

        .metric-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .metric-title {
          font-size: 12px;
          font-weight: 700;
          color: rgba(255, 255, 255, 0.6);
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .metric-icon {
          width: 32px;
          height: 32px;
          border-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .metric-icon.earnings { background: rgba(34, 197, 94, 0.2); color: #4ade80; }
        .metric-icon.impressions { background: rgba(59, 130, 246, 0.2); color: #60a5fa; }
        .metric-icon.clicks { background: rgba(245, 158, 11, 0.2); color: #fbbf24; }
        .metric-icon.rpm { background: rgba(168, 85, 247, 0.2); color: #c084fc; }

        .metric-value {
          font-size: 24px;
          font-weight: 900;
          color: #ffffff;
          margin-top: 4px;
        }

        .metric-footer {
          font-size: 11px;
          color: rgba(255, 255, 255, 0.4);
        }

        .setup-banner {
          background: rgba(245, 158, 11, 0.05);
          border: 1px dashed rgba(245, 158, 11, 0.3);
          border-radius: 14px;
          padding: 20px;
        }

        .setup-info h4 {
          font-size: 15px;
          font-weight: 800;
          color: #f59e0b;
          margin: 0 0 6px 0;
        }

        .setup-info p {
          font-size: 13px;
          color: rgba(255, 255, 255, 0.7);
          margin: 0 0 16px 0;
          line-height: 1.5;
        }

        .setup-steps-mini {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 12px;
        }

        @media (max-width: 800px) {
          .setup-steps-mini {
            grid-template-columns: 1fr;
          }
        }

        .step-item {
          display: flex;
          align-items: center;
          gap: 10px;
          background: rgba(0, 0, 0, 0.25);
          padding: 10px 14px;
          border-radius: 10px;
          font-size: 12px;
          color: rgba(255, 255, 255, 0.8);
          border: 1px solid rgba(255, 255, 255, 0.05);
        }

        .step-num {
          width: 22px;
          height: 22px;
          border-radius: 50%;
          background: #f59e0b;
          color: black;
          font-size: 12px;
          font-weight: 900;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }
      `}</style>
    </div>
  );
}
