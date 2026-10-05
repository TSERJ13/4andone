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
              <h3>Google AdSense<span className="desktop-only"> Performance</span></h3>
              {data?.connected ? (
                <span className="status-pill active">
                  <CheckCircle2 size={12} /> Connected
                </span>
              ) : (
                <span className="status-pill pending">
                  <AlertCircle size={12} /> Setup
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
              <span className="desktop-only">Last </span>7 Days
            </button>
            <button 
              className={`time-tab ${activeTab === 'thisMonth' ? 'active' : ''}`}
              onClick={() => setActiveTab('thisMonth')}
            >
              <span className="desktop-only">This </span>Month
            </button>
          </div>

          {/* Metrics Grid */}
          <div className="metrics-grid">
            <div className="metric-box earnings-box">
              <div className="metric-header">
                <span className="metric-title"><span className="desktop-only">Estimated </span>Earnings</span>
                <span className="metric-icon earnings"><DollarSign size={18} /></span>
              </div>
              <div className="metric-value">€{currentMetrics.earnings}</div>
              <div className="metric-footer">Currency: EUR</div>
            </div>

            <div className="metric-box">
              <div className="metric-header">
                <span className="metric-title"><span className="desktop-only">Ad </span>Impressions</span>
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
            <h4>Google AdSense Direct Integration</h4>
            <p>
              Connect your Google AdSense account with 1 click to stream real-time revenue, clicks, and impressions directly to this dashboard.
            </p>
            <div style={{ marginTop: '16px', marginBottom: '8px' }}>
              <a 
                href="/api/admin/adsense/auth" 
                className="connect-google-btn"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '10px',
                  background: '#ffffff',
                  color: '#1f2937',
                  padding: '10px 20px',
                  borderRadius: '12px',
                  fontWeight: 800,
                  fontSize: '14px',
                  textDecoration: 'none',
                  boxShadow: '0 4px 14px rgba(0,0,0,0.25)',
                  cursor: 'pointer',
                }}
              >
                <svg width="18" height="18" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                </svg>
                Connect with Google AdSense
              </a>
            </div>
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

        .desktop-only {
          display: inline;
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

        @media (max-width: 640px) {
          .desktop-only {
            display: none;
          }

          .adsense-stats-card {
            padding: 16px 14px;
            border-radius: 16px;
            margin-bottom: 16px;
          }

          .card-top-bar {
            margin-bottom: 14px;
            gap: 10px;
          }

          .title-group {
            gap: 10px;
            min-width: 0;
            flex: 1;
          }

          .logo-badge {
            width: 36px;
            height: 36px;
            border-radius: 10px;
            flex-shrink: 0;
          }

          .logo-text {
            font-size: 17px;
          }

          .card-heading {
            gap: 6px;
            flex-wrap: wrap;
            align-items: center;
          }

          .card-heading h3 {
            font-size: 15px;
            line-height: 1.2;
          }

          .card-subtitle {
            font-size: 11px;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
            max-width: 190px;
          }

          .status-pill {
            font-size: 10px;
            padding: 2px 7px;
          }

          .refresh-btn {
            width: 32px;
            height: 32px;
            border-radius: 8px;
            flex-shrink: 0;
          }

          .time-tabs {
            display: grid;
            grid-template-columns: repeat(4, 1fr);
            gap: 6px;
            margin-bottom: 14px;
            padding-bottom: 10px;
          }

          .time-tab {
            padding: 8px 2px;
            font-size: 11.5px;
            font-weight: 700;
            border-radius: 8px;
            text-align: center;
            display: flex;
            align-items: center;
            justify-content: center;
            white-space: nowrap;
          }

          .metrics-grid {
            grid-template-columns: repeat(2, 1fr);
            gap: 10px;
          }

          .metric-box {
            padding: 12px 10px;
            border-radius: 12px;
            gap: 4px;
          }

          .metric-title {
            font-size: 10px;
            letter-spacing: 0.2px;
          }

          .metric-icon {
            width: 26px;
            height: 26px;
            border-radius: 6px;
          }

          .metric-icon :global(svg) {
            width: 14px;
            height: 14px;
          }

          .metric-value {
            font-size: 19px;
            margin-top: 2px;
          }

          .metric-footer {
            font-size: 9.5px;
          }
        }
      `}</style>
    </div>
  );
}
