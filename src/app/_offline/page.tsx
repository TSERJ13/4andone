"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { WifiOff, Download, Play, RefreshCw, Music2 } from 'lucide-react';
import { useAudioControls } from '@/components/audio/AudioProvider';
import { useStudio } from '@/components/admin/StudioProvider';
import { getDownloadedTrackIds, subscribeToOfflineUpdates } from '@/utils/offline';
import { TrackRow } from '@/components/tracks/TrackRow';

export default function OfflineFallbackPage() {
  const { isPlaying, title: playingTitle, trackId: playingTrackId, loadTrack } = useAudioControls();
  const { tracks, styles } = useStudio();
  const [downloadedIds, setDownloadedIds] = useState<string[]>([]);

  useEffect(() => {
    setDownloadedIds(getDownloadedTrackIds());
    const unsubscribe = subscribeToOfflineUpdates(() => {
      setDownloadedIds(getDownloadedTrackIds());
    });
    return unsubscribe;
  }, []);

  const downloadedTracks = tracks.filter(t => downloadedIds.includes(t.id));

  return (
    <div className="offline-page-container">
      <div className="offline-hero-card">
        <div className="offline-badge">
          <WifiOff size={16} className="text-amber-400" />
          <span>Offline Mode</span>
        </div>
        <h1 className="offline-title">You are currently offline</h1>
        <p className="offline-subtitle">
          No internet connection detected. You can listen to all your saved tracks on this device.
        </p>

        {downloadedTracks.length > 0 ? (
          <button
            type="button"
            className="offline-play-all-btn"
            onClick={() => loadTrack(downloadedTracks[0])}
          >
            <Play size={18} fill="currentColor" />
            <span>Play Downloaded Music ({downloadedTracks.length})</span>
          </button>
        ) : (
          <button
            type="button"
            className="offline-reload-btn"
            onClick={() => window.location.reload()}
          >
            <RefreshCw size={16} />
            <span>Retry Connection</span>
          </button>
        )}
      </div>

      <div className="offline-section">
        <div className="offline-section-header">
          <Download size={18} className="text-emerald-400" />
          <h2>Downloaded Tracks ({downloadedTracks.length})</h2>
        </div>

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
                  badge="style"
                  styleColor={styles.find(s => s.title.toLowerCase() === track.style?.toLowerCase())?.color}
                  isDownloaded={true}
                />
              );
            })}
          </div>
        ) : (
          <div className="offline-empty-box">
            <Music2 size={40} className="text-slate-500 mb-2" />
            <p className="font-semibold text-slate-300">No tracks stored offline yet</p>
            <p className="text-xs text-slate-400 max-w-sm mt-1">
              When online, tap the download icon on any track to save it for offline practice in halls without Wi-Fi.
            </p>
          </div>
        )}
      </div>

      <style jsx>{`
        .offline-page-container {
          padding: 24px 16px 120px 16px;
          max-width: 800px;
          margin: 0 auto;
          color: #fff;
        }
        .offline-hero-card {
          background: linear-gradient(135deg, rgba(30, 41, 59, 0.7) 0%, rgba(15, 23, 42, 0.9) 100%);
          border: 1px solid rgba(255, 255, 255, 0.12);
          border-radius: 20px;
          padding: 28px 24px;
          text-align: center;
          margin-bottom: 24px;
          box-shadow: 0 10px 30px rgba(0, 0, 0, 0.4);
        }
        .offline-badge {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          font-size: 12px;
          font-weight: 700;
          color: #fbbf24;
          background: rgba(245, 158, 11, 0.15);
          border: 1px solid rgba(245, 158, 11, 0.3);
          padding: 4px 12px;
          border-radius: 12px;
          margin-bottom: 12px;
        }
        .offline-title {
          font-size: 22px;
          font-weight: 800;
          margin: 0 0 8px 0;
          color: #fff;
        }
        .offline-subtitle {
          font-size: 13px;
          color: #94a3b8;
          max-width: 460px;
          margin: 0 auto 20px auto;
          line-height: 1.5;
        }
        .offline-play-all-btn {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          background: linear-gradient(135deg, #10b981 0%, #059669 100%);
          color: #fff;
          font-size: 14px;
          font-weight: 700;
          border: none;
          padding: 12px 24px;
          border-radius: 14px;
          cursor: pointer;
          box-shadow: 0 4px 15px rgba(16, 185, 129, 0.35);
        }
        .offline-reload-btn {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          background: rgba(255, 255, 255, 0.1);
          color: #fff;
          font-size: 13px;
          font-weight: 600;
          border: 1px solid rgba(255, 255, 255, 0.15);
          padding: 10px 20px;
          border-radius: 12px;
          cursor: pointer;
        }
        .offline-section-header {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-bottom: 16px;
        }
        .offline-section-header h2 {
          font-size: 16px;
          font-weight: 700;
          margin: 0;
          color: #f1f5f9;
        }
        .offline-empty-box {
          background: rgba(18, 18, 18, 0.6);
          border: 1px dashed rgba(255, 255, 255, 0.15);
          border-radius: 16px;
          padding: 40px 20px;
          text-align: center;
          display: flex;
          flex-direction: column;
          align-items: center;
        }
      `}</style>
    </div>
  );
}
