"use client";

import React from 'react';
import { useParams } from 'next/navigation';
import { Play, Clock, Music2, MoreHorizontal, Heart, Disc, ListMusic } from 'lucide-react';
import { useStudio } from '@/components/admin/StudioProvider';
import { useAudio } from '@/components/audio/AudioProvider';

const PlaylistPage = () => {
  const { id } = useParams();
  const { tracks, folders } = useStudio();
  const { isPlaying, title: playingTitle, loadTrack } = useAudio();

  const folder = folders.find(f => f.id === id);
  const playlistTracks = tracks.filter(t => t.folderId === id);

  if (id !== 'favorites' && !folder) {
    return (
      <div className="playlist-page">
        <header className="page-header">
          <h1 className="title">Folder Not Found</h1>
        </header>
      </div>
    );
  }

  const playlist = {
    title: id === 'favorites' ? 'Liked Songs' : (folder?.name || 'Unknown Folder'),
    author: 'Studio Library',
    description: `A collection of ${playlistTracks.length} tracks from your studio.`,
    type: 'Playlist',
    tracks: playlistTracks
  };

  return (
    <div className="playlist-page">
      <header className="page-header">
        <div className="icon-large glass">
          <ListMusic size={64} fill="currentColor" />
        </div>
        <div className="head-content">
          <span className="label">{playlist.type}</span>
          <h1 className="title">{playlist.title}</h1>
          <p className="description text-secondary">{playlist.description}</p>
          <p className="stats">
            <span className="text-primary">{playlist.author}</span> • {playlist.tracks.length} Tracks
          </p>
        </div>
      </header>

      <div className="actions">
        <button 
          className="play-btn-large" 
          onClick={() => playlist.tracks[0] && loadTrack(playlist.tracks[0])}
        >
          {isPlaying && playlist.tracks.some(t => t.title === playingTitle) ? <span className="pause-icon">||</span> : <Play fill="currentColor" size={24} />}
        </button>
      </div>

      <div className="tracks-list">
        {playlist.tracks.map((track, i) => (
          <div 
            key={track.id} 
            className={`track-row ${isPlaying && playingTitle === track.title ? 'is-playing' : ''}`} 
            onClick={() => loadTrack(track)}
          >
            <div className="track-num">{i + 1}</div>
            <div className="track-info">
              <span className="track-name">{track.title}</span>
              <span className="track-artist text-secondary">{track.artist}</span>
            </div>
            <div className="track-duration text-secondary">{'1:45'}</div>
          </div>
        ))}
      </div>

      <style jsx>{`
        .playlist-page { padding: 24px; }
        .page-header { display: flex; align-items: flex-end; gap: 24px; margin-bottom: 32px; }
        .icon-large { 
          width: 232px; height: 232px; border-radius: 12px; 
          background: linear-gradient(135deg, #1db954, #191414);
          display: flex; align-items: center; justify-content: center;
          box-shadow: 0 16px 32px rgba(0,0,0,0.5);
          flex-shrink: 0;
        }
        .title { font-size: 6rem; font-weight: 900; margin: 0; line-height: 1; letter-spacing: -4px; }
        .play-btn-large { 
          width: 56px; height: 56px; border-radius: 50%; background: var(--primary); 
          color: black; display: flex; align-items: center; justify-content: center; 
          transition: transform 0.2s;
        }
        .play-btn-large:hover { transform: scale(1.05); }
        .tracks-list { display: flex; flex-direction: column; gap: 8px; }
        .track-row { 
          display: grid; grid-template-columns: 40px 1fr 100px; 
          padding: 12px 16px; border-radius: 8px; cursor: pointer;
          transition: background 0.2s;
        }
        .track-row:hover { background: rgba(255,255,255,0.08); }
        .track-row.is-playing .track-name { color: var(--primary); }
        .track-num { color: #b3b3b3; display: flex; align-items: center; font-size: 14px; }
        .track-info { display: flex; flex-direction: column; }
        .track-name { font-weight: 600; font-size: 15px; }
        .track-artist { font-size: 13px; }
        .track-duration { display: flex; align-items: center; justify-content: flex-end; font-size: 14px; }
        .text-secondary { color: var(--text-secondary); }
        .text-primary { color: var(--primary); }

        @media (max-width: 768px) {
          .playlist-page { padding: 16px; padding-bottom: 120px; }
          .page-header { 
            flex-direction: column; 
            align-items: center; 
            text-align: center;
            gap: 16px;
            margin-bottom: 24px;
          }
          .icon-large { width: 160px; height: 160px; }
          .icon-large :global(svg) { width: 48px; height: 48px; }
          .title { font-size: 2.5rem; letter-spacing: -1px; }
          .description { font-size: 0.9rem; line-height: 1.4; }
          .track-row { grid-template-columns: 32px 1fr 60px; padding: 10px; }
          .track-duration { font-size: 12px; }
        }
      `}</style>
    </div>
  );
};

export default PlaylistPage;
