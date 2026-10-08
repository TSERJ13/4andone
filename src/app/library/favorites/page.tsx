"use client";

import React from 'react';
import { Heart, Play } from 'lucide-react';
import { useAudioControls } from '@/components/audio/AudioProvider';
import { useStudio } from '@/components/admin/StudioProvider';
import { useAuth } from '@/context/AuthContext';
import { useDownloadedTracks } from '@/hooks/useDownloadedTracks';
import ConfirmModal from '@/components/admin/ConfirmModal';
import { TrackRow } from '@/components/tracks/TrackRow';

const FavoritesPage = () => {
  const { togglePlay, isPlaying, title: playingTitle, trackId: playingTrackId, loadTrack } = useAudioControls();
  const { tracks, styles, toggleFavorite } = useStudio();
  const { isAuthenticated, setIsAuthModalOpen } = useAuth();
  const downloadedIds = useDownloadedTracks();
  
  const [authPrompt, setAuthPrompt] = React.useState({ isOpen: false, action: '' });

  const likedTracks = tracks.filter(t => t.isFavorite && !t.tags?.some(tag => tag.toLowerCase() === 'closed' || tag === 'დახურული'));

  const checkAuthAndExecute = (action: () => void, actionName: string) => {
    if (!isAuthenticated) {
      setAuthPrompt({ isOpen: true, action: actionName });
      return;
    }
    action();
  };

  const totalMinutes = Math.round(likedTracks.reduce((sum, t) => sum + (Number(t.duration) || 0), 0) / 60);

  const handlePlayAll = () => {
    if (likedTracks.length > 0) {
      loadTrack(likedTracks[0]);
    }
  };

  return (
    <div className="favorites-page animate-in">
      <header className="liked-hero">
        <div className="liked-cover">
          <Heart size={34} fill="currentColor" strokeWidth={0} />
        </div>
        <div className="liked-info">
          <span className="liked-label">Playlist</span>
          <h1 className="liked-title">Liked Songs</h1>
          <p className="liked-stats">
            {likedTracks.length} {likedTracks.length === 1 ? 'track' : 'tracks'}
            {totalMinutes > 0 && <> · {totalMinutes} min</>}
          </p>
        </div>
        <button
          className="liked-play"
          onClick={handlePlayAll}
          disabled={likedTracks.length === 0}
          aria-label="Play liked songs"
        >
          <Play fill="currentColor" size={20} />
          <span>Play</span>
        </button>
      </header>

      {likedTracks.length > 0 ? (
        <>

          <div className="tracks-list">
            {likedTracks.map((track, i) => {
              const isTrackActive = isPlaying && (playingTrackId ? playingTrackId === track.id : (playingTitle === track.title || playingTitle === track.id));

              return (
              <TrackRow
                key={track.id}
                track={track}
                isActive={isTrackActive}
                onPlay={() => loadTrack(track)}
                onToggleFavorite={() => checkAuthAndExecute(() => toggleFavorite(track.id), 'favorite tracks')}
                badge="style"
                styleColor={styles.find(s => s.title.toLowerCase() === track.style?.toLowerCase())?.color}
                isDownloaded={downloadedIds.includes(track.id)}
              />
              );
            })}
          </div>
        </>
      ) : (
        <div className="empty-state">
          <Heart size={48} className="text-secondary" />
          <h3>Your liked songs will appear here</h3>
          <p>Save tracks by clicking the heart icon while listening.</p>
        </div>
      )}

      <ConfirmModal 
        isOpen={authPrompt.isOpen}
        title="Authentication Required"
        message={`Please log in with Telegram to ${authPrompt.action} and sync your studio data.`}
        confirmText="Login Now"
        variant="primary"
        onClose={() => setAuthPrompt(prev => ({ ...prev, isOpen: false }))}
        onConfirm={() => {
          setAuthPrompt(prev => ({ ...prev, isOpen: false }));
          setIsAuthModalOpen(true);
        }}
      />

      <style jsx>{`
        .favorites-page {
          padding: 24px 32px 140px 32px;
          max-width: 1200px;
          margin: 0 auto;
        }

        .liked-hero {
          display: flex;
          align-items: flex-end;
          gap: 28px;
          padding: 0;
          margin-bottom: 32px;
          background: transparent;
          border: none;
        }
        .liked-cover {
          position: relative;
          width: 180px; height: 180px;
          flex-shrink: 0;
          border-radius: 8px;
          display: flex; align-items: center; justify-content: center;
          color: #fff;
          background: linear-gradient(135deg, #ff0033 0%, #770018 100%);
          box-shadow: 0 10px 30px rgba(0, 0, 0, 0.6);
          border: 1px solid rgba(255, 255, 255, 0.1);
        }
        .liked-info { position: relative; display: flex; flex-direction: column; gap: 6px; flex: 1; min-width: 0; }
        .liked-label {
          font-size: 11px; font-weight: 800; letter-spacing: 1.2px;
          text-transform: uppercase; color: #ff0033;
        }
        .liked-title { margin: 0; font-size: 2.4rem; font-weight: 900; letter-spacing: -0.5px; line-height: 1.1; color: #fff; }
        .liked-stats { margin: 2px 0 12px 0; font-size: 13px; font-weight: 500; color: #aaa; }
        .liked-play {
          position: relative;
          display: inline-flex; align-items: center; gap: 8px;
          padding: 11px 24px;
          border: none; border-radius: 999px;
          background: #ff0033;
          color: #ffffff; font-weight: 700; font-size: 14px;
          cursor: pointer;
          transition: transform 0.15s, background-color 0.15s;
        }
        .liked-play:hover { background: #cc0029; transform: scale(1.02); }
        .liked-play:active { transform: scale(0.96); }
        .liked-play:disabled { opacity: 0.4; cursor: default; transform: none; }

        .empty-state {
          display: flex; flex-direction: column; align-items: center; justify-content: center;
          padding: 80px 0; color: #717171; gap: 16px; text-align: center;
        }
        .empty-state h3 { color: white; font-size: 24px; font-weight: 800; }
        .empty-state p { max-width: 320px; line-height: 1.5; font-size: 14px; }

        @media (max-width: 768px) {
          .favorites-page { padding: 12px 0 120px 0; }
          .liked-hero { gap: 16px; margin-bottom: 20px; }
          .liked-cover { width: 110px; height: 110px; border-radius: 6px; }
          .liked-cover :global(svg) { width: 32px; height: 32px; }
          .liked-title { font-size: 1.6rem; }
          .liked-stats { font-size: 12px; }
          .liked-play { padding: 9px 18px; font-size: 13px; }
        }
      `}</style>
    </div>
  );
};

export default FavoritesPage;
