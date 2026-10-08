"use client";

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Search, Menu, X } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { UserBadge } from '@/components/auth/UserBadge';

export const HEADER_SEARCH_EVENT = 'yt-header-search';

interface YtHeaderProps {
  onToggleSidebar?: () => void;
  onSearch?: (query: string) => void;
  searchQuery?: string;
}

export default function YtHeader({ onToggleSidebar, onSearch, searchQuery = '' }: YtHeaderProps) {
  const { user } = useAuth();
  const [localSearch, setLocalSearch] = useState(searchQuery);
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const router = useRouter();
  const pathname = usePathname();

  // Without an onSearch handler the header search drives the /search page:
  // live while on /search, Enter from any other page opens it.
  const sendToSearchPage = (val: string) => {
    window.dispatchEvent(new CustomEvent(HEADER_SEARCH_EVENT, { detail: val }));
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setLocalSearch(val);
    if (onSearch) onSearch(val);
    else if (pathname === '/search') sendToSearchPage(val);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key !== 'Enter' || onSearch) return;
    const q = localSearch.trim();
    if (pathname === '/search') sendToSearchPage(q);
    else router.push(q ? `/search?q=${encodeURIComponent(q)}` : '/search');
  };

  const handleClear = () => {
    setLocalSearch('');
    if (onSearch) onSearch('');
    else if (pathname === '/search') sendToSearchPage('');
  };

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

      {/* Center: Search Bar */}
      <div className={`yt-header-center ${isSearchFocused ? 'focused' : ''}`}>
        <div className="yt-search-pill">
          <Search size={18} className="yt-search-icon" />
          <input
            type="text"
            placeholder="Search songs, albums, artists..."
            value={localSearch}
            onChange={handleSearchChange}
            onKeyDown={handleKeyDown}
            onFocus={() => setIsSearchFocused(true)}
            onBlur={() => setIsSearchFocused(false)}
            className="yt-search-input"
          />
          {localSearch && (
            <button type="button" className="yt-search-clear" onClick={handleClear}>
              <X size={16} />
            </button>
          )}
        </div>
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
