"use client";

import React from 'react';
import { useParams } from 'next/navigation';
import { Play, Clock, Music2, MoreHorizontal, Heart, Disc } from 'lucide-react';
import { useStudio } from '@/components/admin/StudioProvider';
import { useAudio } from '@/components/audio/AudioProvider';

const StylePage = () => {
  const { slug } = useParams();
  const { tracks } = useStudio();
  const { isPlaying, title: playingTitle, loadTrack } = useAudio();

  const styleName = (slug as string).charAt(0).toUpperCase() + (slug as string).slice(1).replace('-', ' ');

  // Filter real tracks by style
  const filteredTracks = tracks.filter(t => 
    t.style.toLowerCase().replace(/\s+/g, '-') === slug
  );

  return (
    <div className="style-page">
      {/* ... Header and Actions remain ... */}
      <header className="style-header">
        <div className="style-icon-large glass" style={{ background: 'var(--primary)', color: 'black' }}>
          <Music2 size={64} />
        </div>
        <div className="style-head-content">
          <span className="style-label">Style Category</span>
          <h1 className="style-title">{styleName}</h1>
          <p className="style-stats">
            <span className="text-primary">Studio Library</span> • {filteredTracks.length} Tracks
          </p>
        </div>
      </header>

      <div className="style-actions">
        <button className="play-btn-large" onClick={() => filteredTracks[0] && loadTrack(filteredTracks[0])}>
          {isPlaying && filteredTracks.some(t => t.title === playingTitle) ? <span className="pause-icon">||</span> : <Play fill="currentColor" size={24} />}
        </button>
        <button className="action-btn-circle glass"><Heart size={24} /></button>
        <button className="action-btn-circle glass"><MoreHorizontal size={24} /></button>
      </div>

      <div className="tracks-table">
        <div className="table-header text-secondary">
          <div className="col-num">#</div>
          <div className="col-title">Title</div>
          <div className="col-album">Album</div>
          <div className="col-bpm">BPM</div>
          <div className="col-duration"><Clock size={16} /></div>
        </div>

        <div className="table-body">
          {filteredTracks.length > 0 ? filteredTracks.map((track, i) => (
            <div 
              key={track.id} 
              className={`track-row ${isPlaying && playingTitle === track.title ? 'is-playing' : ''}`}
              onClick={() => loadTrack(track)}
            >
              <div className="col-num">{i + 1}</div>
              <div className="col-title">
                <div className="track-meta">
                  <span className="track-name">{track.title}</span>
                  <span className="track-artist text-secondary">{track.artist}</span>
                </div>
              </div>
              <div className="col-album text-secondary">{track.album || 'No Album'}</div>
              <div className="col-bpm text-secondary">{track.bpm || '-'}</div>
              <div className="col-duration text-secondary">{'1:45'}</div>
            </div>
          )) : (
            <div className="empty-style-state glass">
              <Disc size={48} className="text-secondary" />
              <p>No {styleName} tracks found in your library.</p>
            </div>
          )}
        </div>
      </div>

      <style jsx>{`
        .style-page {
          padding: 24px;
        }

        .style-header {
          display: flex;
          align-items: flex-end;
          gap: 24px;
          margin-bottom: 32px;
        }

        .style-icon-large {
          width: 232px;
          height: 232px;
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 16px 32px rgba(0,0,0,0.5);
        }

        .style-label {
          text-transform: uppercase;
          font-size: 12px;
          font-weight: 800;
          letter-spacing: 1px;
          margin-bottom: 8px;
          display: block;
        }

        .style-title {
          font-size: 6rem;
          font-weight: 900;
          margin: 0;
          letter-spacing: -2px;
          line-height: 1;
        }

        .style-stats {
          margin-top: 16px;
          font-size: 14px;
          font-weight: 600;
        }

        .style-actions {
          display: flex;
          align-items: center;
          gap: 24px;
          margin-bottom: 32px;
        }

        .play-btn-large {
          width: 56px;
          height: 56px;
          border-radius: 50%;
          background: var(--primary);
          color: black;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: transform 0.2s;
        }

        .play-btn-large:hover {
          transform: scale(1.05);
        }

        .pause-icon {
          font-weight: 900;
          font-size: 20px;
        }

        .action-btn-circle {
          width: 44px;
          height: 44px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          color: var(--text-secondary);
        }

        .action-btn-circle:hover {
          color: white;
          border-color: white;
        }

        .tracks-table {
          display: flex;
          flex-direction: column;
        }

        .table-header {
          display: grid;
          grid-template-columns: 48px 4fr 3fr 1fr 100px;
          padding: 8px 16px;
          border-bottom: 1px solid rgba(255,255,255,0.1);
          font-size: 12px;
          text-transform: uppercase;
          letter-spacing: 1px;
          font-weight: 600;
        }

        .track-row {
          display: grid;
          grid-template-columns: 48px 4fr 3fr 1fr 100px;
          padding: 12px 16px;
          border-radius: 8px;
          align-items: center;
          transition: background 0.2s;
          cursor: pointer;
        }

        .track-row:hover {
          background: rgba(255,255,255,0.08);
        }

        .track-meta {
          display: flex;
          flex-direction: column;
        }

        .track-name {
          font-weight: 600;
          font-size: 15px;
        }

        .track-artist {
          font-size: 13px;
        }

        @media (max-width: 768px) {
          .style-page { padding: 16px; padding-bottom: 120px; }
          .style-header { 
            flex-direction: column; 
            align-items: center; 
            text-align: center;
            gap: 16px;
            margin-bottom: 24px;
          }
          .style-icon-large { width: 160px; height: 160px; }
          .style-title { font-size: 2.5rem; letter-spacing: -1px; }
          .table-header { display: none; }
          .track-row { 
            grid-template-columns: 32px 1fr 60px; 
            padding: 10px; 
            gap: 12px;
          }
          .col-album, .col-bpm { display: none; }
          .col-duration { font-size: 12px; }
        }
      `}</style>
    </div>
  );
};

export default StylePage;
