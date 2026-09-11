"use client";

import React, { useState, useEffect } from 'react';
import { ArrowDownToLine, Play, Disc, Heart, CheckCircle2 } from 'lucide-react';
import { useAudio } from '@/components/audio/AudioProvider';
import { useStudio } from '@/components/admin/StudioProvider';
import { useAuth } from '@/context/AuthContext';
import ConfirmModal from '@/components/admin/ConfirmModal';
import { formatDuration } from '@/utils/format';
import { getMPMFromBPM } from '@/utils/audio';
import { Marquee } from '@/components/layout/Marquee';
import { getDownloadedTrackIds, subscribeToOfflineUpdates } from '@/utils/offline';

const DownloadedPage = () => {
  const { isPlaying, title: playingTitle, loadTrack } = useAudio();
  const { tracks, styles, toggleFavorite } = useStudio();
  const { isAuthenticated, setIsAuthModalOpen } = useAuth();
  
  const [authPrompt, setAuthPrompt] = useState({ isOpen: false, action: '' });
  const [downloadedIds, setDownloadedIds] = useState<string[]>([]);

  useEffect(() => {
    setDownloadedIds(getDownloadedTrackIds());
    const unsubscribe = subscribeToOfflineUpdates(() => {
      setDownloadedIds(getDownloadedTrackIds());
    });
    return unsubscribe;
  }, []);

  const downloadedTracks = tracks.filter(t => downloadedIds.includes(t.id));

  const checkAuthAndExecute = (action: () => void, actionName: string) => {
    if (!isAuthenticated) {
      setAuthPrompt({ isOpen: true, action: actionName });
      return;
    }
    action();
  };

  const handlePlayAll = () => {
    if (downloadedTracks.length > 0) {
      loadTrack(downloadedTracks[0]);
    }
  };

  return (
    <div className="downloaded-page animate-in">
      <header className="page-header">
        <div className="icon-large glass">
          <ArrowDownToLine size={64} color="#22c55e" />
        </div>
        <div className="head-content">
          <span className="label">Offline Storage</span>
          <h1 className="title">Downloaded</h1>
          <p className="stats">
            <span style={{ color: '#22c55e' }}>Available Offline</span> • {downloadedTracks.length} Tracks On Device
          </p>
        </div>
        <div className="header-actions">
          <button className="play-btn-large main-play-trigger" onClick={handlePlayAll} title="Play All Downloaded">
            <Play fill="currentColor" size={24} />
          </button>
        </div>
      </header>

      {downloadedTracks.length > 0 ? (
        <div className="tracks-list">
          {downloadedTracks.map((track, i) => (
            <div
              key={track.id}
              className={`track-row ${isPlaying && (playingTitle === track.title || playingTitle === track.id) ? 'is-active' : ''}`}
              onClick={() => loadTrack(track)}
            >
              <div className="track-icon-col">
                <Disc size={18} />
              </div>
              <div className="track-info-col">
                <div className="track-title-row">
                  <div className="track-title-marquee-wrapper">
                    <Marquee 
                      text={track.title} 
                      className="track-name" 
                      isActive={isPlaying && (playingTitle === track.title || playingTitle === track.id)}
                    />
                  </div>
                  <span className="track-downloaded-badge" title="Stored on device (ინტერნეტის გარეშე)">
                    <CheckCircle2 size={13} />
                  </span>
                </div>
                <p className="track-artist">
                  {track.artist}
                  {track.duration ? ` • ${formatDuration(track.duration)}` : ''}
                </p>
              </div>

              <div className="track-badge-col">
                {styles.find(s => s.title.toLowerCase() === track.style?.toLowerCase()) && (
                  <span 
                    className="style-badge-pill" 
                    style={{ backgroundColor: styles.find(s => s.title.toLowerCase() === track.style?.toLowerCase())?.color }}
                  >
                    {track.style}
                  </span>
                )}
              </div>
              
              <div className="track-meta-col">
                {track.style?.toLowerCase() === 'fitness'
                  ? (track.duration ? formatDuration(track.duration) : '')
                  : (track.bpm ? `${getMPMFromBPM(Number(track.bpm), track.style)} MPM` : formatDuration(track.duration))}
              </div>

              <div className="track-only-fav">
                <button
                  className={`fav-action ${track.isFavorite ? 'active-heart' : ''}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    checkAuthAndExecute(() => toggleFavorite(track.id), 'favorite tracks');
                  }}
                  title={track.isFavorite ? "Unlike" : "Like"}
                >
                  <Heart size={18} fill={track.isFavorite ? "#ff4b2b" : "none"} color={track.isFavorite ? "#ff4b2b" : "currentColor"} />
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="empty-state">
          <ArrowDownToLine size={48} className="text-secondary" />
          <h3>No downloaded tracks</h3>
          <p>Save tracks to this device by clicking the download button (⬇️) while listening or browsing.</p>
        </div>
      )}

      <ConfirmModal 
        isOpen={authPrompt.isOpen}
        title="Authentication Required"
        message={`Please log in with Telegram to ${authPrompt.action} and sync your studio data.`}
        confirmText="Login Now"
        variant="primary"
        onClose={() => setAuthPrompt(prev => ({ ...prev, isOpen: false }))}
        onConfirm={() => {
          setAuthPrompt(prev => ({ ...prev, isOpen: false }));
          setIsAuthModalOpen(true);
        }}
      />

      <style jsx>{`
        .downloaded-page { padding: 40px; padding-bottom: 120px; }
        .page-header { display: flex; align-items: flex-end; gap: 32px; margin-bottom: 40px; }
        .head-content { display: flex; flex-direction: column; gap: 8px; flex: 1; }
        .icon-large { 
          width: 180px; height: 180px; border-radius: 20px; 
          background: linear-gradient(135deg, rgba(34, 197, 94, 0.35), #191414);
          display: flex; align-items: center; justify-content: center;
          flex-shrink: 0;
          box-shadow: 0 12px 32px rgba(0,0,0,0.5);
          border: 1px solid rgba(255,255,255,0.05);
        }
        .label { text-transform: uppercase; font-size: 11px; font-weight: 800; letter-spacing: 1px; color: #71717a; }
        .title { font-size: 5rem; font-weight: 950; margin: 0; letter-spacing: -2px; line-height: 1; }
        .stats { font-size: 14px; font-weight: 600; color: #71717a; }
        
        .play-btn-large { 
          width: 56px; height: 56px; border-radius: 50%; background: var(--primary, #1db954); 
          color: black; display: flex; align-items: center; justify-content: center; 
          transition: transform 0.2s;
        }
        .play-btn-large:hover { transform: scale(1.05); }

        .tracks-list { display: flex; flex-direction: column; gap: 8px; }

        .track-info-col { min-width: 0; overflow: hidden; display: flex; flex-direction: column; justify-content: center; }
        .track-title-row {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          max-width: 100%;
        }
        .track-title-marquee-wrapper {
          min-width: 0;
          max-width: fit-content;
          flex-shrink: 1;
        }
        .track-downloaded-badge {
          color: #22c55e;
          display: inline-flex;
          align-items: center;
          flex-shrink: 0;
        }
        .track-name { font-weight: 600; font-size: 14.25px; }
        .track-artist { font-size: 12px; opacity: 0.5; margin-top: 2px; }

        .track-only-fav { display: flex; align-items: center; justify-content: flex-end; }
        .fav-action { opacity: 0.8; transition: all 0.2s; background: none; border: none; cursor: pointer; color: #555; padding: 10px; }
        .fav-action:hover, .fav-action.active-heart { opacity: 1; transform: scale(1.1); }
        .fav-action.active-heart { color: #f43f5e; }

        .empty-state {
          display: flex; flex-direction: column; align-items: center; justify-content: center;
          padding: 80px 0; color: #71717a; gap: 20px; text-align: center;
        }
        .empty-state h3 { color: white; font-size: 24px; font-weight: 800; }
        .empty-state p { max-width: 300px; line-height: 1.5; font-size: 14px; }

        @media (max-width: 768px) {
          .downloaded-page { padding: 12px; padding-bottom: 20px; }
          .page-header { flex-direction: row; align-items: center; text-align: left; gap: 12px; margin-top: 20px; margin-bottom: 24px; position: relative; }
          .icon-large { width: 80px; height: 80px; border-radius: 12px; }
          .title { font-size: 20px; font-weight: 950; letter-spacing: -0.5px; }
          .head-content { gap: 1px; min-width: 0; }
          .head-content .label { font-size: 8px; }
          .head-content .stats { font-size: 10px; }
          .header-actions { padding-bottom: 0; margin-left: 10px; }
          .play-btn-large { width: 44px; height: 44px; }
          .play-btn-large svg { width: 18px; height: 18px; }
        }
      `}</style>
    </div>
  );
};

export default DownloadedPage;
