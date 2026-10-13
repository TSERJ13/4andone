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
  const tasks: { name: string; status: string; date: string; type: string }[] = [];

  return (
    <div className="admin-ai animate-in">
      <div className="ai-actions-row">
        <div className="header-info">
          <h2>Voice Isolation Engine</h2>
          <p className="text-secondary">Audio separation is not available yet. No processing jobs are running.</p>
        </div>
        <button className="btn-primary" disabled>
          <Zap size={18} />
          Not available yet
        </button>
      </div>

      <div className="ai-stats-grid">
        <div className="stat-card glass">
          <Cpu className="text-primary" />
          <div className="stat-info">
            <h3>0</h3>
            <p>Total Tasks</p>
          </div>
        </div>
        <div className="stat-card glass">
          <CheckCircle2 className="text-success" />
          <div className="stat-info">
            <h3>—</h3>
            <p>Success Rate</p>
          </div>
        </div>
        <div className="stat-card glass">
          <MicOff className="text-warning" />
          <div className="stat-info">
            <h3>0 mins</h3>
            <p>Isolated Music</p>
          </div>
        </div>
      </div>

      <div className="tasks-list glass">
        <div className="list-header">
          <h2>Active Queue</h2>
          <span className="text-secondary">No jobs</span>
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
        @media (max-width: 640px) {
          .admin-ai { gap: 20px; padding-bottom: 80px; }
          .ai-actions-row {
            flex-direction: column;
            align-items: stretch;
            gap: 12px;
          }
          .ai-actions-row button {
            width: 100%;
            justify-content: center;
            height: 42px;
          }
          .ai-stats-grid {
            grid-template-columns: 1fr;
            gap: 10px;
          }
          .stat-card {
            padding: 16px;
            border-radius: 16px;
            gap: 16px;
          }
          .tasks-list {
            padding: 16px;
            border-radius: 18px;
          }
          .activity-item {
            padding: 12px;
            gap: 12px;
          }
        }

        .animate-in { animation: animateIn 0.5s cubic-bezier(0.4, 0, 0.2, 1); }
        @keyframes animateIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>
    </div>
  );
}
