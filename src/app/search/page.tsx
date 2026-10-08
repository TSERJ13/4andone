"use client";

import React, { useState, Fragment } from 'react';
import { Search, X, Music2, Disc, Sparkles } from 'lucide-react';
import { useStudio } from '@/components/admin/StudioProvider';
import { useAudioControls } from '@/components/audio/AudioProvider';
import { useAuth } from '@/context/AuthContext';
import { useDownloadedTracks } from '@/hooks/useDownloadedTracks';
import { displayStyleName } from '@/utils/styleNames';
import Link from 'next/link';
import ConfirmModal from '@/components/admin/ConfirmModal';
import { TrackRow } from '@/components/tracks/TrackRow';
import { ListAd, useListAdAnchor } from '@/components/ads/ListAd';

const FILTER_CHIPS = ['All', 'Songs', 'Styles', 'Albums'];

const getStyleImage = (styleTitle: string): string => {
  const title = (styleTitle || '').toLowerCase().trim();
  if (title.includes('cha')) return '/styles/cha-cha-cha.jpg';
  if (title.includes('samba')) return '/styles/samba.jpg';
  if (title.includes('rumba')) return '/styles/rumba.jpg';
  if (title.includes('paso')) return '/styles/paso-doble.jpg';
  if (title.includes('jive')) return '/styles/jive.jpg';
  if (title.includes('viennese') || (title.includes('waltz') && title.includes('v'))) return '/styles/viennese-waltz.jpg';
  if (title.includes('slow') && title.includes('waltz')) return '/styles/slow-waltz.jpg';
  if (title.includes('waltz')) return '/styles/slow-waltz.jpg';
  if (title.includes('foxtrot') || title.includes('fox')) return '/styles/slow-foxtrot.jpg';
  if (title.includes('quickstep') || title.includes('quick')) return '/styles/quickstep.jpg';
  if (title.includes('tango')) return '/styles/tango.jpg';
  return '/styles/samba.jpg';
};

