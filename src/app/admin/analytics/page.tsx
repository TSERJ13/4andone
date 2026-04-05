"use client";

import React from 'react';
import { 
  BarChart3, 
  TrendingUp, 
  Users, 
  Clock, 
  PlayCircle
} from 'lucide-react';

export default function AdminAnalytics() {
  const chartMock = [
    { label: 'Mon', value: 45 },
    { label: 'Tue', value: 52 },
    { label: 'Wed', value: 38 },
    { label: 'Thu', value: 65 },
    { label: 'Fri', value: 48 },
    { label: 'Sat', value: 72 },
    { label: 'Sun', value: 85 },
  ];

  return (
    <div className="admin-analytics animate-in">
      <div className="analytics-actions-row">
        <div className="header-info">
          <h2>Platform Insights</h2>
          <p className="text-secondary">Track user engagement and system reach.</p>
        </div>
        <div className="header-actions">
          <button className="btn-secondary glass">Last 7 Days</button>
          <button className="btn-primary">Generate Report</button>
        </div>
      </div>

      <div className="analytics-summary-grid">
        <div className="metric-card glass">
          <div className="metric-header">
            <Users size={20} className="text-primary" />
            <span>Active Listeners</span>
          </div>
          <div className="metric-value">1,204</div>
          <div className="metric-trend high">+12.4% <TrendingUp size={14} /></div>
        </div>
        <div className="metric-card glass">
          <div className="metric-header">
            <PlayCircle size={20} className="text-primary" />
            <span>Total Streams</span>
          </div>
          <div className="metric-value">45,812</div>
          <div className="metric-trend high">+5.2% <TrendingUp size={14} /></div>
        </div>
        <div className="metric-card glass">
          <div className="metric-header">
            <Clock size={20} className="text-primary" />
            <span>Avg. Session</span>
          </div>
          <div className="metric-value">42m 12s</div>
          <div className="metric-trend neutral">Stable</div>
        </div>
      </div>

      <div className="usage-chart-section glass">
        <div className="chart-header">
          <BarChart3 size={20} className="text-primary" />
          <h3>Weekly Traffic Distribution</h3>
        </div>
        <div className="bars-container">
          {chartMock.map((item) => (
            <div key={item.label} className="bar-wrapper">
              <div 
                className="bar-fill" 
                style={{ height: `${item.value}%` }}
              ></div>
              <span className="label">{item.label}</span>
            </div>
          ))}
        </div>
      </div>

      <style jsx>{`
        .admin-analytics { display: flex; flex-direction: column; gap: 32px; padding-bottom: 120px; }
        
        .analytics-actions-row {
          display: flex; align-items: center; justify-content: space-between;
        }

        .header-info h2 { font-size: 22px; font-weight: 800; margin-bottom: 4px; }
        .header-actions { display: flex; gap: 12px; }

        .analytics-summary-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 24px; }
        .metric-card { padding: 32px; border-radius: 24px; }
        .metric-header { display: flex; align-items: center; gap: 12px; font-size: 11px; color: #71717a; margin-bottom: 16px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.1em; }
        .metric-value { font-size: 40px; font-weight: 900; margin-bottom: 8px; letter-spacing: -1.5px; }
        .metric-trend { font-size: 13px; font-weight: 700; display: flex; align-items: center; gap: 4px; }
        .metric-trend.high { color: #1db954; }
        .metric-trend.neutral { color: #a1a1aa; }

        .usage-chart-section { padding: 40px; border-radius: 28px; }
        .chart-header { display: flex; align-items: center; gap: 12px; margin-bottom: 48px; }
        .chart-header h3 { font-size: 20px; font-weight: 800; }

        .bars-container { height: 300px; display: flex; align-items: flex-end; justify-content: space-around; gap: 20px; padding: 0 20px; }
        .bar-wrapper { flex: 1; display: flex; flex-direction: column; align-items: center; gap: 20px; }
        .bar-fill { width: 100%; max-width: 50px; background: #1db954; border-radius: 8px 8px 0 0; opacity: 0.8; transition: all 1s cubic-bezier(0.4, 0, 0.2, 1); }
        .bar-fill:hover { opacity: 1; transform: scaleX(1.1) translateY(-8px); filter: drop-shadow(0 0 15px rgba(29, 185, 84, 0.4)); }
        .label { font-size: 12px; font-weight: 700; color: #71717a; text-transform: uppercase; letter-spacing: 0.5px; }

        .text-primary { color: #1db954; }
        .text-secondary { color: #a1a1aa; }

        .animate-in { animation: animateIn 0.5s cubic-bezier(0.4, 0, 0.2, 1); }
        @keyframes animateIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>
    </div>
  );
}
