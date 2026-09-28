"use client";

import React, { useState, useMemo, useEffect } from 'react';
import Link from 'next/link';
import { Play, Disc, Flame, Music2, Heart, Zap, Settings, Radio, CheckCircle2 } from 'lucide-react';
import { useAudio } from '@/components/audio/AudioProvider';
import { useStudio, Track } from '@/components/admin/StudioProvider';
import { useAuth } from '@/context/AuthContext';
import { useDownloadedTracks } from '@/hooks/useDownloadedTracks';
import { formatDuration } from '@/utils/format';
import { getMPMFromBPM, canonicalStyle } from '@/utils/audio';
import { Marquee } from '@/components/layout/Marquee';
import ConfirmModal from '@/components/admin/ConfirmModal';

const LATIN_STYLES = ['Samba', 'Cha-Cha-Cha', 'Rumba', 'Paso Doble', 'Jive'];

export default function GeorgieMusheevPage() {
  const { loadTrack, isPlaying, title: playingTitle, setActiveMode, setSessionTracks } = useAudio();
  const { tracks, styles, toggleFavorite, isLoading } = useStudio();
  const { isAuthenticated, setIsAuthModalOpen } = useAuth();
  const downloadedIds = useDownloadedTracks();

  const [showPasoSettingsModal, setShowPasoSettingsModal] = useState(false);
  const [pasoTheme, setPasoTheme] = useState<'2-theme' | '3-theme'>(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('musheev_paso_theme');
      if (stored === '3-theme') return '3-theme';
    }
    return '2-theme';
  });

  const handleSavePasoTheme = (theme: '2-theme' | '3-theme') => {
    setPasoTheme(theme);
    if (typeof window !== 'undefined') {
      localStorage.setItem('musheev_paso_theme', theme);
    }
  };

  const [infoModal, setInfoModal] = useState({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {}
  });

  // Filter tracks belonging to Georgie Musheev & 7 Winds
  const musheevTracks = useMemo(() => {
    return tracks.filter(t => {
      const albumLower = (t.album || '').toLowerCase();
      const artistLower = (t.artist || '').toLowerCase();
      const hasMusheevTag = t.tags?.some(tag => {
        const l = tag.toLowerCase();
        return l.includes('musheev') || l.includes('7 winds') || l.includes('seven winds');
      });

      return albumLower.includes('musheev') || 
             albumLower.includes('7 winds') || 
             artistLower.includes('musheev') || 
             artistLower.includes('7 winds') || 
             hasMusheevTag;
    });
  }, [tracks]);

  // Strictly Latin styles for Georgie Musheev & 7 Winds
  const latinTracks = useMemo(() => {
    return musheevTracks.filter(t => {
      const canon = canonicalStyle(t.style);
      return LATIN_STYLES.some(s => canonicalStyle(s) === canon);
    });
  }, [musheevTracks]);

  const handlePlaySingle = (track: Track) => {
    loadTrack(track);
  };

  const startFinalMode = () => {
    const selectedTracks: Track[] = [];
    LATIN_STYLES.forEach(styleName => {
      const styleTracks = latinTracks.filter(t => canonicalStyle(t.style) === canonicalStyle(styleName));
      if (styleTracks.length > 0) {
        if (canonicalStyle(styleName) === 'pasodoble') {
          const matchingThemeTrack = styleTracks.find(t => t.tags?.includes(`paso-${pasoTheme}`));
          selectedTracks.push(matchingThemeTrack || styleTracks[0]);
        } else {
          selectedTracks.push(styleTracks[Math.floor(Math.random() * styleTracks.length)]);
        }
      }
    });

    if (selectedTracks.length > 0) {
      setActiveMode('MUSHEEV_Latin');
      setSessionTracks(selectedTracks);
      loadTrack(selectedTracks[0], false, true);
    } else {
      alert(`No Georgie Musheev & 7 Winds tracks found.\n\nPlease upload Georgie Musheev & 7 Winds tracks in the admin panel with album "Georgie Musheev & 7 Winds".`);
    }
  };

  // Auto-start final mode if URL query parameter has ?final=true
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      if (params.get('final') === 'true' && latinTracks.length > 0) {
        startFinalMode();
      }
    }
  }, [latinTracks.length]);

  const checkAuthAndExecute = (action: () => void, actionName: string) => {
    if (!isAuthenticated) {
      setInfoModal({
        isOpen: true,
        title: 'Authentication Required',
        message: `Please log in with Telegram to ${actionName}.`,
        onConfirm: () => {
          setInfoModal(prev => ({ ...prev, isOpen: false }));
          setIsAuthModalOpen(true);
        }
      });
      return;
    }
    action();
  };

  return (
    <div className="page-wrapper goc-page-wrapper">
      <div className="goc-container">
        {/* Hero Album Cover Header */}
        <header className="goc-hero glass musheev-hero">
          <div className="goc-cover-box musheev-cover">
            <img src="/georgie-musheev.jpg" alt="Georgie Musheev & 7 Winds" className="goc-cover-img" />
          </div>
          <div className="goc-hero-info">
            <span className="goc-pill-badge musheev-badge">LIVE SOUNDS COLLECTION</span>
            <h1 className="goc-title musheev-title">Georgie Musheev &amp; 7 Winds</h1>
            <p className="goc-subtitle">
              The Seven Winds • Exclusive Live Latin Dance Music • Dedicated Latin Collection &amp; Final Mode
            </p>
            <div className="goc-stats-row">
              <span className="stat-pill latin-stat">{latinTracks.length} Latin Tracks</span>
              <span className="stat-pill">5 Dance Styles</span>
            </div>
          </div>
        </header>

        {/* Latin Final Mode Banner */}
        <div className="final-mode-banner glass">
          <div className="final-mode-content">
            <Flame size={32} className="flame-icon musheev-flame" />
            <div className="banner-text">
              <h3>Georgie Musheev &amp; 7 Winds Latin Final Mode</h3>
              <p>Run full continuous Latin final sequence (Samba, Cha-Cha-Cha, Rumba, Paso Doble, Jive) using live band tracks only.</p>
            </div>
          </div>
          <div className="banner-actions-group">
            <button 
              className="start-final-btn musheev-start-btn"
              onClick={startFinalMode}
            >
              <Zap size={18} />
              <span>Start Latin Final Mode</span>
            </button>

            <button
              type="button"
              className="goc-settings-btn"
              onClick={() => setShowPasoSettingsModal(true)}
              title="Paso Doble Settings"
            >
              <Settings size={20} />
              <span className="paso-theme-label musheev-paso-label">
                {pasoTheme === '3-theme' ? '3 Themes' : '2 Themes'}
              </span>
            </button>
          </div>
        </div>

        {/* Tracks by Dance Style (Latin Only) */}
        <div className="styles-tracks-section">
          {LATIN_STYLES.map(styleName => {
            const styleObj = styles.find(s => canonicalStyle(s.title) === canonicalStyle(styleName));
            const styleTracks = latinTracks.filter(t => canonicalStyle(t.style) === canonicalStyle(styleName));

            return (
              <div key={styleName} className="style-group-box glass">
                <div className="style-group-header">
                  <div className="style-header-left">
                    <span 
                      className="style-indicator-dot" 
                      style={{ backgroundColor: styleObj?.color || '#e11d48' }}
                    />
                    <h2>{styleName}</h2>
                  </div>
                  <span className="style-track-count">{styleTracks.length} {styleTracks.length === 1 ? 'Track' : 'Tracks'}</span>
                </div>

                {styleTracks.length > 0 ? (
                  <div className="tracks-list">
                    {styleTracks.map((track) => {
                      const displayTitle = track.title || 'Untitled Track';
                      const displayArtist = track.artist || 'Georgie Musheev & 7 Winds';
                      const trackStyleName = track.style || styleName;
                      const matchedStyle = styles.find(s => canonicalStyle(s.title) === canonicalStyle(trackStyleName));
                      const badgeColor = matchedStyle?.color || styleObj?.color || '#e11d48';

                      return (
                        <div
                          key={track.id}
                          className={`track-row ${isPlaying && (playingTitle === track.title || playingTitle === track.id) ? 'is-active' : ''}`}
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
                                  isActive={isPlaying && (playingTitle === track.title || playingTitle === track.id)}
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

                          <div className="track-action-col">
                            <button
                              className="track-action-btn"
                              title={track.isFavorite ? "Remove from Favorites" : "Add to Favorites"}
                              onClick={(e) => {
                                e.stopPropagation();
                                checkAuthAndExecute(() => toggleFavorite(track.id), 'add tracks to favorites');
                              }}
                            >
                              <Heart
                                size={18}
                                fill={track.isFavorite ? "#ff3366" : "none"}
                                color={track.isFavorite ? "#ff3366" : "currentColor"}
                              />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="empty-style-notice">
                    <Music2 size={24} />
                    <span>No {styleName} tracks uploaded to Georgie Musheev &amp; 7 Winds yet.</span>
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
              <Settings size={36} style={{ color: '#e11d48', marginBottom: '8px' }} />
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
                  onClick={() => handleSavePasoTheme('2-theme')}
                >
                  <span className="opt-title">2 Themes</span>
                  <span className="opt-desc">~1:45 (Standard)</span>
                </button>

                <button
                  type="button"
                  className={`theme-opt-card ${pasoTheme === '3-theme' ? 'active' : ''}`}
                  onClick={() => handleSavePasoTheme('3-theme')}
                >
                  <span className="opt-title">3 Themes</span>
                  <span className="opt-desc">~2:15 (Full Track)</span>
                </button>
              </div>
            </div>

            <button
              className="primary-btn done-btn musheev-done-btn"
              onClick={() => setShowPasoSettingsModal(false)}
            >
              Done
            </button>
          </div>
        </div>
      )}

      <ConfirmModal
        isOpen={infoModal.isOpen}
        onClose={() => setInfoModal(prev => ({ ...prev, isOpen: false }))}
        onConfirm={infoModal.onConfirm}
        title={infoModal.title}
        message={infoModal.message}
        confirmText="Connect Telegram"
        variant="primary"
      />

      <style jsx>{`
        .musheev-hero {
          background: linear-gradient(135deg, rgba(225, 29, 72, 0.22) 0%, rgba(20, 20, 20, 0.85) 100%) !important;
          border-color: rgba(225, 29, 72, 0.35) !important;
        }

        .musheev-cover {
          box-shadow: 0 10px 25px rgba(0, 0, 0, 0.6), 0 0 25px rgba(225, 29, 72, 0.35) !important;
        }

        .musheev-badge {
          background: linear-gradient(90deg, #e11d48, #be123c) !important;
          box-shadow: 0 4px 15px rgba(225, 29, 72, 0.4) !important;
        }

        .musheev-title {
          background: linear-gradient(90deg, #ffffff, #fb7185, #f43f5e) !important;
          -webkit-background-clip: text !important;
          -webkit-text-fill-color: transparent !important;
        }

        .musheev-flame {
          color: #e11d48 !important;
        }

        .musheev-start-btn {
          background: linear-gradient(90deg, #e11d48, #be123c) !important;
          box-shadow: 0 4px 20px rgba(225, 29, 72, 0.4) !important;
        }

        .musheev-paso-label {
          color: #e11d48 !important;
        }

        .musheev-done-btn {
          background: linear-gradient(90deg, #e11d48, #be123c) !important;
        }

        .banner-actions-group {
          display: flex;
          align-items: center;
          gap: 12px;
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
          border-color: #e11d48;
          transform: translateY(-1px);
        }

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
          max-width: 440px;
          padding: 30px;
          border-radius: 24px;
          background: rgba(18, 18, 18, 0.95);
          border: 1px solid rgba(255, 255, 255, 0.15);
          display: flex;
          flex-direction: column;
          gap: 24px;
        }

        .modal-header {
          text-align: center;
          display: flex;
          flex-direction: column;
          align-items: center;
        }

        .modal-header h2 {
          font-size: 1.4rem;
          font-weight: 800;
          margin-bottom: 6px;
        }

        .modal-header p {
          font-size: 0.85rem;
          color: var(--text-secondary);
        }

        .form-label {
          font-size: 0.85rem;
          font-weight: 600;
          color: var(--text-secondary);
          margin-bottom: 12px;
          display: block;
        }

        .theme-options-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 12px;
        }

        .theme-opt-card {
          padding: 16px;
          border-radius: 16px;
          background: rgba(255, 255, 255, 0.04);
          border: 1px solid rgba(255, 255, 255, 0.1);
          color: white;
          cursor: pointer;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 4px;
          transition: all 0.2s ease;
        }

        .theme-opt-card:hover {
          background: rgba(255, 255, 255, 0.08);
          border-color: rgba(255, 255, 255, 0.2);
        }

        .theme-opt-card.active {
          background: rgba(225, 29, 72, 0.15);
          border-color: #e11d48;
          box-shadow: 0 0 15px rgba(225, 29, 72, 0.3);
        }

        .opt-title {
          font-weight: 700;
          font-size: 1rem;
        }

        .opt-desc {
          font-size: 0.75rem;
          color: var(--text-secondary);
        }

        .done-btn {
          padding: 14px;
          border-radius: 16px;
          font-weight: 700;
          border: none;
          color: white;
          cursor: pointer;
        }

        .empty-style-notice {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 24px 20px;
          color: var(--text-secondary);
          font-size: 0.9rem;
          background: rgba(255, 255, 255, 0.02);
          border-radius: 12px;
          margin-top: 10px;
        }
      `}</style>
    </div>
  );
}