const SearchPage = () => {
  const [query, setQuery] = useState('');
  const [activeChip, setActiveChip] = useState('All');
  const { tracks, styles, albums, toggleFavorite } = useStudio();
  const { isPlaying, title: playingTitle, trackId: playingTrackId, loadTrack } = useAudioControls();
  const listAdAnchor = useListAdAnchor();
  const { isAuthenticated, setIsAuthModalOpen } = useAuth();
  const downloadedIds = useDownloadedTracks();

  const [infoModal, setInfoModal] = useState({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => { }
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

  const stylesWithTracks = styles.filter(s =>
    s.title.toLowerCase() !== 'fitness' &&
    tracks.some(t => t.style?.toLowerCase() === s.title.toLowerCase())
  );

  const getStyleTrackCount = (styleName: string) => {
    return tracks.filter(t =>
      t.style?.toLowerCase() === styleName.toLowerCase() &&
      !t.tags?.some(tag => tag.toLowerCase() === 'closed' || tag === 'დახურული')
    ).length;
  };

  const searchResultsTracks = tracks.filter(track => {
    const q = query.toLowerCase().trim();
    const matchesQuery =
      track.title.toLowerCase().includes(q) ||
      track.artist.toLowerCase().includes(q) ||
      (track.style && track.style.toLowerCase().includes(q));

    const isHidden =
      track.style?.toLowerCase() === 'fitness' ||
      track.tags?.some(tag => tag.toLowerCase() === 'closed' || tag === 'დახურული');

    return matchesQuery && !isHidden;
  });

  const matchingStyles = stylesWithTracks.filter(s =>
    s.title.toLowerCase().includes(query.toLowerCase().trim())
  );

  const matchingAlbums = albums.filter(a =>
    a.title.toLowerCase().includes(query.toLowerCase().trim()) ||
    (a.artist && a.artist.toLowerCase().includes(query.toLowerCase().trim()))
  );

  return (
    <div className="yt-search-page animate-in">
      {/* Search Bar Container */}
      <div className="yt-search-header-sticky">
        <div className="yt-search-pill-large">
          <Search size={20} className="yt-search-pill-icon" />
          <input
            type="text"
            placeholder="Search songs, styles, albums, artists..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="yt-search-pill-input"
            autoFocus
          />
          {query && (
            <button
              type="button"
              className="yt-search-pill-clear"
              onClick={() => setQuery('')}
              aria-label="Clear search"
            >
              <X size={18} />
            </button>
          )}
        </div>

        {/* Filter Chips Bar */}
        <div className="yt-search-chips-row">
          {FILTER_CHIPS.map(chip => (
            <button
              key={chip}
              type="button"
              className={`yt-search-chip ${activeChip === chip ? 'active' : ''}`}
              onClick={() => setActiveChip(chip)}
            >
              {chip}
            </button>
          ))}
        </div>
      </div>

      {/* Main Search Page Content */}
      <div className="yt-search-content">
        {!query ? (
          /* Browse All Styles View */
          <div className="yt-browse-section">
            <div className="yt-section-header">
              <h2 className="yt-section-title">Browse Dance Styles</h2>
              <span className="yt-section-subtitle">Explore dance tracks by category</span>
            </div>

            <div className="yt-styles-grid">
              {stylesWithTracks.length > 0 ? (
                stylesWithTracks.map((style) => {
                  const trackCount = getStyleTrackCount(style.title);
                  const styleImg = getStyleImage(style.title);
                  const slug = style.title.toLowerCase().replace(/\s+/g, '-');

                  return (
                    <Link
                      key={style.id}
                      href={`/style/${slug}`}
                      className="yt-style-card"
                      style={{
                        background: `linear-gradient(135deg, ${style.color || '#272727'} 0%, #121212 100%)`
                      }}
                    >
                      <div className="yt-style-info">
                        <h3 className="yt-style-name">{displayStyleName(style.title)}</h3>
                        <p className="yt-style-count">{trackCount} TRACKS</p>
                      </div>

                      <div className="yt-style-img-wrapper">
                        <img
                          src={styleImg}
                          alt={style.title}
                          className="yt-style-img"
                        />
                      </div>
                    </Link>
                  );
                })
              ) : (
                <div className="yt-empty-state">
                  <Music2 size={48} opacity={0.3} />
                  <p>No dance styles available yet.</p>
                </div>
              )}
            </div>
          </div>
        ) : (
          /* Search Results View */
          <div className="yt-results-section">
            {/* 1. Matching Styles (if chip is All or Styles) */}
            {(activeChip === 'All' || activeChip === 'Styles') && matchingStyles.length > 0 && (
              <div className="yt-results-group">
                <h3 className="yt-group-title">Dance Styles</h3>
                <div className="yt-styles-grid">
                  {matchingStyles.map(style => (
                    <Link
                      key={style.id}
                      href={`/style/${style.title.toLowerCase().replace(/\s+/g, '-')}`}
                      className="yt-style-card"
                      style={{
                        background: `linear-gradient(135deg, ${style.color || '#272727'} 0%, #121212 100%)`
                      }}
                    >
                      <div className="yt-style-info">
                        <h3 className="yt-style-name">{displayStyleName(style.title)}</h3>
                        <p className="yt-style-count">{getStyleTrackCount(style.title)} TRACKS</p>
                      </div>
                      <div className="yt-style-img-wrapper">
                        <img
                          src={getStyleImage(style.title)}
                          alt={style.title}
                          className="yt-style-img"
                        />
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {/* 2. Matching Albums (if chip is All or Albums) */}
            {(activeChip === 'All' || activeChip === 'Albums') && matchingAlbums.length > 0 && (
              <div className="yt-results-group">
                <h3 className="yt-group-title">Albums</h3>
                <div className="yt-albums-grid">
                  {matchingAlbums.map(album => (
                    <Link
                      key={album.id}
                      href={`/album/${album.slug}`}
                      className="yt-album-card"
                    >
                      <img
                        src={album.coverUrl || '/logo-square.jpg'}
                        alt={album.title}
                        className="yt-album-cover"
                      />
                      <div className="yt-album-title">{album.title}</div>
                      <div className="yt-album-artist">{album.artist || '4ANDONE'}</div>
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {/* 3. Matching Songs (if chip is All or Songs) */}
            {(activeChip === 'All' || activeChip === 'Songs') && (
              <div className="yt-results-group">
                <h3 className="yt-group-title">Songs</h3>
                {searchResultsTracks.length > 0 ? (
                  <div className="yt-tracks-list">
                    {searchResultsTracks.map((track) => {
                      const isTrackActive =
                        isPlaying &&
                        (playingTrackId
                          ? playingTrackId === track.id
                          : playingTitle === track.title || playingTitle === track.id);

                      return (
                        <Fragment key={track.id}>
                          <TrackRow
                            track={track}
                            isActive={isTrackActive}
                            onPlay={() => loadTrack(track)}
                            onToggleFavorite={() =>
                              checkAuthAndExecute(
                                () => toggleFavorite?.(track.id),
                                'favorite tracks'
                              )
                            }
                            badge="style"
                            styleColor={
                              styles.find(
                                s => s.title.toLowerCase() === track.style?.toLowerCase()
                              )?.color
                            }
                            isDownloaded={downloadedIds.includes(track.id)}
                          />
                          {track.id === listAdAnchor && <ListAd key={track.id} />}
                        </Fragment>
                      );
                    })}
                  </div>
                ) : (
                  matchingStyles.length === 0 && matchingAlbums.length === 0 && (
                    <div className="yt-empty-state">
                      <p className="yt-empty-text">No results found for "{query}"</p>
                    </div>
                  )
                )}
              </div>
            )}
          </div>
        )}
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

      <style jsx>{`
        .yt-search-page {
          padding: 16px 24px 140px 24px;
          max-width: 1200px;
          margin: 0 auto;
        }

        .yt-search-header-sticky {
          position: sticky;
          top: 0;
          z-index: 100;
          background: rgba(3, 3, 3, 0.85);
          backdrop-filter: blur(16px);
          -webkit-backdrop-filter: blur(16px);
          padding: 12px 0 16px 0;
          margin-bottom: 24px;
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .yt-search-pill-large {
          display: flex;
          align-items: center;
          background: #212121;
          border: 1px solid rgba(255, 255, 255, 0.12);
          border-radius: 28px;
          padding: 0 20px;
          height: 48px;
          width: 100%;
          max-width: 680px;
          margin: 0 auto;
          box-shadow: 0 8px 24px rgba(0, 0, 0, 0.5);
          transition: all 0.25s ease;
        }

        .yt-search-pill-large:focus-within {
          background: #282828;
          border-color: rgba(255, 255, 255, 0.3);
          box-shadow: 0 12px 32px rgba(0, 0, 0, 0.7);
        }

        .yt-search-pill-icon {
          color: #aaaaaa;
          margin-right: 14px;
          flex-shrink: 0;
        }

        .yt-search-pill-input {
          background: transparent;
          border: none;
          outline: none;
          color: #ffffff;
          font-size: 15px;
          font-weight: 500;
          width: 100%;
        }

        .yt-search-pill-input::placeholder {
          color: #888888;
        }

        .yt-search-pill-clear {
          background: none;
          border: none;
          color: #aaaaaa;
          cursor: pointer;
          padding: 4px;
          display: flex;
          align-items: center;
          border-radius: 50%;
          transition: color 0.15s ease;
        }

        .yt-search-pill-clear:hover {
          color: #ffffff;
        }

        .yt-search-chips-row {
          display: flex;
          align-items: center;
          gap: 8px;
          overflow-x: auto;
          scrollbar-width: none;
          padding-bottom: 2px;
        }

        .yt-search-chips-row::-webkit-scrollbar {
          display: none;
        }

        .yt-search-chip {
          background: rgba(255, 255, 255, 0.08);
          border: 1px solid rgba(255, 255, 255, 0.08);
          color: #ffffff;
          font-size: 13px;
          font-weight: 600;
          padding: 6px 16px;
          border-radius: 18px;
          cursor: pointer;
          white-space: nowrap;
          transition: all 0.2s ease;
        }

        .yt-search-chip:hover {
          background: rgba(255, 255, 255, 0.15);
        }

        .yt-search-chip.active {
          background: #ffffff;
          color: #030303;
          border-color: #ffffff;
        }

        .yt-section-header {
          margin-bottom: 20px;
        }

        .yt-section-title {
          font-size: 22px;
          font-weight: 800;
          color: #ffffff;
          letter-spacing: -0.5px;
          margin: 0 0 4px 0;
        }

        .yt-section-subtitle {
          font-size: 13px;
          color: #aaaaaa;
        }

        .yt-styles-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
          gap: 16px;
        }

        .yt-style-card {
          position: relative;
          height: 110px;
          border-radius: 14px;
          padding: 16px;
          overflow: hidden;
          text-decoration: none;
          color: #ffffff;
          border: 1px solid rgba(255, 255, 255, 0.08);
          box-shadow: 0 8px 24px rgba(0, 0, 0, 0.4);
          transition: transform 0.25s ease, box-shadow 0.25s ease;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
        }

        .yt-style-card:hover {
          transform: translateY(-4px) scale(1.02);
          box-shadow: 0 16px 36px rgba(0, 0, 0, 0.6);
        }

        .yt-style-info {
          position: relative;
          z-index: 2;
        }

        .yt-style-name {
          font-size: 18px;
          font-weight: 800;
          margin: 0 0 4px 0;
          color: #ffffff;
          letter-spacing: -0.3px;
        }

        .yt-style-count {
          font-size: 10px;
          font-weight: 700;
          color: rgba(255, 255, 255, 0.7);
          letter-spacing: 0.5px;
          margin: 0;
        }

        .yt-style-img-wrapper {
          position: absolute;
          right: -12px;
          bottom: -12px;
          width: 72px;
          height: 72px;
          border-radius: 10px;
          overflow: hidden;
          transform: rotate(18deg);
          box-shadow: -4px 4px 16px rgba(0, 0, 0, 0.6);
          transition: transform 0.3s ease;
        }

        .yt-style-card:hover .yt-style-img-wrapper {
          transform: rotate(8deg) scale(1.1);
        }

        .yt-style-img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .yt-group-title {
          font-size: 18px;
          font-weight: 800;
          color: #ffffff;
          margin: 24px 0 14px 0;
        }

        .yt-albums-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
          gap: 16px;
        }

        .yt-album-card {
          text-decoration: none;
          color: #ffffff;
          background: #181818;
          border-radius: 12px;
          padding: 12px;
          transition: background 0.2s ease;
        }

        .yt-album-card:hover {
          background: #252525;
        }

        .yt-album-cover {
          width: 100%;
          aspect-ratio: 1;
          border-radius: 8px;
          object-fit: cover;
          margin-bottom: 8px;
        }

        .yt-album-title {
          font-size: 14px;
          font-weight: 700;
          color: #ffffff;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .yt-album-artist {
          font-size: 12px;
          color: #aaaaaa;
          margin-top: 2px;
        }

        .yt-tracks-list {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .yt-empty-state {
          padding: 60px 20px;
          text-align: center;
          color: #aaaaaa;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 12px;
        }

        .yt-empty-text {
          font-size: 15px;
          font-weight: 500;
        }

        @media (max-width: 768px) {
          .yt-search-page {
            padding: 12px 16px 140px 16px;
          }

          .yt-styles-grid {
            grid-template-columns: repeat(2, 1fr);
            gap: 12px;
          }

          .yt-style-card {
            height: 100px;
            padding: 14px;
          }

          .yt-style-name {
            font-size: 16px;
          }

          .yt-search-pill-large {
            height: 44px;
            padding: 0 16px;
          }
        }
      `}</style>
    </div>
  );
};

export default SearchPage;
