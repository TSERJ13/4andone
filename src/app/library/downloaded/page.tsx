"use client";

import React, { useState, useEffect } from 'react';
import { ArrowDownToLine, Play } from 'lucide-react';
import { useAudioControls } from '@/components/audio/AudioProvider';
import { useStudio } from '@/components/admin/StudioProvider';
import { useAuth } from '@/context/AuthContext';
import ConfirmModal from '@/components/admin/ConfirmModal';
import { getDownloadedTrackIds, subscribeToOfflineUpdates } from '@/utils/offline';
import { TrackRow } from '@/components/tracks/TrackRow';

const DownloadedPage = () => {
  const { isPlaying, title: playingTitle, trackId: playingTrackId, loadTrack } = useAudioControls();
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
          {downloadedTracks.map((track, i) => {
            const isTrackActive = isPlaying && (playingTrackId ? playingTrackId === track.id : (playingTitle === track.title || playingTitle === track.id));

            return (
            <TrackRow
              key={track.id}
              track={track}
              isActive={isTrackActive}
              onPlay={() => loadTrack(track)}
              onToggleFavorite={() => checkAuthAndExecute(() => toggleFavorite(track.id), 'favorite tracks')}
              badge="style"
              styleColor={styles.find(s => s.title.toLowerCase() === track.style?.toLowerCase())?.color}
            />
            );
          })}
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
        .downloaded-page {
          padding: 24px 32px 140px 32px;
          max-width: 1200px;
          margin: 0 auto;
        }

        .page-header {
          display: flex;
          align-items: flex-end;
          gap: 28px;
          margin-bottom: 32px;
        }

        .head-content {
          display: flex;
          flex-direction: column;
          gap: 6px;
          flex: 1;
          min-width: 0;
        }

        .icon-large { 
          width: 180px; height: 180px; border-radius: 8px; 
          background: linear-gradient(135deg, #22c55e 0%, #0d421d 100%);
          display: flex; align-items: center; justify-content: center;
          flex-shrink: 0;
          box-shadow: 0 10px 30px rgba(0, 0, 0, 0.6);
          border: 1px solid rgba(255, 255, 255, 0.1);
        }

        .label {
          font-size: 11px; font-weight: 800; letter-spacing: 1.2px;
          text-transform: uppercase; color: #22c55e;
        }

        .title {
          font-size: 2.4rem; font-weight: 900; margin: 0;
          letter-spacing: -0.5px; line-height: 1.1; color: #fff;
        }

        .stats {
          font-size: 13px; font-weight: 500; color: #aaa; margin: 2px 0 12px 0;
        }

        .play-btn-large {
          display: inline-flex; align-items: center; gap: 8px;
          padding: 11px 24px; border: none; border-radius: 999px;
          background: #22c55e; color: #ffffff; font-weight: 700; font-size: 14px;
          cursor: pointer; transition: transform 0.15s, background-color 0.15s;
        }
        .play-btn-large:hover { background: #16a34a; transform: scale(1.02); }
        .play-btn-large:active { transform: scale(0.96); }

        .tracks-list { display: flex; flex-direction: column; gap: 4px; }

        .empty-state {
          display: flex; flex-direction: column; align-items: center; justify-content: center;
          padding: 80px 0; color: #717171; gap: 16px; text-align: center;
        }
        .empty-state h3 { color: white; font-size: 24px; font-weight: 800; }
        .empty-state p { max-width: 320px; line-height: 1.5; font-size: 14px; }

        @media (max-width: 768px) {
          .downloaded-page { padding: 12px 0 120px 0; }
          .page-header { gap: 16px; margin-bottom: 20px; }
          .icon-large { width: 110px; height: 110px; border-radius: 6px; }
          .title { font-size: 1.6rem; }
          .stats { font-size: 12px; }
          .play-btn-large { padding: 9px 18px; font-size: 13px; }
        }
      `}</style>
    </div>
  );
};

export default DownloadedPage;
