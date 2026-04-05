"use client";

import React from 'react';
import {
  Music,
  Users,
  Cpu,
  TrendingUp,
  PlayCircle,
  Plus,
  PauseCircle
} from 'lucide-react';
import BulkUpload from "../../../components/admin/BulkUpload";
import { useAudio } from '@/components/audio/AudioProvider';
import { useStudio } from '@/components/admin/StudioProvider';

export default function AdminDashboard() {
  const { togglePlay, isPlaying } = useAudio();
  const { tracks, stats: studioStats } = useStudio();

  const stats = [
    {
      label: 'Cloud Storage',
      value: studioStats.storageUsed,
      icon: <TrendingUp size={20} />,
      change: 'Calculated dynamically',
      color: '#1db954'
    },
    {
      label: 'Total Folders',
      value: '8',
      icon: <Plus size={20} />,
      change: 'Active organization',
      color: '#3b82f6'
    },
    {
      label: 'Active Playlists',
      value: '14',
      icon: <Users size={20} />,
      change: 'Production ready',
      color: '#f59e0b'
    },
    {
      label: 'Total Tracks',
      value: tracks.length.toString(),
      icon: <Music size={20} />,
      change: '+ tracks live',
      color: '#1db954'
    },
  ];

  return (
    <div className="dashboard-container animate-in">
      <div className="dashboard-grid">
        {/* Left Column: Core Workflow */}
        <div className="main-column">
          <section className="dashboard-section glass">
            <div className="section-header">
              <div className="header-info">
                <h2>Bulk Music Upload</h2>
                <p>Ingest professional tracks to your studio library.</p>
              </div>
              <Plus size={20} className="text-primary" />
            </div>
            <BulkUpload />
          </section>
        </div>

        {/* Right Column: Stats & Monitoring */}
        <div className="side-column">
          <div className="mini-stats-grid">
            {stats.map((stat) => (
              <div key={stat.label} className="mini-stat-card glass">
                <div className="stat-header">
                  <div className="stat-icon" style={{ color: stat.color }}>{stat.icon}</div>
                  <span className="stat-label">{stat.label}</span>
                </div>
                <div className="stat-body">
                  <span className="stat-value">{stat.value}</span>
                  <span className="stat-change">{stat.change}</span>
                </div>
              </div>
            ))}
          </div>

          <section className="dashboard-section glass activity-section">
            <div className="section-header">
              <h2>Studio Library</h2>
              <button className="text-btn">Manage Selection</button>
            </div>
            <div className="activity-list">
              {tracks.slice(0, 5).map((track, i) => (
                <div key={track.id || i} className="activity-item">
                  <button className="activity-icon-btn glass" onClick={() => togglePlay()}>
                    {isPlaying && i === 0 ? <PauseCircle size={18} className="text-primary" /> : <PlayCircle size={18} className="text-primary" />}
                  </button>
                  <div className="activity-info">
                    <p className="activity-name">{track.title || 'Untitled'}</p>
                    <p className="activity-meta">Active Selection • {track.artist || 'Unknown'}</p>
                  </div>
                  <div className="activity-status">
                    <span className="p-dot" style={{ opacity: i === 0 ? 1 : 0.3 }}></span>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>
      </div>

      <style jsx>{`
        .dashboard-container {
          display: flex;
          flex-direction: column;
          gap: 0;
          padding-bottom: 20px;
        }

        .dashboard-grid {
          display: grid;
          grid-template-columns: 1fr 360px;
          gap: 40px;
          align-items: start;
        }

        .dashboard-section {
          padding: 32px;
          border-radius: 24px;
          overflow: hidden;
        }

        .section-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 32px;
        }

        .header-info h2 { font-size: 22px; font-weight: 800; margin-bottom: 6px; }
        .header-info p { font-size: 14px; color: #71717a; }

        .mini-stats-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 16px;
          margin-bottom: 24px;
        }

        .mini-stat-card {
          padding: 20px;
          border-radius: 20px;
          display: flex;
          flex-direction: column;
          gap: 12px;
          min-width: 0;
        }

        .stat-header { display: flex; align-items: center; gap: 10px; overflow: hidden; }
        .stat-label { font-size: 10px; font-weight: 800; color: #71717a; text-transform: uppercase; white-space: nowrap; letter-spacing: 0.5px; }
        .stat-value { font-size: 24px; font-weight: 900; display: block; }
        .stat-change { font-size: 10px; color: #71717a; }

        .activity-section { flex: 1; }
        .activity-list { display: flex; flex-direction: column; gap: 6px; }
        .activity-item {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 12px;
          border-radius: 14px;
          transition: background 0.2s;
        }
        .activity-item:hover { background: rgba(255, 255, 255, 0.03); }
        .activity-icon-btn { width: 40px; height: 40px; border-radius: 12px; display: flex; align-items: center; justify-content: center; transition: transform 0.2s; }
        .activity-icon-btn:hover { transform: scale(1.05); background: rgba(255,255,255,0.05); }
        .activity-name { font-size: 14px; font-weight: 700; }
        .activity-meta { font-size: 11px; color: #71717a; }

        .p-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: #1db954;
          box-shadow: 0 0 10px rgba(29, 185, 84, 0.5);
          animation: pulse 2s infinite;
        }

        @keyframes pulse {
          0% { opacity: 0.4; }
          50% { opacity: 1; }
          100% { opacity: 0.4; }
        }

        .text-btn { font-size: 12px; font-weight: 700; color: #1db954; }
        .text-primary { color: #1db954; }
        .text-secondary { color: #a1a1aa; }

        @media (max-width: 1400px) {
          .dashboard-grid { grid-template-columns: 1fr; gap: 32px; }
          .side-column { display: grid; grid-template-columns: 1fr 1fr; gap: 32px; }
          .mini-stats-grid { margin-bottom: 0; }
        }

        @media (max-width: 1024px) {
          .side-column { grid-template-columns: 1fr; }
        }

        .animate-in { animation: animateIn 0.5s cubic-bezier(0.4, 0, 0.2, 1); }
        @keyframes animateIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>
    </div>
  );
}
