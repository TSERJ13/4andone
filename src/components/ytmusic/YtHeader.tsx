"use client";

import React, { useState } from 'react';
import Link from 'next/link';
import { Search, Menu, X } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { UserBadge } from '@/components/auth/UserBadge';

interface YtHeaderProps {
  onToggleSidebar?: () => void;
  onSearch?: (query: string) => void;
  searchQuery?: string;
}

export default function YtHeader({ onToggleSidebar, onSearch, searchQuery = '' }: YtHeaderProps) {
  const { user } = useAuth();
  const [localSearch, setLocalSearch] = useState(searchQuery);
  const [isSearchFocused, setIsSearchFocused] = useState(false);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setLocalSearch(val);
    if (onSearch) onSearch(val);
  };

  const handleClear = () => {
    setLocalSearch('');
    if (onSearch) onSearch('');
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
