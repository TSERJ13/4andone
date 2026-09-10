"use client";

import React, { useState } from 'react';
import {
  Heart,
  Plus,
  Music,
  Disc,
  ChevronRight,
  History,
  TrendingUp,
  Play,
  Pause
} from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useStudio, Track } from '@/components/admin/StudioProvider';
import { useAudio } from '@/components/audio/AudioProvider';
import { useAuth } from '@/context/AuthContext';
import { getMPMFromBPM } from '@/utils/audio';
import { formatDuration } from '@/utils/format';
import ConfirmModal from '@/components/admin/ConfirmModal';
import { Marquee } from '@/components/layout/Marquee';

export default function LibraryPage() {
  const router = useRouter();
  const { tracks, folders, styles, finalTracks, addToFinal, removeFromFinal, toggleFavorite } = useStudio();
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
            className="collection-card glass"
            style={{ cursor: 'pointer' }}
          >
            <div className="card-icon" style={{ color: '#f43f5e' }}>
              <Heart size={20} fill="#f43f5e" />
            </div>
            <div className="card-info">
              <h3>Liked Songs</h3>
              <p className="meta text-secondary">All favorites</p>
            </div>
          </div>


            <div 
              className="collection-card glass"
              onClick={() => checkAuthAndExecute(() => {/* playlist logic */}, 'create playlists')}
              style={{ cursor: 'pointer' }}
            >
              <div className="card-icon" style={{ color: '#1db954' }}>
                <Plus size={20} />
              </div>
              <div className="card-info">
                <h3>Create Playlist</h3>
                <p className="meta text-secondary">New Playlist</p>
              </div>
            </div>

            {folders.map((folder) => (
              <Link 
                key={folder.id} 
                href={`/library/${folder.id}`} 
                className="collection-card glass"
              >
                <div className="card-visual" style={{ 
                  background: `linear-gradient(135deg, ${folder.color}, transparent)`,
                  opacity: 0.1 
                }} />
                <div className="card-icon" style={{ color: folder.color }}>
                  <Disc size={20} />
                </div>
                <div className="card-info">
                  <h3>{folder.name}</h3>
                  <p className="meta text-secondary">{tracks.filter(t => 
                    t.folderId === folder.id && 
                    t.style?.toLowerCase() !== 'fitness' &&
                    !t.tags?.some(tag => tag.toLowerCase() === 'closed' || tag === 'დახურული')
                  ).length} Tracks</p>
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
          {tracks.filter(t => 
            t.style?.toLowerCase() !== 'fitness' && 
            !t.tags?.some(tag => tag.toLowerCase() === 'closed' || tag === 'დახურული')
          ).length > 0 ? tracks.filter(t => 
            t.style?.toLowerCase() !== 'fitness' && 
            !t.tags?.some(tag => tag.toLowerCase() === 'closed' || tag === 'დახურული')
          ).slice(0, 10).map((track, i) => (
            <div
              key={track.id}
              className={`track-row ${isPlaying && playingTitle === track.title ? 'is-active' : ''}`}
              onClick={() => loadTrack(track)}
              style={{ cursor: 'pointer' }}
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
                  : (track.bpm ? `${getMPMFromBPM(Number(track.bpm), track.style)} BPM` : track.style)}
              </div>

              <div className="track-actions-col">
                <button
                  className={`fav-action ${track.isFavorite ? 'active-heart' : ''}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    checkAuthAndExecute(() => toggleFavorite?.(track.id), 'favorite tracks');
                  }}
                >
                  <Heart size={16} fill={track.isFavorite ? "#ff4b2b" : "none"} color={track.isFavorite ? "#ff4b2b" : "currentColor"} />
                </button>
                <div className="play-action">
                  {isPlaying && playingTitle === track.title ? (
                     <div className="playing-bars"><span></span><span></span><span></span></div>
                  ) : (
                    <Play size={18} fill="currentColor" />
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
        .library-content {
          display: flex;
          flex-direction: column;
          gap: 32px;
          min-height: 100%;
        }

        .library-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
        }

        .library-header h1 {
          font-size: 32px;
          font-weight: 900;
          letter-spacing: -1.5px;
        }

        .btn-create-folder {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 10px 20px;
          border-radius: 12px;
          font-size: 14px;
          font-weight: 700;
          color: var(--primary);
          background: rgba(29, 185, 84, 0.1);
          border: 1px solid rgba(29, 185, 84, 0.2);
          transition: all 0.2s;
        }

        .btn-create-folder:hover {
          background: rgba(29, 185, 84, 0.2);
          transform: translateY(-2px);
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
          box-sizing: border-box;
          padding: 12px;
          border-radius: 20px;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: flex-start;
          text-align: center;
          gap: 8px;
          padding: 18px 12px 12px 12px;
          width: 125px;
          height: 125px;
          position: relative;
          overflow: hidden;
          /* Force hardware acceleration to fix overflow:hidden + border-radius bug */
          transform: translateZ(0);
          -webkit-mask-image: -webkit-radial-gradient(white, black);
          transition: all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
          border: 1px solid rgba(255, 255, 255, 0.05);
          cursor: pointer;
        }

        .collection-card.create-card {
          border: 2px dashed rgba(255, 255, 255, 0.1);
          background: transparent;
        }

        .collection-card.create-card:hover {
          border-color: var(--primary);
          background: rgba(29, 185, 84, 0.05);
        }

        @media (hover: hover) {
          .collection-card:hover { 
            transform: translateY(-8px); 
            background: rgba(255, 255, 255, 0.08); 
            border-color: rgba(255,255,255,0.15);
            box-shadow: 0 15px 35px rgba(0,0,0,0.4);
          }
        }

        .track-row.is-playing {
          background: rgba(29, 185, 84, 0.08);
          border-left: 3px solid #1db954;
          transition: all 0.3s ease;
        }
        .track-row.is-playing .track-name { color: #1db954; }

        .card-visual { position: absolute; inset: 0; pointer-events: none; border-radius: inherit; }

        .card-icon { 
          width: 44px; height: 44px; border-radius: 14px; display: flex; align-items: center; justify-content: center; 
          background: rgba(0, 0, 0, 0.2); backdrop-filter: blur(8px);
        }

        .card-info { display: flex; flex-direction: column; align-items: center; text-align: center; }
        .card-info h3 { font-size: 0.85rem; font-weight: 800; margin-bottom: 2px; letter-spacing: -0.5px; line-height: 1.1; }
        .card-info .meta { font-size: 9px; opacity: 0.4; display: block; }

        .tracks-list { display: flex; flex-direction: column; gap: 8px; }

        .track-icon-col { display: flex; align-items: center; justify-content: flex-start; }
        .track-info-col { min-width: 0; overflow: hidden; }
        .track-name { font-weight: 600; font-size: 14.25px; }
        .track-artist { font-size: 12px; opacity: 0.5; margin-top: 2px; }
        
        .track-meta-col { font-size: 13px; font-weight: 600; }
        
        .track-actions-col {
          display: flex;
          align-items: center;
          justify-content: flex-end;
          gap: 20px;
        }

        .fav-action { opacity: 0.4; transition: all 0.2s; }
        .fav-action:hover, .fav-action.active-heart { opacity: 1; transform: scale(1.1); }
        .play-action { color: var(--primary); }

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

        .desktop-only { display: flex; }
        .mobile-only { display: none; }

        @media (max-width: 768px) {
          .desktop-only { display: none; }
          .mobile-only { display: flex; }
          .library-content {
            padding: 16px;
            padding-bottom: 120px;
          }
          .collection-grid {
            display: flex;
            flex-wrap: wrap;
            justify-content: flex-start;
            gap: 12px;
          }
          .collection-card {
            padding: 8px !important;
            width: 75px !important;
            height: 75px !important;
            border-radius: 24px !important;
            gap: 4px !important;
            flex-shrink: 0 !important;
          }
          .collection-card.placeholder-card {
            border: 2px dashed rgba(255,255,255,0.1);
            background: transparent;
            color: var(--text-secondary);
          }
          .card-icon, .card-icon-premium {
            width: 32px;
            height: 32px;
            border-radius: 10px;
          }
          .card-info h3 { font-size: 0.8rem; letter-spacing: -0.5px; } /* Slightly smaller for mobile */
          .card-info .meta { display: none; }

        }
      `}</style>
    </div>
  );
}
