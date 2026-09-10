"use client";

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Check, Plus, Music2, FolderPlus } from 'lucide-react';
import { useStudio, Track, Folder } from '@/components/admin/StudioProvider';
import { useAuth } from '@/context/AuthContext';

interface AddToPlaylistModalProps {
  isOpen: boolean;
  onClose: () => void;
  track: Track | null;
}

export const AddToPlaylistModal: React.FC<AddToPlaylistModalProps> = ({
  isOpen,
  onClose,
  track
}) => {
  const { folders, folderTracksMap, addTrackToFolder, removeTrackFromFolder, addFolder } = useStudio();
  const { isAuthenticated, setIsAuthModalOpen } = useAuth();

  const [mounted, setMounted] = useState(false);
  const [showCreateInput, setShowCreateInput] = useState(false);
  const [newPlaylistName, setNewPlaylistName] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [loadingFolderId, setLoadingFolderId] = useState<string | null>(null);

  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  if (!isOpen || !track || !mounted) return null;

  const handleToggleTrack = async (folder: Folder) => {
    if (!isAuthenticated) {
      onClose();
      setIsAuthModalOpen(true);
      return;
    }

    const isAlreadyIn = folderTracksMap?.[folder.id]?.includes(track.id) || track.folderId === folder.id;
    setLoadingFolderId(folder.id);

    try {
      if (isAlreadyIn) {
        await removeTrackFromFolder(folder.id, track.id);
      } else {
        await addTrackToFolder(folder.id, track.id);
      }
    } catch (err) {
      console.error('[ADD-TO-PLAYLIST-ERROR]', err);
    } finally {
      setLoadingFolderId(null);
    }
  };

  const handleCreateAndAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newPlaylistName.trim();
    if (!trimmed) return;

    if (!isAuthenticated) {
      onClose();
      setIsAuthModalOpen(true);
      return;
    }

    setIsCreating(true);
    try {
      const colors = ['#1db954', '#f43f5e', '#3b82f6', '#8b5cf6', '#f59e0b', '#06b6d4'];
      const randomColor = colors[Math.floor(Math.random() * colors.length)];
      const created = await addFolder(trimmed, randomColor);
      if (created) {
        await addTrackToFolder(created.id, track.id);
        setNewPlaylistName('');
        setShowCreateInput(false);
      }
    } catch (err) {
      console.error('[CREATE-AND-ADD-ERROR]', err);
    } finally {
      setIsCreating(false);
    }
  };

  return createPortal(
    <div className="atp-overlay" onClick={onClose}>
      <div className="atp-dialog glass animate-in" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="atp-header">
          <div>
            <h3>Add to Playlist</h3>
            <p className="atp-subtitle">Select a playlist for this track</p>
          </div>
          <button className="atp-close-btn" onClick={onClose} aria-label="Close modal">
            <X size={20} />
          </button>
        </div>

        {/* Track Preview */}
        <div className="atp-track-preview">
          <div className="atp-track-art">
            {track.artworkUrl ? (
              <img src={track.artworkUrl} alt={track.title} />
            ) : (
              <Music2 size={24} color="#1db954" />
            )}
          </div>
          <div className="atp-track-details">
            <h4 className="truncate">{track.title}</h4>
            <p className="truncate">{track.artist || '4and.one Music'}</p>
          </div>
        </div>

        {/* Quick Create Playlist Inline */}
        {showCreateInput ? (
          <form onSubmit={handleCreateAndAdd} className="atp-create-form">
            <input
              type="text"
              placeholder="Playlist name..."
              value={newPlaylistName}
              onChange={(e) => setNewPlaylistName(e.target.value)}
              autoFocus
              maxLength={40}
              className="atp-create-input"
            />
            <button
              type="submit"
              disabled={isCreating || !newPlaylistName.trim()}
              className="atp-create-submit"
            >
              {isCreating ? <span className="atp-spinner"></span> : 'Create'}
            </button>
            <button
              type="button"
              onClick={() => { setShowCreateInput(false); setNewPlaylistName(''); }}
              className="atp-create-cancel"
            >
              Cancel
            </button>
          </form>
        ) : (
          <button
            type="button"
            className="atp-new-btn"
            onClick={() => setShowCreateInput(true)}
          >
            <FolderPlus size={18} />
            <span>New Playlist</span>
          </button>
        )}

        {/* Playlists List */}
        <div className="atp-list-container">
          {folders && folders.length > 0 ? (
            folders.map((folder) => {
              const isIncluded = folderTracksMap?.[folder.id]?.includes(track.id) || track.folderId === folder.id;
              const isLoading = loadingFolderId === folder.id;

              return (
                <button
                  type="button"
                  key={folder.id}
                  className={`atp-folder-item ${isIncluded ? 'is-active' : ''}`}
                  onClick={() => handleToggleTrack(folder)}
                  disabled={isLoading}
                >
                  <div
                    className="atp-folder-badge"
                    style={{ backgroundColor: `${folder.color}22`, borderColor: folder.color }}
                  >
                    <Music2 size={18} style={{ color: folder.color }} />
                  </div>

                  <div className="atp-folder-info">
                    <span className="atp-folder-name truncate">{folder.name}</span>
                    <span className="atp-folder-count">
                      {(folderTracksMap?.[folder.id]?.length || 0)} tracks
                    </span>
                  </div>

                  <div className={`atp-checkbox ${isIncluded ? 'checked' : ''}`}>
                    {isLoading ? (
                      <span className="atp-spinner-small"></span>
                    ) : isIncluded ? (
                      <Check size={14} strokeWidth={3} />
                    ) : null}
                  </div>
                </button>
              );
            })
          ) : (
            <div className="atp-empty">
              <p>No playlists yet.</p>
              <span>Click "New Playlist" above to create your first one!</span>
            </div>
          )}
        </div>
      </div>

      <style jsx>{`
        .atp-overlay {
          position: fixed;
          inset: 0;
          background: rgba(0, 0, 0, 0.82);
          backdrop-filter: blur(14px);
          -webkit-backdrop-filter: blur(14px);
          z-index: 10005;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 20px;
          animation: atpFadeIn 0.2s ease-out;
        }

        .atp-dialog {
          width: 100%;
          max-width: 440px;
          background: #121212;
          border: 1px solid rgba(255, 255, 255, 0.12);
          border-radius: 24px;
          padding: 24px;
          box-shadow: 0 25px 60px rgba(0, 0, 0, 0.85);
          display: flex;
          flex-direction: column;
          gap: 16px;
          animation: atpScaleIn 0.25s cubic-bezier(0.16, 1, 0.3, 1);
        }

        .atp-header {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
        }

        .atp-header h3 {
          font-size: 20px;
          font-weight: 800;
          color: #ffffff;
          margin: 0;
          letter-spacing: -0.3px;
        }

        .atp-subtitle {
          font-size: 12px;
          color: rgba(255, 255, 255, 0.5);
          margin: 2px 0 0 0;
        }

        .atp-close-btn {
          width: 32px;
          height: 32px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          background: rgba(255, 255, 255, 0.06);
          border: none;
          color: rgba(255, 255, 255, 0.6);
          cursor: pointer;
          transition: all 0.2s;
        }

        .atp-close-btn:hover {
          background: rgba(255, 255, 255, 0.14);
          color: #ffffff;
        }

        .atp-track-preview {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 10px 14px;
          background: rgba(255, 255, 255, 0.04);
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 14px;
        }

        .atp-track-art {
          width: 44px;
          height: 44px;
          border-radius: 10px;
          overflow: hidden;
          background: #181818;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }

        .atp-track-art img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .atp-track-details {
          min-width: 0;
          flex: 1;
        }

        .atp-track-details h4 {
          font-size: 14px;
          font-weight: 700;
          color: #ffffff;
          margin: 0;
        }

        .atp-track-details p {
          font-size: 12px;
          color: rgba(255, 255, 255, 0.5);
          margin: 2px 0 0 0;
        }

        .atp-new-btn {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          height: 42px;
          border-radius: 12px;
          background: rgba(29, 185, 84, 0.1);
          border: 1px solid rgba(29, 185, 84, 0.3);
          color: #1db954;
          font-size: 14px;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.2s;
        }

        .atp-new-btn:hover {
          background: rgba(29, 185, 84, 0.2);
          transform: translateY(-1px);
        }

        .atp-create-form {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .atp-create-input {
          flex: 1;
          height: 42px;
          padding: 0 14px;
          border-radius: 12px;
          background: rgba(255, 255, 255, 0.08);
          border: 1px solid rgba(255, 255, 255, 0.15);
          color: #ffffff;
          font-size: 14px;
          outline: none;
        }

        .atp-create-input:focus {
          border-color: #1db954;
        }

        .atp-create-submit {
          height: 42px;
          padding: 0 16px;
          border-radius: 12px;
          background: #1db954;
          border: none;
          color: #000000;
          font-size: 13px;
          font-weight: 700;
          cursor: pointer;
        }

        .atp-create-cancel {
          height: 42px;
          padding: 0 12px;
          border-radius: 12px;
          background: transparent;
          border: 1px solid rgba(255, 255, 255, 0.12);
          color: rgba(255, 255, 255, 0.6);
          font-size: 13px;
          cursor: pointer;
        }

        .atp-list-container {
          display: flex;
          flex-direction: column;
          gap: 8px;
          max-height: 260px;
          overflow-y: auto;
          padding-right: 4px;
        }

        .atp-folder-item {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 10px 12px;
          border-radius: 14px;
          background: rgba(255, 255, 255, 0.04);
          border: 1px solid rgba(255, 255, 255, 0.06);
          cursor: pointer;
          transition: all 0.2s;
          text-align: left;
        }

        .atp-folder-item:hover {
          background: rgba(255, 255, 255, 0.08);
          border-color: rgba(255, 255, 255, 0.12);
        }

        .atp-folder-item.is-active {
          background: rgba(29, 185, 84, 0.08);
          border-color: rgba(29, 185, 84, 0.35);
        }

        .atp-folder-badge {
          width: 38px;
          height: 38px;
          border-radius: 10px;
          border: 1px solid;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }

        .atp-folder-info {
          flex: 1;
          min-width: 0;
          display: flex;
          flex-direction: column;
        }

        .atp-folder-name {
          font-size: 14px;
          font-weight: 700;
          color: #ffffff;
        }

        .atp-folder-count {
          font-size: 11px;
          color: rgba(255, 255, 255, 0.45);
        }

        .atp-checkbox {
          width: 24px;
          height: 24px;
          border-radius: 50%;
          border: 2px solid rgba(255, 255, 255, 0.25);
          display: flex;
          align-items: center;
          justify-content: center;
          color: #000000;
          flex-shrink: 0;
          transition: all 0.2s;
        }

        .atp-checkbox.checked {
          background: #1db954;
          border-color: #1db954;
        }

        .atp-empty {
          padding: 30px 16px;
          text-align: center;
          color: rgba(255, 255, 255, 0.5);
        }

        .atp-empty p {
          margin: 0;
          font-weight: 700;
        }

        .atp-empty span {
          font-size: 12px;
          opacity: 0.7;
        }

        .atp-spinner {
          display: inline-block;
          width: 16px;
          height: 16px;
          border: 2px solid rgba(0, 0, 0, 0.3);
          border-top-color: #000000;
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
        }

        .atp-spinner-small {
          display: inline-block;
          width: 12px;
          height: 12px;
          border: 2px solid rgba(255, 255, 255, 0.3);
          border-top-color: #1db954;
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
        }

        @keyframes atpFadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }

        @keyframes atpScaleIn {
          from { opacity: 0; transform: scale(0.95); }
          to { opacity: 1; transform: scale(1); }
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>,
    document.body
  );
};

export default AddToPlaylistModal;
