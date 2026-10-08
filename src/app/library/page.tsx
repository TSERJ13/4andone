"use client";

import React, { useState } from 'react';
import { ThumbsUp, Plus, Disc, ArrowDownToLine, Play, Pin, ChevronDown, Music2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useStudio, Track } from '@/components/admin/StudioProvider';
import { useAudioControls } from '@/components/audio/AudioProvider';
import { useAuth } from '@/context/AuthContext';
import ConfirmModal from '@/components/admin/ConfirmModal';
import CreatePlaylistModal from '@/components/library/CreatePlaylistModal';
import { getDownloadedTrackIds, subscribeToOfflineUpdates } from '@/utils/offline';
import { getTrackCover } from '@/utils/trackCover';
import { canonicalStyle } from '@/utils/audio';

const FILTER_CHIPS = ['Playlists', 'Songs', 'Albums', 'Artists', 'Profiles', 'Podcasts'];

export default function LibraryPage() {
  const router = useRouter();
  const { tracks, folders, folderTracksMap, styles, albums } = useStudio();
  const { loadTrack } = useAudioControls();
  const { isAuthenticated, setIsAuthModalOpen } = useAuth();
  const [activeChip, setActiveChip] = useState('Playlists');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [downloadedIds, setDownloadedIds] = useState<string[]>([]);

  React.useEffect(() => {
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
    return getTrackCover(matchingTrack, albums, styles);
  };

  const likedTracksCount = tracks.filter(t => t.isFavorite && !t.tags?.some(tag => tag.toLowerCase() === 'closed' || tag === 'დახურული')).length;

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

      {/* YouTube Music Grid Layout */}
      <div className="yt-library-grid">
        {/* 1. Liked Music Card */}
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

        {/* 2. Downloaded Card */}
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

        {/* 3. Dance Style Playlists (Cha Cha Cha, Samba, Rumba, Paso Doble, Jive, Slow Waltz, Tango, etc.) */}
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

        {/* 4. User Created Folders / Custom Playlists */}
        {folders.map((folder) => {
          const folderTracks = tracks.filter(t => 
            (t.folderId === folder.id || folderTracksMap?.[folder.id]?.includes(t.id)) && 
            t.style?.toLowerCase() !== 'fitness'
          );
          const cover = folderTracks[0] ? getTrackCover(folderTracks[0], albums, styles) : '/logo-square.jpg';

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

        {/* 5. Create Playlist Card */}
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
          border-radius: 6px;
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
          transform: scale(1.03);
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

        :global(.inline-pin) {
          color: #ff0033;
        }

        @media (max-width: 768px) {
          .yt-library-page {
            padding: 12px 16px 140px 16px;
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
        }
      `}</style>
    </div>
  );
}
