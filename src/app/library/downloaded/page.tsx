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
  const totalMinutes = Math.round(downloadedTracks.reduce((sum, t) => sum + (Number(t.duration) || 0), 0) / 60);

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
      <header className="downloaded-hero">
        <div className="downloaded-cover">
          <ArrowDownToLine size={48} color="#ffffff" />
        </div>
        <div className="downloaded-info">
          <span className="downloaded-label">Auto Playlist</span>
          <h1 className="downloaded-title">Downloaded</h1>
          <p className="downloaded-stats">
            {downloadedTracks.length} {downloadedTracks.length === 1 ? 'track' : 'tracks'}
            {totalMinutes > 0 && <> · {totalMinutes} min</>}
          </p>
        </div>
        <button
          className="downloaded-play"
          onClick={handlePlayAll}
          disabled={downloadedTracks.length === 0}
          aria-label="Play downloaded tracks"
        >
          <Play fill="currentColor" size={20} />
          <span>Play</span>
        </button>
      </header>

      {downloadedTracks.length > 0 ? (
        <div className="tracks-list">
          {downloadedTracks.map((track) => {
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
                isDownloaded={true}
              />
            );
          })}
        </div>
      ) : (
        <div className="empty-state">
          <div className="empty-icon-circle">
            <ArrowDownToLine size={48} color="#22c55e" />
          </div>
          <h3>No downloaded tracks</h3>
          <p>Save tracks to your device by clicking the download icon while listening or browsing to practice offline without internet connection.</p>
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

        .downloaded-hero {
          display: flex;
          align-items: flex-end;
          gap: 28px;
          margin-bottom: 32px;
          background: transparent;
          border: none;
        }

        .downloaded-cover {
          position: relative;
          width: 180px;
          height: 180px;
          flex-shrink: 0;
          border-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #ffffff;
          background: linear-gradient(135deg, #22c55e 0%, #0d421d 100%);
          box-shadow: 0 10px 30px rgba(0, 0, 0, 0.6);
          border: 1px solid rgba(255, 255, 255, 0.1);
        }

        .downloaded-info {
          position: relative;
          display: flex;
          flex-direction: column;
          gap: 6px;
          flex: 1;
          min-width: 0;
        }

        .downloaded-label {
          font-size: 11px;
          font-weight: 800;
          letter-spacing: 1.2px;
          text-transform: uppercase;
          color: #22c55e;
        }

        .downloaded-title {
          margin: 0;
          font-size: 2.4rem;
          font-weight: 900;
          letter-spacing: -0.5px;
          line-height: 1.1;
          color: #ffffff;
        }

        .downloaded-stats {
          margin: 2px 0 12px 0;
          font-size: 13px;
          font-weight: 500;
          color: #aaaaaa;
        }

        .downloaded-play {
          position: relative;
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 11px 24px;
          border: none;
          border-radius: 999px;
          background: #22c55e;
          color: #ffffff;
          font-weight: 700;
          font-size: 14px;
          cursor: pointer;
          transition: transform 0.15s, background-color 0.15s;
        }

        .downloaded-play:hover {
          background: #16a34a;
          transform: scale(1.02);
        }

        .downloaded-play:active {
          transform: scale(0.96);
        }

        .downloaded-play:disabled {
          opacity: 0.4;
          cursor: default;
          transform: none;
        }

        .tracks-list {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .empty-state {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 80px 0;
          color: #717171;
          gap: 16px;
          text-align: center;
        }

        .empty-icon-circle {
          width: 80px;
          height: 80px;
          border-radius: 50%;
          background: rgba(34, 197, 94, 0.1);
          border: 1px solid rgba(34, 197, 94, 0.2);
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .empty-state h3 {
          color: #ffffff;
          font-size: 24px;
          font-weight: 800;
          margin: 0;
        }

        .empty-state p {
          max-width: 360px;
          line-height: 1.5;
          font-size: 14px;
          margin: 0;
          color: #aaaaaa;
        }

        @media (max-width: 768px) {
          .downloaded-page {
            padding: 12px 16px 120px 16px;
          }
          .downloaded-hero {
            gap: 16px;
            margin-bottom: 20px;
          }
          .downloaded-cover {
            width: 110px;
            height: 110px;
            border-radius: 6px;
          }
          .downloaded-cover :global(svg) {
            width: 32px;
            height: 32px;
          }
          .downloaded-title {
            font-size: 1.6rem;
          }
          .downloaded-stats {
            font-size: 12px;
          }
          .downloaded-play {
            padding: 9px 18px;
            font-size: 13px;
          }
        }
      `}</style>
    </div>
  );
};

export default DownloadedPage;
