"use client";

import React, { useState } from 'react';
import { Search, Music2, Disc, Play } from 'lucide-react';
import { useStudio } from '@/components/admin/StudioProvider';
import { useAudio } from '@/components/audio/AudioProvider';
import Link from 'next/link';
import { getMPMFromBPM } from '@/utils/audio';

const SearchPage = () => {
  const [query, setQuery] = useState('');
  const { tracks, styles } = useStudio();
  const { isPlaying, title: playingTitle, loadTrack } = useAudio();

  const stylesWithTracks = styles.filter(s => 
    tracks.some(t => t.style?.toLowerCase() === s.title.toLowerCase())
  );

  const searchResults = tracks.filter(track => 
    track.title.toLowerCase().includes(query.toLowerCase()) ||
    track.artist.toLowerCase().includes(query.toLowerCase()) ||
    (track.style && track.style.toLowerCase().includes(query.toLowerCase()))
  );

  const getStyleTrackCount = (styleName: string) => {
    return tracks.filter(t => t.style?.toLowerCase() === styleName.toLowerCase()).length;
  };

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
            <h2 className="section-title">Browse Styles</h2>
            <div className="genre-grid">
              {stylesWithTracks.length > 0 ? stylesWithTracks.map((style) => (
                <Link 
                  key={style.id} 
                  href={`/style/${style.title.toLowerCase().replace(/\s+/g, '-')}`}
                  className="genre-card"
                  style={{ 
                    backgroundColor: `${style.color}15`,
                    borderColor: `${style.color}30`,
                    color: style.color,
                    borderRadius: '12px'
                  }}
                >
                  <div className="genre-info">
                    <h3>{style.title}</h3>
                    <p className="track-count">{getStyleTrackCount(style.title)} Tracks</p>
                  </div>
                  <div className="card-decoration">
                    <Music2 size={80} opacity={0.15} color={style.color} />
                  </div>
                </Link>
              )) : (
                <div className="empty-search-state glass">
                  <Music2 size={48} opacity={0.2} />
                  <p>Add some music in the Admin Panel to see styles here!</p>
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
                    <div className="play-btn-small glass">
                      {isPlaying && playingTitle === track.title ? (
                         <div className="playing-bars"><span></span><span></span><span></span></div>
                      ) : <Play size={16} fill="currentColor" />}
                    </div>
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
        .search-page { padding: 40px; padding-bottom: 120px; }
        .search-header {
          position: sticky; top: 0; z-index: 100;
          display: flex; align-items: center; gap: 16px;
          padding: 16px 32px; border-radius: 50px;
          width: 100%; max-width: 600px; margin-bottom: 50px;
          background: rgba(255, 255, 255, 0.03);
          backdrop-filter: blur(24px);
          border: 1px solid rgba(255,255,255,0.12);
          box-shadow: 0 12px 40px rgba(0,0,0,0.3);
        }
        .search-icon { color: #71717a; }
        .search-input {
          background: transparent; border: none; outline: none;
          color: white; font-size: 18px; width: 100%; font-weight: 500;
        }
        .genre-grid {
          display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
          gap: 24px;
        }
        .genre-card {
          padding: 48px 24px; border-radius: 12px; min-height: 180px;
          position: relative; overflow: hidden; cursor: pointer;
          transition: all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
          border: 1px solid;
          display: flex;
          flex-direction: column;
          justify-content: center;
          align-items: center;
          text-align: center;
          text-decoration: none;
        }
        .genre-card:hover { 
          transform: translateY(-8px) scale(1.02);
          box-shadow: 0 16px 32px rgba(0,0,0,0.4);
          background-color: rgba(255, 255, 255, 0.1) !important;
        }
        .genre-info { position: relative; z-index: 2; width: 100%; display: flex; flex-direction: column; align-items: center; }
        .genre-card h3 { 
          font-size: 22px; font-weight: 900; letter-spacing: -0.5px; margin: 0; line-height: 1.2; 
          word-break: break-word; overflow-wrap: break-word; max-width: 100%; padding: 0 8px;
        }
        .track-count { font-size: 13px; font-weight: 700; opacity: 0.8; margin-top: 6px; }
        
        .card-decoration { 
          position: absolute; bottom: -10px; right: -10px; 
          transform: rotate(-15deg); 
          filter: blur(2px);
          pointer-events: none;
        }
        
        .section-title { font-size: 28px; font-weight: 900; margin-bottom: 32px; letter-spacing: -1px; }

        .search-results { display: flex; flex-direction: column; }
        .results-container { display: flex; flex-direction: column; gap: 12px; }
        .search-row {
          display: flex; align-items: center; justify-content: space-between;
          padding: 16px 30px; border-radius: 24px; cursor: pointer;
          transition: all 0.2s; border: 1px solid rgba(255,255,255,0.03);
          background: rgba(255,255,255,0.02);
        }
        .search-row:hover { background: rgba(255,255,255,0.08); border-color: rgba(255,255,255,0.1); }
        .search-row.is-playing { background: rgba(29, 185, 84, 0.05); border-color: rgba(29, 185, 84, 0.3); }
        
        .track-title { font-weight: 700; font-size: 16px; margin: 0; }
        .track-artist { font-size: 13px; margin: 4px 0 0; opacity: 0.6; }
        
        .play-btn-small {
          width: 44px; height: 44px; border-radius: 50%;
          display: flex; align-items: center; justify-content: center;
          color: #1db954; 
          background: rgba(255,255,255,0.05);
        }

        .playing-bars {
          display: flex; align-items: flex-end; gap: 2px;
          width: 14px; height: 14px;
        }
        .playing-bars span {
          width: 2px; background: #1db954;
          animation: dance 1s infinite ease-in-out;
        }
        .playing-bars span:nth-child(1) { height: 60%; animation-delay: -0.4s; }
        .playing-bars span:nth-child(2) { height: 100%; animation-delay: -0.2s; }
        .playing-bars span:nth-child(3) { height: 80%; animation-delay: 0s; }
        @keyframes dance {
          0%, 100% { transform: scaleY(0.5); }
          50% { transform: scaleY(1); }
        }

        .empty-search-state {
          grid-column: 1 / -1;
          padding: 80px; text-align: center; border-radius: 32px;
          color: #71717a; background: rgba(255, 255, 255, 0.02);
          display: flex; flex-direction: column; align-items: center; gap: 16px;
        }
        
        @media (max-width: 768px) {
          .search-page { padding: 20px; }
          .search-header { margin-bottom: 30px; padding: 12px 24px; border-radius: 40px; }
          .genre-grid { grid-template-columns: repeat(2, 1fr); gap: 12px; }
          .genre-card { padding: 32px 12px; border-radius: 12px; min-height: 140px; }
          .genre-card h3 { font-size: 16px; }
          .track-count { font-size: 11px; }
          .card-decoration { display: none; }
          .search-row { padding: 12px 20px; border-radius: 20px; }
          .track-title { font-size: 14px; }
        }
      `}</style>
    </div>
  );
};

export default SearchPage;
