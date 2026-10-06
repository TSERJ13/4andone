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
        .favorites-page { padding: 40px; padding-bottom: 120px; }

        /* Hero card — same family as the home album cards */
        .liked-hero {
          position: relative;
          overflow: hidden;
          display: flex;
          align-items: center;
          gap: 20px;
          padding: 24px;
          margin-bottom: 28px;
          border-radius: 20px;
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid rgba(255, 255, 255, 0.08);
        }
        .liked-cover {
          position: relative;
          width: 96px; height: 96px;
          flex-shrink: 0;
          border-radius: 18px;
          display: flex; align-items: center; justify-content: center;
          color: #fff;
          background: linear-gradient(135deg, var(--primary, #1db954), #191414);
          border: 1px solid rgba(255, 255, 255, 0.06);
        }
        .liked-info { position: relative; display: flex; flex-direction: column; gap: 4px; flex: 1; min-width: 0; }
        .liked-label {
          font-size: 10px; font-weight: 800; letter-spacing: 1.5px;
          text-transform: uppercase; color: #71717a;
        }
        .liked-title { margin: 0; font-size: 2.4rem; font-weight: 900; letter-spacing: -1px; line-height: 1.05; color: #fff; }
        .liked-stats { margin: 2px 0 0; font-size: 13px; font-weight: 600; color: #a1a1aa; }
        .liked-play {
          position: relative;
          display: inline-flex; align-items: center; gap: 8px;
          padding: 12px 22px;
          border: none; border-radius: 999px;
          background: var(--primary, #1db954);
          color: #000; font-weight: 800; font-size: 14px;
          cursor: pointer;
          transition: transform 0.15s, background-color 0.15s;
        }
        .liked-play:hover { background: var(--primary-hover, #1ed760); }
        .liked-play:active { transform: scale(0.95); }
        .liked-play:disabled { opacity: 0.4; cursor: default; box-shadow: none; }

        .track-only-fav { display: flex; align-items: center; justify-content: flex-end; }
        .fav-action { opacity: 0.8; transition: all 0.2s; background: none; border: none; cursor: pointer; color: #555; padding: 10px; }
        .fav-action:hover, .fav-action.active-heart { opacity: 1; transform: scale(1.1); }
        .fav-action.active-heart { color: #f43f5e; }
        @keyframes dance {
          0%, 100% { transform: scaleY(0.5); }
          50% { transform: scaleY(1); }
        }

        .empty-state {
          display: flex; flex-direction: column; align-items: center; justify-content: center;
          padding: 80px 0; color: #71717a; gap: 20px; text-align: center;
        }
        .empty-state h3 { color: white; font-size: 24px; font-weight: 800; }
        .empty-state p { max-width: 300px; line-height: 1.5; font-size: 14px; }

        @media (max-width: 768px) {
          .favorites-page { padding: 12px 0 20px; }
          .liked-hero { gap: 14px; padding: 16px; margin: 8px 0 18px; border-radius: 18px; }
          .liked-cover { width: 64px; height: 64px; border-radius: 14px; }
          .liked-cover :global(svg) { width: 26px; height: 26px; }
          .liked-title { font-size: 22px; letter-spacing: -0.5px; }
          .liked-stats { font-size: 12px; }
          .liked-play { padding: 0; width: 46px; height: 46px; justify-content: center; }
          .liked-play span { display: none; }
        }
      `}</style>
    </div>
  );
};

export default FavoritesPage;
