"use client";

import React, { useState, useEffect } from 'react';
import { History, Play, Trash2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useAudioControls } from '@/components/audio/AudioProvider';
import { useStudio } from '@/components/admin/StudioProvider';
import { useAuth } from '@/context/AuthContext';
import { useDownloadedTracks } from '@/hooks/useDownloadedTracks';
import ConfirmModal from '@/components/admin/ConfirmModal';
import { TrackRow } from '@/components/tracks/TrackRow';
import { 
  getRecentlyPlayedTrackIds, 
  getRecentlyPlayedAlbums, 
  clearListeningHistory,
  RecentAlbumItem
} from '@/utils/history';
import { DEFAULT_ALBUMS } from '@/types/album';

export default function HistoryPage() {
  const router = useRouter();
  const { isPlaying, title: playingTitle, trackId: playingTrackId, loadTrack } = useAudioControls();
  const { tracks, styles, albums: dbAlbums, toggleFavorite } = useStudio();
  const { isAuthenticated, setIsAuthModalOpen } = useAuth();
  const downloadedIds = useDownloadedTracks();

  const [recentTrackIds, setRecentTrackIds] = useState<string[]>([]);
  const [recentAlbums, setRecentAlbums] = useState<RecentAlbumItem[]>([]);
  const [authPrompt, setAuthPrompt] = useState({ isOpen: false, action: '' });
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  const refreshHistory = () => {
    setRecentTrackIds(getRecentlyPlayedTrackIds());
    setRecentAlbums(getRecentlyPlayedAlbums());
  };

  useEffect(() => {
    refreshHistory();
    const handleUpdate = () => refreshHistory();
    window.addEventListener('4andone_recently_played_updated', handleUpdate);
    window.addEventListener('storage', handleUpdate);
    return () => {
      window.removeEventListener('4andone_recently_played_updated', handleUpdate);
      window.removeEventListener('storage', handleUpdate);
    };
  }, []);

  // Map track IDs to Track objects
  const historyTracks = recentTrackIds
    .map(id => tracks.find(t => t.id === id))
    .filter((t): t is NonNullable<typeof t> => t !== undefined);

  // If recentAlbums is empty, show default albums as suggested recent collections
  const displayAlbums = recentAlbums.length > 0 
    ? recentAlbums 
    : DEFAULT_ALBUMS.slice(0, 6).map(a => ({
        id: a.id,
        slug: a.slug,
        title: a.title,
        artist: a.artist,
        coverUrl: a.coverUrl,
        badge: a.badge,
        playedAt: Date.now()
      }));

  const checkAuthAndExecute = (action: () => void, actionName: string) => {
    if (!isAuthenticated) {
      setAuthPrompt({ isOpen: true, action: actionName });
      return;
    }
    action();
  };

  const handleClear = () => {
    clearListeningHistory();
    refreshHistory();
    setShowClearConfirm(false);
  };

  const handlePlayAllHistory = () => {
    if (historyTracks.length > 0) {
      loadTrack(historyTracks[0]);
    }
  };

  return (
    <div className="history-page animate-in">
      <header className="history-hero">
        <div className="history-cover">
          <History size={48} color="#ffffff" />
        </div>
        <div className="history-info">
          <span className="history-label">User History</span>
          <h1 className="history-title">Listening History</h1>
          <p className="history-stats">
            {historyTracks.length} {historyTracks.length === 1 ? 'song played' : 'songs played recently'}
          </p>
        </div>
        <div className="history-hero-actions">
          <button
            type="button"
            className="history-play-btn"
            onClick={handlePlayAllHistory}
            disabled={historyTracks.length === 0}
          >
            <Play fill="currentColor" size={18} />
            <span>Play Recent</span>
          </button>
          {historyTracks.length > 0 && (
            <button
              type="button"
              className="history-clear-btn"
              onClick={() => setShowClearConfirm(true)}
              title="Clear History"
            >
              <Trash2 size={16} />
              <span>Clear</span>
            </button>
          )}
        </div>
      </header>

      {/* Section 1: Recently Listened Songs */}
      <section className="history-section">
        <h2 className="section-heading">Recently Played Songs</h2>
        {historyTracks.length > 0 ? (
          <div className="tracks-list">
            {historyTracks.map((track) => {
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
                  isDownloaded={downloadedIds.includes(track.id)}
                />
              );
            })}
          </div>
        ) : (
          <div className="empty-history-box">
            <History size={40} className="empty-icon" />
            <h3>No listening history yet</h3>
            <p>Listen to your favorite dance tracks and practice sessions to build your history here.</p>
          </div>
        )}
      </section>

      {/* Section 2: Recently Played Albums & Live Bands */}
      <section className="history-section margin-top-lg">
        <h2 className="section-heading">Recently Played Albums &amp; Live Bands</h2>
        <div className="albums-grid">
          {displayAlbums.map((item) => (
            <div
              key={item.id}
              className="history-album-card"
              onClick={() => router.push(`/album/${item.slug}`)}
            >
              <div className="card-cover-box">
                <img src={item.coverUrl} alt={item.title} className="card-img" />
                <div className="card-play-overlay">
                  <div className="play-circle-btn">
                    <Play fill="#000000" color="#000000" size={20} style={{ marginLeft: '2px' }} />
                  </div>
                </div>
              </div>
              <div className="card-info">
                <h3 className="card-title">{item.title}</h3>
                <p className="card-sub">{item.artist}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Clear History Confirmation Modal */}
      <ConfirmModal
        isOpen={showClearConfirm}
        title="Clear Listening History?"
        message="This will remove your recently played tracks from history."
        confirmText="Clear History"
        variant="danger"
        showCancel={true}
        onClose={() => setShowClearConfirm(false)}
        onConfirm={handleClear}
      />

      <ConfirmModal 
        isOpen={authPrompt.isOpen}
        title="Authentication Required"
        message={`Please log in with Telegram to ${authPrompt.action}.`}
        confirmText="Login Now"
        variant="primary"
        onClose={() => setAuthPrompt(prev => ({ ...prev, isOpen: false }))}
        onConfirm={() => {
          setAuthPrompt(prev => ({ ...prev, isOpen: false }));
          setIsAuthModalOpen(true);
        }}
      />

      <style jsx>{`
        .history-page {
          padding: 24px 32px 140px 32px;
          max-width: 1200px;
          margin: 0 auto;
        }

        .history-hero {
          display: flex;
          align-items: flex-end;
          gap: 28px;
          margin-bottom: 36px;
        }

        .history-cover {
          width: 160px;
          height: 160px;
          border-radius: 8px;
          background: linear-gradient(135deg, #10b981 0%, #064e3b 100%);
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          box-shadow: 0 10px 30px rgba(0, 0, 0, 0.6);
          border: 1px solid rgba(255, 255, 255, 0.1);
        }

        .history-info {
          display: flex;
          flex-direction: column;
          gap: 6px;
          flex: 1;
          min-width: 0;
        }

        .history-label {
          font-size: 11px;
          font-weight: 800;
          letter-spacing: 1.2px;
          text-transform: uppercase;
          color: #10b981;
        }

        .history-title {
          font-size: 2.4rem;
          font-weight: 900;
          margin: 0;
          letter-spacing: -0.5px;
          color: #ffffff;
          line-height: 1.1;
        }

        .history-stats {
          font-size: 13px;
          color: #aaaaaa;
          margin: 2px 0 0 0;
        }

        .history-hero-actions {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .history-play-btn {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 11px 24px;
          border-radius: 999px;
          background: #10b981;
          color: #ffffff;
          font-weight: 700;
          font-size: 14px;
          border: none;
          cursor: pointer;
          transition: transform 0.15s, background-color 0.15s;
        }

        .history-play-btn:hover {
          background: #059669;
          transform: scale(1.02);
        }

        .history-play-btn:disabled {
          opacity: 0.4;
          cursor: default;
          transform: none;
        }

        .history-clear-btn {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 10px 18px;
          border-radius: 999px;
          background: rgba(255, 255, 255, 0.08);
          border: 1px solid rgba(255, 255, 255, 0.12);
          color: #aaaaaa;
          font-weight: 600;
          font-size: 13px;
          cursor: pointer;
          transition: all 0.15s;
        }

        .history-clear-btn:hover {
          background: rgba(255, 0, 51, 0.15);
          color: #ff4b2b;
          border-color: rgba(255, 0, 51, 0.3);
        }

        .history-section {
          width: 100%;
        }

        .margin-top-lg {
          margin-top: 40px;
        }

        .section-heading {
          font-size: 18px;
          font-weight: 800;
          color: #ffffff;
          margin: 0 0 16px 0;
          letter-spacing: -0.3px;
        }

        .tracks-list {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .empty-history-box {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 60px 0;
          background: rgba(255, 255, 255, 0.02);
          border: 1px dashed rgba(255, 255, 255, 0.1);
          border-radius: 16px;
          text-align: center;
          color: #aaaaaa;
        }

        .empty-history-box h3 {
          font-size: 18px;
          font-weight: 700;
          color: #ffffff;
          margin: 12px 0 6px 0;
        }

        .empty-history-box p {
          font-size: 13px;
          max-width: 320px;
          margin: 0;
        }

        .albums-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
          gap: 20px;
        }

        .history-album-card {
          display: flex;
          flex-direction: column;
          gap: 8px;
          cursor: pointer;
        }

        .card-cover-box {
          position: relative;
          width: 100%;
          aspect-ratio: 1 / 1;
          border-radius: 8px;
          overflow: hidden;
          background: #181818;
        }

        .card-img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          transition: transform 0.2s;
        }

        .history-album-card:hover .card-img {
          transform: scale(1.04);
        }

        .card-play-overlay {
          position: absolute;
          inset: 0;
          background: rgba(0, 0, 0, 0.4);
          display: flex;
          align-items: center;
          justify-content: center;
          opacity: 0;
          transition: opacity 0.2s;
        }

        .history-album-card:hover .card-play-overlay {
          opacity: 1;
        }

        .play-circle-btn {
          width: 40px;
          height: 40px;
          border-radius: 50%;
          background: #ffffff;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.4);
        }

        .card-info {
          display: flex;
          flex-direction: column;
          gap: 2px;
        }

        .card-title {
          font-size: 13px;
          font-weight: 700;
          color: #ffffff;
          margin: 0;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .card-sub {
          font-size: 12px;
          color: #aaaaaa;
          margin: 0;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        @media (max-width: 768px) {
          .history-page {
            padding: 12px 0 120px 0; /* the page scroller already has 16px sides */
          }
          /* Phone: cover + title side by side, buttons in their own row below */
          .history-hero {
            flex-wrap: wrap;
            align-items: center;
            gap: 16px;
            margin-bottom: 28px;
          }
          .history-cover {
            width: 88px;
            height: 88px;
            border-radius: 12px;
          }
          .history-cover :global(svg) {
            width: 38px;
            height: 38px;
          }
          .history-label {
            white-space: nowrap;
          }
          .history-title {
            font-size: 1.6rem;
            white-space: nowrap;
          }
          .history-hero-actions {
            width: 100%;
            gap: 10px;
          }
          .history-play-btn {
            flex: 1;
            justify-content: center;
            white-space: nowrap;
          }
          .history-clear-btn {
            flex-shrink: 0;
          }
          .albums-grid {
            grid-template-columns: repeat(2, 1fr);
            gap: 14px;
          }
        }
      `}</style>
    </div>
  );
}
