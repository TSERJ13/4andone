"use client";

import React, { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Play, Pause, Clock, Music2, MoreHorizontal, Heart, Disc, ListMusic, GripVertical, Trash2, X } from 'lucide-react';
import { useStudio, Track } from '@/components/admin/StudioProvider';
import { useAudio } from '@/components/audio/AudioProvider';
import { useAuth } from '@/context/AuthContext';
import { formatDuration } from '@/utils/format';
import ConfirmModal from '@/components/admin/ConfirmModal';
import { getMPMFromBPM } from '@/utils/audio';
import { Marquee } from '@/components/layout/Marquee';

const PlaylistPage = () => {
  const { id } = useParams();
  const router = useRouter();
  const { tracks, folders, folderTracksMap, styles, reorderGlobalTracks, finalTracks, addToFinal, removeFromFinal, toggleFavorite, removeFolder, removeTrackFromFolder } = useStudio();
  const { isPlaying, title: playingTitle, loadTrack } = useAudio();
  const { isAuthenticated, setIsAuthModalOpen } = useAuth();

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

  const handleDrop = (e: React.DragEvent, dropIndex: number) => {
    const dragIndex = parseInt(e.dataTransfer.getData('draggedIndex'));
    if (dragIndex !== dropIndex) {
      reorderGlobalTracks(dragIndex, dropIndex);
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
          {isPlaying && playlist.tracks.some(t => t.title === playingTitle) ? <div className="playing-bars"><span></span><span></span><span></span></div> : <Play fill="currentColor" size={24} />}
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
          playlist.tracks.map((track, i) => (
            <div
              key={track.id}
              className={`track-row ${isPlaying && (playingTitle === track.title || playingTitle === track.id) ? 'is-active' : ''}`}
              draggable
              onDragStart={(e) => handleDragStart(e, i)}
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(e, i)}
              onClick={() => loadTrack(track)}
            >
              <div className="track-index">{i + 1}</div>
              <div className="track-icon-col">
                <Disc size={18} />
              </div>
              <div className="track-info-col">
                <Marquee 
                  text={track.title} 
                  className="track-name" 
                  isActive={isPlaying && (playingTitle === track.title || playingTitle === track.id)}
                />
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
                  : (track.bpm ? `${getMPMFromBPM(Number(track.bpm), track.style)} BPM` : formatDuration(track.duration))}
              </div>

              <div className="track-actions-col">
                <button
                  className={`fav-action ${track.isFavorite ? 'active-heart' : ''}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    checkAuthAndExecute(() => toggleFavorite?.(track.id), 'favorite tracks');
                  }}
                  title="Like Song"
                >
                  <Heart size={16} fill={track.isFavorite ? "#ff4b2b" : "none"} color={track.isFavorite ? "#ff4b2b" : "currentColor"} />
                </button>

                {id !== 'favorites' && (
                  <button
                    className="remove-track-action"
                    onClick={(e) => {
                      e.stopPropagation();
                      removeTrackFromFolder(id as string, track.id);
                    }}
                    title="Remove from playlist"
                  >
                    <X size={16} />
                  </button>
                )}

                <div className="play-action">
                  {isPlaying && (playingTitle === track.title || playingTitle === track.id) ? (
                    <div className="playing-bars"><span></span><span></span><span></span></div>
                  ) : (
                    <Play size={18} fill="currentColor" />
                  )}
                </div>
              </div>
            </div>
          ))
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
        .playlist-page { padding: 40px; padding-bottom: 120px; }
        .page-header { display: flex; align-items: flex-end; gap: 32px; margin-bottom: 40px; }
        .icon-large { 
          width: 232px; height: 232px; border-radius: 20px; 
          background: linear-gradient(135deg, var(--primary), #121212);
          display: flex; align-items: center; justify-content: center;
          box-shadow: 0 16px 32px rgba(0,0,0,0.5);
          flex-shrink: 0;
          border: 1px solid rgba(255,255,255,0.05);
        }
        .head-content { display: flex; flex-direction: column; gap: 8px; }
        .label { text-transform: uppercase; font-size: 11px; font-weight: 800; letter-spacing: 1px; color: #71717a; }
        .title { font-size: 5rem; font-weight: 950; margin: 0; line-height: 1; letter-spacing: -3px; }
        .description { font-size: 14px; opacity: 0.6; }
        .stats { font-size: 14px; font-weight: 600; color: #71717a; }

        .actions { display: flex; align-items: center; height: 100px; }
        .play-btn-large { 
          width: 56px; height: 56px; border-radius: 50%; background: var(--primary); 
          color: black; display: flex; align-items: center; justify-content: center; 
          transition: transform 0.2s;
        }
        .play-btn-large:hover { transform: scale(1.05); }
        
        .btn-delete-playlist {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 8px 16px;
          margin-left: 16px;
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

        .fav-action { opacity: 0.4; transition: all 0.2s; background: none; border: none; cursor: pointer; color: #555; }
        .fav-action:hover, .fav-action.active-heart { opacity: 1; transform: scale(1.1); }
        .fav-action.active-heart { color: #ff4b2b; }
        
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
        
        .text-secondary { color: #71717a; }
        .text-primary { color: var(--primary); }

        .empty-state { padding: 40px; text-align: center; opacity: 0.4; }

        @media (max-width: 768px) {
          .playlist-page { padding: 20px; padding-bottom: 120px; }
          .page-header { flex-direction: column; align-items: center; text-align: center; gap: 24px; margin-top: 20px; }
          .icon-large { width: 140px; height: 140px; border-radius: 20px; }
          .title { font-size: 2.2rem; letter-spacing: -1px; }
          .actions { justify-content: center; height: 80px; }
        }
      `}</style>
    </div>
  );
};

export default PlaylistPage;
