"use client";

import React from 'react';
import {
  Heart,
  Plus,
  Music,
  Disc,
  ChevronRight,
  History,
  TrendingUp,
  Flag,
  Play
} from 'lucide-react';
import Link from 'next/link';
import { useStudio, Track } from '@/components/admin/StudioProvider';
import { useAudio } from '@/components/audio/AudioProvider';
import { useAuth } from '@/context/AuthContext';
import { getMPMFromBPM } from '@/utils/audio';
import ConfirmModal from '@/components/admin/ConfirmModal';
import { useState } from 'react';

export default function LibraryPage() {
  const { tracks, folders, finalTracks, addToFinal, removeFromFinal, toggleFavorite } = useStudio();
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

  return (
    <div className="library-container animate-in">
      {/* ... Header remains ... */}
      <header className="library-header">
        <h1>Your Library</h1>
        <div className="header-actions">
          {/* Manage Assets removed as per request */}
        </div>
      </header>

      <section className="library-section">
        <div className="section-header">
          <History size={18} className="text-secondary" />
          <h2>Your Collections</h2>
        </div>
        <div className="collection-grid">
          <Link 
            href="/library/favorites" 
            className="collection-card glass"
            style={{ borderRadius: '16px', padding: '32px 28px' }}
          >
            <div className="card-visual" style={{ background: 'linear-gradient(135deg, #ff0000, transparent)', opacity: 0.1 }} />
            <div className="card-icon" style={{ color: '#ff0000' }}>
              <Heart size={24} fill="#ff0000" />
            </div>
            <div className="card-info">
              <h3>Liked Songs</h3>
              <p className="meta text-secondary">Auto-generated • All favorites</p>
            </div>
          </Link>

          {folders.map((folder) => (
            <Link 
              key={folder.id} 
              href={`/library/${folder.id}`} 
              className="collection-card glass"
              style={{ borderRadius: '16px', padding: '32px 28px' }}
            >
              <div className="card-visual" style={{ 
                background: `linear-gradient(135deg, ${folder.color}, transparent)`,
                opacity: 0.1 
              }} />
              <div className="card-icon" style={{ color: folder.color }}>
                <Disc size={24} />
              </div>
              <div className="card-info">
                <h3>{folder.name}</h3>
                <p className="meta text-secondary">Studio Folder • {tracks.filter(t => t.folderId === folder.id).length} tracks</p>
              </div>
            </Link>
          ))}
        </div>
      </section>

      <section className="library-section">
        <div className="section-header">
          <TrendingUp size={18} className="text-secondary" />
          <h2>Recent Practice</h2>
        </div>
        <div className="tracks-list">
          {tracks.length > 0 ? tracks.slice(0, 10).map((track, i) => (
            <div
              key={track.id}
              className={`track-row glass ${isPlaying && playingTitle === track.title ? 'is-playing' : ''}`}
              onClick={() => loadTrack(track)}
              style={{ cursor: 'pointer' }}
            >
              <div className="track-number">{i + 1}</div>
              <div className="track-meta">
                <Music size={20} className="text-secondary" />
                <div>
                  <p className="track-name">{track.title}</p>
                  <p className="track-artist text-secondary">{track.artist}</p>
                </div>
              </div>
              <div className="track-duration text-secondary">
                {track.bpm ? `${getMPMFromBPM(Number(track.bpm), track.style)} Bars/Min` : '—'}
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
          )) : (
            <div className="empty-lib-state glass">
              <p>No tracks added to your library yet.</p>
            </div>
          )}
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

      <style jsx>{`
        .library-container {
          display: flex;
          flex-direction: column;
          gap: 32px;
          padding: 32px;
          margin: 0 16px 16px 0;
          padding-bottom: 140px;
          background: rgba(255, 255, 255, 0.02);
          border-radius: 12px;
          border: 1px solid rgba(255, 255, 255, 0.05);
          min-height: calc(100vh - 40px);
          overflow: hidden;
        }

        .library-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
        }

        .library-header h1 {
          font-size: 32px;
          font-weight: 800;
          letter-spacing: -1px;
        }

        .library-section {
          display: flex;
          flex-direction: column;
          gap: 24px;
        }

        .section-header {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .section-header h2 {
          font-size: 20px;
          font-weight: 700;
        }

        .collection-grid {
          display: flex;
          flex-wrap: wrap;
          gap: 20px;
        }

        .collection-card {
          padding: 24px 20px; /* Reduced from 32px 28px */
          border-radius: 16px;
          display: flex;
          align-items: center;
          gap: 16px; /* Reduced from 24px */
          width: fit-content;
          min-width: 180px; /* Reduced from 220px */
          position: relative;
          overflow: hidden;
          transition: all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
          border: 1px solid rgba(255, 255, 255, 0.03);
          cursor: pointer;
        }

        .collection-card:hover { transform: translateY(-8px); background: rgba(255, 255, 255, 0.08); border-color: rgba(255,255,255,0.1); }

        .track-row.is-playing {
          background: rgba(29, 185, 84, 0.08);
          border-left: 3px solid #1db954;
          transition: all 0.3s ease;
        }
        .track-row.is-playing .track-name { color: #1db954; }

        .card-visual { position: absolute; inset: 0; pointer-events: none; }

        .card-icon { 
          width: 52px; height: 52px; border-radius: 18px; display: flex; align-items: center; justify-content: center; 
          background: rgba(0, 0, 0, 0.2); backdrop-filter: blur(8px);
        }

        .card-info h3 { font-size: 1.2rem; font-weight: 800; margin-bottom: 4px; letter-spacing: -0.5px; }
        .card-info .meta { font-size: 12px; opacity: 0.8; }

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

        .feature-icon {
          color: #555;
          transition: all 0.2s;
          background: transparent;
          border: none;
          cursor: pointer;
        }
        .feature-icon:hover { color: white; transform: scale(1.1); }
        .feature-icon.active-flag { color: #1db954; }
        .feature-icon.active-heart { color: #ff4b2b; }

        .play-row-btn {
          width: 36px;
          height: 36px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          color: var(--primary);
        }

        .playing-bars {
          display: flex;
          align-items: flex-end;
          gap: 2px;
          width: 16px;
          height: 16px;
        }
        .playing-bars span {
          width: 2px;
          background: var(--primary);
          animation: dance 1s infinite ease-in-out;
        }
        .playing-bars span:nth-child(1) { height: 60%; animation-delay: -0.4s; }
        .playing-bars span:nth-child(2) { height: 100%; animation-delay: -0.2s; }
        .playing-bars span:nth-child(3) { height: 80%; animation-delay: 0s; }
        @keyframes dance {
          0%, 100% { transform: scaleY(0.5); }
          50% { transform: scaleY(1); }
        }

        @media (max-width: 768px) {
          .library-container {
            padding: 16px;
            gap: 20px;
          }
          .collection-grid {
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: 12px;
          }
          .collection-card {
            padding: 12px;
            min-width: 100%;
            gap: 12px;
          }
          .card-icon {
            width: 32px;
            height: 32px;
            border-radius: 10px;
          }
          .card-info h3 { font-size: 0.85rem; }
          .card-info .meta { display: none; }

          .track-row {
            grid-template-columns: 32px 1fr 48px;
            padding: 8px 12px;
          }
          .track-duration { display: none; }
        }
      `}</style>
    </div>
  );
}
