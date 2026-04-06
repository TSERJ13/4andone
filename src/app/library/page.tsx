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
import { useStudio } from '@/components/admin/StudioProvider';
import { useAudio } from '@/components/audio/AudioProvider';
import { getMPMFromBPM } from '@/utils/audio';

export default function LibraryPage() {
  const { tracks, folders, finalTracks, addToFinal, removeFromFinal } = useStudio();
  const { isPlaying, title: playingTitle, loadTrack } = useAudio();

  return (
    <div className="library-container animate-in">
      {/* ... Header remains ... */}
      <header className="library-header">
        <h1>Your Library</h1>
        <div className="header-actions">
          <Link href="/admin/library" className="btn-secondary glass">
            <Plus size={18} />
            Manage Assets
          </Link>
        </div>
      </header>

      <section className="library-section">
        <div className="section-header">
          <History size={18} className="text-secondary" />
          <h2>Your Collections</h2>
        </div>
        <div className="collection-grid">
          <Link href="/library/favorites" className="collection-card glass">
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
            <Link key={folder.id} href={`/library/${folder.id}`} className="collection-card glass">
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
        <div className="playlist-rows">
          {tracks.length > 0 ? tracks.slice(0, 10).map((track) => (
            <div
              key={track.id}
              className={`playlist-row glass ${isPlaying && playingTitle === track.title ? 'is-playing' : ''}`}
              onClick={() => loadTrack(track)}
              style={{ cursor: 'pointer' }}
            >
              <div className="row-image glass-item">
                <Music size={20} />
              </div>
              <div className="row-content">
                <p className="row-title">{track.title}</p>
                <p className="row-artist text-secondary">
                  {track.artist}
                  {track.bpm && (
                    <span className="text-primary font-bold ml-2">• {getMPMFromBPM(Number(track.bpm), track.style)} Bars/Min</span>
                  )}
                </p>
              </div>
              <div className="row-actions">
                <button
                  className={`feature-icon ${finalTracks.some(t => t.id === track.id) ? 'active-flag' : ''}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    finalTracks.some(t => t.id === track.id) ? removeFromFinal(track.id) : addToFinal(track);
                  }}
                >
                  <Flag size={18} fill={finalTracks.some(t => t.id === track.id) ? "currentColor" : "none"} />
                </button>
                <div className="play-row-btn glass">
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

      <style jsx>{`
        .library-container {
          display: flex;
          flex-direction: column;
          gap: 40px;
          padding: 40px;
          margin: 0 20px 20px 0;
          padding-bottom: 140px;
          background: rgba(255, 255, 255, 0.02);
          border-radius: 24px;
          border: 1px solid rgba(255, 255, 255, 0.05);
          min-height: calc(100vh - 40px);
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
          padding: 24px 32px;
          border-radius: 32px;
          display: flex;
          align-items: center;
          gap: 24px;
          width: fit-content;
          min-width: 200px;
          position: relative;
          overflow: hidden;
          transition: all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
          border: 1px solid rgba(255, 255, 255, 0.03);
          cursor: pointer;
        }

        .collection-card:hover { transform: translateY(-8px); background: rgba(255, 255, 255, 0.08); border-color: rgba(255,255,255,0.1); }

        .card-visual { position: absolute; inset: 0; pointer-events: none; }

        .card-icon { 
          width: 64px; height: 64px; border-radius: 24px; display: flex; align-items: center; justify-content: center; 
          background: rgba(0, 0, 0, 0.2); backdrop-filter: blur(8px);
        }

        .card-info h3 { font-size: 1.4rem; font-weight: 800; margin-bottom: 4px; letter-spacing: -0.5px; }
        .card-info .meta { font-size: 12px; opacity: 0.8; }

        .playlist-rows {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .playlist-row {
          padding: 12px 20px;
          border-radius: 16px;
          display: flex;
          align-items: center;
          gap: 16px;
        }

        .row-image {
          width: 48px;
          height: 48px;
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .row-title {
          font-weight: 600;
          font-size: 15px;
        }

        .row-artist {
          font-size: 13px;
        }

        .row-actions {
          margin-left: auto;
          display: flex;
          align-items: center;
          gap: 16px;
        }

        .feature-icon {
          color: #555;
          transition: all 0.2s;
        }
        .feature-icon.active-flag { color: #1db954; }

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
          .collection-grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </div>
  );
}
