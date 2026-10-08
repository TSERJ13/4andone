"use client";

import React, { useState, useEffect, useRef, Fragment } from 'react';
import { HEADER_SEARCH_EVENT } from '@/components/ytmusic/YtHeader';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  Search,
  X,
  History,
  ArrowUpLeft,
  SlidersHorizontal,
  Music2
} from 'lucide-react';
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
const SORT_OPTIONS = [
  { id: 'relevance', name: 'Relevance' },
  { id: 'alphabetical', name: 'Title (A-Z)' },
  { id: 'newest', name: 'Newest' }
];

const SearchPage = () => {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);

  const [query, setQuery] = useState('');
  const [activeChip, setActiveChip] = useState('All');
  const [sortBy, setSortBy] = useState('relevance');
  const [selectedStyleFilter, setSelectedStyleFilter] = useState('all');
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [history, setHistory] = useState<string[]>([]);

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

  // Load actual search history from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem('4andone_search_history');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          setHistory(parsed);
        }
      }
    } catch (e) {
      setHistory([]);
    }
  }, []);

  const saveToHistory = (term: string) => {
    if (!term || !term.trim()) return;
    const cleanTerm = term.trim();
    setHistory(prev => {
      const updated = [cleanTerm, ...prev.filter(item => item.toLowerCase() !== cleanTerm.toLowerCase())].slice(0, 10);
      try {
        localStorage.setItem('4andone_search_history', JSON.stringify(updated));
      } catch (e) {}
      return updated;
    });
  };

  const removeHistoryItem = (term: string) => {
    setHistory(prev => {
      const updated = prev.filter(item => item !== term);
      try {
        localStorage.setItem('4andone_search_history', JSON.stringify(updated));
      } catch (e) {}
      return updated;
    });
  };

  const clearAllHistory = () => {
    setHistory([]);
    try {
      localStorage.setItem('4andone_search_history', JSON.stringify([]));
    } catch (e) {}
  };

  // Query from the header search: ?q= on arrival, then live updates
  useEffect(() => {
    try {
      const q = new URLSearchParams(window.location.search).get('q');
      if (q) setQuery(q);
    } catch { /* ignore */ }
    const onHeaderSearch = (e: Event) => setQuery(String((e as CustomEvent).detail ?? ''));
    window.addEventListener(HEADER_SEARCH_EVENT, onHeaderSearch);
    return () => window.removeEventListener(HEADER_SEARCH_EVENT, onHeaderSearch);
  }, []);

  const handleSearchClick = (term: string) => {
    setQuery(term);
    saveToHistory(term);
  };

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

  // Filter & Sort Tracks
  let searchResultsTracks = tracks.filter(track => {
    const q = query.toLowerCase().trim();
    const matchesQuery = !q ||
      track.title.toLowerCase().includes(q) ||
      track.artist.toLowerCase().includes(q) ||
      (track.style && track.style.toLowerCase().includes(q));

    const matchesStyle = selectedStyleFilter === 'all' ||
      (track.style && track.style.toLowerCase() === selectedStyleFilter.toLowerCase());

    const isHidden =
      track.style?.toLowerCase() === 'fitness' ||
      track.tags?.some(tag => tag.toLowerCase() === 'closed' || tag === 'დახურული');

    return matchesQuery && matchesStyle && !isHidden;
  });

  if (sortBy === 'alphabetical') {
    searchResultsTracks.sort((a, b) => a.title.localeCompare(b.title));
  } else if (sortBy === 'newest') {
    searchResultsTracks = [...searchResultsTracks].reverse();
  }

  const matchingStyles = stylesWithTracks.filter(s =>
    (selectedStyleFilter === 'all' || s.title.toLowerCase() === selectedStyleFilter.toLowerCase()) &&
    (!query || s.title.toLowerCase().includes(query.toLowerCase().trim()))
  );

  const matchingAlbums = albums.filter(a =>
    !query ||
    a.title.toLowerCase().includes(query.toLowerCase().trim()) ||
    (a.artist && a.artist.toLowerCase().includes(query.toLowerCase().trim()))
  );

  return (
    <div className="yt-native-search-page animate-in">
      {/* 1. YouTube Music Mobile Top Search Bar */}
      <div className="yt-search-header-bar">
        <button
          type="button"
          className="yt-back-icon-btn"
          onClick={() => router.back()}
          aria-label="Back"
        >
          <ArrowLeft size={22} />
        </button>

        <div className="yt-search-input-pill">
          <input
            ref={inputRef}
            type="text"
            placeholder="Search songs, styles, artists..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && query.trim()) {
                saveToHistory(query);
              }
            }}
            className="yt-search-native-input"
            autoFocus
          />

          {query ? (
            <button
              type="button"
              className="yt-clear-query-btn"
              onClick={() => setQuery('')}
              aria-label="Clear text"
            >
              <X size={18} />
            </button>
          ) : null}

          {/* Interactive Filter Button (SlidersHorizontal) */}
          <button
            type="button"
            className={`yt-filter-toggle-btn ${isFilterOpen ? 'active' : ''}`}
            onClick={() => setIsFilterOpen(!isFilterOpen)}
            title="Search Filters & Options"
            aria-label="Toggle filters"
          >
            <SlidersHorizontal size={19} />
          </button>
        </div>
      </div>

      {/* 2. Interactive Filter Drawer / Panel */}
      {isFilterOpen && (
        <div className="yt-filter-panel-card animate-in">
          <div className="yt-filter-panel-header">
            <span className="yt-filter-panel-title">Search Filters</span>
            <button
              type="button"
              className="yt-filter-close-btn"
              onClick={() => setIsFilterOpen(false)}
            >
              <X size={16} />
            </button>
          </div>

          {/* Category Chips inside filter panel */}
          <div className="yt-filter-section">
            <span className="yt-filter-label">Type</span>
            <div className="yt-filter-chips-row">
              {FILTER_CHIPS.map(chip => (
                <button
                  key={chip}
                  type="button"
                  className={`yt-filter-chip-btn ${activeChip === chip ? 'active' : ''}`}
                  onClick={() => setActiveChip(chip)}
                >
                  {chip}
                </button>
              ))}
            </div>
          </div>

          {/* Dance Style Select */}
          <div className="yt-filter-section">
            <span className="yt-filter-label">Style</span>
            <div className="yt-filter-chips-row">
              <button
                type="button"
                className={`yt-filter-chip-btn ${selectedStyleFilter === 'all' ? 'active' : ''}`}
                onClick={() => setSelectedStyleFilter('all')}
              >
                All Styles
              </button>
              {stylesWithTracks.map(st => (
                <button
                  key={st.id}
                  type="button"
                  className={`yt-filter-chip-btn ${selectedStyleFilter === st.title.toLowerCase() ? 'active' : ''}`}
                  onClick={() => setSelectedStyleFilter(st.title.toLowerCase())}
                >
                  {displayStyleName(st.title)}
                </button>
              ))}
            </div>
          </div>

          {/* Sort By Options */}
          <div className="yt-filter-section">
            <span className="yt-filter-label">Sort By</span>
            <div className="yt-filter-chips-row">
              {SORT_OPTIONS.map(opt => (
                <button
                  key={opt.id}
                  type="button"
                  className={`yt-filter-chip-btn ${sortBy === opt.id ? 'active' : ''}`}
                  onClick={() => setSortBy(opt.id)}
                >
                  {opt.name}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 3. Main Content Area */}
      <div className="yt-search-main-content">
        {!query ? (
          /* DEFAULT STATE: Actual User Search History Only */
          <div className="yt-history-view">
            {history.length > 0 && (
              <>
                <div className="yt-history-header-row">
                  <span className="yt-history-section-label">Recent Searches</span>
                  <button
                    type="button"
                    className="yt-clear-all-history-btn"
                    onClick={clearAllHistory}
                  >
                    Clear all
                  </button>
                </div>

                <div className="yt-history-list">
                  {history.map((term, index) => (
                    <div
                      key={index}
                      className="yt-history-row"
                      onClick={() => handleSearchClick(term)}
                    >
                      <div className="yt-history-left">
                        <History size={20} className="yt-history-clock" />
                        <span className="yt-history-term">{term}</span>
                      </div>

                      <div className="yt-history-actions">
                        <button
                          type="button"
                          className="yt-fill-arrow-btn"
                          onClick={(e) => {
                            e.stopPropagation();
                            setQuery(term);
                            inputRef.current?.focus();
                          }}
                          title="Fill in search input"
                          aria-label="Fill search term"
                        >
                          <ArrowUpLeft size={20} />
                        </button>

                        <button
                          type="button"
                          className="yt-remove-history-btn"
                          onClick={(e) => {
                            e.stopPropagation();
                            removeHistoryItem(term);
                          }}
                          title="Remove from history"
                          aria-label="Remove item"
                        >
                          <X size={16} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        ) : (
          /* SEARCH ACTIVE STATE: Filter Chips + Matching Results */
          <div className="yt-search-active-results">
            {/* Filter Chips Bar */}
            <div className="yt-chips-scroll-bar">
              {FILTER_CHIPS.map((chip) => (
                <button
                  key={chip}
                  type="button"
                  className={`yt-search-filter-chip ${activeChip === chip ? 'active' : ''}`}
                  onClick={() => setActiveChip(chip)}
                >
                  {chip}
                </button>
              ))}
            </div>

            {/* Matching Styles */}
            {(activeChip === 'All' || activeChip === 'Styles') && matchingStyles.length > 0 && (
              <div className="yt-results-block">
                <h3 className="yt-block-title">Dance Styles</h3>
                <div className="yt-styles-mini-grid">
                  {matchingStyles.map((style) => (
                    <Link
                      key={style.id}
                      href={`/style/${style.title.toLowerCase().replace(/\s+/g, '-')}`}
                      className="yt-style-result-pill"
                      style={{
                        background: `linear-gradient(135deg, ${style.color || '#272727'} 0%, #171717 100%)`
                      }}
                      onClick={() => saveToHistory(style.title)}
                    >
                      <span className="yt-style-pill-name">{displayStyleName(style.title)}</span>
                      <span className="yt-style-pill-count">{getStyleTrackCount(style.title)} tracks</span>
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {/* Matching Albums */}
            {(activeChip === 'All' || activeChip === 'Albums') && matchingAlbums.length > 0 && (
              <div className="yt-results-block">
                <h3 className="yt-block-title">Albums</h3>
                <div className="yt-albums-mini-grid">
                  {matchingAlbums.map((album) => (
                    <Link
                      key={album.id}
                      href={`/album/${album.slug}`}
                      className="yt-album-result-card"
                      onClick={() => saveToHistory(album.title)}
                    >
                      <img
                        src={album.coverUrl || '/logo-square.jpg'}
                        alt={album.title}
                        className="yt-album-thumb"
                      />
                      <div className="yt-album-info">
                        <div className="yt-album-name">{album.title}</div>
                        <div className="yt-album-meta">{album.artist || '4ANDONE'}</div>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {/* Matching Tracks */}
            {(activeChip === 'All' || activeChip === 'Songs') && (
              <div className="yt-results-block">
                <h3 className="yt-block-title">Songs</h3>
                {searchResultsTracks.length > 0 ? (
                  <div className="yt-tracks-list-container">
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
                            onPlay={() => {
                              saveToHistory(track.title);
                              loadTrack(track);
                            }}
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
                    <div className="yt-empty-query-state">
                      <Music2 size={40} opacity={0.3} />
                      <p>No results found for "{query}"</p>
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
        .yt-native-search-page {
          background: #000000;
          min-height: 100vh;
          padding: 12px 16px 140px 16px;
          max-width: 800px;
          margin: 0 auto;
        }

        /* Top Header Bar */
        .yt-search-header-bar {
          display: flex;
          align-items: center;
          gap: 12px;
          position: sticky;
          top: 0;
          z-index: 100;
          background: #000000;
          padding: 8px 0 12px 0;
        }

        .yt-back-icon-btn {
          background: none;
          border: none;
          color: #ffffff;
          cursor: pointer;
          padding: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 50%;
          transition: background 0.15s ease;
        }

        .yt-back-icon-btn:hover {
          background: rgba(255, 255, 255, 0.1);
        }

        .yt-search-input-pill {
          flex: 1;
          display: flex;
          align-items: center;
          background: #212121;
          border-radius: 28px;
          padding: 0 12px 0 16px;
          height: 48px;
          border: 1px solid rgba(255, 255, 255, 0.08);
        }

        .yt-search-native-input {
          flex: 1;
          background: transparent;
          border: none;
          outline: none;
          color: #ffffff;
          font-size: 16px;
          font-weight: 400;
        }

        .yt-search-native-input::placeholder {
          color: #8e8e8e;
        }

        .yt-clear-query-btn {
          background: none;
          border: none;
          color: #aaaaaa;
          cursor: pointer;
          padding: 6px;
          display: flex;
          align-items: center;
          margin-right: 4px;
        }

        .yt-filter-toggle-btn {
          background: none;
          border: none;
          color: #aaaaaa;
          cursor: pointer;
          padding: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 50%;
          transition: all 0.2s ease;
        }

        .yt-filter-toggle-btn:hover,
        .yt-filter-toggle-btn.active {
          color: #ffffff;
          background: rgba(255, 255, 255, 0.15);
        }

        /* Filter Panel */
        .yt-filter-panel-card {
          background: #1c1c1c;
          border: 1px solid rgba(255, 255, 255, 0.15);
          border-radius: 16px;
          padding: 16px;
          margin-bottom: 20px;
          box-shadow: 0 12px 32px rgba(0, 0, 0, 0.8);
          display: flex;
          flex-direction: column;
          gap: 14px;
        }

        .yt-filter-panel-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          border-bottom: 1px solid rgba(255, 255, 255, 0.08);
          padding-bottom: 8px;
        }

        .yt-filter-panel-title {
          font-size: 15px;
          font-weight: 700;
          color: #ffffff;
        }

        .yt-filter-close-btn {
          background: none;
          border: none;
          color: #aaaaaa;
          cursor: pointer;
          padding: 4px;
          display: flex;
          align-items: center;
        }

        .yt-filter-section {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .yt-filter-label {
          font-size: 12px;
          font-weight: 700;
          color: #aaaaaa;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .yt-filter-chips-row {
          display: flex;
          align-items: center;
          gap: 8px;
          overflow-x: auto;
          scrollbar-width: none;
          padding-bottom: 2px;
        }

        .yt-filter-chips-row::-webkit-scrollbar {
          display: none;
        }

        .yt-filter-chip-btn {
          background: rgba(255, 255, 255, 0.08);
          border: 1px solid rgba(255, 255, 255, 0.08);
          color: #ffffff;
          font-size: 13px;
          font-weight: 600;
          padding: 6px 14px;
          border-radius: 16px;
          cursor: pointer;
          white-space: nowrap;
          transition: all 0.2s ease;
        }

        .yt-filter-chip-btn.active {
          background: #ffffff;
          color: #000000;
          border-color: #ffffff;
        }

        /* Search History List */
        .yt-history-header-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 8px;
          padding: 0 4px;
        }

        .yt-history-section-label {
          font-size: 13px;
          font-weight: 700;
          color: #8e8e8e;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .yt-clear-all-history-btn {
          background: none;
          border: none;
          color: #ef4444;
          font-size: 12px;
          font-weight: 600;
          cursor: pointer;
          padding: 4px 8px;
        }

        .yt-history-list {
          display: flex;
          flex-direction: column;
          margin-bottom: 32px;
        }

        .yt-history-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 14px 4px;
          cursor: pointer;
          transition: background 0.15s ease;
          border-bottom: 1px solid rgba(255, 255, 255, 0.04);
        }

        .yt-history-row:hover {
          background: rgba(255, 255, 255, 0.04);
        }

        .yt-history-left {
          display: flex;
          align-items: center;
          gap: 16px;
        }

        .yt-history-clock {
          color: #aaaaaa;
          flex-shrink: 0;
        }

        .yt-history-term {
          color: #ffffff;
          font-size: 16px;
          font-weight: 500;
        }

        .yt-history-actions {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .yt-fill-arrow-btn,
        .yt-remove-history-btn {
          background: none;
          border: none;
          color: #aaaaaa;
          cursor: pointer;
          padding: 6px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 50%;
          transition: color 0.15s ease, background 0.15s ease;
        }

        .yt-fill-arrow-btn:hover,
        .yt-remove-history-btn:hover {
          color: #ffffff;
          background: rgba(255, 255, 255, 0.1);
        }

        /* Active Results View */
        .yt-chips-scroll-bar {
          display: flex;
          align-items: center;
          gap: 8px;
          overflow-x: auto;
          scrollbar-width: none;
          margin-bottom: 20px;
        }

        .yt-chips-scroll-bar::-webkit-scrollbar {
          display: none;
        }

        .yt-search-filter-chip {
          background: rgba(255, 255, 255, 0.1);
          border: none;
          color: #ffffff;
          font-size: 13px;
          font-weight: 600;
          padding: 6px 16px;
          border-radius: 18px;
          cursor: pointer;
          white-space: nowrap;
          transition: all 0.2s ease;
        }

        .yt-search-filter-chip.active {
          background: #ffffff;
          color: #000000;
        }

        .yt-results-block {
          margin-bottom: 24px;
        }

        .yt-block-title {
          font-size: 18px;
          font-weight: 800;
          color: #ffffff;
          margin-bottom: 12px;
        }

        .yt-styles-mini-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
          gap: 10px;
        }

        .yt-style-result-pill {
          padding: 12px 14px;
          border-radius: 10px;
          text-decoration: none;
          color: #ffffff;
          display: flex;
          flex-direction: column;
          justify-content: center;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.4);
        }

        .yt-style-pill-name {
          font-size: 15px;
          font-weight: 700;
        }

        .yt-style-pill-count {
          font-size: 11px;
          opacity: 0.7;
          margin-top: 2px;
        }

        .yt-albums-mini-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(130px, 1fr));
          gap: 12px;
        }

        .yt-album-result-card {
          text-decoration: none;
          color: #ffffff;
          background: #181818;
          border-radius: 10px;
          padding: 10px;
        }

        .yt-album-thumb {
          width: 100%;
          aspect-ratio: 1;
          border-radius: 6px;
          object-fit: cover;
          margin-bottom: 6px;
        }

        .yt-album-name {
          font-size: 13px;
          font-weight: 700;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .yt-album-meta {
          font-size: 11px;
          color: #aaaaaa;
        }

        .yt-tracks-list-container {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .yt-empty-query-state {
          padding: 48px 16px;
          text-align: center;
          color: #8e8e8e;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 10px;
        }

        @media (max-width: 768px) {
          .yt-native-search-page {
            padding: 8px 12px 140px 12px;
          }

          .yt-history-row {
            padding: 12px 0;
          }

          .yt-history-term {
            font-size: 15px;
          }
        }
      `}</style>
    </div>
  );
};

export default SearchPage;
