"use client";

import React, { useState, useEffect } from 'react';
import { 
  ThumbsUp, 
  Plus, 
  ArrowDownToLine, 
  Play, 
  Pause,
  Pin, 
  ChevronDown, 
  Music2, 
  Heart,
  CheckCircle2,
  Disc,
  UserCheck
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useStudio, Track } from '@/components/admin/StudioProvider';
import { useAudioControls } from '@/components/audio/AudioProvider';
import { useAuth } from '@/context/AuthContext';
import ConfirmModal from '@/components/admin/ConfirmModal';
import CreatePlaylistModal from '@/components/library/CreatePlaylistModal';
import { 
  getDownloadedTrackIds, 
  subscribeToOfflineUpdates,
  downloadTrackOffline,
  removeOfflineTrack,
  isTrackDownloaded
} from '@/utils/offline';
import { getTrackCover } from '@/utils/trackCover';
import { canonicalStyle } from '@/utils/audio';
import { DEFAULT_ALBUMS, Album } from '@/types/album';

const FILTER_CHIPS = ['Playlists', 'Songs', 'Albums', 'Artists'];

export default function LibraryPage() {
  const router = useRouter();
  const { tracks, folders, folderTracksMap, styles, albums: dbAlbums, toggleFavorite } = useStudio();
  const { loadTrack, isPlaying, trackId: playingTrackId, togglePlay } = useAudioControls();
  const { isAuthenticated, setIsAuthModalOpen } = useAuth();
  
  const [activeChip, setActiveChip] = useState('Playlists');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [downloadedIds, setDownloadedIds] = useState<string[]>([]);
  const [downloadingIds, setDownloadingIds] = useState<string[]>([]);

  useEffect(() => {
    setDownloadedIds(getDownloadedTrackIds());
    const unsubscribe = subscribeToOfflineUpdates(() => {
      setDownloadedIds(getDownloadedTrackIds());
    });
    return unsubscribe;
  }, []);

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

  // Helper to find a representative cover image for a dance style
  const getStyleCover = (styleName: string) => {
    const canon = canonicalStyle(styleName);
    const matchingTrack = tracks.find(t => canonicalStyle(t.style) === canon);
    return getTrackCover(matchingTrack, dbAlbums, styles);
  };

  const handleToggleDownload = async (e: React.MouseEvent, track: Track) => {
    e.stopPropagation();
    if (downloadingIds.includes(track.id)) return;

    if (downloadedIds.includes(track.id)) {
      await removeOfflineTrack(track.id);
      setDownloadedIds(getDownloadedTrackIds());
    } else {
      setDownloadingIds(prev => [...prev, track.id]);
      try {
        await downloadTrackOffline(track);
        setDownloadedIds(getDownloadedTrackIds());
      } finally {
        setDownloadingIds(prev => prev.filter(id => id !== track.id));
      }
    }
  };

  const formatDuration = (seconds?: number) => {
    if (!seconds) return '2:15';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  const likedTracksCount = tracks.filter(t => t.isFavorite && !t.tags?.some(tag => tag.toLowerCase() === 'closed' || tag === 'დახურული')).length;

  // Combine default static albums with DB albums
  // The live list (/api/albums) already includes the built-in albums — minus
  // the deleted ones — so DEFAULT_ALBUMS is only the offline fallback.
  const allAlbums: Album[] = (dbAlbums && dbAlbums.length > 0 ? dbAlbums : DEFAULT_ALBUMS);

  // Unique artists for Artists view
  const artistList = allAlbums.map(album => ({
    name: album.artist,
    coverUrl: album.coverUrl,
    slug: album.slug,
    program: album.program,
    badge: album.badge
  }));

  // Non-fitness tracks for Songs view
  const libraryTracks = tracks.filter(t => t.style?.toLowerCase() !== 'fitness' && !t.tags?.some(tag => tag.toLowerCase() === 'closed' || tag === 'დახურული'));

  return (
    <div className="yt-library-page animate-in">
      {/* Top Filter Chips & Sort Bar */}
      <div className="yt-library-top-bar">
        <div className="yt-library-filter-chips">
          {FILTER_CHIPS.map((chip) => (
            <button
              key={chip}
              className={`yt-library-chip ${activeChip === chip ? 'active' : ''}`}
              onClick={() => setActiveChip(chip)}
            >
              {chip}
            </button>
          ))}
        </div>

        <button className="yt-library-sort-btn">
          <span>Recent activity</span>
          <ChevronDown size={16} />
        </button>
      </div>

      {/* ----------------- 1. PLAYLISTS CHIP VIEW ----------------- */}
      {activeChip === 'Playlists' && (
        <div className="yt-library-grid">
          {/* Liked Music Card */}
          <div 
            className="yt-library-card"
            onClick={() => router.push('/library/favorites')}
          >
            <div className="yt-card-cover-box liked-cover-gradient">
              <ThumbsUp size={48} fill="#ffffff" color="#ffffff" />
              <div className="yt-card-play-overlay">
                <div className="yt-play-circle-btn">
                  <Play fill="#000000" color="#000000" size={22} style={{ marginLeft: '2px' }} />
                </div>
              </div>
            </div>
            <div className="yt-card-info">
              <h3 className="yt-card-title">Liked Music</h3>
              <p className="yt-card-sub">
                <Pin size={11} className="inline-pin" /> Auto playlist • {likedTracksCount} songs
              </p>
            </div>
          </div>

          {/* Downloaded Card */}
          <div 
            className="yt-library-card"
            onClick={() => router.push('/library/downloaded')}
          >
            <div className="yt-card-cover-box downloaded-cover-gradient">
              <ArrowDownToLine size={48} color="#ffffff" />
              <div className="yt-card-play-overlay">
                <div className="yt-play-circle-btn">
                  <Play fill="#000000" color="#000000" size={22} style={{ marginLeft: '2px' }} />
                </div>
              </div>
            </div>
            <div className="yt-card-info">
              <h3 className="yt-card-title">Downloaded</h3>
              <p className="yt-card-sub">
                Auto playlist • {downloadedIds.length} tracks
              </p>
            </div>
          </div>

          {/* Dance Style Playlists */}
          {styles.filter(s => s.title.toLowerCase() !== 'fitness').map((st) => {
            const cover = getStyleCover(st.title);
            const styleTrackCount = tracks.filter(t => canonicalStyle(t.style) === canonicalStyle(st.title)).length;
            const href = `/style/${st.title.toLowerCase().replace(/[\s\-_]+/g, '-')}`;

            return (
              <div 
                key={st.id}
                className="yt-library-card"
                onClick={() => router.push(href)}
              >
                <div className="yt-card-cover-box">
                  <img src={cover} alt={st.title} className="yt-card-img" />
                  <div className="yt-card-play-overlay">
                    <div className="yt-play-circle-btn">
                      <Play fill="#000000" color="#000000" size={22} style={{ marginLeft: '2px' }} />
                    </div>
                  </div>
                </div>
                <div className="yt-card-info">
                  <h3 className="yt-card-title">{st.title}</h3>
                  <p className="yt-card-sub">
                    Playlist • 4andone Music | {styleTrackCount} tracks
                  </p>
                </div>
              </div>
            );
          })}

          {/* User Created Folders / Custom Playlists */}
          {folders.map((folder) => {
            const folderTracks = tracks.filter(t => 
              (t.folderId === folder.id || folderTracksMap?.[folder.id]?.includes(t.id)) && 
              t.style?.toLowerCase() !== 'fitness'
            );
            const cover = folderTracks[0] ? getTrackCover(folderTracks[0], dbAlbums, styles) : '/logo-square.jpg';

            return (
              <div 
                key={folder.id}
                className="yt-library-card"
                onClick={() => router.push(`/library/${folder.id}`)}
              >
                <div className="yt-card-cover-box">
                  <img src={cover} alt={folder.name} className="yt-card-img" />
                  <div className="yt-card-play-overlay">
                    <div className="yt-play-circle-btn">
                      <Play fill="#000000" color="#000000" size={22} style={{ marginLeft: '2px' }} />
                    </div>
                  </div>
                </div>
                <div className="yt-card-info">
                  <h3 className="yt-card-title">{folder.name}</h3>
                  <p className="yt-card-sub">
                    Playlist • User collection • {folderTracks.length} tracks
                  </p>
                </div>
              </div>
            );
          })}

          {/* Create Playlist Card */}
          <div 
            className="yt-library-card create-card-box"
            onClick={() => checkAuthAndExecute(() => setIsCreateModalOpen(true), 'create playlists')}
          >
            <div className="yt-card-cover-box create-cover-box">
              <Plus size={40} color="#aaaaaa" />
            </div>
            <div className="yt-card-info">
              <h3 className="yt-card-title">New playlist</h3>
              <p className="yt-card-sub">Create custom playlist</p>
            </div>
          </div>
        </div>
      )}

      {/* ----------------- 2. SONGS CHIP VIEW ----------------- */}
      {activeChip === 'Songs' && (
        <div className="yt-songs-view">
          <div className="yt-songs-header">
            <span className="yt-songs-count">{libraryTracks.length} songs in library</span>
          </div>

          <div className="yt-songs-list">
            {libraryTracks.map((track, idx) => {
              const cover = getTrackCover(track, dbAlbums, styles);
              const isCurrent = playingTrackId === track.id;
              const isTrackLiked = track.isFavorite;
              const isDownloaded = downloadedIds.includes(track.id);

              return (
                <div
                  key={track.id}
                  className={`yt-song-row ${isCurrent ? 'playing' : ''}`}
                  onClick={() => loadTrack(track)}
                >
                  <div className="yt-song-index">
                    {isCurrent && isPlaying ? (
                      <div className="yt-playing-bars">
                        <span className="bar bar1"></span>
                        <span className="bar bar2"></span>
                        <span className="bar bar3"></span>
                      </div>
                    ) : (
                      <span>{idx + 1}</span>
                    )}
                  </div>

                  <div className="yt-song-cover-thumb">
                    <img src={cover} alt={track.title} />
                    <button className="yt-thumb-play-btn">
                      {isCurrent && isPlaying ? (
                        <Pause size={16} fill="#ffffff" color="#ffffff" />
                      ) : (
                        <Play size={16} fill="#ffffff" color="#ffffff" style={{ marginLeft: '2px' }} />
                      )}
                    </button>
                  </div>

                  <div className="yt-song-details">
                    <span className="yt-song-title">{track.title}</span>
                    <span className="yt-song-artist">
                      {track.artist || '4ANDONE'} • <span className="yt-song-style-tag">{track.style || 'Dance'}</span>
                    </span>
                  </div>

                  <div className="yt-song-actions">
                    <button
                      type="button"
                      className={`yt-action-icon-btn ${isTrackLiked ? 'liked' : ''}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        checkAuthAndExecute(() => toggleFavorite(track.id), 'like songs');
                      }}
                      title={isTrackLiked ? 'Remove from Liked' : 'Save to Liked'}
                    >
                      <Heart size={18} fill={isTrackLiked ? '#10b981' : 'none'} color={isTrackLiked ? '#10b981' : '#aaaaaa'} />
                    </button>

                    <button
                      type="button"
                      className={`yt-action-icon-btn ${isDownloaded ? 'downloaded' : ''}`}
                      onClick={(e) => handleToggleDownload(e, track)}
                      title={isDownloaded ? 'Downloaded offline' : 'Download offline'}
                    >
                      {isDownloaded ? (
                        <CheckCircle2 size={18} color="#10b981" />
                      ) : (
                        <ArrowDownToLine size={18} color="#aaaaaa" />
                      )}
                    </button>

                    <span className="yt-song-duration">{formatDuration(track.duration)}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ----------------- 3. ALBUMS CHIP VIEW ----------------- */}
      {activeChip === 'Albums' && (
        <div className="yt-library-grid">
          {allAlbums.map((album) => {
            const albumTrackCount = tracks.filter(t => 
              t.album?.toLowerCase().includes(album.slug.toLowerCase()) || 
              t.artist?.toLowerCase().includes(album.artist.toLowerCase())
            ).length;

            return (
              <div 
                key={album.id}
                className="yt-library-card"
                onClick={() => router.push(`/album/${album.slug}`)}
              >
                <div className="yt-card-cover-box">
                  <img src={album.coverUrl} alt={album.title} className="yt-card-img" />
                  <div className="yt-card-play-overlay">
                    <div className="yt-play-circle-btn">
                      <Play fill="#000000" color="#000000" size={22} style={{ marginLeft: '2px' }} />
                    </div>
                  </div>
                </div>
                <div className="yt-card-info">
                  <h3 className="yt-card-title">{album.title}</h3>
                  <p className="yt-card-sub">
                    Album • {album.artist}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ----------------- 4. ARTISTS CHIP VIEW ----------------- */}
      {activeChip === 'Artists' && (
        <div className="yt-library-grid">
          {artistList.map((artist, idx) => (
            <div 
              key={idx}
              className="yt-library-card yt-artist-card"
              onClick={() => router.push(`/album/${artist.slug}`)}
            >
              <div className="yt-card-cover-box yt-artist-avatar-box">
                <img src={artist.coverUrl} alt={artist.name} className="yt-card-img yt-artist-img" />
                <div className="yt-card-play-overlay yt-artist-overlay">
                  <div className="yt-play-circle-btn">
                    <Play fill="#000000" color="#000000" size={22} style={{ marginLeft: '2px' }} />
                  </div>
                </div>
              </div>
              <div className="yt-card-info text-center">
                <h3 className="yt-card-title">{artist.name}</h3>
                <p className="yt-card-sub">
                  Artist • 4ANDONE
                </p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modals */}
      <ConfirmModal 
        isOpen={infoModal.isOpen}
        title={infoModal.title}
        message={infoModal.message}
        confirmText="Login Now"
        variant="primary"
        onClose={() => setInfoModal(prev => ({ ...prev, isOpen: false }))}
        onConfirm={infoModal.onConfirm}
      />

      <CreatePlaylistModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSuccess={(newFolder) => router.push(`/library/${newFolder.id}`)}
      />

      <style jsx>{`
        .yt-library-page {
          padding: 24px 32px 140px 32px;
          max-width: 1400px;
          margin: 0 auto;
          box-sizing: border-box;
          width: 100%;
          overflow-x: hidden;
        }

        .yt-library-top-bar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 24px;
          gap: 12px;
          width: 100%;
        }

        .yt-library-filter-chips {
          display: flex;
          align-items: center;
          gap: 8px;
          overflow-x: auto;
          scrollbar-width: none;
          flex: 1;
          min-width: 0;
          -webkit-overflow-scrolling: touch;
        }
        .yt-library-filter-chips::-webkit-scrollbar { display: none; }

        .yt-library-chip {
          padding: 7px 16px;
          border-radius: 18px;
          font-size: 13px;
          font-weight: 600;
          color: #f1f1f1;
          background: rgba(255, 255, 255, 0.08);
          border: 1px solid rgba(255, 255, 255, 0.06);
          cursor: pointer;
          white-space: nowrap;
          transition: all 0.15s ease;
          flex-shrink: 0;
        }
        .yt-library-chip:hover {
          background: rgba(255, 255, 255, 0.16);
        }
        .yt-library-chip.active {
          background: #ffffff;
          color: #030303;
        }

        .yt-library-sort-btn {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          background: transparent;
          border: none;
          color: #aaaaaa;
          font-size: 13px;
          font-weight: 600;
          cursor: pointer;
          white-space: nowrap;
          flex-shrink: 0;
        }
        .yt-library-sort-btn:hover {
          color: #ffffff;
        }

        .yt-library-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(170px, 1fr));
          gap: 24px 16px;
          width: 100%;
        }

        .yt-library-card {
          display: flex;
          flex-direction: column;
          gap: 8px;
          cursor: pointer;
          min-width: 0;
          width: 100%;
        }

        .yt-card-cover-box {
          position: relative;
          width: 100%;
          aspect-ratio: 1 / 1;
          border-radius: 8px;
          overflow: hidden;
          background: #181818;
          display: flex;
          align-items: center;
          justify-content: center;
          border: 1px solid rgba(255, 255, 255, 0.06);
        }

        .yt-card-img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          transition: transform 0.2s ease;
        }

        .yt-library-card:hover .yt-card-img {
          transform: scale(1.04);
        }

        /* Artist Circular Avatar */
        .yt-artist-avatar-box {
          border-radius: 50% !important;
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.4);
        }
        .yt-artist-img {
          border-radius: 50% !important;
        }
        .yt-artist-overlay {
          border-radius: 50% !important;
        }
        .text-center {
          text-align: center;
          align-items: center;
        }

        .liked-cover-gradient {
          background: linear-gradient(135deg, #a855f7 0%, #ec4899 50%, #f43f5e 100%);
        }

        .downloaded-cover-gradient {
          background: linear-gradient(135deg, #22c55e 0%, #0d421d 100%);
        }

        .create-cover-box {
          background: rgba(255, 255, 255, 0.04);
          border: 1px dashed rgba(255, 255, 255, 0.2);
        }

        .yt-card-play-overlay {
          position: absolute;
          inset: 0;
          background: rgba(0, 0, 0, 0.45);
          display: flex;
          align-items: center;
          justify-content: center;
          opacity: 0;
          transition: opacity 0.2s ease;
        }

        .yt-library-card:hover .yt-card-play-overlay {
          opacity: 1;
        }

        .yt-play-circle-btn {
          width: 44px;
          height: 44px;
          border-radius: 50%;
          background: #ffffff;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 4px 14px rgba(0, 0, 0, 0.5);
          transition: transform 0.15s ease;
        }

        .yt-library-card:hover .yt-play-circle-btn {
          transform: scale(1.06);
        }

        .yt-card-info {
          display: flex;
          flex-direction: column;
          gap: 3px;
          min-width: 0;
          width: 100%;
        }

        .yt-card-title {
          font-size: 14px;
          font-weight: 700;
          color: #ffffff;
          margin: 0;
          line-height: 1.3;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          min-width: 0;
        }

        .yt-card-sub {
          font-size: 12px;
          color: #aaaaaa;
          margin: 0;
          display: block;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          min-width: 0;
        }

        /* Songs View Styles */
        .yt-songs-view {
          display: flex;
          flex-direction: column;
          gap: 12px;
          width: 100%;
        }
        .yt-songs-header {
          font-size: 13px;
          color: #aaaaaa;
          margin-bottom: 8px;
        }
        .yt-songs-list {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }
        .yt-song-row {
          display: flex;
          align-items: center;
          gap: 16px;
          padding: 8px 12px;
          border-radius: 8px;
          cursor: pointer;
          transition: background-color 0.15s ease;
        }
        .yt-song-row:hover {
          background: rgba(255, 255, 255, 0.06);
        }
        .yt-song-row.playing {
          background: rgba(16, 185, 129, 0.1);
        }
        .yt-song-index {
          width: 24px;
          font-size: 13px;
          color: #aaaaaa;
          text-align: center;
          flex-shrink: 0;
        }
        .yt-song-cover-thumb {
          position: relative;
          width: 44px;
          height: 44px;
          border-radius: 6px;
          overflow: hidden;
          flex-shrink: 0;
          background: #222;
        }
        .yt-song-cover-thumb img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }
        .yt-thumb-play-btn {
          position: absolute;
          inset: 0;
          background: rgba(0, 0, 0, 0.5);
          display: flex;
          align-items: center;
          justify-content: center;
          opacity: 0;
          border: none;
          cursor: pointer;
          transition: opacity 0.15s ease;
        }
        .yt-song-row:hover .yt-thumb-play-btn {
          opacity: 1;
        }
        .yt-song-details {
          display: flex;
          flex-direction: column;
          gap: 2px;
          flex: 1;
          min-width: 0;
        }
        .yt-song-title {
          font-size: 14px;
          font-weight: 600;
          color: #ffffff;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .yt-song-artist {
          font-size: 12px;
          color: #aaaaaa;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .yt-song-style-tag {
          color: #10b981;
          font-weight: 500;
        }
        .yt-song-actions {
          display: flex;
          align-items: center;
          gap: 12px;
          flex-shrink: 0;
        }
        .yt-action-icon-btn {
          background: transparent;
          border: none;
          cursor: pointer;
          padding: 6px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: background-color 0.15s ease;
        }
        .yt-action-icon-btn:hover {
          background: rgba(255, 255, 255, 0.1);
        }
        .yt-song-duration {
          font-size: 13px;
          color: #aaaaaa;
          min-width: 40px;
          text-align: right;
        }

        /* Equalizer Animation */
        .yt-playing-bars {
          display: inline-flex;
          align-items: flex-end;
          gap: 2px;
          height: 14px;
        }
        .bar {
          width: 3px;
          background-color: #10b981;
          border-radius: 1px;
          animation: bounce 1s infinite ease-in-out;
        }
        .bar1 { height: 60%; animation-delay: 0.1s; }
        .bar2 { height: 100%; animation-delay: 0.3s; }
        .bar3 { height: 40%; animation-delay: 0.2s; }

        @keyframes bounce {
          0%, 100% { transform: scaleY(0.4); }
          50% { transform: scaleY(1); }
        }

        :global(.inline-pin) {
          color: #ff0033;
        }

        @media (max-width: 768px) {
          .yt-library-page {
            padding: 12px 0 140px 0; /* scroller already has 16px sides */
          }
          .yt-library-top-bar {
            margin-bottom: 16px;
          }
          .yt-library-sort-btn {
            display: none !important;
          }
          .yt-library-grid {
            grid-template-columns: repeat(2, 1fr);
            gap: 16px 12px;
          }
          .yt-card-title {
            font-size: 13px;
          }
          .yt-card-sub {
            font-size: 11px;
          }
          .yt-song-row {
            padding: 6px 4px;
            gap: 10px;
          }
          .yt-song-actions {
            gap: 6px;
          }
        }
      `}</style>
    </div>
  );
}
