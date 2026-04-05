"use client";

import React from 'react';
import { 
  Cpu, 
  Play, 
  CheckCircle2, 
  Loader2, 
  Zap, 
  MicOff 
} from 'lucide-react';

export default function AdminAI() {
  const tasks = [
    { name: 'Samba de Janeiro', status: 'completed', date: '2 Mins Ago', type: 'Vocal Removal' },
    { name: 'Ocean Waltz', status: 'processing', date: 'Just Now', type: 'Instrument Segregation' },
    { name: 'Latin Fever', status: 'pending', date: '5 Mins Ago', type: 'Vocal Removal' },
  ];

  return (
    <div className="admin-ai animate-in">
      <div className="ai-actions-row">
        <div className="header-info">
          <h2>Voice Isolation Engine</h2>
          <p className="text-secondary">Track and manage automated stem separation tasks.</p>
        </div>
        <button className="btn-primary">
          <Zap size={18} />
          Start New Job
        </button>
      </div>

      <div className="ai-stats-grid">
        <div className="stat-card glass">
          <Cpu className="text-primary" />
          <div className="stat-info">
            <h3>412</h3>
            <p>Total Tasks</p>
          </div>
        </div>
        <div className="stat-card glass">
          <CheckCircle2 className="text-success" />
          <div className="stat-info">
            <h3>98.2%</h3>
            <p>Success Rate</p>
          </div>
        </div>
        <div className="stat-card glass">
          <MicOff className="text-warning" />
          <div className="stat-info">
            <h3>8,410 mins</h3>
            <p>Isolated Music</p>
          </div>
        </div>
      </div>

      <div className="tasks-list glass">
        <div className="list-header">
          <h2>Active Queue</h2>
          <button className="btn-text">View History</button>
        </div>
        <div className="activity-list">
          {tasks.map((task) => (
            <div key={task.name} className="activity-item">
              <div className="item-icon glass">
                {task.status === 'processing' ? <Loader2 size={20} className="spin text-primary" /> : <Play size={18} className="text-secondary" />}
              </div>
              <div className="item-details">
                <p className="item-title">{task.name}</p>
                <p className="item-meta">{task.type} • {task.date}</p>
              </div>
              <div className="item-status">
                <span className={`status-badge ${task.status}`}>
                  {task.status}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      <style jsx>{`
        .admin-ai { display: flex; flex-direction: column; gap: 32px; padding-bottom: 120px; }
        
        .ai-actions-row {
          display: flex; align-items: center; justify-content: space-between;
        }

        .header-info h2 { font-size: 22px; font-weight: 800; margin-bottom: 4px; }

        .ai-stats-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 24px; }
        .stat-card { padding: 32px; border-radius: 24px; display: flex; align-items: center; gap: 24px; }
        .stat-info h3 { font-size: 28px; font-weight: 900; }
        .stat-info p { font-size: 14px; color: #71717a; }

        .tasks-list { padding: 32px; border-radius: 28px; }
        .list-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 32px; }
        .list-header h2 { font-size: 20px; font-weight: 800; }

        .activity-list { display: flex; flex-direction: column; gap: 12px; }
        .activity-item { padding: 16px 20px; border-radius: 16px; display: flex; align-items: center; gap: 20px; }
        .activity-item:hover { background: rgba(255,255,255,0.03); }

        .item-icon { width: 44px; height: 44px; display: flex; align-items: center; justify-content: center; border-radius: 12px; }

        .item-details .item-title { font-weight: 700; font-size: 15px; }
        .item-details .item-meta { font-size: 12px; color: #71717a; }

        .status-badge { font-size: 10px; font-weight: 800; padding: 4px 10px; border-radius: 6px; text-transform: uppercase; letter-spacing: 0.5px; }
        .status-badge.completed { background: rgba(34, 197, 94, 0.1); color: #4ade80; }
        .status-badge.processing { background: rgba(59, 130, 246, 0.1); color: #60a5fa; }
        .status-badge.pending { background: rgba(245, 158, 11, 0.1); color: #fbbf24; }

        .spin { animation: spin 2s linear infinite; }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        
        .text-primary { color: #1db954; }
        .text-success { color: #4ade80; }
        .text-warning { color: #fbbf24; }
        .text-secondary { color: #a1a1aa; }
        .btn-text { color: #1db954; font-size: 13px; font-weight: 700; }

        .animate-in { animation: animateIn 0.5s cubic-bezier(0.4, 0, 0.2, 1); }
        @keyframes animateIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>
    </div>
  );
}
