"use client";

import React, { useState } from 'react';
import { X, CheckCircle2, Music4 } from 'lucide-react';
import { useStudio } from '@/components/admin/StudioProvider';

interface PlaylistModalProps {
  trackTitle: string;
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (playlistId: string, playlistName: string) => void;
}

const PlaylistModal: React.FC<PlaylistModalProps> = ({ trackTitle, isOpen, onClose, onConfirm }) => {
  const { folders } = useStudio();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);

  if (!isOpen) return null;

  const handleConfirm = () => {
    if (selectedId) {
      const folder = folders.find(f => f.id === selectedId);
      if (folder) {
        onConfirm(selectedId, folder.name);
        setIsSuccess(true);
        setTimeout(() => {
          setIsSuccess(false);
          onClose();
          setSelectedId(null);
        }, 1500);
      }
    }
  };

  const selectedFolder = folders.find(f => f.id === selectedId);

  return (
    <div className="modal-overlay">
      <div className="playlist-modal glass animate-in">
        <div className="modal-header">
          <div className="header-info">
            <h3>Add to Playlist</h3>
            <p className="track-name-display">{trackTitle}</p>
          </div>
          <button className="close-btn" onClick={onClose}><X size={20} /></button>
        </div>

        {isSuccess ? (
          <div className="success-state">
            <CheckCircle2 size={48} className="text-primary" />
            <p>Added to <strong>{selectedFolder?.name}</strong></p>
          </div>
        ) : (
          <>
            <div className="playlist-grid">
              {folders.length > 0 ? folders.map((p) => (
                <button 
                  key={p.id} 
                  className={`playlist-item glass ${selectedId === p.id ? 'active' : ''}`}
                  onClick={() => setSelectedId(p.id)}
                >
                  <Music4 size={16} className={selectedId === p.id ? 'text-primary' : 'text-secondary'} style={{ color: p.color }} />
                  <span>{p.name}</span>
                </button>
              )) : (
                <div className="empty-state text-secondary">
                  No playlists created yet.
                </div>
              )}
            </div>

            <div className="modal-footer">
              <button className="btn-cancel" onClick={onClose}>Cancel</button>
              <button 
                className="btn-confirm" 
                disabled={!selectedId}
                onClick={handleConfirm}
              >
                Add to Playlist
              </button>
            </div>
          </>
        )}
      </div>

      <style jsx>{`
        .modal-overlay {
          position: fixed;
          inset: 0;
          background: rgba(0, 0, 0, 0.8);
          backdrop-filter: blur(8px);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 2000;
          padding: 20px;
        }

        .playlist-modal {
          width: 100%;
          max-width: 440px;
          border-radius: 24px;
          padding: 32px;
          display: flex;
          flex-direction: column;
          gap: 24px;
        }

        .modal-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
        }

        .header-info h3 { font-size: 20px; font-weight: 800; margin-bottom: 4px; }
        .track-name-display { color: #1db954; font-size: 14px; font-weight: 600; }

        .close-btn { color: #71717a; transition: color 0.2s; }
        .close-btn:hover { color: white; }

        .playlist-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 12px;
          max-height: 300px;
          overflow-y: auto;
          padding-right: 8px;
        }

        .playlist-grid::-webkit-scrollbar { width: 4px; }
        .playlist-grid::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 2px; }

        .playlist-item {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 12px 16px;
          border-radius: 12px;
          font-size: 14px;
          font-weight: 600;
          text-align: left;
          transition: all 0.2s;
        }

        .playlist-item:hover { background: rgba(255,255,255,0.05); }
        .playlist-item.active { background: rgba(29, 185, 84, 0.1); border-color: #1db954; color: white; }

        .modal-footer {
          display: flex;
          gap: 12px;
          margin-top: 12px;
        }

        .btn-cancel { flex: 1; padding: 12px; border-radius: 12px; font-weight: 700; color: #a1a1aa; }
        .btn-confirm { 
          flex: 2; 
          padding: 12px; 
          border-radius: 12px; 
          background: #1db954; 
          color: black; 
          font-weight: 800; 
          transition: all 0.2s;
        }
        .btn-confirm:disabled { opacity: 0.5; cursor: not-allowed; filter: grayscale(1); }
        .btn-confirm:hover:not(:disabled) { transform: translateY(-2px); box-shadow: 0 4px 12px rgba(29, 185, 84, 0.4); }

        .success-state {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 16px;
          padding: 40px 0;
          text-align: center;
        }
        .success-state p { font-size: 16px; }

        .text-primary { color: #1db954; }
        .text-secondary { color: #71717a; }

        .empty-state { grid-column: span 2; text-align: center; padding: 20px; }

        @keyframes animate-in {
          from { opacity: 0; transform: scale(0.95) translateY(10px); }
          to { opacity: 1; transform: scale(1) translateY(0); }
        }
        .animate-in { animation: animate-in 0.3s cubic-bezier(0.4, 0, 0.2, 1); }
      `}</style>
    </div>
  );
};

export default PlaylistModal;
