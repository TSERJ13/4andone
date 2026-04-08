"use client";

import React from 'react';
import { useParams } from 'next/navigation';
import { Play, Clock, Music2, MoreHorizontal, Heart, Disc, ListMusic, GripVertical, Flag } from 'lucide-react';
import { useStudio, Track } from '@/components/admin/StudioProvider';
import { useAudio } from '@/components/audio/AudioProvider';
import { useAuth } from '@/context/AuthContext';
import { formatDuration } from '@/utils/format';
import ConfirmModal from '@/components/admin/ConfirmModal';
import { useState } from 'react';

const PlaylistPage = () => {
  const { id } = useParams();
  const { tracks, folders, reorderGlobalTracks, finalTracks, addToFinal, removeFromFinal, toggleFavorite } = useStudio();
  const { isPlaying, title: playingTitle, loadTrack } = useAudio();
  const { isAuthenticated, setIsAuthModalOpen } = useAuth();

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
  const playlistTracks = tracks.filter(t => t.folderId === id);

  if (id !== 'favorites' && !folder) {
    return (
      <div className="playlist-page">
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
    <div className="playlist-page">
      <header className="page-header">
        <div className="icon-large glass">
          <ListMusic size={64} fill="currentColor" />
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
          {isPlaying && playlist.tracks.some(t => t.title === playingTitle) ? <span className="pause-icon">||</span> : <Play fill="currentColor" size={24} />}
        </button>
      </div>

      <div className="tracks-list">
        {playlist.tracks.length > 0 ? (
          playlist.tracks.map((track, i) => (
            <div 
              key={track.id} 
              className={`track-row glass ${isPlaying && playingTitle === track.title ? 'is-playing' : ''}`} 
              draggable
              onDragStart={(e) => handleDragStart(e, i)}
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(e, i)}
              onClick={() => loadTrack(track)}
            >
              <div className="track-number">{i + 1}</div>
              <div className="track-meta">
                <Music2 size={20} className="text-secondary" />
                <div>
                  <p className="track-name">{track.title}</p>
                  <p className="track-artist text-secondary">{track.artist}</p>
                </div>
              </div>
              <div className="track-duration text-secondary">
                {formatDuration(track.duration)}
              </div>
              <div className="track-actions">
                <button
                  className={`feature-icon ${track.isFavorite ? 'active-heart' : ''}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    checkAuthAndExecute(() => toggleFavorite?.(track.id), 'favorite tracks');
                  }}
                >
                  <Heart size={18} fill={track.isFavorite ? "#ff4b2b" : "none"} color={track.isFavorite ? "#ff4b2b" : "currentColor"} />
                </button>
                <button
                  className={`feature-icon ${finalTracks.some(t => t.id === track.id) ? 'active-flag' : ''}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    checkAuthAndExecute(() => {
                      finalTracks.some(t => t.id === track.id) ? removeFromFinal(track.id) : addToFinal(track);
                    }, 'manage competition folders');
                  }}
                >
                  <Flag size={18} fill={finalTracks.some(t => t.id === track.id) ? "currentColor" : "none"} />
                </button>
                <div className="btn-play-row">
                  {isPlaying && playingTitle === track.title ? (
                    <div className="playing-bars"><span></span><span></span><span></span></div>
                  ) : (
                    <Play size={20} fill="currentColor" />
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
        .playlist-page { padding: 24px; }
        .page-header { display: flex; align-items: flex-end; gap: 24px; margin-bottom: 32px; }
        .icon-large { 
          width: 232px; height: 232px; border-radius: 12px; 
          background: linear-gradient(135deg, #1db954, #191414);
          display: flex; align-items: center; justify-content: center;
          box-shadow: 0 16px 32px rgba(0,0,0,0.5);
          flex-shrink: 0;
        }
        .title { font-size: 6rem; font-weight: 900; margin: 0; line-height: 1; letter-spacing: -4px; }
        .play-btn-large { 
          width: 56px; height: 56px; border-radius: 50%; background: var(--primary); 
          color: black; display: flex; align-items: center; justify-content: center; 
          transition: transform 0.2s; margin-bottom: 24px;
        }
        .play-btn-large:hover { transform: scale(1.05); }
        
        .tracks-list { display: flex; flex-direction: column; gap: 8px; }
        .track-row {
          display: grid;
          grid-template-columns: 40px 1fr 140px 100px;
          align-items: center;
          padding: 12px 16px;
          border-radius: 12px;
          transition: background 0.2s;
        }
        .track-row:hover { background: rgba(255,255,255,0.08); }
        .track-number { font-size: 12px; font-weight: 800; opacity: 0.3; width: 40px; text-align: center; }
        .track-meta { display: flex; align-items: center; gap: 16px; }
        .track-name { font-weight: 600; font-size: 14px; }
        .track-artist { font-size: 12px; }
        .track-duration { font-size: 13px; font-weight: 500; }
        .track-actions { display: flex; align-items: center; justify-content: flex-end; gap: 16px; }
        .btn-play-row { color: var(--primary); }

        .track-row.is-playing {
          background: rgba(29, 185, 84, 0.08);
          border-left: 3px solid #1db954;
        }
        .track-row.is-playing .track-name { color: #1db954; }

        .feature-icon { color: #555; transition: all 0.2s; background: none; border: none; cursor: pointer; }
        .feature-icon:hover { color: white; transform: scale(1.1); }
        .feature-icon.active-flag { color: #1db954; }
        .feature-icon.active-heart { color: #ff4b2b; }

        .playing-bars { display: flex; align-items: flex-end; gap: 2px; width: 16px; height: 16px; }
        .playing-bars span { width: 2px; background: var(--primary); animation: dance 1s infinite ease-in-out; }
        .playing-bars span:nth-child(1) { height: 60%; animation-delay: -0.4s; }
        .playing-bars span:nth-child(2) { height: 100%; animation-delay: -0.2s; }
        .playing-bars span:nth-child(3) { height: 80%; animation-delay: 0s; }
        
        .text-secondary { color: var(--text-secondary); }
        .text-primary { color: var(--primary); }

        @media (max-width: 768px) {
          .playlist-page { padding: 16px; padding-bottom: 120px; }
          .page-header { 
            flex-direction: column; 
            align-items: center; 
            text-align: center;
            gap: 16px;
            margin-bottom: 24px;
          }
          .icon-large { width: 160px; height: 160px; }
          .title { font-size: 2.5rem; letter-spacing: -1px; }
          .track-row {
            grid-template-columns: 32px 1fr 60px;
            padding: 10px;
          }
          .track-duration { display: none; }
        }
      `}</style>
    </div>
  );
};

export default PlaylistPage;
