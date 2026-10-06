"use client";

import React, { useState, useMemo, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Play, Disc, Flame, Music2, Heart, Zap, Activity, Settings, Radio, CheckCircle2, ChevronLeft } from 'lucide-react';
import { useAudioControls } from '@/components/audio/AudioProvider';
import { useStudio, Track } from '@/components/admin/StudioProvider';
import { useAuth } from '@/context/AuthContext';
import { useDownloadedTracks } from '@/hooks/useDownloadedTracks';
import { formatDuration } from '@/utils/format';
import { getMPMFromBPM, canonicalStyle } from '@/utils/audio';
import { Marquee } from '@/components/layout/Marquee';
import ConfirmModal from '@/components/admin/ConfirmModal';
import { Album } from '@/types/album';

const LATIN_STYLES = ['Samba', 'Cha-Cha-Cha', 'Rumba', 'Paso Doble', 'Jive'];
const STANDARD_STYLES = ['Slow Waltz', 'Tango', 'Viennese Waltz', 'Slow Foxtrot', 'Quickstep'];

export default function DynamicAlbumPage() {
  const params = useParams();
  const router = useRouter();
  const slug = (params?.slug as string) || '';

  const { loadTrack, isPlaying, title: playingTitle, trackId: playingTrackId, setActiveMode, setSessionTracks, isFinalMode, stop } = useAudioControls();
  const { albums, tracks, styles, toggleFavorite, isLoading } = useStudio();
  const { isAuthenticated, setIsAuthModalOpen } = useAuth();
  const downloadedIds = useDownloadedTracks();
  const [showAlbumStopConfirm, setShowAlbumStopConfirm] = useState(false);
  const [pendingTrack, setPendingTrack] = useState<Track | null>(null);

  // Find matching album from albums list
  const album = useMemo(() => {
    return albums.find(a => a.slug.toLowerCase() === slug.toLowerCase());
  }, [albums, slug]);

  const [activeTab, setActiveTab] = useState<'Latin' | 'Standard'>('Latin');
  const [showPasoSettingsModal, setShowPasoSettingsModal] = useState(false);
  const [pasoTheme, setPasoTheme] = useState<'2-theme' | '3-theme'>(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem(`album_${slug}_paso_theme`);
      if (stored === '3-theme') return '3-theme';
    }
    return '2-theme';
  });

  const handleSavePasoTheme = (theme: '2-theme' | '3-theme') => {
    setPasoTheme(theme);
    if (typeof window !== 'undefined') {
      localStorage.setItem(`album_${slug}_paso_theme`, theme);
    }
  };

  const [infoModal, setInfoModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    confirmText?: string;
    variant?: 'danger' | 'primary';
    showCancel?: boolean;
    onConfirm: () => void;
  }>({
    isOpen: false,
    title: '',
    message: '',
    confirmText: 'OK',
    variant: 'primary',
    showCancel: false,
    onConfirm: () => {}
  });

  // Filter tracks matching this album
  const albumTracks = useMemo(() => {
    if (!album) return [];
    const albumSlug = album.slug.toLowerCase();
    const albumTitle = album.title.toLowerCase();
    const albumArtist = (album.artist || '').toLowerCase();
    const albumTags = (album.tags || []).map(t => t.toLowerCase());

    return tracks.filter(t => {
      const tAlbum = (t.album || '').toLowerCase();
      const tArtist = (t.artist || '').toLowerCase();
      const hasTag = t.tags?.some(tag => {
        const l = tag.toLowerCase();
        return albumTags.includes(l) || l.includes(albumSlug) || albumTitle.includes(l);
      });

      return (
        tAlbum.includes(albumSlug) || 
        tAlbum.includes(albumTitle) || 
        tArtist.includes(albumTitle) || 
        (albumArtist && tArtist.includes(albumArtist)) ||
        hasTag
      );
    });
  }, [tracks, album]);

  const latinTracks = useMemo(() => {
    return albumTracks.filter(t => {
      const canon = canonicalStyle(t.style);
      return LATIN_STYLES.some(s => canonicalStyle(s) === canon);
    });
  }, [albumTracks]);

  const standardTracks = useMemo(() => {
    return albumTracks.filter(t => {
      const canon = canonicalStyle(t.style);
      return STANDARD_STYLES.some(s => canonicalStyle(s) === canon);
    });
  }, [albumTracks]);

  const isLatinOnly = album?.program === 'Latin';
  const isStandardOnly = album?.program === 'Standard';
  const isBoth = !isLatinOnly && !isStandardOnly;

  const currentProgramTracks = isLatinOnly ? latinTracks : isStandardOnly ? standardTracks : (activeTab === 'Latin' ? latinTracks : standardTracks);

  // Active styles to display
  const activeDisplayStyles = useMemo(() => {
    if (!album) return [];
    let baseStyles: string[] = [];
    if (isLatinOnly) {
      baseStyles = LATIN_STYLES;
    } else if (isStandardOnly) {
      baseStyles = STANDARD_STYLES;
    } else {
      baseStyles = activeTab === 'Latin' ? LATIN_STYLES : STANDARD_STYLES;
    }

    if (album.allowedStyles && album.allowedStyles.length > 0) {
      return baseStyles.filter(s => album.allowedStyles.includes(s));
    }
    return baseStyles;
  }, [album, isLatinOnly, isStandardOnly, activeTab]);

  const handlePlaySingle = (track: Track) => {
    if (isFinalMode) {
      setPendingTrack(track);
      setShowAlbumStopConfirm(true);
      return;
    }
    loadTrack(track);
  };

  const startFinalMode = (discipline: 'Latin' | 'Standard' = 'Latin') => {
    const targetStyles = discipline === 'Latin' ? LATIN_STYLES : STANDARD_STYLES;
    const pool = discipline === 'Latin' ? latinTracks : standardTracks;

    const selectedTracks: Track[] = [];
    targetStyles.forEach(styleName => {
      const styleTracks = pool.filter(t => canonicalStyle(t.style) === canonicalStyle(styleName));
      if (styleTracks.length > 0) {
        if (canonicalStyle(styleName) === 'pasodoble') {
          const matchingThemeTrack = styleTracks.find(t => t.tags?.includes(`paso-${pasoTheme}`));
          const chosenTrack = matchingThemeTrack || styleTracks[Math.floor(Math.random() * styleTracks.length)];
          selectedTracks.push(chosenTrack);
        } else {
          const randomTrack = styleTracks[Math.floor(Math.random() * styleTracks.length)];
          selectedTracks.push(randomTrack);
        }
      }
    });

    if (selectedTracks.length > 0) {
      setActiveMode(`ALBUM_${slug}_${discipline}`);
      setSessionTracks(selectedTracks);
      loadTrack(selectedTracks[0], false, true);
    } else {
      setInfoModal({
        isOpen: true,
        title: 'No Tracks Found',
        message: `No tracks found for ${album?.title || 'album'} ${discipline}.\n\nPlease upload tracks in the admin panel with album "${album?.title}".`,
        confirmText: 'OK',
        variant: 'primary',
        showCancel: false,
        onConfirm: () => setInfoModal(prev => ({ ...prev, isOpen: false }))
      });
    }
  };

  // Auto-start final mode if URL query parameter has ?final=true
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const p = new URLSearchParams(window.location.search);
      if (p.get('final') === 'true' && latinTracks.length > 0) {
        startFinalMode(isStandardOnly ? 'Standard' : 'Latin');
      }
    }
  }, [latinTracks.length, standardTracks.length]);

  const checkAuthAndExecute = (action: () => void, actionName: string) => {
    if (!isAuthenticated) {
      setInfoModal({
        isOpen: true,
        title: 'Authentication Required',
        message: `Please log in with Telegram to ${actionName}.`,
        confirmText: 'Connect Telegram',
        variant: 'primary',
        showCancel: true,
        onConfirm: () => {
          setInfoModal(prev => ({ ...prev, isOpen: false }));
          setIsAuthModalOpen(true);
        }
      });
      return;
    }
    action();
  };

  if (!album && !isLoading) {
    return (
      <div className="page-wrapper goc-page-wrapper">
        <div className="goc-container not-found-state glass">
          <Disc size={48} className="text-secondary" />
          <h2>Album Not Found</h2>
          <p>The album &quot;{slug}&quot; could not be found or has not been published yet.</p>
          <Link href="/" className="back-home-btn">
            <ChevronLeft size={18} />
            <span>Return to Homepage</span>
          </Link>
        </div>
      </div>
    );
  }

  const themePrimary = album?.themeColor || '#e11d48';
  const themeSecondary = album?.secondaryColor || '#be123c';
  const themeGradient = album?.gradient || `linear-gradient(90deg, ${themePrimary}, ${themeSecondary})`;

  return (
    <div className="page-wrapper goc-page-wrapper">
      <div className="goc-container">
        {/* Hero Album Cover Header */}
        <header 
          className="goc-hero glass album-hero"
          style={{
            background: `linear-gradient(135deg, ${themePrimary}25 0%, rgba(20, 20, 20, 0.85) 100%)`,
            borderColor: `${themePrimary}45`
          }}
        >
          <div 
            className="goc-cover-box album-cover"
            style={{
              boxShadow: `0 10px 25px rgba(0, 0, 0, 0.6), 0 0 25px ${themePrimary}40`,
              borderColor: `${themePrimary}45`
            }}
          >
            <img 
              src={album?.coverUrl || '/georgie-musheev.jpg'} 
              alt={album?.title || 'Album'} 
              className="goc-cover-img"
              onError={(e) => { (e.target as HTMLImageElement).src = '/georgie-musheev.jpg'; }}
            />
          </div>
          <div className="goc-hero-info">
            <span 
              className="goc-pill-badge"
              style={{
                background: themeGradient,
                boxShadow: `0 4px 15px ${themePrimary}40`
              }}
            >
              {album?.badge || 'LIVE SOUNDS COLLECTION'}
            </span>
            <h1 
              className="goc-title"
              style={{
                background: `linear-gradient(90deg, #ffffff, ${themePrimary})`,
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent'
              }}
            >
              {album?.title}
            </h1>
            <p className="goc-subtitle">
              {album?.subtitle || album?.description || `${album?.artist} • Dedicated Live Collection & Final Mode`}
            </p>
            <div className="goc-stats-row">
              <span className="stat-pill">{albumTracks.length} Total Tracks</span>
              {!isStandardOnly && <span className="stat-pill latin-stat" style={{ color: themePrimary, borderColor: `${themePrimary}40` }}>{latinTracks.length} Latin</span>}
              {!isLatinOnly && <span className="stat-pill std-stat">{standardTracks.length} Standard</span>}
            </div>
          </div>
        </header>

        {/* Both Discipline Tabs (Only shown if album program is 'Both') */}
        {isBoth && (
          <div className="discipline-tabs-container">
            <button 
              className={`tab-btn latin ${activeTab === 'Latin' ? 'active' : ''}`}
              style={activeTab === 'Latin' ? { borderColor: themePrimary, color: themePrimary, background: `${themePrimary}20` } : undefined}
              onClick={() => setActiveTab('Latin')}
            >
              <Zap size={20} />
              <span>International Latin</span>
              <span className="tab-count">{latinTracks.length}</span>
            </button>
            <button 
              className={`tab-btn standard ${activeTab === 'Standard' ? 'active' : ''}`}
              onClick={() => setActiveTab('Standard')}
            >
              <Activity size={20} />
              <span>International Standard</span>
              <span className="tab-count">{standardTracks.length}</span>
            </button>
          </div>
        )}

        {/* Final Mode Trigger Banner */}
        <div 
          className="goc-final-banner glass"
          style={{
            background: `linear-gradient(135deg, ${themePrimary}20 0%, rgba(20, 20, 20, 0.5) 100%)`,
            borderColor: `${themePrimary}40`
          }}
        >
          <div className="final-banner-content">
            <Flame size={32} style={{ color: themePrimary }} />
            <div>
              <h3>{album?.title} {isBoth ? activeTab : (isLatinOnly ? 'Latin' : 'Standard')} Final Mode</h3>
              <p>Run full continuous final sequence using {album?.title} live band tracks only.</p>
            </div>
          </div>
          
          <div className="banner-actions-group">
            <button 
              className="start-final-btn"
              style={{
                background: themeGradient,
                boxShadow: `0 4px 20px ${themePrimary}50`
              }}
              onClick={() => startFinalMode(isBoth ? activeTab : (isLatinOnly ? 'Latin' : 'Standard'))}
            >
              <Play size={20} fill="currentColor" />
              <span>Start {isBoth ? activeTab : (isLatinOnly ? 'Latin' : 'Standard')} Final</span>
            </button>

            {(!isStandardOnly || activeTab === 'Latin') && (
              <button
                className="goc-settings-btn glass"
                style={{ borderColor: `${themePrimary}40` }}
                onClick={() => setShowPasoSettingsModal(true)}
                title="Paso Doble Settings"
              >
                <Settings size={20} />
                <span className="paso-theme-label" style={{ color: themePrimary }}>
                  {pasoTheme === '3-theme' ? '3 Themes' : '2 Themes'}
                </span>
              </button>
            )}
          </div>
        </div>

        {/* Tracks by Dance Style */}
        <div className="styles-tracks-section">
          {activeDisplayStyles.map(styleName => {
            const styleObj = styles.find(s => canonicalStyle(s.title) === canonicalStyle(styleName));
            const styleTracks = currentProgramTracks.filter(t => canonicalStyle(t.style) === canonicalStyle(styleName));

            return (
              <div key={styleName} className="style-group-box glass">
                <div className="style-group-header">
                  <div className="style-header-left">
                    <span 
                      className="style-indicator-dot" 
                      style={{ backgroundColor: styleObj?.color || themePrimary }}
                    />
                    <h2>{styleName}</h2>
                  </div>
                  <span className="style-track-count">{styleTracks.length} {styleTracks.length === 1 ? 'Track' : 'Tracks'}</span>
                </div>

                {styleTracks.length > 0 ? (
                  <div className="tracks-list">
                    {styleTracks.map((track) => {
                      const displayTitle = track.title || 'Untitled Track';
                      const displayArtist = track.artist || album?.artist || 'Live Band';
                      const trackStyleName = track.style || styleName;
                      const matchedStyle = styles.find(s => canonicalStyle(s.title) === canonicalStyle(trackStyleName));
                      const badgeColor = matchedStyle?.color || styleObj?.color || themePrimary;
                      const isTrackActive = isPlaying && (playingTrackId ? playingTrackId === track.id : (playingTitle === track.title || playingTitle === track.id));

                      return (
                        <div
                          key={track.id}
                          className={`track-row ${isTrackActive ? 'is-active' : ''}`}
                          onClick={() => handlePlaySingle(track)}
                        >
                          <div className="track-icon-col">
                            <Disc size={18} />
                          </div>
                          <div className="track-info-col">
                            <div className="track-title-row">
                              <div className="track-title-marquee-wrapper">
                                <Marquee
                                  text={displayTitle}
                                  className="track-name"
                                  isActive={isTrackActive}
                                />
                              </div>
                              {downloadedIds.includes(track.id) && (
                                <span className="track-downloaded-badge" title="Stored on device (Offline)">
                                  <CheckCircle2 size={13} />
                                </span>
                              )}
                            </div>
                            <p className="track-artist">
                              {displayArtist}
                              {track.duration ? ` • ${formatDuration(track.duration)}` : ''}
                            </p>
                          </div>

                          <div className="track-badge-col">
                            {trackStyleName && (
                              <span 
                                className="style-badge-pill" 
                                style={{ backgroundColor: badgeColor }}
                              >
                                {trackStyleName.toUpperCase()}
                              </span>
                            )}
                          </div>

                          <div className="track-meta-col">
                            {track.style?.toLowerCase() === 'fitness'
                              ? (track.duration ? formatDuration(track.duration) : '')
                              : (track.bpm ? `${getMPMFromBPM(Number(track.bpm), track.style)} BPM` : formatDuration(track.duration))}
                          </div>

                          <div className="track-actions-col">
                            <button
                              className={`fav-action ${track.isFavorite ? 'active-heart' : ''}`}
                              onClick={(e) => {
                                e.stopPropagation();
                                checkAuthAndExecute(() => toggleFavorite?.(track.id), 'favorite tracks');
                              }}
                              title="Like Song"
                            >
                              <Heart size={16} fill={track.isFavorite ? "#ff4b2b" : "none"} color={track.isFavorite ? "#ff4b2b" : "currentColor"} />
                            </button>
                            <div className="play-action">
                              {isTrackActive ? (
                                <div className="playing-bars"><span></span><span></span><span></span></div>
                              ) : (
                                <Play size={18} fill="currentColor" />
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="empty-style-state">
                    <Music2 size={24} className="empty-icon" />
                    <span>No {styleName} tracks uploaded to {album?.title} yet.</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Paso Doble Theme Count Modal */}
      {showPasoSettingsModal && (
        <div className="modal-overlay" onClick={() => setShowPasoSettingsModal(false)}>
          <div className="modal-content paso-settings-modal glass" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <Settings size={36} style={{ color: themePrimary, marginBottom: '8px' }} />
              <h2>Paso Doble Settings</h2>
              <p>Select how many themes Paso Doble should be in practice &amp; finals</p>
            </div>

            <div className="modal-body">
              <label className="form-label">
                Paso Doble Theme Count (რამდენ თემიანი პასადობლი იყოს)
              </label>
              <div className="theme-options-grid">
                <button
                  type="button"
                  className={`theme-opt-card ${pasoTheme === '2-theme' ? 'active' : ''}`}
                  style={pasoTheme === '2-theme' ? { borderColor: themePrimary, background: `${themePrimary}20` } : undefined}
                  onClick={() => handleSavePasoTheme('2-theme')}
                >
                  <span className="opt-title">2 Themes</span>
                  <span className="opt-desc">~1:45 (Standard)</span>
                </button>

                <button
                  type="button"
                  className={`theme-opt-card ${pasoTheme === '3-theme' ? 'active' : ''}`}
                  style={pasoTheme === '3-theme' ? { borderColor: themePrimary, background: `${themePrimary}20` } : undefined}
                  onClick={() => handleSavePasoTheme('3-theme')}
                >
                  <span className="opt-title">3 Themes</span>
                  <span className="opt-desc">~2:15 (Full Track)</span>
                </button>
              </div>
            </div>

            <button
              className="primary-btn done-btn"
              style={{ background: themeGradient }}
              onClick={() => setShowPasoSettingsModal(false)}
            >
              Done
            </button>
          </div>
        </div>
      )}

      {showAlbumStopConfirm && (
        <ConfirmModal
          isOpen={showAlbumStopConfirm}
          onClose={() => {
            setShowAlbumStopConfirm(false);
            setPendingTrack(null);
          }}
          onConfirm={() => {
            stop();
            if (pendingTrack) {
              loadTrack(pendingTrack);
            }
            setShowAlbumStopConfirm(false);
            setPendingTrack(null);
          }}
          title="End Finals Practice?"
          message="Final Mode is currently running. Do you want to stop the practice session and play this track?"
          confirmText="Stop & Play"
          variant="danger"
        />
      )}

      <ConfirmModal
        isOpen={infoModal.isOpen}
        onClose={() => setInfoModal(prev => ({ ...prev, isOpen: false }))}
        onConfirm={infoModal.onConfirm}
        title={infoModal.title}
        message={infoModal.message}
        confirmText={infoModal.confirmText || "OK"}
        variant={infoModal.variant || "primary"}
        showCancel={infoModal.showCancel ?? false}
      />

      <style jsx>{`
        .goc-page-wrapper {
          padding-bottom: 140px;
        }

        .goc-container {
          max-width: 1200px;
          margin: 0 auto;
        }

        .not-found-state {
          padding: 60px 20px;
          border-radius: 20px;
          text-align: center;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 16px;
          margin-top: 40px;
        }

        .back-home-btn {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 10px 20px;
          border-radius: 20px;
          background: rgba(255, 255, 255, 0.1);
          color: white;
          text-decoration: none;
          font-weight: 700;
        }

        .goc-hero {
          padding: 32px;
          border-radius: 24px;
          display: flex;
          align-items: center;
          gap: 32px;
          margin-bottom: 32px;
          border: 1px solid rgba(255, 255, 255, 0.1);
        }

        .goc-cover-box {
          width: 240px;
          height: 140px;
          border-radius: 16px;
          overflow: hidden;
          flex-shrink: 0;
          border: 1px solid rgba(255, 255, 255, 0.15);
        }

        .goc-cover-img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          object-position: center;
        }

        .goc-hero-info {
          flex: 1;
        }

        .goc-pill-badge {
          color: white;
          padding: 4px 12px;
          border-radius: 20px;
          font-size: 10px;
          font-weight: 900;
          letter-spacing: 1px;
          margin-bottom: 12px;
          display: inline-block;
        }

        .goc-title {
          font-size: 2.4rem;
          font-weight: 900;
          letter-spacing: -1px;
          margin-bottom: 8px;
        }

        .goc-subtitle {
          font-size: 0.95rem;
          color: var(--text-secondary);
          margin-bottom: 16px;
        }

        .goc-stats-row {
          display: flex;
          gap: 10px;
        }

        .stat-pill {
          padding: 6px 14px;
          border-radius: 20px;
          background: rgba(255, 255, 255, 0.05);
          font-size: 0.8rem;
          font-weight: 700;
          border: 1px solid rgba(255, 255, 255, 0.08);
        }

        .std-stat { color: #2193b0; border-color: rgba(33, 147, 176, 0.3); }

        .discipline-tabs-container {
          display: flex;
          gap: 16px;
          margin-bottom: 24px;
        }

        .tab-btn {
          flex: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 12px;
          padding: 16px;
          border-radius: 16px;
          font-size: 1rem;
          font-weight: 800;
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid rgba(255, 255, 255, 0.08);
          color: var(--text-secondary);
          cursor: pointer;
          transition: all 0.25s ease;
        }

        .tab-btn:hover {
          background: rgba(255, 255, 255, 0.08);
          color: white;
        }

        .tab-btn.active.standard {
          background: rgba(33, 147, 176, 0.15);
          border-color: #2193b0;
          color: #2193b0;
          box-shadow: 0 4px 20px rgba(33, 147, 176, 0.2);
        }

        .tab-count {
          padding: 2px 8px;
          border-radius: 10px;
          background: rgba(255, 255, 255, 0.1);
          font-size: 0.8rem;
        }

        .goc-final-banner {
          padding: 24px 32px;
          border-radius: 20px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 32px;
          gap: 20px;
          border: 1px solid rgba(255, 255, 255, 0.1);
        }

        .final-banner-content {
          display: flex;
          align-items: center;
          gap: 16px;
        }

        .final-banner-content h3 {
          font-size: 1.2rem;
          font-weight: 800;
          margin-bottom: 2px;
        }

        .final-banner-content p {
          font-size: 0.85rem;
          color: var(--text-secondary);
        }

        .banner-actions-group {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .start-final-btn {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 14px 28px;
          border-radius: 30px;
          font-weight: 800;
          font-size: 0.95rem;
          color: white;
          border: none;
          cursor: pointer;
          transition: transform 0.2s ease;
        }

        .start-final-btn:hover {
          transform: scale(1.04);
        }

        .goc-settings-btn {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 12px 18px;
          border-radius: 30px;
          font-weight: 700;
          font-size: 0.85rem;
          color: white;
          background: rgba(255, 255, 255, 0.06);
          border: 1px solid rgba(255, 255, 255, 0.15);
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .goc-settings-btn:hover {
          background: rgba(255, 255, 255, 0.12);
          transform: translateY(-1px);
        }

        .styles-tracks-section {
          display: flex;
          flex-direction: column;
          gap: 24px;
        }

        .style-group-box {
          padding: 24px;
          border-radius: 20px;
          border: 1px solid rgba(255, 255, 255, 0.05);
          background: rgba(255, 255, 255, 0.02);
        }

        .style-group-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 16px;
          padding-bottom: 12px;
          border-bottom: 1px solid rgba(255, 255, 255, 0.05);
        }

        .style-header-left {
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .style-indicator-dot {
          width: 10px;
          height: 10px;
          border-radius: 50%;
        }

        .style-group-header h2 {
          font-size: 1.3rem;
          font-weight: 800;
        }

        .style-track-count {
          font-size: 0.85rem;
          color: var(--text-secondary);
        }

        .tracks-list {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .empty-style-state {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 20px;
          border-radius: 12px;
          background: rgba(255, 255, 255, 0.01);
          color: var(--text-secondary);
          font-size: 0.9rem;
        }

        /* MODAL */
        .modal-overlay {
          position: fixed;
          inset: 0;
          background: rgba(0,0,0,0.85);
          backdrop-filter: blur(16px);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 10000;
          padding: 20px;
        }

        .paso-settings-modal {
          width: 100%;
          max-width: 460px;
          padding: 32px;
          border-radius: 24px;
          background: #141414;
          border: 1px solid rgba(255, 255, 255, 0.1);
          text-align: center;
          box-shadow: 0 20px 60px rgba(0,0,0,0.8);
        }

        .paso-settings-modal .modal-header h2 {
          font-size: 1.4rem;
          font-weight: 800;
          margin-bottom: 4px;
        }

        .paso-settings-modal .modal-header p {
          font-size: 0.85rem;
          color: rgba(255, 255, 255, 0.6);
        }

        .modal-body {
          margin: 20px 0;
        }

        .form-label {
          display: block;
          font-size: 0.75rem;
          font-weight: 800;
          text-transform: uppercase;
          letter-spacing: 1px;
          color: rgba(255, 255, 255, 0.6);
          margin-bottom: 12px;
          text-align: left;
        }

        .theme-options-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 12px;
        }

        .theme-opt-card {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 16px 8px;
          border-radius: 16px;
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid rgba(255, 255, 255, 0.08);
          color: white;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .theme-opt-card:hover {
          background: rgba(255, 255, 255, 0.08);
        }

        .opt-title {
          font-size: 0.95rem;
          font-weight: 800;
          margin-bottom: 4px;
        }

        .opt-desc {
          font-size: 0.7rem;
          opacity: 0.6;
        }

        .done-btn {
          width: 100%;
          padding: 14px;
          border-radius: 30px;
          font-weight: 800;
          font-size: 1rem;
          color: white;
          border: none;
          cursor: pointer;
          margin-top: 12px;
          transition: transform 0.2s ease;
        }

        .done-btn:hover {
          transform: scale(1.02);
        }

        @media (max-width: 768px) {
          .discipline-tabs-container {
            flex-direction: column;
          }
          .goc-hero {
            flex-direction: column;
            text-align: center;
            padding: 24px;
          }
          .goc-cover-box {
            width: 100%;
            height: 160px;
          }
          .goc-title {
            font-size: 1.8rem;
          }
          .goc-final-banner {
            flex-direction: column;
            align-items: stretch;
            text-align: center;
          }
          .final-banner-content {
            flex-direction: column;
          }
          .banner-actions-group {
            flex-direction: column;
            width: 100%;
          }
          .start-final-btn, .goc-settings-btn {
            width: 100%;
            justify-content: center;
          }
        }
      `}</style>
    </div>
  );
}
