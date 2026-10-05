"use client";

import React, { useState, useEffect } from 'react';
import {
  Music,
  Users,
  PlayCircle,
  Plus,
  PauseCircle,
  Eye,
  TrendingUp,
  Clock,
  UserCheck,
  Coffee
} from 'lucide-react';
import BulkUpload from "../../../components/admin/BulkUpload";
import { useAudio } from '@/components/audio/AudioProvider';
import { useStudio } from '@/components/admin/StudioProvider';
import { supabase } from '@/utils/supabase';

export default function AdminDashboard() {
  const { togglePlay, isPlaying } = useAudio();
  const { tracks, folders, finalFolders } = useStudio();
  
  // New Analytics Stats
  const [totalPeople, setTotalPeople] = useState<number>(0);
  const [returningUsers, setReturningUsers] = useState<number>(0);
  const [totalPlays, setTotalPlays] = useState<number>(0);
  const [totalListeningSeconds, setTotalListeningSeconds] = useState<number>(0);
  const [avgSecondsPerPerson, setAvgSecondsPerPerson] = useState<number>(0);
  const [coffeeClicks, setCoffeeClicks] = useState<number>(0);
  const [uniqueCoffeeVisitors, setUniqueCoffeeVisitors] = useState<number>(0);

  useEffect(() => {
    async function fetchStats() {
      try {
        const [peopleRes, returningRes, playsRes, coffeeRes] = await Promise.all([
          // Total People (Unique telegram users or unique session IDs if anon)
          supabase.from('telegram_users').select('telegram_id', { count: 'exact', head: true }),
          // Returning Users (visit_count > 1)
          supabase.from('telegram_users').select('telegram_id', { count: 'exact', head: true }).gt('visit_count', 1),
          // Total Plays & Summed Duration (excluding button click events)
          supabase.from('track_plays').select('duration_seconds').neq('event_type', 'kofi_click'),
          // Buy Me Coffee Clicks and Visitors
          supabase.from('track_plays').select('id, user_ref, session_id').eq('event_type', 'kofi_click'),
        ]);

        const peopleCount = peopleRes.count || 0;
        setTotalPeople(peopleCount);
        setReturningUsers(returningRes.count || 0);
        if (coffeeRes.data) {
          setCoffeeClicks(coffeeRes.data.length);
          const uniqueSupporters = new Set(coffeeRes.data.map(r => r.user_ref || r.session_id).filter(Boolean)).size;
          setUniqueCoffeeVisitors(uniqueSupporters);
        }
        
        if (playsRes.data) {
          setTotalPlays(playsRes.data.length);
          const totalSec = playsRes.data.reduce((acc, row) => acc + (row.duration_seconds || 0), 0);
          setTotalListeningSeconds(totalSec);
          if (peopleCount > 0) {
            setAvgSecondsPerPerson(totalSec / peopleCount);
          }
        }
      } catch (e) {
        console.error("Failed to fetch admin stats", e);
      }
    }

    fetchStats();
    // Refresh every 30s
    const interval = setInterval(fetchStats, 30000);
    return () => clearInterval(interval);
  }, []);

  const formatHours = (seconds: number) => {
    const hours = seconds / 3600;
    if (hours < 1) return `${Math.round(seconds / 60)}m`;
    return `${hours.toFixed(1)}h`;
  };

  const dashboardStats = [
    { label: 'Total People', value: totalPeople.toString(), icon: <Users size={14} />, color: '#1db954' },
    { label: 'Returning', value: returningUsers.toString(), icon: <UserCheck size={14} />, color: '#3b82f6' },
    { label: 'Total Plays', value: totalPlays.toString(), icon: <PlayCircle size={14} />, color: '#f59e0b' },
    { label: 'Total Listening', value: formatHours(totalListeningSeconds), icon: <Clock size={14} />, color: '#ec4899' },
    { label: 'Avg / Person', value: formatHours(avgSecondsPerPerson), icon: <TrendingUp size={14} />, color: '#8b5cf6' },
    { label: 'Coffee Clicks', value: coffeeClicks > 0 ? `${coffeeClicks} (${uniqueCoffeeVisitors} unique)` : '0', icon: <Coffee size={14} />, color: '#f59e0b' },
    { label: 'Tracks Library', value: tracks.length.toString(), icon: <Music size={14} />, color: '#06b6d4' },
  ];

  return (
    <div className="dashboard-container animate-in">
      <div className="dashboard-main-flow">
        {/* Bulk Upload - Now Full Width and Primary Focus */}
        <section className="dashboard-section glass">
          <div className="section-header">
            <div>
              <h2>Bulk Music Upload</h2>
              <p className="section-sub">Ingest professional tracks to your studio library.</p>
            </div>
            {/* Removed redundant + icon */}
          </div>
          <BulkUpload />
        </section>
      </div>

      {/* Footer Status Bar with Advanced Analytics Metrics */}
      <div className="dashboard-status-bar glass">
        <div className="status-left">
          <div className="title-group-mini">
            <h1>Studio Pulse</h1>
            <div className="live-status">
              <div className="pulse-dot"></div>
              <span>LIVE TRACKING</span>
            </div>
          </div>
        </div>

        <div className="status-middle">
          <div className="stats-horizontal-scroll">
            {dashboardStats.map((stat) => (
              <div key={stat.label} className="status-stat-pill glass">
                <div className="stat-pill-icon" style={{ color: stat.color }}>{stat.icon}</div>
                <div className="stat-pill-content">
                  <span className="stat-pill-value">{stat.value}</span>
                  <span className="stat-pill-label">{stat.label}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="status-right">
           <div className="sync-status">
              <span className="sync-text">Cloud Sync Ready</span>
              <div className="sync-dot"></div>
           </div>
        </div>
      </div>

      <style jsx>{`
        .dashboard-container {
          width: 100%;
          padding-bottom: 120px;
        }

        .dashboard-main-flow {
          width: 100%;
          max-width: 100%;
        }

        .dashboard-status-bar {
          position: fixed;
          bottom: 24px;
          left: 50%;
          transform: translateX(-50%);
          width: calc(100% - 340px);
          max-width: 1400px;
          height: 72px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0 32px;
          border-radius: 20px;
          z-index: 100;
          background: rgba(9, 9, 11, 0.85);
          backdrop-filter: blur(24px);
          border: 1px solid rgba(255, 255, 255, 0.1);
          box-shadow: 0 16px 48px rgba(0, 0, 0, 0.6);
        }

        .status-left { display: flex; align-items: center; gap: 20px; flex-shrink: 0; }
        .title-group-mini h1 { font-size: 14px; font-weight: 900; margin: 0; letter-spacing: 0.5px; text-transform: uppercase; color: #71717a; }
        .live-status { display: flex; align-items: center; gap: 6px; font-size: 10px; font-weight: 950; color: #1db954; }

        .status-middle { flex: 1; display: flex; justify-content: center; padding: 0 40px; }
        .stats-horizontal-scroll { display: flex; gap: 12px; align-items: center; }
        
        .status-stat-pill {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 8px 16px;
          border-radius: 12px;
          background: rgba(255,255,255,0.03);
          border: 1px solid rgba(255,255,255,0.05);
          min-width: 100px;
        }

        .stat-pill-content { display: flex; flex-direction: column; line-height: 1; }
        .stat-pill-value { font-size: 16px; font-weight: 950; color: white; }
        .stat-pill-label { font-size: 8px; font-weight: 800; color: #71717a; text-transform: uppercase; margin-top: 2px; }

        .status-right { flex-shrink: 0; }
        .sync-status { display: flex; align-items: center; gap: 8px; font-size: 10px; font-weight: 700; color: #52525b; }
        .sync-dot { width: 4px; height: 4px; background: rgba(255,255,255,0.2); border-radius: 50%; }

        .pulse-dot {
          width: 5px;
          height: 5px;
          background: #1db954;
          border-radius: 50%;
          box-shadow: 0 0 0 0 rgba(29, 185, 84, 0.4);
          animation: pulse 2s infinite;
        }
        @keyframes pulse {
          0% { box-shadow: 0 0 0 0 rgba(29, 185, 84, 0.7); }
          70% { box-shadow: 0 0 0 8px rgba(29, 185, 84, 0); }
          100% { box-shadow: 0 0 0 0 rgba(29, 185, 84, 0); }
        }

        .dashboard-section {
          padding: 32px;
          border-radius: 24px;
          border: 1px solid rgba(255,255,255,0.05);
          width: 100%;
        }

        .section-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 24px;
        }

        .section-header h2 { font-size: 20px; font-weight: 900; }
        .section-sub { font-size: 13px; color: #71717a; margin-top: 4px; }
        .text-primary { color: #1db954; }

        .animate-in { animation: animIn 0.4s cubic-bezier(0.4,0,0.2,1); }
        @keyframes animIn { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:translateY(0)} }

        @media (max-width: 1300px) {
          .dashboard-status-bar { width: calc(100% - 40px); bottom: 12px; padding: 0 20px; height: 64px; }
          .status-middle { padding: 0 20px; }
          .status-stat-pill { min-width: 80px; padding: 6px 12px; }
          .stat-pill-value { font-size: 14px; }
          .status-right { display: none; }
        }

        @media (max-width: 1100px) {
          .dashboard-section { padding: 20px; }
        }

        @media (max-width: 800px) {
          .status-left { display: none; }
          .status-middle { padding: 0; width: 100%; }
          .stats-horizontal-scroll { width: 100%; overflow-x: auto; padding-bottom: 4px; }
          .stats-horizontal-scroll::-webkit-scrollbar { display: none; }
        }
      `}</style>
    </div>
  );
}
