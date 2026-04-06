"use client";

import React, { useState } from 'react';
import { Search, Music2, Disc, Play } from 'lucide-react';
import { useStudio } from '@/components/admin/StudioProvider';
import { useAudio } from '@/components/audio/AudioProvider';
import Link from 'next/link';
import { getMPMFromBPM } from '@/utils/audio';

const SearchPage = () => {
  const [query, setQuery] = useState('');
  const { tracks } = useStudio();
  const { isPlaying, title: playingTitle, loadTrack } = useAudio();

  // Get unique styles from real tracks for browsing
  const uniqueStyles = Array.from(new Set(tracks.map(t => t.style))).filter(Boolean);

  // Filter tracks based on search query
  const searchResults = tracks.filter(track => 
    track.title.toLowerCase().includes(query.toLowerCase()) ||
    track.artist.toLowerCase().includes(query.toLowerCase()) ||
    track.style.toLowerCase().includes(query.toLowerCase())
  );

  return (
    <div className="search-page">
      <div className="search-header glass">
        <Search size={24} className="search-icon" />
        <input 
          type="text" 
          placeholder="Search for tracks, artists, or styles..." 
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="search-input"
        />
      </div>

      <div className="search-content">
        {!query ? (
          <div className="browse-all">
            <h2 className="section-title">Browse All</h2>
            <div className="genre-grid">
              {uniqueStyles.length > 0 ? uniqueStyles.map((style) => (
                <Link 
                  key={style} 
                  href={`/style/${style.toLowerCase().replace(/\s+/g, '-')}`}
                  className="genre-card glass"
                >
                  <h3>{style}</h3>
                  <div className="card-decoration">
                    <Music2 size={64} opacity={0.1} />
                  </div>
                </Link>
              )) : (
                <div className="empty-search-state glass">
                  <p>Add some music in the Admin Panel to see categories here!</p>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="search-results">
            <h2 className="section-title">Tracks</h2>
            <div className="results-container">
              {searchResults.length > 0 ? searchResults.map((track) => (
                <div 
                  key={track.id} 
                  className={`search-row glass ${isPlaying && playingTitle === track.title ? 'is-playing' : ''}`}
                  onClick={() => loadTrack(track)}
                >
                  <div className="track-info">
                    <p className="track-title">{track.title}</p>
                    <p className="track-artist text-secondary">
                      {track.artist} • {track.style}
                      {track.bpm && (
                        <span className="text-primary font-bold ml-2">• {getMPMFromBPM(Number(track.bpm), track.style)} Bars/Min</span>
                      )}
                    </p>
                  </div>
                  <div className="track-action">
                    <button className="play-btn-small glass">
                      {isPlaying && playingTitle === track.title ? 'PLAYING' : <Play size={16} fill="currentColor" />}
                    </button>
                  </div>
                </div>
              )) : (
                <p className="no-results text-secondary">No results found for "{query}"</p>
              )}
            </div>
          </div>
        )}
      </div>

      <style jsx>{`
        .search-page { padding: 24px; }
        .search-header {
          position: sticky; top: 0; z-index: 10;
          display: flex; align-items: center; gap: 16px;
          padding: 12px 24px; border-radius: 40px;
          width: 100%; max-width: 500px; margin-bottom: 40px;
          border-color: rgba(255,255,255,0.1);
        }
        .search-input {
          background: transparent; border: none; outline: none;
          color: white; font-size: 16px; width: 100%;
        }
        .genre-grid {
          display: grid; grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
          gap: 20px;
        }
        .genre-card {
          padding: 24px; border-radius: 12px; height: 180px;
          position: relative; overflow: hidden; cursor: pointer;
          transition: transform 0.2s;
        }
        .genre-card:hover { transform: translateY(-5px); }
        .genre-card h3 { font-size: 24px; font-weight: 800; letter-spacing: -1px; }
        .card-decoration { position: absolute; bottom: -10px; right: -10px; transform: rotate(-15deg); }
        .section-title { font-size: 24px; margin-bottom: 24px; }

        .search-results { display: flex; flex-direction: column; }
        .results-container { display: flex; flex-direction: column; gap: 8px; }
        .search-row {
          display: flex; align-items: center; justify-content: space-between;
          padding: 12px 20px; border-radius: 12px; cursor: pointer;
          transition: all 0.2s; border: 1px solid transparent;
        }
        .search-row:hover { background: rgba(255,255,255,0.05); border-color: rgba(255,255,255,0.1); }
        .search-row.is-playing { background: rgba(29, 185, 84, 0.05); border-color: rgba(29, 185, 84, 0.2); }
        
        .track-title { font-weight: 700; font-size: 15px; margin: 0; }
        .track-artist { font-size: 13px; margin: 2px 0 0; }
        
        .play-btn-small {
          width: 36px; height: 36px; border-radius: 50%;
          display: flex; align-items: center; justify-content: center;
          color: var(--primary); font-size: 10px; font-weight: 800;
        }
        
        .empty-search-state {
          padding: 60px; text-align: center; border-radius: 20px;
          color: var(--text-secondary);
        }
      `}</style>
    </div>
  );
};

export default SearchPage;
