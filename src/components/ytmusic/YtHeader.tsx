"use client";

import React, { useState, useEffect, useRef, useMemo } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Search, Menu, X, Play, Disc, Music2, ArrowRight } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { UserBadge } from '@/components/auth/UserBadge';
import { useStudio } from '@/components/admin/StudioProvider';
import { useAudioControls } from '@/components/audio/AudioProvider';
import { getTrackCover } from '@/utils/trackCover';

export const HEADER_SEARCH_EVENT = 'yt-header-search';

interface YtHeaderProps {
  onToggleSidebar?: () => void;
  onSearch?: (query: string) => void;
  searchQuery?: string;
}

export default function YtHeader({ onToggleSidebar, onSearch, searchQuery = '' }: YtHeaderProps) {
  const { user } = useAuth();
  const { tracks, albums, styles } = useStudio();
  const { loadTrack } = useAudioControls();

  const [localSearch, setLocalSearch] = useState(searchQuery);
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const pathname = usePathname();

  // Sync with URL ?q= if on /search page
  useEffect(() => {
    if (pathname === '/search' && typeof window !== 'undefined') {
      const q = new URLSearchParams(window.location.search).get('q') || '';
      if (q && q !== localSearch) {
        setLocalSearch(q);
      }
    }
  }, [pathname]);

  // Click outside listener to close dropdown
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const sendToSearchPage = (val: string) => {
    window.dispatchEvent(new CustomEvent(HEADER_SEARCH_EVENT, { detail: val }));
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setLocalSearch(val);
    setShowDropdown(val.trim().length > 0);

    if (onSearch) {
      onSearch(val);
    } else if (pathname === '/search') {
      sendToSearchPage(val);
    }
  };

  const executeSearch = (targetQuery?: string) => {
    const q = (targetQuery !== undefined ? targetQuery : localSearch).trim();
    setShowDropdown(false);
    inputRef.current?.blur();

    if (!q) {
      router.push('/search');
      return;
    }

    if (pathname === '/search') {
      sendToSearchPage(q);
      window.history.replaceState(null, '', `/search?q=${encodeURIComponent(q)}`);
    } else {
      router.push(`/search?q=${encodeURIComponent(q)}`);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      executeSearch();
    } else if (e.key === 'Escape') {
      setShowDropdown(false);
    }
  };

  const handleClear = () => {
    setLocalSearch('');
    setShowDropdown(false);
    if (onSearch) onSearch('');
    else if (pathname === '/search') sendToSearchPage('');
  };

  // Instant matching results
  const qClean = localSearch.toLowerCase().trim();

  const matchingTracks = useMemo(() => {
    if (!qClean) return [];
    return tracks.filter(t => {
      if (t.style?.toLowerCase() === 'fitness') return false;
      if (t.tags?.some(tag => tag.toLowerCase() === 'closed' || tag === 'დახურული')) return false;

      const title = t.title.toLowerCase();
      const artist = (t.artist || '').toLowerCase();
      const style = (t.style || '').toLowerCase();
      const album = (t.album || '').toLowerCase();

      return title.includes(qClean) || artist.includes(qClean) || style.includes(qClean) || album.includes(qClean);
    }).slice(0, 5);
  }, [tracks, qClean]);

  const matchingStyles = useMemo(() => {
    if (!qClean) return [];
    return styles.filter(s => {
      if (s.title.toLowerCase() === 'fitness') return false;
      return s.title.toLowerCase().includes(qClean);
    }).slice(0, 3);
  }, [styles, qClean]);

  const matchingAlbums = useMemo(() => {
    if (!qClean) return [];
    return albums.filter(a => {
      return a.title.toLowerCase().includes(qClean) || (a.artist && a.artist.toLowerCase().includes(qClean));
    }).slice(0, 3);
  }, [albums, qClean]);

  const hasAnyResults = matchingTracks.length > 0 || matchingStyles.length > 0 || matchingAlbums.length > 0;

  return (
    <header className="yt-header">
      {/* Left: Hamburger Button */}
      <div className="yt-header-left">
        <button
          type="button"
          className="yt-icon-btn yt-menu-btn"
          onClick={onToggleSidebar}
          aria-label="Toggle navigation"
        >
          <Menu size={22} />
        </button>
      </div>

      {/* Center: Search Bar with Dropdown */}
      <div
        ref={containerRef}
        className={`yt-header-center ${isSearchFocused ? 'focused' : ''}`}
      >
        <div className="yt-search-pill">
          <button
            type="button"
            className="yt-search-icon-btn"
            onClick={() => executeSearch()}
            aria-label="Execute search"
          >
            <Search size={18} className="yt-search-icon" />
          </button>

          <input
            ref={inputRef}
            type="text"
            placeholder="Search songs, albums, artists..."
            value={localSearch}
            onChange={handleSearchChange}
            onKeyDown={handleKeyDown}
            onFocus={() => {
              setIsSearchFocused(true);
              if (localSearch.trim().length > 0) setShowDropdown(true);
            }}
            onBlur={() => setIsSearchFocused(false)}
            className="yt-search-input"
          />

          {localSearch && (
            <button type="button" className="yt-search-clear" onClick={handleClear} aria-label="Clear search">
              <X size={16} />
            </button>
          )}
        </div>

        {/* Live Search Results Dropdown */}
        {showDropdown && qClean.length > 0 && (
          <div className="yt-search-dropdown animate-in">
            {/* Top Action: Search for exact query */}
            <button
              type="button"
              className="yt-dropdown-item"
              onClick={() => executeSearch()}
            >
              <div className="yt-dropdown-icon-thumb">
                <Search size={18} />
              </div>
              <div className="yt-dropdown-info">
                <div className="yt-dropdown-title">Search for &ldquo;{localSearch}&rdquo;</div>
                <div className="yt-dropdown-sub">Press Enter for all results</div>
              </div>
              <span className="yt-dropdown-kbd">↵ Enter</span>
            </button>

            {/* Songs Results */}
            {matchingTracks.length > 0 && (
              <>
                <div className="yt-dropdown-header">Songs</div>
                {matchingTracks.map(track => {
                  const cover = getTrackCover(track, albums, styles);
                  return (
                    <button
                      key={track.id}
                      type="button"
                      className="yt-dropdown-item"
                      onClick={() => {
                        loadTrack(track, false, true);
                        setShowDropdown(false);
                      }}
                    >
                      <img
                        src={cover}
                        alt={track.title}
                        className="yt-dropdown-thumb"
                      />
                      <div className="yt-dropdown-info">
                        <div className="yt-dropdown-title">{track.title}</div>
                        <div className="yt-dropdown-sub">
                          {track.artist || 'Unknown'} {track.style ? `• ${track.style}` : ''}
                        </div>
                      </div>
                      <Play size={18} className="yt-dropdown-play-icon" />
                    </button>
                  );
                })}
              </>
            )}

            {/* Dance Styles Results */}
            {matchingStyles.length > 0 && (
              <>
                <div className="yt-dropdown-header">Dance Styles</div>
                {matchingStyles.map(st => {
                  const slug = (st as any).slug || st.title.toLowerCase().replace(/[\s\-_]+/g, '-');
                  return (
                    <Link
                      key={st.id}
                      href={`/style/${slug}`}
                      className="yt-dropdown-item"
                      onClick={() => setShowDropdown(false)}
                    >
                      <div className="yt-dropdown-icon-thumb" style={{ color: st.color || '#3ea6ff' }}>
                        <Music2 size={18} />
                      </div>
                      <div className="yt-dropdown-info">
                        <div className="yt-dropdown-title">{st.title}</div>
                        <div className="yt-dropdown-sub">Dance Style Playlist</div>
                      </div>
                      <ArrowRight size={16} className="yt-dropdown-play-icon" />
                    </Link>
                  );
                })}
              </>
            )}

            {/* Albums Results */}
            {matchingAlbums.length > 0 && (
              <>
                <div className="yt-dropdown-header">Albums &amp; Artists</div>
                {matchingAlbums.map(alb => {
                  const slug = alb.slug || alb.id;
                  return (
                    <Link
                      key={alb.id}
                      href={`/album/${slug}`}
                      className="yt-dropdown-item"
                      onClick={() => setShowDropdown(false)}
                    >
                      {alb.coverUrl ? (
                        <img src={alb.coverUrl} alt={alb.title} className="yt-dropdown-thumb" />
                      ) : (
                        <div className="yt-dropdown-icon-thumb">
                          <Disc size={18} />
                        </div>
                      )}
                      <div className="yt-dropdown-info">
                        <div className="yt-dropdown-title">{alb.title}</div>
                        <div className="yt-dropdown-sub">
                          Album {alb.artist ? `• ${alb.artist}` : ''}
                        </div>
                      </div>
                      <ArrowRight size={16} className="yt-dropdown-play-icon" />
                    </Link>
                  );
                })}
              </>
            )}

            {/* Bottom Footer button */}
            <button
              type="button"
              className="yt-dropdown-footer-btn"
              onClick={() => executeSearch()}
            >
              <span>View full results page</span>
              <ArrowRight size={16} />
            </button>
          </div>
        )}
      </div>

      {/* Right: User Profile Badge */}
      <div className="yt-header-right">
        <div className="yt-user-area">
          <UserBadge />
        </div>
      </div>
    </header>
  );
}
