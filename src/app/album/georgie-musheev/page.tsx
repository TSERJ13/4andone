"use client";

import React, { useState, useMemo } from 'react';
import { Play, Flame, Music2, Settings } from 'lucide-react';
import { useAudioControls } from '@/components/audio/AudioProvider';
import { useStudio, Track } from '@/components/admin/StudioProvider';
import { useAuth } from '@/context/AuthContext';
import { useDownloadedTracks } from '@/hooks/useDownloadedTracks';
import { canonicalStyle } from '@/utils/audio';
import ConfirmModal from '@/components/admin/ConfirmModal';
import { TrackRow } from '@/components/tracks/TrackRow';

const LATIN_STYLES = ['Samba', 'Cha-Cha-Cha', 'Rumba', 'Paso Doble', 'Jive'];

export default function GeorgieMusheevPage() {
  const { loadTrack, isPlaying, title: playingTitle, trackId: playingTrackId, setActiveMode, setSessionTracks, isFinalMode, stop } = useAudioControls();
  const { tracks, styles, toggleFavorite, isLoading } = useStudio();
  const { isAuthenticated, setIsAuthModalOpen } = useAuth();
  const downloadedIds = useDownloadedTracks();
  const [showAlbumStopConfirm, setShowAlbumStopConfirm] = useState(false);
  const [pendingTrack, setPendingTrack] = useState<Track | null>(null);

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

  // Filter tracks belonging to Georgie Musheev & 7 Winds
  const musheevTracks = useMemo(() => {
    return tracks.filter(t => {
      const albumLower = (t.album || '').toLowerCase();
      const artistLower = (t.artist || '').toLowerCase();
      const hasMusheevTag = t.tags?.some(tag => {
        const l = tag.toLowerCase();
        return l.includes('musheev') || l.includes('7 winds') || l.includes('seven winds');
      });

      return (
        albumLower.includes('musheev') || 
        albumLower.includes('7 winds') || 
        artistLower.includes('musheev') || 
        artistLower.includes('7 winds') || 
        hasMusheevTag
      );
    });
  }, [tracks]);

  const latinTracks = useMemo(() => {
    return musheevTracks.filter(t => {
      const canon = canonicalStyle(t.style);
      return LATIN_STYLES.some(s => canonicalStyle(s) === canon);
    });
  }, [musheevTracks]);

  const handlePlaySingle = (track: Track) => {
    if (isFinalMode) {
      setPendingTrack(track);
      setShowAlbumStopConfirm(true);
      return;
    }
    loadTrack(track);
  };

  const startFinalMode = () => {
    const selectedTracks: Track[] = [];
    LATIN_STYLES.forEach(styleName => {
      const styleTracks = latinTracks.filter(t => canonicalStyle(t.style) === canonicalStyle(styleName));
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
      setActiveMode('MUSHEEV_Latin');
      setSessionTracks(selectedTracks);
      loadTrack(selectedTracks[0], false, true);
    } else {
      setInfoModal({
        isOpen: true,
        title: 'No Tracks Found',
        message: 'No Georgie Musheev & 7 Winds tracks found.\n\nPlease upload tracks in the admin panel with album "Georgie Musheev & 7 Winds".',
        confirmText: 'OK',
        variant: 'primary',
        showCancel: false,
        onConfirm: () => setInfoModal(prev => ({ ...prev, isOpen: false }))
      });
    }
  };

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

        {/* Latin Final Mode Trigger Banner */}
        <div className="goc-final-banner glass latin">
          <div className="final-banner-content">
            <Flame size={32} className="flame-icon musheev-flame" />
            <div>
              <h3>Georgie Musheev &amp; 7 Winds Latin Final Mode</h3>
              <p>Run full continuous Latin final sequence (Samba, Cha-Cha-Cha, Rumba, Paso Doble, Jive) using live band tracks only.</p>
            </div>
          </div>
          
          <div className="banner-actions-group">
            <button 
              className="start-final-btn musheev-start-btn"
              onClick={startFinalMode}
            >
              <Play size={20} fill="currentColor" />
              <span>Start Latin Final</span>
            </button>

            <button
              className="goc-settings-btn glass"
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

                      const isTrackActive = isPlaying && (playingTrackId ? playingTrackId === track.id : (playingTitle === track.title || playingTitle === track.id));

                      return (
                        <TrackRow
                          key={track.id}
                          track={track.style ? track : { ...track, style: trackStyleName }}
                          isActive={isTrackActive}
                          onPlay={() => handlePlaySingle(track)}
                          onToggleFavorite={() => checkAuthAndExecute(() => toggleFavorite?.(track.id), 'favorite tracks')}
                          badge="style"
                          styleColor={badgeColor}
                          isDownloaded={downloadedIds.includes(track.id)}
                        />
                      );
                    })}
                  </div>
                ) : (
                  <div className="empty-style-state">
                    <Music2 size={24} className="empty-icon" />
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
        .musheev-hero {
          background: linear-gradient(135deg, rgba(225, 29, 72, 0.22) 0%, rgba(20, 20, 20, 0.85) 100%) !important;
          border-color: rgba(225, 29, 72, 0.35) !important;
        }

        .musheev-cover {
          box-shadow: 0 10px 25px rgba(0, 0, 0, 0.6), 0 0 25px rgba(225, 29, 72, 0.35) !important;
          border-color: rgba(225, 29, 72, 0.35) !important;
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
          border-color: rgba(225, 29, 72, 0.4);
        }

        .theme-opt-card.active {
          background: rgba(225, 29, 72, 0.15);
          border-color: #e11d48;
          box-shadow: 0 4px 15px rgba(225, 29, 72, 0.3);
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

        .goc-page-wrapper {
          padding-bottom: 140px;
        }

        .goc-container {
          max-width: 1200px;
          margin: 0 auto;
        }

        .goc-hero {
          padding: 32px;
          border-radius: 24px;
          display: flex;
          align-items: center;
          gap: 32px;
          margin-bottom: 32px;
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

        .latin-stat { color: #f43f5e; border-color: rgba(244, 63, 94, 0.3); }
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
          background: rgba(225, 29, 72, 0.15);
          border-color: #e11d48;
          color: #fb7185;
          box-shadow: 0 4px 20px rgba(225, 29, 72, 0.2);
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
          background: linear-gradient(135deg, rgba(225, 29, 72, 0.18) 0%, rgba(20, 20, 20, 0.5) 100%);
          border-color: rgba(225, 29, 72, 0.35);
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
          color: white;
          border: none;
          cursor: pointer;
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
