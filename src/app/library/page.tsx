"use client";

import React, { useState } from 'react';
import { Heart, Plus, Disc, History, TrendingUp, ArrowDownToLine } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useStudio, Track } from '@/components/admin/StudioProvider';
import { useAudioControls } from '@/components/audio/AudioProvider';
import { useAuth } from '@/context/AuthContext';
import ConfirmModal from '@/components/admin/ConfirmModal';
import CreatePlaylistModal from '@/components/library/CreatePlaylistModal';
import { getDownloadedTrackIds, subscribeToOfflineUpdates } from '@/utils/offline';
import { TrackRow } from '@/components/tracks/TrackRow';

export default function LibraryPage() {
  const router = useRouter();
  const { tracks, folders, folderTracksMap, styles, finalTracks, addToFinal, removeFromFinal, toggleFavorite } = useStudio();
  const { isPlaying, title: playingTitle, trackId: playingTrackId, loadTrack } = useAudioControls();
  const { isAuthenticated, setIsAuthModalOpen } = useAuth();
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [downloadedIds, setDownloadedIds] = useState<string[]>([]);

  React.useEffect(() => {
    setDownloadedIds(getDownloadedTrackIds());
    const unsubscribe = subscribeToOfflineUpdates(() => {
      setDownloadedIds(getDownloadedTrackIds());
    });
    return unsubscribe;
  }, []);

  const [infoModal, setInfoModal] = useState({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {}
  });

  const checkAuthAndExecute = (action: () => void, actionName: string) => {
    if (!isAuthenticated) {
      setInfoModal({
        isOpen: true,
        title: 'Connect Telegram',
        message: `Please sign in with Telegram to ${actionName} and sync your dance library across all your devices.`,
        onConfirm: () => {
          setInfoModal(prev => ({ ...prev, isOpen: false }));
          setIsAuthModalOpen(true);
        }
      });
      return;
    }
    action();
  };

  return (
    <div className="library-content animate-in">
      <header className="library-header">
        <h1>Your Library</h1>
      </header>

      <section className="library-section">
        <div className="section-header">
          <History size={18} className="text-secondary" />
          <h2>Your Collections</h2>
        </div>
        <div className="collection-grid">
          <div 
            onClick={() => router.push('/library/favorites')}
            className="collection-card liked-card glass"
            style={{ cursor: 'pointer' }}
          >
            <div className="card-icon" style={{ color: '#f43f5e' }}>
              <Heart size={26} fill="#f43f5e" />
            </div>
            <div className="card-info">
              <h3>Liked Songs</h3>
              <p className="meta text-secondary">
                {tracks.filter(t => t.isFavorite && !t.tags?.some(tag => tag.toLowerCase() === 'closed' || tag === 'დახურული')).length} Tracks
              </p>
            </div>
          </div>

          <div 
            onClick={() => router.push('/library/downloaded')}
            className="collection-card glass"
            style={{ cursor: 'pointer' }}
          >
            <div className="card-icon" style={{ color: '#22c55e' }}>
              <ArrowDownToLine size={26} />
            </div>
            <div className="card-info">
              <h3>Downloaded</h3>
              <p className="meta text-secondary">
                {downloadedIds.length} On Device
              </p>
            </div>
          </div>

          <div 
            className="collection-card create-card glass"
            onClick={() => checkAuthAndExecute(() => setIsCreateModalOpen(true), 'create playlists')}
            style={{ cursor: 'pointer' }}
          >
            <div className="card-icon" style={{ color: '#1db954' }}>
              <Plus size={26} strokeWidth={2.5} />
            </div>
            <div className="card-info">
              <h3>Create Playlist</h3>
              <p className="meta text-secondary">New Playlist</p>
            </div>
          </div>

          {folders.map((folder) => (
            <div 
              key={folder.id} 
              onClick={() => router.push(`/library/${folder.id}`)} 
              className="collection-card glass"
              style={{ cursor: 'pointer' }}
            >
              <div className="card-icon" style={{ color: folder.color || '#a855f7' }}>
                <Disc size={26} />
              </div>
              <div className="card-info">
                <h3>{folder.name}</h3>
                <p className="meta text-secondary">{tracks.filter(t => 
                  (t.folderId === folder.id || folderTracksMap?.[folder.id]?.includes(t.id)) && 
                  t.style?.toLowerCase() !== 'fitness' &&
                  !t.tags?.some(tag => tag.toLowerCase() === 'closed' || tag === 'დახურული')
                ).length} Tracks</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="library-section">
        <div className="section-header">
          <TrendingUp size={18} className="text-secondary" />
          <h2>Recent Practice</h2>
        </div>
        <div className="tracks-list">
          {(() => {
            const list = tracks.filter(t => 
              t.style?.toLowerCase() !== 'fitness' && 
              !t.tags?.some(tag => tag.toLowerCase() === 'closed' || tag === 'დახურული')
            ).slice(0, 10);

            if (list.length === 0) {
              return (
                <div className="empty-state p-8 text-center text-secondary">
                  No practice tracks available.
                </div>
              );
            }

            return list.map((track, i) => {
              const isTrackActive = isPlaying && (playingTrackId ? playingTrackId === track.id : (playingTitle === track.title || playingTitle === track.id));

              return (
              <TrackRow
                key={track.id}
                track={track}
                isActive={isTrackActive}
                onPlay={() => loadTrack(track)}
                onToggleFavorite={() => checkAuthAndExecute(() => toggleFavorite?.(track.id), 'favorite tracks')}
                badge="style"
                styleColor={styles.find(s => s.title.toLowerCase() === track.style?.toLowerCase())?.color}
                isDownloaded={downloadedIds.includes(track.id)}
              />
              );
            });
        })()}
        </div>
      </section>

      <ConfirmModal 
        isOpen={infoModal.isOpen}
        title={infoModal.title}
        message={infoModal.message}
        confirmText="Login Now"
        variant="primary"
        onClose={() => setInfoModal(prev => ({ ...prev, isOpen: false }))}
        onConfirm={infoModal.onConfirm}
      />

      <CreatePlaylistModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSuccess={(newFolder) => router.push(`/library/${newFolder.id}`)}
      />

      <style jsx>{`
        .library-content {
          display: flex;
          flex-direction: column;
          gap: 28px;
          padding: 24px 32px 140px 32px;
          max-width: 1200px;
          margin: 0 auto;
        }

        .library-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
        }

        .library-header h1 {
          font-size: 2.2rem;
          font-weight: 900;
          letter-spacing: -0.5px;
          color: #ffffff;
        }

        .library-section {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .section-header {
          display: flex;
          align-items: center;
          gap: 10px;
          color: #ffffff;
        }

        .section-header h2 {
          font-size: 1.25rem;
          font-weight: 800;
        }

        .collection-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
          gap: 20px;
        }

        .collection-card {
          box-sizing: border-box;
          padding: 16px;
          border-radius: 8px;
          display: flex;
          flex-direction: column;
          align-items: flex-start;
          text-align: left;
          gap: 12px;
          background: #181818;
          border: 1px solid rgba(255, 255, 255, 0.06);
          cursor: pointer;
          transition: background-color 0.15s ease, transform 0.15s ease;
        }

        .collection-card:hover {
          background: #252525;
          transform: translateY(-2px);
        }

        .collection-card.create-card {
          border: 1px dashed rgba(255, 255, 255, 0.2);
          background: transparent;
        }

        .collection-card.create-card:hover {
          border-color: #ff0033;
          background: rgba(255, 0, 51, 0.05);
        }

        .card-icon { 
          width: 60px; height: 60px; border-radius: 6px; display: flex; align-items: center; justify-content: center; 
          background: rgba(255, 255, 255, 0.05);
          flex-shrink: 0;
        }

        .card-info { display: flex; flex-direction: column; gap: 3px; width: 100%; }
        .card-info h3 { font-size: 14px; font-weight: 700; margin: 0; color: #ffffff; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .card-info .meta { font-size: 12px; color: #aaa; margin: 0; }

        .tracks-list { display: flex; flex-direction: column; gap: 4px; }

        @media (max-width: 768px) {
          .library-content {
            padding: 12px 0 120px 0;
          }
          .collection-grid {
            grid-template-columns: repeat(2, 1fr);
            gap: 12px;
          }
          .collection-card {
            padding: 12px !important;
            border-radius: 6px !important;
          }
          .card-icon {
            width: 44px !important;
            height: 44px !important;
          }
        }
      `}</style>
    </div>
  );
}
