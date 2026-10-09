"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { WifiOff, Download, Play, Shuffle, Music, Disc, User, ArrowLeft, RefreshCw, CheckCircle2 } from 'lucide-react';
import { useAudioControls } from '@/components/audio/AudioProvider';
import { useStudio } from '@/components/admin/StudioProvider';
import { getFullOfflineTracks, subscribeToOfflineUpdates } from '@/utils/offline';
import { TrackRow } from '@/components/tracks/TrackRow';
import { getTrackCover } from '@/utils/trackCover';

type OfflineTab = 'songs' | 'albums' | 'artists';

interface OfflineHubProps {
  standalone?: boolean;
}

export default function OfflineHub({ standalone = false }: OfflineHubProps) {
  const { isPlaying, title: playingTitle, trackId: playingTrackId, loadTrack, toggleShuffle } = useAudioControls();
  const { tracks: studioTracks, albums: studioAlbums, styles: studioStyles } = useStudio();
  
  const [activeTab, setActiveTab] = useState<OfflineTab>('songs');
  const [offlineTracks, setOfflineTracks] = useState<any[]>([]);
  const [selectedAlbum, setSelectedAlbum] = useState<string | null>(null);
  const [selectedArtist, setSelectedArtist] = useState<string | null>(null);
  const [selectedStyle, setSelectedStyle] = useState<string>('all');

  const refreshOfflineTracks = () => {
    const list = getFullOfflineTracks(studioTracks);
    setOfflineTracks(list);
  };

  useEffect(() => {
    refreshOfflineTracks();
    const unsubscribe = subscribeToOfflineUpdates(refreshOfflineTracks);
    return unsubscribe;
  }, [studioTracks]);

  // Available styles among offline tracks
  const availableStyles = useMemo(() => {
    const stylesSet = new Set<string>();
    offlineTracks.forEach(t => {
      if (t.style) stylesSet.add(t.style);
    });
    return Array.from(stylesSet);
  }, [offlineTracks]);

  // Filtered tracks for Songs tab
  const filteredTracks = useMemo(() => {
    if (selectedStyle === 'all') return offlineTracks;
    return offlineTracks.filter(t => t.style?.toLowerCase() === selectedStyle.toLowerCase());
  }, [offlineTracks, selectedStyle]);

  // Grouped by Album
  const albumGroups = useMemo(() => {
    const map = new Map<string, { name: string; artist: string; coverUrl?: string; tracks: any[] }>();
    
    offlineTracks.forEach(track => {
      const albumName = track.album || track.albumTitle || 'Unknown Album';
      if (!map.has(albumName)) {
        const matchingStudioAlbum = studioAlbums?.find(a => a.title.toLowerCase() === albumName.toLowerCase());
        const coverUrl = track.coverUrl || track.artworkUrl || matchingStudioAlbum?.coverUrl || getTrackCover(track, studioAlbums, studioStyles);
        map.set(albumName, {
          name: albumName,
          artist: track.artist || matchingStudioAlbum?.artist || 'Various Artists',
          coverUrl,
          tracks: [],
        });
      }
      map.get(albumName)!.tracks.push(track);
    });

    return Array.from(map.values());
  }, [offlineTracks, studioAlbums, studioStyles]);

  // Grouped by Artist
  const artistGroups = useMemo(() => {
    const map = new Map<string, { name: string; tracks: any[] }>();

    offlineTracks.forEach(track => {
      const artistName = track.artist || 'Unknown Artist';
      if (!map.has(artistName)) {
        map.set(artistName, { name: artistName, tracks: [] });
      }
      map.get(artistName)!.tracks.push(track);
    });

    return Array.from(map.values());
  }, [offlineTracks]);

  const handlePlayAll = () => {
    if (offlineTracks.length > 0) {
      loadTrack(offlineTracks[0]);
    }
  };

  const handleShuffleAll = () => {
    if (offlineTracks.length > 0) {
      const randomIndex = Math.floor(Math.random() * offlineTracks.length);
      toggleShuffle();
      loadTrack(offlineTracks[randomIndex]);
    }
  };

  const totalMinutes = Math.round(offlineTracks.reduce((sum, t) => sum + (Number(t.duration) || 0), 0) / 60);

  // Active view inside Albums or Artists tab
  const currentAlbumData = selectedAlbum ? albumGroups.find(a => a.name === selectedAlbum) : null;
  const currentArtistData = selectedArtist ? artistGroups.find(a => a.name === selectedArtist) : null;

  return (
    <div className={`offline-hub ${standalone ? 'is-standalone' : ''}`}>
      {/* Header Banner */}
      <div className="offline-hero">
        <div className="offline-hero-badge">
          <WifiOff size={14} className="text-amber-400" />
          <span>Offline Mode</span>
        </div>
        <h1 className="offline-hero-title">Downloaded Music</h1>
        <p className="offline-hero-sub">
          {offlineTracks.length} {offlineTracks.length === 1 ? 'track' : 'tracks'} stored on this device
          {totalMinutes > 0 && ` · ${totalMinutes} min`}
        </p>

        {offlineTracks.length > 0 && (
          <div className="offline-actions">
            <button type="button" className="btn-play-all" onClick={handlePlayAll}>
              <Play size={16} fill="currentColor" />
              <span>Play All</span>
            </button>
            <button type="button" className="btn-shuffle-all" onClick={handleShuffleAll}>
              <Shuffle size={16} />
              <span>Shuffle</span>
            </button>
          </div>
        )}
      </div>

      {/* Main Tab Bar: Songs | Albums | Artists */}
      <div className="offline-tabs-bar">
        <button
          type="button"
          className={`tab-btn ${activeTab === 'songs' ? 'active' : ''}`}
          onClick={() => {
            setActiveTab('songs');
            setSelectedAlbum(null);
            setSelectedArtist(null);
          }}
        >
          <Music size={16} />
          <span>Songs ({offlineTracks.length})</span>
        </button>

        <button
          type="button"
          className={`tab-btn ${activeTab === 'albums' ? 'active' : ''}`}
          onClick={() => {
            setActiveTab('albums');
            setSelectedAlbum(null);
            setSelectedArtist(null);
          }}
        >
          <Disc size={16} />
          <span>Albums ({albumGroups.length})</span>
        </button>

        <button
          type="button"
          className={`tab-btn ${activeTab === 'artists' ? 'active' : ''}`}
          onClick={() => {
            setActiveTab('artists');
            setSelectedAlbum(null);
            setSelectedArtist(null);
          }}
        >
          <User size={16} />
          <span>Artists ({artistGroups.length})</span>
        </button>
      </div>

      {/* Content Area */}
      <div className="offline-content">
        {/* Empty State */}
        {offlineTracks.length === 0 && (
          <div className="offline-empty">
            <div className="empty-circle">
              <Download size={40} className="text-emerald-400" />
            </div>
            <h3>No Downloaded Tracks</h3>
            <p>
              When online, tap the download icon on any track to save it to your device for offline playback.
            </p>
            <button
              type="button"
              className="btn-retry"
              onClick={() => window.location.reload()}
            >
              <RefreshCw size={14} />
              <span>Check Connection</span>
            </button>
          </div>
        )}

        {/* 1. SONGS TAB */}
        {activeTab === 'songs' && offlineTracks.length > 0 && (
          <div className="songs-tab-view">
            {/* Style Filters */}
            {availableStyles.length > 1 && (
              <div className="style-pills-row">
                <button
                  type="button"
                  className={`pill-btn ${selectedStyle === 'all' ? 'active' : ''}`}
                  onClick={() => setSelectedStyle('all')}
                >
                  All
                </button>
                {availableStyles.map(st => (
                  <button
                    key={st}
                    type="button"
                    className={`pill-btn ${selectedStyle.toLowerCase() === st.toLowerCase() ? 'active' : ''}`}
                    onClick={() => setSelectedStyle(st.toLowerCase())}
                  >
                    {st}
                  </button>
                ))}
              </div>
            )}

            <div className="tracks-list">
              {filteredTracks.map(track => {
                const isTrackActive = isPlaying && (playingTrackId ? playingTrackId === track.id : (playingTitle === track.title || playingTitle === track.id));

                return (
                  <TrackRow
                    key={track.id}
                    track={track}
                    isActive={isTrackActive}
                    onPlay={() => loadTrack(track)}
                    badge="style"
                    styleColor={studioStyles?.find(s => s.title.toLowerCase() === track.style?.toLowerCase())?.color}
                    isDownloaded={true}
                  />
                );
              })}
            </div>
          </div>
        )}

        {/* 2. ALBUMS TAB */}
        {activeTab === 'albums' && offlineTracks.length > 0 && (
          <div className="albums-tab-view">
            {selectedAlbum && currentAlbumData ? (
              /* Selected Album Details View */
              <div className="detail-view">
                <button
                  type="button"
                  className="back-btn"
                  onClick={() => setSelectedAlbum(null)}
                >
                  <ArrowLeft size={16} />
                  <span>All Albums</span>
                </button>

                <div className="detail-header">
                  <div className="detail-cover-box">
                    {currentAlbumData.coverUrl ? (
                      <img
                        src={currentAlbumData.coverUrl}
                        alt={currentAlbumData.name}
                        className="detail-cover-img"
                        onError={(e) => {
                          (e.target as HTMLElement).style.display = 'none';
                        }}
                      />
                    ) : (
                      <Disc size={40} className="text-emerald-400" />
                    )}
                  </div>
                  <div className="detail-info">
                    <span className="detail-tag">Album</span>
                    <h2 className="detail-title">{currentAlbumData.name}</h2>
                    <p className="detail-sub">{currentAlbumData.artist} · {currentAlbumData.tracks.length} tracks</p>
                    <button
                      type="button"
                      className="btn-play-all sm"
                      onClick={() => loadTrack(currentAlbumData.tracks[0])}
                    >
                      <Play size={14} fill="currentColor" />
                      <span>Play Album</span>
                    </button>
                  </div>
                </div>

                <div className="tracks-list">
                  {currentAlbumData.tracks.map(track => {
                    const isTrackActive = isPlaying && (playingTrackId ? playingTrackId === track.id : (playingTitle === track.title || playingTitle === track.id));
                    return (
                      <TrackRow
                        key={track.id}
                        track={track}
                        isActive={isTrackActive}
                        onPlay={() => loadTrack(track)}
                        badge="style"
                        styleColor={studioStyles?.find(s => s.title.toLowerCase() === track.style?.toLowerCase())?.color}
                        isDownloaded={true}
                      />
                    );
                  })}
                </div>
              </div>
            ) : (
              /* Albums Grid */
              <div className="cards-grid">
                {albumGroups.map(album => (
                  <div
                    key={album.name}
                    className="album-card"
                    onClick={() => setSelectedAlbum(album.name)}
                    role="button"
                    tabIndex={0}
                  >
                    <div className="album-card-cover">
                      {album.coverUrl ? (
                        <img
                          src={album.coverUrl}
                          alt={album.name}
                          className="album-card-img"
                          onError={(e) => {
                            (e.target as HTMLElement).style.display = 'none';
                          }}
                        />
                      ) : null}
                      <div className="album-card-fallback">
                        <Disc size={36} className="text-emerald-400 opacity-80" />
                      </div>
                      <button type="button" className="album-play-overlay">
                        <Play size={20} fill="currentColor" />
                      </button>
                    </div>
                    <div className="album-card-info">
                      <h3 className="album-card-title">{album.name}</h3>
                      <p className="album-card-sub">{album.artist} · {album.tracks.length} tracks</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* 3. ARTISTS TAB */}
        {activeTab === 'artists' && offlineTracks.length > 0 && (
          <div className="artists-tab-view">
            {selectedArtist && currentArtistData ? (
              /* Selected Artist Details View */
              <div className="detail-view">
                <button
                  type="button"
                  className="back-btn"
                  onClick={() => setSelectedArtist(null)}
                >
                  <ArrowLeft size={16} />
                  <span>All Artists</span>
                </button>

                <div className="detail-header">
                  <div className="detail-cover-box artist-avatar">
                    <User size={44} className="text-emerald-400" />
                  </div>
                  <div className="detail-info">
                    <span className="detail-tag">Artist</span>
                    <h2 className="detail-title">{currentArtistData.name}</h2>
                    <p className="detail-sub">{currentArtistData.tracks.length} downloaded tracks</p>
                    <button
                      type="button"
                      className="btn-play-all sm"
                      onClick={() => loadTrack(currentArtistData.tracks[0])}
                    >
                      <Play size={14} fill="currentColor" />
                      <span>Play All Songs</span>
                    </button>
                  </div>
                </div>

                <div className="tracks-list">
                  {currentArtistData.tracks.map(track => {
                    const isTrackActive = isPlaying && (playingTrackId ? playingTrackId === track.id : (playingTitle === track.title || playingTitle === track.id));
                    return (
                      <TrackRow
                        key={track.id}
                        track={track}
                        isActive={isTrackActive}
                        onPlay={() => loadTrack(track)}
                        badge="style"
                        styleColor={studioStyles?.find(s => s.title.toLowerCase() === track.style?.toLowerCase())?.color}
                        isDownloaded={true}
                      />
                    );
                  })}
                </div>
              </div>
            ) : (
              /* Artists List / Grid */
              <div className="artists-grid">
                {artistGroups.map(artist => (
                  <div
                    key={artist.name}
                    className="artist-card"
                    onClick={() => setSelectedArtist(artist.name)}
                    role="button"
                    tabIndex={0}
                  >
                    <div className="artist-avatar-circle">
                      <User size={28} className="text-emerald-400" />
                    </div>
                    <div className="artist-card-info">
                      <h3 className="artist-card-title">{artist.name}</h3>
                      <p className="artist-card-sub">{artist.tracks.length} downloaded tracks</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      <style jsx>{`
        .offline-hub {
          padding: 20px 20px 140px 20px;
          max-width: 1100px;
          margin: 0 auto;
          color: #ffffff;
        }
        .offline-hero {
          background: linear-gradient(135deg, #111827 0%, #030712 100%);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 20px;
          padding: 28px 24px;
          margin-bottom: 24px;
          box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5);
        }
        .offline-hero-badge {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          font-size: 11px;
          font-weight: 700;
          color: #f59e0b;
          background: rgba(245, 158, 11, 0.12);
          border: 1px solid rgba(245, 158, 11, 0.25);
          padding: 4px 10px;
          border-radius: 12px;
          margin-bottom: 12px;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
        .offline-hero-title {
          font-size: 28px;
          font-weight: 900;
          margin: 0 0 6px 0;
          letter-spacing: -0.5px;
        }
        .offline-hero-sub {
          font-size: 13px;
          color: #9ca3af;
          margin: 0 0 20px 0;
        }
        .offline-actions {
          display: flex;
          align-items: center;
          gap: 12px;
        }
        .btn-play-all {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          background: #22c55e;
          color: #ffffff;
          font-size: 14px;
          font-weight: 700;
          border: none;
          padding: 10px 22px;
          border-radius: 999px;
          cursor: pointer;
          transition: transform 0.15s, background 0.15s;
        }
        .btn-play-all:hover {
          background: #16a34a;
          transform: scale(1.02);
        }
        .btn-play-all.sm {
          padding: 8px 16px;
          font-size: 13px;
          margin-top: 10px;
        }
        .btn-shuffle-all {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          background: rgba(255, 255, 255, 0.08);
          color: #ffffff;
          font-size: 14px;
          font-weight: 600;
          border: 1px solid rgba(255, 255, 255, 0.15);
          padding: 10px 20px;
          border-radius: 999px;
          cursor: pointer;
          transition: background 0.15s;
        }
        .btn-shuffle-all:hover {
          background: rgba(255, 255, 255, 0.15);
        }

        /* Tabs */
        .offline-tabs-bar {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-bottom: 20px;
          border-bottom: 1px solid rgba(255, 255, 255, 0.1);
          padding-bottom: 12px;
        }
        .tab-btn {
          display: flex;
          align-items: center;
          gap: 8px;
          background: transparent;
          border: 1px solid transparent;
          color: #9ca3af;
          font-size: 14px;
          font-weight: 600;
          padding: 8px 16px;
          border-radius: 12px;
          cursor: pointer;
          transition: all 0.15s ease;
        }
        .tab-btn:hover {
          color: #ffffff;
          background: rgba(255, 255, 255, 0.05);
        }
        .tab-btn.active {
          color: #ffffff;
          background: rgba(34, 197, 94, 0.15);
          border-color: rgba(34, 197, 94, 0.3);
        }

        /* Filter Pills */
        .style-pills-row {
          display: flex;
          align-items: center;
          gap: 8px;
          overflow-x: auto;
          padding-bottom: 12px;
          margin-bottom: 16px;
        }
        .pill-btn {
          background: rgba(255, 255, 255, 0.06);
          border: 1px solid rgba(255, 255, 255, 0.1);
          color: #cbd5e1;
          font-size: 12px;
          font-weight: 600;
          padding: 6px 14px;
          border-radius: 999px;
          white-space: nowrap;
          cursor: pointer;
          transition: background 0.15s;
        }
        .pill-btn.active {
          background: #ffffff;
          color: #000000;
          border-color: #ffffff;
        }

        /* Empty State */
        .offline-empty {
          text-align: center;
          padding: 60px 20px;
          background: rgba(15, 23, 42, 0.4);
          border: 1px dashed rgba(255, 255, 255, 0.15);
          border-radius: 20px;
          display: flex;
          flex-direction: column;
          align-items: center;
        }
        .empty-circle {
          width: 72px;
          height: 72px;
          border-radius: 50%;
          background: rgba(34, 197, 94, 0.1);
          border: 1px solid rgba(34, 197, 94, 0.2);
          display: flex;
          align-items: center;
          justify-content: center;
          margin-bottom: 16px;
        }
        .offline-empty h3 {
          font-size: 20px;
          font-weight: 800;
          margin: 0 0 8px 0;
        }
        .offline-empty p {
          font-size: 13px;
          color: #9ca3af;
          max-width: 380px;
          line-height: 1.5;
          margin: 0 0 20px 0;
        }
        .btn-retry {
          display: flex;
          align-items: center;
          gap: 6px;
          background: rgba(255, 255, 255, 0.1);
          color: #ffffff;
          border: 1px solid rgba(255, 255, 255, 0.2);
          padding: 8px 16px;
          border-radius: 12px;
          font-size: 12px;
          font-weight: 600;
          cursor: pointer;
        }

        /* Grid layouts */
        .cards-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
          gap: 16px;
        }
        .album-card {
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 14px;
          padding: 12px;
          cursor: pointer;
          transition: transform 0.15s, background 0.15s;
        }
        .album-card:hover {
          background: rgba(255, 255, 255, 0.08);
          transform: translateY(-2px);
        }
        .album-card-cover {
          position: relative;
          width: 100%;
          aspect-ratio: 1;
          border-radius: 10px;
          overflow: hidden;
          background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%);
          margin-bottom: 10px;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .album-card-img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }
        .album-card-fallback {
          position: absolute;
          inset: 0;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .album-play-overlay {
          position: absolute;
          bottom: 8px;
          right: 8px;
          width: 36px;
          height: 36px;
          border-radius: 50%;
          background: #22c55e;
          color: #ffffff;
          border: none;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 4px 12px rgba(0,0,0,0.5);
          opacity: 0;
          transform: scale(0.8);
          transition: all 0.15s ease;
        }
        .album-card:hover .album-play-overlay {
          opacity: 1;
          transform: scale(1);
        }
        .album-card-title {
          font-size: 14px;
          font-weight: 700;
          margin: 0 0 4px 0;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .album-card-sub {
          font-size: 12px;
          color: #9ca3af;
          margin: 0;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        /* Artists Grid */
        .artists-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
          gap: 12px;
        }
        .artist-card {
          display: flex;
          align-items: center;
          gap: 14px;
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 14px;
          padding: 12px 16px;
          cursor: pointer;
          transition: background 0.15s;
        }
        .artist-card:hover {
          background: rgba(255, 255, 255, 0.08);
        }
        .artist-avatar-circle {
          width: 44px;
          height: 44px;
          border-radius: 50%;
          background: linear-gradient(135deg, rgba(34, 197, 94, 0.2) 0%, rgba(16, 185, 129, 0.05) 100%);
          border: 1px solid rgba(34, 197, 94, 0.3);
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }
        .artist-card-title {
          font-size: 14px;
          font-weight: 700;
          margin: 0 0 2px 0;
        }
        .artist-card-sub {
          font-size: 12px;
          color: #9ca3af;
          margin: 0;
        }

        /* Detail Views */
        .detail-view {
          display: flex;
          flex-direction: column;
          gap: 20px;
        }
        .back-btn {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          background: rgba(255, 255, 255, 0.06);
          border: 1px solid rgba(255, 255, 255, 0.12);
          color: #ffffff;
          font-size: 13px;
          font-weight: 600;
          padding: 6px 14px;
          border-radius: 10px;
          cursor: pointer;
          align-self: flex-start;
        }
        .detail-header {
          display: flex;
          align-items: flex-end;
          gap: 20px;
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid rgba(255, 255, 255, 0.08);
          padding: 20px;
          border-radius: 16px;
        }
        .detail-cover-box {
          width: 110px;
          height: 110px;
          border-radius: 12px;
          overflow: hidden;
          background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%);
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }
        .detail-cover-box.artist-avatar {
          border-radius: 50%;
          background: linear-gradient(135deg, rgba(34, 197, 94, 0.2) 0%, rgba(15, 23, 42, 0.8) 100%);
          border: 1px solid rgba(34, 197, 94, 0.3);
        }
        .detail-cover-img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }
        .detail-tag {
          font-size: 11px;
          font-weight: 800;
          text-transform: uppercase;
          color: #22c55e;
          letter-spacing: 1px;
        }
        .detail-title {
          font-size: 22px;
          font-weight: 800;
          margin: 4px 0;
        }
        .detail-sub {
          font-size: 13px;
          color: #9ca3af;
          margin: 0;
        }

        .tracks-list {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        @media (max-width: 640px) {
          .offline-hub {
            padding: 12px 12px 140px 12px;
          }
          .offline-hero-title {
            font-size: 22px;
          }
          .cards-grid {
            grid-template-columns: repeat(auto-fill, minmax(130px, 1fr));
            gap: 12px;
          }
          .detail-header {
            flex-direction: column;
            align-items: flex-start;
          }
          .detail-cover-box {
            width: 90px;
            height: 90px;
          }
        }
      `}</style>
    </div>
  );
}
