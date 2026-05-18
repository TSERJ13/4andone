"use client";

import React from 'react';
import { 
  Shield, 
  Server, 
  Globe, 
  Lock, 
  Cloud 
} from 'lucide-react';
import { useStudio } from '@/components/admin/StudioProvider';

export default function AdminSettings() {
  const { tracks } = useStudio();
  
  const totalBytes = tracks.reduce((acc, t) => acc + (t.size || 0), 0);
  const usedGB = totalBytes / (1024 ** 3);
  const maxGB = 10; // Cloudflare Free Tier
  const percentUsed = Math.min(100, Math.max(0, (usedGB / maxGB) * 100));

  const sections = [
    { title: 'General Settings', icon: <Globe size={20} />, description: 'Platform language, timezone, and regional defaults.' },
    { title: 'Admin Controls', icon: <Shield size={20} />, description: 'Manage permissions, access logs, and security protocols.' },
    { title: 'Server & Storage', icon: <Server size={20} />, description: 'Supabase configuration, CDN settings, and bucket quotas.' },
    { title: 'AI Configuration', icon: <Cloud size={20} />, description: 'Adjust vocal removal parameters and batch processing limits.' },
  ];

  return (
    <div className="admin-settings animate-in">
      <div className="settings-actions-row">
        <div className="header-info">
          <h2>Global Configuration</h2>
          <p className="text-secondary">Manage technical and operational parameters.</p>
        </div>
        <button className="btn-primary">
          Save All Changes
        </button>
      </div>

      <div className="storage-card glass">
        <div className="section-header">
          <Cloud size={20} className="text-primary" />
          <h3>Cloudflare R2 Storage Quota</h3>
        </div>
        <div className="storage-info">
          <div className="storage-text">
            <span className="font-bold text-white">{usedGB.toFixed(2)} GB Used</span>
            <span className="text-secondary">{(maxGB - usedGB).toFixed(2)} GB Free (of {maxGB} GB)</span>
          </div>
          <div className="storage-bar-wrap">
            <div className="storage-bar" style={{ width: `${percentUsed}%` }} />
          </div>
        </div>
      </div>

      <div className="settings-grid">
        {sections.map((section) => (
          <div key={section.title} className="settings-card glass">
            <div className="card-top">
              <div className="icon-wrapper glass">
                {section.icon}
              </div>
              <div className="title-info">
                <h3>{section.title}</h3>
                <p className="text-secondary">{section.description}</p>
              </div>
            </div>
            <div className="card-actions">
              <button className="btn-secondary glass">Configure</button>
            </div>
          </div>
        ))}
      </div>

      <div className="danger-zone glass">
        <div className="section-header">
          <Lock size={20} className="text-danger" />
          <h3 className="text-danger">Danger Zone</h3>
        </div>
        <div className="danger-content">
          <p className="text-secondary">Permanently delete all tracks, reset database, or wipe CDN caches. These actions cannot be undone.</p>
          <button className="btn-danger">Master Reset System</button>
        </div>
      </div>

      <style jsx>{`
        .admin-settings { display: flex; flex-direction: column; gap: 32px; padding-bottom: 120px; }
        
        .settings-actions-row {
          display: flex; align-items: center; justify-content: space-between;
        }

        .header-info h2 { font-size: 22px; font-weight: 800; margin-bottom: 4px; }

        .settings-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(320px, 1fr)); gap: 24px; }
        .settings-card { padding: 32px; border-radius: 24px; display: flex; flex-direction: column; gap: 32px; height: 100%; transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1); }
        .settings-card:hover { transform: translateY(-4px); background: rgba(255,255,255,0.05); }

        .card-top { display: flex; gap: 20px; align-items: flex-start; }
        .icon-wrapper { width: 48px; height: 48px; border-radius: 12px; display: flex; align-items: center; justify-content: center; color: #1db954; }
        
        .title-info h3 { font-size: 18px; font-weight: 800; margin-bottom: 8px; }
        .title-info p { font-size: 14px; line-height: 1.5; }

        .card-actions { margin-top: auto; }
        .btn-secondary { padding: 8px 20px; border-radius: 10px; font-size: 12px; font-weight: 700; }

        .storage-card { padding: 32px; border-radius: 24px; margin-bottom: 32px; }
        .storage-info { margin-top: 16px; }
        .storage-text { display: flex; justify-content: space-between; font-size: 14px; margin-bottom: 12px; }
        .storage-bar-wrap { height: 8px; background: rgba(255,255,255,0.05); border-radius: 4px; overflow: hidden; }
        .storage-bar { height: 100%; background: #1db954; border-radius: 4px; transition: width 0.5s ease; }
        .font-bold { font-weight: 700; }
        .text-white { color: #ffffff; }

        .danger-zone { padding: 40px; border-radius: 28px; border: 1px solid rgba(239, 68, 68, 0.2); background: rgba(239, 68, 68, 0.05); }
        .section-header { display: flex; align-items: center; gap: 12px; margin-bottom: 16px; }
        .danger-content { display: flex; align-items: center; justify-content: space-between; gap: 40px; flex-wrap: wrap; }
        .btn-danger { background: #ef4444; color: white; padding: 12px 24px; border-radius: 12px; font-weight: 800; font-size: 14px; transition: all 0.2s; }
        .btn-danger:hover { background: #dc2626; transform: scale(1.05); }

        .text-danger { color: #ef4444; }
        .text-secondary { color: #a1a1aa; }

        .animate-in { animation: animateIn 0.5s cubic-bezier(0.4, 0, 0.2, 1); }
        @keyframes animateIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>
    </div>
  );
}
