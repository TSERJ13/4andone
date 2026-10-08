"use client";

import React, { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Play, ListMusic, Trash2, X } from 'lucide-react';
import { useStudio, Track } from '@/components/admin/StudioProvider';
import { useAudioControls } from '@/components/audio/AudioProvider';
import { useAuth } from '@/context/AuthContext';
import { useDownloadedTracks } from '@/hooks/useDownloadedTracks';
import ConfirmModal from '@/components/admin/ConfirmModal';
import { TrackRow } from '@/components/tracks/TrackRow';

const PlaylistPage = () => {
  const { id } = useParams();
  const router = useRouter();
  const { tracks, folders, folderTracksMap, styles, reorderGlobalTracks, reorderTracks, finalTracks, addToFinal, removeFromFinal, toggleFavorite, removeFolder, removeTrackFromFolder } = useStudio();
  const { isPlaying, title: playingTitle, trackId: playingTrackId, loadTrack } = useAudioControls();
  const { isAuthenticated, setIsAuthModalOpen } = useAuth();
  const downloadedIds = useDownloadedTracks();

  const [infoModal, setInfoModal] = useState({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => { }
  });

  const checkAuthAndExecute = (action: () => void, actionName: string) => {
    if (!isAuthenticated) {
      setInfoModal({
        isOpen: true,
        title: 'Authentication Required',
        message: `Please log in with Telegram to ${actionName} and sync your studio data.`,
        onConfirm: () => {
          setInfoModal(prev => ({ ...prev, isOpen: false }));
          setIsAuthModalOpen(true);
        }
      });
      return;
    }
    action();
  };

  const handleDragStart = (e: React.DragEvent, index: number) => {
    e.dataTransfer.setData('draggedIndex', index.toString());
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = async (e: React.DragEvent, dropIndex: number) => {
    const dragIndex = parseInt(e.dataTransfer.getData('draggedIndex'));
    if (dragIndex !== dropIndex && !isNaN(dragIndex)) {
      const draggedTrack = playlistTracks[dragIndex];
      const targetTrack = playlistTracks[dropIndex];
      if (draggedTrack && targetTrack) {
        await reorderTracks(draggedTrack.id, targetTrack.id, playlistTracks);
      }
    }
  };

  const folder = folders.find(f => f.id === id);
  const playlistTracks = tracks.filter(t =>
    (t.folderId === id || folderTracksMap?.[id as string]?.includes(t.id)) &&
    !t.tags?.some(tag => tag.toLowerCase() === 'closed' || tag === 'დახურული')
  );

  if (id !== 'favorites' && !folder) {
    return (
      <div className="playlist-page animate-in">
        <header className="page-header">
          <h1 className="title">Folder Not Found</h1>
        </header>
      </div>
    );
  }

  const playlist = {
    title: id === 'favorites' ? 'Liked Songs' : (folder?.name || 'Unknown Folder'),
    author: 'Studio Library',
    description: `A collection of ${playlistTracks.length} tracks from your studio.`,
    type: 'Playlist',
    tracks: playlistTracks
  };

  return (
    <div className="playlist-page animate-in">
      <header className="page-header">
        <div 
          className="icon-large glass"
          style={{ 
            background: folder?.color ? `linear-gradient(135deg, ${folder.color}88, #121212)` : undefined,
            borderColor: folder?.color ? `${folder.color}44` : undefined
          }}
        >
          <ListMusic size={64} style={{ color: folder?.color || 'inherit' }} />
        </div>
        <div className="head-content">
          <span className="label">{playlist.type}</span>
          <h1 className="title">{playlist.title}</h1>
          <p className="description text-secondary">{playlist.description}</p>
          <p className="stats">
            <span className="text-primary">{playlist.author}</span> • {playlist.tracks.length} Tracks
          </p>
        </div>
      </header>

      <div className="actions">
        <button
          className="play-btn-large"
          onClick={() => playlist.tracks[0] && loadTrack(playlist.tracks[0])}
        >
          {isPlaying && playlist.tracks.some(t => playingTrackId ? t.id === playingTrackId : t.title === playingTitle) ? <div className="playing-bars"><span></span><span></span><span></span></div> : <Play fill="currentColor" size={24} />}
        </button>

        {id !== 'favorites' && folder && (
          <button
            className="btn-delete-playlist"
            onClick={() => {
              setInfoModal({
                isOpen: true,
                title: 'Delete Playlist',
                message: `Are you sure you want to delete "${folder.name}"?`,
                onConfirm: async () => {
                  setInfoModal(prev => ({ ...prev, isOpen: false }));
                  await removeFolder(id as string);
                  router.push('/library');
                }
              });
            }}
            title="Delete Playlist"
          >
            <Trash2 size={16} />
            <span>Delete</span>
          </button>
        )}
      </div>

      <div className="tracks-list">
        {playlist.tracks.length > 0 ? (
          playlist.tracks.map((track, i) => {
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
              extraAction={id !== 'favorites' ? (
                <button
                  className="remove-track-action"
                  onClick={(e) => { e.stopPropagation(); removeTrackFromFolder(id as string, track.id); }}
                  title="Remove from playlist"
                >
                  <X size={16} />
                </button>
              ) : null}
            />
            );
          })
        ) : (
          <div className="empty-state">
            <p>No tracks in this folder.</p>
          </div>
        )}
      </div>

      <ConfirmModal
        isOpen={infoModal.isOpen}
        title={infoModal.title}
        message={infoModal.message}
        confirmText="Login Now"
        variant="primary"
        onClose={() => setInfoModal(prev => ({ ...prev, isOpen: false }))}
        onConfirm={infoModal.onConfirm}
      />

      <style jsx>{`
        .playlist-page {
          padding: 24px 32px 140px 32px;
          max-width: 1200px;
          margin: 0 auto;
        }

        .page-header {
          display: flex;
          align-items: flex-end;
          gap: 28px;
          margin-bottom: 24px;
        }

        .icon-large { 
          width: 180px; height: 180px; border-radius: 8px; 
          background: linear-gradient(135deg, #ff0033 0%, #770018 100%);
          display: flex; align-items: center; justify-content: center;
          box-shadow: 0 10px 30px rgba(0, 0, 0, 0.6);
          flex-shrink: 0;
          border: 1px solid rgba(255, 255, 255, 0.1);
        }

        .head-content { display: flex; flex-direction: column; gap: 6px; flex: 1; min-width: 0; }
        .label {
          font-size: 11px; font-weight: 800; letter-spacing: 1.2px;
          text-transform: uppercase; color: #ff0033;
        }
        .title { font-size: 2.4rem; font-weight: 900; margin: 0; line-height: 1.1; letter-spacing: -0.5px; color: #fff; }
        .description { font-size: 13px; color: #8b8b93; margin: 2px 0 0 0; }
        .stats { font-size: 13px; font-weight: 500; color: #aaa; margin: 4px 0 0 0; }

        .actions { display: flex; align-items: center; gap: 12px; margin-bottom: 24px; }
        .play-btn-large {
          display: inline-flex; align-items: center; gap: 8px;
          padding: 11px 24px; border: none; border-radius: 999px;
          background: #ff0033; color: #ffffff; font-weight: 700; font-size: 14px;
          cursor: pointer; transition: transform 0.15s, background-color 0.15s;
        }
        .play-btn-large:hover { background: #cc0029; transform: scale(1.02); }
        .play-btn-large:active { transform: scale(0.96); }
        
        .btn-delete-playlist {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 8px 16px;
          border-radius: 20px;
          background: rgba(244, 63, 94, 0.1);
          border: 1px solid rgba(244, 63, 94, 0.25);
          color: #f43f5e;
          font-size: 13px;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.2s;
        }
        .btn-delete-playlist:hover {
          background: rgba(244, 63, 94, 0.2);
          transform: translateY(-1px);
        }

        .remove-track-action {
          opacity: 0.4;
          transition: all 0.2s;
          background: none;
          border: none;
          cursor: pointer;
          color: #71717a;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 4px;
        }
        .remove-track-action:hover {
          opacity: 1;
          color: #f43f5e;
          transform: scale(1.15);
        }

        .tracks-list { display: flex; flex-direction: column; gap: 4px; }
        .empty-state { padding: 60px 20px; text-align: center; color: #717171; }

        @media (max-width: 768px) {
          .playlist-page { padding: 12px 0 120px 0; }
          .page-header { gap: 16px; margin-bottom: 20px; }
          .icon-large { width: 110px; height: 110px; border-radius: 6px; }
          .title { font-size: 1.6rem; }
          .play-btn-large { padding: 9px 18px; font-size: 13px; }
        }
      `}</style>
    </div>
  );
};

export default PlaylistPage;
