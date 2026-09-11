"use client";

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import { Play, Disc, Flame, Music2, Heart, Zap, Activity, Settings } from 'lucide-react';
import { useAudio } from '@/components/audio/AudioProvider';
import { useStudio, Track } from '@/components/admin/StudioProvider';
import { useAuth } from '@/context/AuthContext';
import { formatDuration } from '@/utils/format';
import { getMPMFromBPM } from '@/utils/audio';
import { Marquee } from '@/components/layout/Marquee';
import ConfirmModal from '@/components/admin/ConfirmModal';

const LATIN_STYLES = ['Samba', 'Cha-Cha-Cha', 'Rumba', 'Paso Doble', 'Jive'];
const STANDARD_STYLES = ['Slow Waltz', 'Tango', 'Viennese Waltz', 'Slow Foxtrot', 'Quickstep'];

export default function GocAlbumPage() {
  const { loadTrack, isPlaying, title: playingTitle, setActiveMode, setSessionTracks } = useAudio();
  const { tracks, styles, toggleFavorite, isLoading } = useStudio();
  const { isAuthenticated, setIsAuthModalOpen } = useAuth();

  const [activeTab, setActiveTab] = useState<'Latin' | 'Standard'>('Latin');
  const [showPasoSettingsModal, setShowPasoSettingsModal] = useState(false);
  const [pasoTheme, setPasoTheme] = useState<'2-theme' | '3-theme'>(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('goc_paso_theme');
      if (stored === '3-theme') return '3-theme';
    }
    return '2-theme';
  });

  const handleSavePasoTheme = (theme: '2-theme' | '3-theme') => {
    setPasoTheme(theme);
    if (typeof window !== 'undefined') {
      localStorage.setItem('goc_paso_theme', theme);
    }
  };

  const [infoModal, setInfoModal] = useState({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {}
  });

  // Filter tracks belonging to GOC 2026 (via album field or GOC tags)
  const gocTracks = useMemo(() => {
    return tracks.filter(t => 
      t.album === 'GOC 2026' || 
      t.tags?.some(tag => tag.toUpperCase() === 'GOC 2026' || tag.toUpperCase() === 'GOC')
    );
  }, [tracks]);

  const latinGocTracks = useMemo(() => {
    return gocTracks.filter(t => LATIN_STYLES.some(s => s.toLowerCase() === t.style?.toLowerCase()));
  }, [gocTracks]);

  const standardGocTracks = useMemo(() => {
    return gocTracks.filter(t => STANDARD_STYLES.some(s => s.toLowerCase() === t.style?.toLowerCase()));
  }, [gocTracks]);

  const currentProgramTracks = activeTab === 'Latin' ? latinGocTracks : standardGocTracks;

  const handlePlaySingle = (track: Track) => {
    loadTrack(track);
  };

  const startGocFinalMode = (discipline: 'Latin' | 'Standard') => {
    const targetStyles = discipline === 'Latin' ? LATIN_STYLES : STANDARD_STYLES;
    const pool = discipline === 'Latin' ? latinGocTracks : standardGocTracks;

    const selectedTracks: Track[] = [];
    targetStyles.forEach(styleName => {
      const styleTracks = pool.filter(t => t.style?.toLowerCase() === styleName.toLowerCase());
      if (styleTracks.length > 0) {
        if (styleName.toLowerCase().includes('paso')) {
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
      setActiveMode(`GOC_${discipline}`);
      setSessionTracks(selectedTracks);
      loadTrack(selectedTracks[0], false, true);
    } else {
      alert(`No GOC 2026 tracks found for ${discipline}.\n\nPlease upload GOC tracks and set the album to "GOC 2026" or tag them with "GOC 2026".`);
    }
  };

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
        <header className="goc-hero glass">
          <div className="goc-cover-box">
            <img src="/goc2026.png" alt="GOC Latin Final 2026" className="goc-cover-img" />
          </div>
          <div className="goc-hero-info">
            <span className="goc-pill-badge">OFFICIAL COMPETITION ALBUM</span>
            <h1 className="goc-title">GOC FINAL 2026</h1>
            <p className="goc-subtitle">
              German Open Championships Official Final Music • Exclusive Isolated Collection
            </p>
            <div className="goc-stats-row">
              <span className="stat-pill">{gocTracks.length} Total Tracks</span>
              <span className="stat-pill latin-stat">{latinGocTracks.length} Latin</span>
              <span className="stat-pill std-stat">{standardGocTracks.length} Standard</span>
            </div>
          </div>
        </header>

        {/* Main Tabs: International Latin & Standard */}
        <div className="discipline-tabs-container">
          <button 
            className={`tab-btn latin ${activeTab === 'Latin' ? 'active' : ''}`}
            onClick={() => setActiveTab('Latin')}
          >
            <Zap size={20} />
            <span>International Latin</span>
            <span className="tab-count">{latinGocTracks.length}</span>
          </button>
          <button 
            className={`tab-btn standard ${activeTab === 'Standard' ? 'active' : ''}`}
            onClick={() => setActiveTab('Standard')}
          >
            <Activity size={20} />
            <span>International Standard</span>
            <span className="tab-count">{standardGocTracks.length}</span>
          </button>
        </div>

        {/* Final Mode Trigger Banner for Active Program */}
        <div className={`goc-final-banner glass ${activeTab.toLowerCase()}`}>
          <div className="final-banner-content">
            <Flame size={32} className="flame-icon" />
            <div>
              <h3>GOC {activeTab} Final Mode Practice</h3>
              <p>Run full continuous final sequence using GOC {activeTab} tracks only.</p>
            </div>
          </div>
          
          <div className="banner-actions-group">
            <button 
              className="start-final-btn"
              onClick={() => startGocFinalMode(activeTab)}
            >
              <Play size={20} fill="currentColor" />
              <span>Start GOC {activeTab} Final</span>
            </button>

            {activeTab === 'Latin' && (
              <button
                className="goc-settings-btn glass"
                onClick={() => setShowPasoSettingsModal(true)}
                title="Paso Doble Settings"
              >
                <Settings size={20} />
                <span className="paso-theme-label">
                  {pasoTheme === '3-theme' ? '3 Themes' : '2 Themes'}
                </span>
              </button>
            )}
          </div>
        </div>

        {/* Tracks by Dance Style */}
        <div className="styles-tracks-section">
          {(activeTab === 'Latin' ? LATIN_STYLES : STANDARD_STYLES).map(styleName => {
            const styleObj = styles.find(s => s.title.toLowerCase() === styleName.toLowerCase());
            const styleTracks = currentProgramTracks.filter(t => t.style?.toLowerCase() === styleName.toLowerCase());

            return (
              <div key={styleName} className="style-group-box glass">
                <div className="style-group-header">
                  <div className="style-header-left">
                    <span 
                      className="style-indicator-dot" 
                      style={{ backgroundColor: styleObj?.color || '#1db954' }}
                    />
                    <h2>{styleName}</h2>
                  </div>
                  <span className="style-track-count">{styleTracks.length} {styleTracks.length === 1 ? 'Track' : 'Tracks'}</span>
                </div>

                {styleTracks.length > 0 ? (
                  <div className="tracks-list">
                    {styleTracks.map((track, i) => {
                      const displayTitle = track.title || 'Untitled Track';
                      const displayArtist = track.artist || 'Unknown Artist';
                      const trackStyleName = track.style || styleName;
                      const matchedStyle = styles.find(s => s.title.toLowerCase() === trackStyleName?.toLowerCase());
                      const badgeColor = matchedStyle?.color || styleObj?.color || '#ff416c';

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
                            <Marquee
                              text={displayTitle}
                              className="track-name"
                              isActive={isPlaying && (playingTitle === track.title || playingTitle === track.id)}
                            />
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
                              {isPlaying && (playingTitle === track.title || playingTitle === track.id) ? (
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
                    <span>No {styleName} tracks uploaded to GOC 2026 yet.</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {showPasoSettingsModal && (
        <div className="modal-overlay" onClick={() => setShowPasoSettingsModal(false)}>
          <div className="modal-content paso-settings-modal glass" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <Settings size={36} style={{ color: '#ff416c', marginBottom: '8px' }} />
              <h2>Paso Doble Settings</h2>
              <p>Select how many themes Paso Doble should be in practice & finals</p>
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
              className="primary-btn done-btn"
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
          border-color: #ff416c;
          transform: translateY(-1px);
        }

        .paso-theme-label {
          font-size: 0.78rem;
          opacity: 0.9;
          color: #ff416c;
          font-weight: 800;
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
          border-color: rgba(255, 65, 108, 0.4);
        }

        .theme-opt-card.active {
          background: rgba(255, 65, 108, 0.15);
          border-color: #ff416c;
          box-shadow: 0 4px 15px rgba(255, 65, 108, 0.3);
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
          background: linear-gradient(90deg, #ff4b2b, #ff416c);
          color: white;
          border: none;
          cursor: pointer;
          margin-top: 12px;
          transition: transform 0.2s ease;
        }

        .done-btn:hover {
          transform: scale(1.02);
        }
        .goc-page-wrapper {
          padding-bottom: 140px;
        }

        .goc-container {
          max-width: 1200px;
          margin: 0 auto;
        }

        .nav-back-button {
          display: inline-flex !important;
          flex-direction: row !important;
          align-items: center !important;
          gap: 36px;
          padding: 8px 4px;
          margin-left: 16px;
          margin-top: -6px;
          margin-bottom: 42px;
          background: transparent !important;
          border: none !important;
          transition: all 0.25s ease;
          text-decoration: none;
          width: fit-content;
          white-space: nowrap;
          color: rgba(255, 255, 255, 0.8);
          cursor: pointer;
        }

        :global(.back-arrow-icon) {
          display: inline-block;
          vertical-align: middle;
          transition: transform 0.25s ease, color 0.25s ease;
          flex-shrink: 0;
        }

        .nav-label {
          font-size: 1.05rem;
          font-weight: 800;
          letter-spacing: 0.5px;
          color: rgba(255, 255, 255, 0.85);
          transition: color 0.25s ease;
          line-height: 1;
          display: inline-block;
          vertical-align: middle;
        }

        .nav-back-button:hover {
          transform: translateX(-4px);
        }

        .nav-back-button:hover :global(.back-arrow-icon) {
          color: #ff416c;
          transform: translateX(-3px);
        }

        .nav-back-button:hover .nav-label {
          color: white;
        }

        .goc-hero {
          padding: 32px;
          border-radius: 24px;
          display: flex;
          align-items: center;
          gap: 32px;
          margin-bottom: 32px;
          background: linear-gradient(135deg, rgba(255, 65, 108, 0.15) 0%, rgba(20, 20, 20, 0.8) 100%);
          border: 1px solid rgba(255, 65, 108, 0.2);
        }

        .goc-cover-box {
          width: 240px;
          height: 140px;
          border-radius: 16px;
          overflow: hidden;
          flex-shrink: 0;
          box-shadow: 0 10px 25px rgba(0, 0, 0, 0.6), 0 0 20px rgba(255, 65, 108, 0.3);
          border: 1px solid rgba(255, 255, 255, 0.15);
        }

        .goc-cover-img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          object-position: top center;
        }

        .goc-hero-info {
          flex: 1;
        }

        .goc-pill-badge {
          background: linear-gradient(90deg, #ff4b2b, #ff416c);
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
          background: linear-gradient(90deg, #ffffff, #ff416c);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
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

        .latin-stat { color: #f7971e; border-color: rgba(247, 151, 30, 0.3); }
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

        .tab-btn.active.latin {
          background: rgba(247, 151, 30, 0.15);
          border-color: #f7971e;
          color: #f7971e;
          box-shadow: 0 4px 20px rgba(247, 151, 30, 0.2);
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

        .goc-final-banner.latin {
          background: linear-gradient(135deg, rgba(247, 151, 30, 0.15) 0%, rgba(20, 20, 20, 0.4) 100%);
          border-color: rgba(247, 151, 30, 0.3);
        }

        .goc-final-banner.standard {
          background: linear-gradient(135deg, rgba(33, 147, 176, 0.15) 0%, rgba(20, 20, 20, 0.4) 100%);
          border-color: rgba(33, 147, 176, 0.3);
        }

        .final-banner-content {
          display: flex;
          align-items: center;
          gap: 16px;
        }

        .flame-icon {
          color: #ff416c;
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

        .start-final-btn {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 14px 28px;
          border-radius: 30px;
          font-weight: 800;
          font-size: 0.95rem;
          background: linear-gradient(90deg, #ff4b2b, #ff416c);
          color: white;
          border: none;
          cursor: pointer;
          box-shadow: 0 4px 20px rgba(255, 65, 108, 0.4);
          transition: transform 0.2s ease;
        }

        .start-final-btn:hover {
          transform: scale(1.04);
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

        .playing-bars {
          display: flex;
          align-items: flex-end;
          gap: 3px;
          width: 20px;
          height: 20px;
        }

        .playing-bars span {
          width: 3px;
          background: var(--primary);
          animation: dance 1s infinite ease-in-out;
        }

        .playing-bars span:nth-child(1) { height: 60%; animation-delay: -0.4s; }
        .playing-bars span:nth-child(2) { height: 100%; animation-delay: -0.2s; }
        .playing-bars span:nth-child(3) { height: 80%; animation-delay: 0s; }

        @keyframes dance {
          0%, 100% { transform: scaleY(0.5); }
          50% { transform: scaleY(1); }
        }

        @media (max-width: 768px) {
          .style-group-box {
            padding: 0 !important;
            background: transparent !important;
            border: none !important;
            margin-bottom: 24px;
          }

          .goc-hero {
            flex-direction: column;
            text-align: center;
            padding: 20px;
          }

          .goc-cover-box {
            width: 100%;
            height: 125px;
            border-radius: 14px;
            overflow: hidden;
          }

          .goc-cover-img {
            width: 100%;
            height: 100%;
            object-fit: cover;
            object-position: top center;
          }

          .goc-title {
            font-size: 1.8rem;
          }

          .goc-stats-row {
            justify-content: center;
          }

          .discipline-tabs-container {
            flex-direction: column;
          }

          .goc-final-banner {
            flex-direction: column;
            text-align: center;
            padding: 20px;
          }

          .final-banner-content {
            flex-direction: column;
          }

          .banner-actions-group {
            width: 100%;
            display: flex;
            align-items: center;
            gap: 10px;
            margin-top: 10px;
          }

          .start-final-btn {
            flex: 1;
            width: auto;
            justify-content: center;
            padding: 13px 16px;
            font-size: 0.88rem;
          }

          .goc-settings-btn {
            flex-shrink: 0;
            padding: 12px 14px;
            height: 46px;
            border-radius: 23px;
            justify-content: center;
            background: rgba(255, 255, 255, 0.08);
            border: 1px solid rgba(255, 65, 108, 0.4);
          }

          .paso-settings-modal {
            padding: 24px 18px;
            border-radius: 20px;
            margin: 12px;
          }

          .theme-options-grid {
            grid-template-columns: 1fr;
            gap: 10px;
          }

          .theme-opt-card {
            padding: 14px 16px;
            flex-direction: row;
            justify-content: space-between;
            align-items: center;
          }

          .theme-opt-card .opt-title {
            margin-bottom: 0;
          }
        }
      `}</style>
    </div>
  );
}
