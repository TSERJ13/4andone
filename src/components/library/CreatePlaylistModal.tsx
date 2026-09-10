"use client";

import React, { useState } from 'react';
import { X, Music, Plus, Check } from 'lucide-react';
import { useStudio, Folder } from '@/components/admin/StudioProvider';

interface CreatePlaylistModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (folder: Folder) => void;
}

const COLOR_OPTIONS = [
  '#1db954', // Spotify Green
  '#f43f5e', // Ruby Rose
  '#3b82f6', // Electric Blue
  '#8b5cf6', // Violet Purple
  '#f59e0b', // Amber Orange
  '#06b6d4', // Cyan
];

export const CreatePlaylistModal: React.FC<CreatePlaylistModalProps> = ({
  isOpen,
  onClose,
  onSuccess
}) => {
  const { addFolder } = useStudio();
  const [playlistName, setPlaylistName] = useState('');
  const [selectedColor, setSelectedColor] = useState(COLOR_OPTIONS[0]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = playlistName.trim();
    if (!trimmed) {
      setErrorMessage('Please enter a playlist name');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage('');

    try {
      const created = await addFolder(trimmed, selectedColor);
      setPlaylistName('');
      onClose();
      if (created && onSuccess) {
        onSuccess(created);
      }
    } catch (err: any) {
      console.error('[PLAYLIST-CREATE-ERROR]', err);
      setErrorMessage(err.message || 'Failed to create playlist');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="cpm-overlay" onClick={onClose}>
      <div className="cpm-dialog glass" onClick={(e) => e.stopPropagation()}>
        <div className="cpm-header">
          <div className="cpm-header-title">
            <div className="cpm-icon-badge" style={{ backgroundColor: `${selectedColor}22`, borderColor: selectedColor }}>
              <Music size={22} style={{ color: selectedColor }} />
            </div>
            <div>
              <h2>Create Playlist</h2>
              <p>Save your favorite tracks to the cloud</p>
            </div>
          </div>
          <button className="cpm-close-btn" onClick={onClose} aria-label="Close dialog">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="cpm-form">
          <div className="cpm-field">
            <label htmlFor="playlist-name-input">Playlist Name</label>
            <input
              id="playlist-name-input"
              type="text"
              placeholder="e.g. Samba Practice 2026"
              value={playlistName}
              onChange={(e) => { setPlaylistName(e.target.value); setErrorMessage(''); }}
              autoFocus
              maxLength={50}
              className="cpm-input"
            />
            {errorMessage && <span className="cpm-error">{errorMessage}</span>}
          </div>

          <div className="cpm-field">
            <label>Cover Accent Color</label>
            <div className="cpm-colors">
              {COLOR_OPTIONS.map((color) => (
                <button
                  type="button"
                  key={color}
                  className={`cpm-color-dot ${selectedColor === color ? 'selected' : ''}`}
                  style={{ backgroundColor: color }}
                  onClick={() => setSelectedColor(color)}
                >
                  {selectedColor === color && <Check size={14} color="#000000" strokeWidth={3} />}
                </button>
              ))}
            </div>
          </div>

          <div className="cpm-actions">
            <button
              type="button"
              className="cpm-btn-secondary"
              onClick={onClose}
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="cpm-btn-primary"
              style={{ backgroundColor: selectedColor }}
              disabled={isSubmitting || !playlistName.trim()}
            >
              {isSubmitting ? (
                <div className="cpm-spinner"></div>
              ) : (
                <>
                  <Plus size={18} strokeWidth={2.5} />
                  <span>Create Playlist</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>

      <style jsx>{`
        .cpm-overlay {
          position: fixed;
          inset: 0;
          background: rgba(0, 0, 0, 0.75);
          backdrop-filter: blur(12px);
          -webkit-backdrop-filter: blur(12px);
          z-index: 10002;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 20px;
          animation: cpmFadeIn 0.2s ease-out;
        }

        .cpm-dialog {
          width: 100%;
          max-width: 440px;
          background: #111111;
          border: 1px solid rgba(255, 255, 255, 0.12);
          border-radius: 24px;
          padding: 24px;
          box-shadow: 0 20px 60px rgba(0, 0, 0, 0.85);
          animation: cpmScaleIn 0.25s cubic-bezier(0.16, 1, 0.3, 1);
        }

        .cpm-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 24px;
        }

        .cpm-header-title {
          display: flex;
          align-items: center;
          gap: 14px;
        }

        .cpm-icon-badge {
          width: 44px;
          height: 44px;
          border-radius: 14px;
          display: flex;
          align-items: center;
          justify-content: center;
          border: 1px solid;
          transition: all 0.2s ease;
        }

        .cpm-header-title h2 {
          font-size: 19px;
          font-weight: 800;
          margin: 0;
          color: #ffffff;
          letter-spacing: -0.3px;
        }

        .cpm-header-title p {
          font-size: 12px;
          color: rgba(255, 255, 255, 0.45);
          margin: 2px 0 0 0;
        }

        .cpm-close-btn {
          width: 32px;
          height: 32px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          background: rgba(255, 255, 255, 0.05);
          border: none;
          color: rgba(255, 255, 255, 0.6);
          cursor: pointer;
          transition: all 0.2s;
        }

        .cpm-close-btn:hover {
          background: rgba(255, 255, 255, 0.12);
          color: #ffffff;
        }

        .cpm-form {
          display: flex;
          flex-direction: column;
          gap: 20px;
        }

        .cpm-field {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .cpm-field label {
          font-size: 12px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.8px;
          color: rgba(255, 255, 255, 0.6);
        }

        .cpm-input {
          width: 100%;
          height: 48px;
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.12);
          border-radius: 14px;
          padding: 0 16px;
          font-size: 15px;
          color: #ffffff;
          outline: none;
          transition: all 0.2s;
        }

        .cpm-input:focus {
          border-color: #1db954;
          background: rgba(255, 255, 255, 0.08);
          box-shadow: 0 0 0 3px rgba(29, 185, 84, 0.2);
        }

        .cpm-error {
          font-size: 12px;
          color: #f43f5e;
          font-weight: 600;
        }

        .cpm-colors {
          display: flex;
          gap: 12px;
        }

        .cpm-color-dot {
          width: 36px;
          height: 36px;
          border-radius: 50%;
          border: 2px solid transparent;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: transform 0.2s, border-color 0.2s;
        }

        .cpm-color-dot:hover {
          transform: scale(1.12);
        }

        .cpm-color-dot.selected {
          border-color: #ffffff;
          transform: scale(1.15);
          box-shadow: 0 0 14px rgba(255, 255, 255, 0.35);
        }

        .cpm-actions {
          display: flex;
          align-items: center;
          justify-content: flex-end;
          gap: 12px;
          margin-top: 8px;
        }

        .cpm-btn-secondary {
          height: 44px;
          padding: 0 20px;
          border-radius: 12px;
          background: rgba(255, 255, 255, 0.06);
          border: 1px solid rgba(255, 255, 255, 0.08);
          color: rgba(255, 255, 255, 0.8);
          font-size: 14px;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.2s;
        }

        .cpm-btn-secondary:hover {
          background: rgba(255, 255, 255, 0.1);
          color: #ffffff;
        }

        .cpm-btn-primary {
          height: 44px;
          padding: 0 24px;
          border-radius: 12px;
          border: none;
          color: #000000;
          font-size: 14px;
          font-weight: 800;
          display: flex;
          align-items: center;
          gap: 8px;
          cursor: pointer;
          transition: all 0.2s;
          box-shadow: 0 4px 15px rgba(0, 0, 0, 0.4);
        }

        .cpm-btn-primary:disabled {
          opacity: 0.4;
          cursor: not-allowed;
        }

        .cpm-btn-primary:not(:disabled):hover {
          transform: translateY(-1.5px);
          box-shadow: 0 6px 20px rgba(0, 0, 0, 0.5);
        }

        .cpm-spinner {
          width: 18px;
          height: 18px;
          border: 2px solid rgba(0, 0, 0, 0.3);
          border-top-color: #000000;
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
        }

        @keyframes cpmFadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }

        @keyframes cpmScaleIn {
          from { opacity: 0; transform: scale(0.94); }
          to { opacity: 1; transform: scale(1); }
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

export default CreatePlaylistModal;
