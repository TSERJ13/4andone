"use client";

import React from 'react';
import Link from 'next/link';
import { Play, Mic2, Timer, Flame, Music2, Disc, Heart } from 'lucide-react';
import { useAudio } from '@/components/audio/AudioProvider';
import { useStudio } from '@/components/admin/StudioProvider';
import { useAuth } from '@/context/AuthContext';
import { formatDuration } from '@/utils/format';
import { getMPMFromBPM } from '@/utils/audio';
import ConfirmModal from '@/components/admin/ConfirmModal';
import { useState } from 'react';
import { UserBadge } from '@/components/auth/UserBadge';
import { useRouter } from 'next/navigation';
import { Marquee } from '@/components/layout/Marquee';

export default function Home() {
  const {
    togglePlay,
    isPlaying,
    title: playingTitle,
    loadTrack
  } = useAudio();
  const {
    tracks,
    styles,
    finalTracks,
    addToFinal,
    removeFromFinal,
    isLoading,
    toggleFavorite
  } = useStudio();
  const { isAuthenticated, setIsAuthModalOpen } = useAuth();
  const router = useRouter();

  const [infoModal, setInfoModal] = useState({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => { }
  });

  const [visibleTrackCount, setVisibleTrackCount] = useState(25);

  const newArrivals = React.useMemo(() => {
    return tracks.filter(t =>
      t.style?.toLowerCase() !== 'fitness' &&
      !t.tags?.some(tag => tag.toLowerCase() === 'closed' || tag === 'დახურული') &&
      t.album !== 'GOC 2026' &&
      !t.tags?.some(tag => tag.toUpperCase() === 'GOC 2026' || tag.toUpperCase() === 'GOC')
    );
  }, [tracks]);

  const checkAuthAndExecute = (action: () => void, actionName: string) => {
    if (!isAuthenticated) {
      setInfoModal({
        isOpen: true,
        title: 'Authentication Required',
        message: `Please log in with Telegram to ${actionName} and sync your dance library across all your devices.`,
        onConfirm: () => {
          setInfoModal(prev => ({ ...prev, isOpen: false }));
          setIsAuthModalOpen(true);
        }
      });
      return;
    }
    action();
  };

  const handlePlay = (track: any) => {
    loadTrack(track);
  };

  const SkeletonCard = ({ color }: { color: string }) => (
    <div className="style-card skeleton glass" style={{
      height: '56px',
      padding: '6px 10px',
      position: 'relative',
      backgroundColor: `${color}10`,
      border: '1px solid rgba(255, 255, 255, 0.03)',
      borderRadius: '10px'
    }}>
      <div className="card-inner-box" style={{ display: 'grid', gridTemplateColumns: '36px 1fr', alignItems: 'center', height: '100%', gap: '10px' }}>
        <div className="style-icon skeleton-shimmer" style={{
          width: '36px',
          height: '36px',
          borderRadius: '8px',
          backgroundColor: 'rgba(255, 255, 255, 0.05)'
        }}></div>
        <div className="style-info" style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', width: '100%' }}>
          <div className="skeleton-line skeleton-shimmer" style={{ height: '10px', width: '50px', marginBottom: '3px', borderRadius: '3px' }}></div>
          <div className="skeleton-line skeleton-shimmer" style={{ height: '6px', width: '25px', borderRadius: '2px', opacity: 0.3 }}></div>
        </div>
      </div>
    </div>
  );

  const SkeletonRow = () => (
    <div className="track-row skeleton" style={{ pointerEvents: 'none' }}>
      <div className="track-index skeleton-shimmer" style={{ width: '12px', height: '14px', margin: '0 auto', opacity: 0.1 }}></div>
      <div className="track-icon-col">
        <div className="skeleton-shimmer" style={{ width: '20px', height: '20px', borderRadius: '4px', opacity: 0.2 }}></div>
      </div>
      <div className="track-info-col">
        <div className="skeleton-line full skeleton-shimmer" style={{ height: '14px', width: '120px', marginBottom: '4px' }}></div>
        <div className="skeleton-line half skeleton-shimmer" style={{ height: '10px', width: '80px' }}></div>
      </div>
      <div className="track-meta-col skeleton-shimmer" style={{ width: '60px', height: '12px', opacity: 0.2, marginLeft: 'auto' }}></div>
      <div className="track-actions-col">
        <div className="skeleton-shimmer" style={{ width: '18px', height: '18px', borderRadius: '4px', opacity: 0.2 }}></div>
        <div className="skeleton-shimmer-circle" style={{ width: '20px', height: '20px', opacity: 0.2 }}></div>
      </div>
    </div>
  );

  return (
    <div className="page-wrapper">
      <div className="home-container">
        {/* GOC 2026 Featured Album Banner */}
        <header className="hero-section goc-hero-section glass">
          <div className="hero-top-right">
            <UserBadge />
          </div>
          <div className="hero-content-wrapper">
            <div className="hero-content">
              <span className="goc-badge">SPECIAL COLLECTION</span>
              <h1 className="hero-title text-gradient">GOC FINAL 2026<br />MUSIC</h1>
              <p className="hero-desc">
                Exclusive German Open Championship finals music. Isolated collection with dedicated Latin & Standard Final Mode practice.
              </p>
              <div className="hero-actions desktop-actions">
                <button className="btn-primary goc-btn" onClick={() => router.push('/album/goc-2026')}>
                  Open GOC Album
                </button>
                <button className="btn-outline glass" onClick={() => router.push('/album/goc-2026')}>
                  Final Mode
                </button>
              </div>
            </div>
            <div className="goc-hero-card-preview" onClick={() => router.push('/album/goc-2026')}>
              <img src="/goc2026.png" alt="GOC 2026 Latin Final Music" className="goc-hero-img" />
            </div>
          </div>
          <div className="hero-actions mobile-actions">
            <button className="btn-primary goc-btn" onClick={() => router.push('/album/goc-2026')}>
              Open GOC Album
            </button>
            <button className="btn-outline glass" onClick={() => router.push('/album/goc-2026')}>
              Final Mode
            </button>
          </div>
        </header>

        <section className="section">
          <div className="section-header-flex">
            <div className="section-title-group">
              <span className="program-badge latin">International Latin</span>
            </div>
          </div>
          <div className="styles-grid">
            {isLoading ? (
              Array(5).fill(0).map((_, i) => <SkeletonCard key={i} color="#f7971e" />)
            ) : (
              styles.filter(s => s.program === 'Latin' && s.title.toLowerCase() !== 'fitness').map((style) => {
                const count = tracks.filter(t =>
                  t.style?.toLowerCase() === style.title.toLowerCase() &&
                  !t.tags?.some(tag => tag.toLowerCase() === 'closed' || tag === 'დახურული') &&
                  t.style?.toLowerCase() !== 'fitness' &&
                  t.album !== 'GOC 2026' &&
                  !t.tags?.some(tag => tag.toUpperCase() === 'GOC 2026' || tag.toUpperCase() === 'GOC')
                ).length;
                return (
                  <Link
                    key={style.id}
                    href={`/style/${style.title.toLowerCase().replace(/\s+/g, '-')}`}
                    className="style-card glass"
                    style={{ backgroundColor: `${style.color}15`, borderRadius: '16px' }}
                  >
                    <div className="card-inner-box">
                      <div className="style-icon">
                        <Music2 size={24} color={style.color} />
                      </div>
                      <div className="style-info">
                        <h3>{style.title}</h3>
                        <p>{count} {count === 1 ? 'Track' : 'Tracks'}</p>
                      </div>
                    </div>
                    <button className="play-button-small">
                      <Play size={16} fill="currentColor" />
                    </button>
                  </Link>
                );
              })
            )}
          </div>
        </section>

        <section className="section" style={{ marginTop: '40px' }}>
          <div className="section-header-flex">
            <div className="section-title-group">
              <span className="program-badge standard">International Standard</span>
            </div>
          </div>
          <div className="styles-grid">
            {isLoading ? (
              Array(5).fill(0).map((_, i) => <SkeletonCard key={i} color="#2193b0" />)
            ) : (
              styles.filter(s => s.program === 'Standard' && s.title.toLowerCase() !== 'fitness').map((style) => {
                const count = tracks.filter(t =>
                  t.style?.toLowerCase() === style.title.toLowerCase() &&
                  !t.tags?.some(tag => tag.toLowerCase() === 'closed' || tag === 'დახურული') &&
                  t.style?.toLowerCase() !== 'fitness' &&
                  t.album !== 'GOC 2026' &&
                  !t.tags?.some(tag => tag.toUpperCase() === 'GOC 2026' || tag.toUpperCase() === 'GOC')
                ).length;
                return (
                  <Link
                    key={style.id}
                    href={`/style/${style.title.toLowerCase().replace(/\s+/g, '-')}`}
                    className="style-card glass"
                    style={{ backgroundColor: `${style.color}15`, borderRadius: '16px' }}
                  >
                    <div className="card-inner-box">
                      <div className="style-icon">
                        <Music2 size={24} color={style.color} />
                      </div>
                      <div className="style-info">
                        <h3>{style.title}</h3>
                        <p>{count} {count === 1 ? 'Track' : 'Tracks'}</p>
                      </div>
                    </div>
                    <button className="play-button-small">
                      <Play size={16} fill="currentColor" />
                    </button>
                  </Link>
                );
              })
            )}
          </div>
        </section>

        <section className="section">
          <h2 className="section-title">New Arrivals</h2>
          <div className="tracks-list">
            {isLoading ? (
              Array(5).fill(0).map((_, i) => <SkeletonRow key={i} />)
            ) : newArrivals.length > 0 ? (
              <>
                {newArrivals.slice(0, visibleTrackCount).map((track, i) => (
                  <div
                    key={track.id}
                    className={`track-row ${isPlaying && (playingTitle === track.title || playingTitle === track.id) ? 'is-active' : ''}`}
                    onClick={() => handlePlay(track)}
                  >
                    <div className="track-index">{i + 1}</div>
                    <div className="track-icon-col">
                      <Disc size={18} />
                    </div>
                    <div className="track-info-col">
                      <Marquee 
                        text={track.title} 
                        className="track-name" 
                        isActive={isPlaying && (playingTitle === track.title || playingTitle === track.id)}
                      />
                      <div className="artist-badge-row">
                        <p className="track-artist">
                          {track.artist}
                          {track.duration ? ` • ${formatDuration(track.duration)}` : ''}
                        </p>
                        {styles.find(s => s.title.toLowerCase() === track.style?.toLowerCase()) && (
                          <span 
                            className="style-badge-pill" 
                            style={{ backgroundColor: styles.find(s => s.title.toLowerCase() === track.style?.toLowerCase())?.color }}
                          >
                            {track.style}
                          </span>
                        )}
                      </div>
                    </div>
                    
                    <div className="track-meta-col">
                      {track.duration ? formatDuration(track.duration) : ''}
                      {track.duration && track.bpm ? ' • ' : ''}
                      {track.bpm ? `${getMPMFromBPM(Number(track.bpm), track.style)} BPM` : ''}
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
                ))}

                {newArrivals.length > visibleTrackCount && (
                  <div className="load-more-container">
                    <button 
                      className="load-more-btn glass" 
                      onClick={() => setVisibleTrackCount(prev => prev + 25)}
                    >
                      Load More
                    </button>
                  </div>
                )}
              </>
            ) : (
              <div className="empty-home-state glass">
                <Music2 size={48} className="text-secondary" />
                <p>Your studio library is currently empty.</p>
                <p className="sub">Upload tracks in the Admin Panel to see them here.</p>
              </div>
            )}
          </div>
        </section>
      </div>

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
        .home-container {
          padding-bottom: 140px;
        }

        .hero-section {
          padding: 50px 40px;
          border-radius: 24px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 48px;
          background: linear-gradient(135deg, rgba(229, 9, 20, 0.15) 0%, rgba(20, 20, 20, 0.6) 100%);
          border: 1px solid rgba(255, 60, 60, 0.2);
          gap: 40px;
          position: relative;
          overflow: hidden;
        }

        .hero-content-wrapper {
          display: flex;
          align-items: center;
          justify-content: space-between;
          width: 100%;
          gap: 40px;
        }

        .mobile-actions {
          display: none !important;
        }

        .desktop-actions {
          display: flex;
        }

        .goc-badge {
          background: linear-gradient(90deg, #ff4b2b, #ff416c);
          color: white;
          padding: 5px 14px;
          border-radius: 20px;
          font-size: 11px;
          font-weight: 900;
          text-transform: uppercase;
          margin-bottom: 16px;
          display: inline-block;
          letter-spacing: 1px;
          box-shadow: 0 4px 15px rgba(255, 65, 108, 0.3);
        }

        .goc-hero-card-preview {
          position: relative;
          width: 380px;
          height: 215px;
          border-radius: 16px;
          overflow: hidden;
          box-shadow: 0 12px 30px rgba(0, 0, 0, 0.6), 0 0 20px rgba(255, 65, 108, 0.2);
          cursor: pointer;
          border: 1px solid rgba(255, 255, 255, 0.15);
          transition: transform 0.3s ease, box-shadow 0.3s ease;
          flex-shrink: 0;
        }

        .goc-hero-card-preview:hover {
          transform: scale(1.03);
          box-shadow: 0 16px 40px rgba(0, 0, 0, 0.8), 0 0 30px rgba(255, 65, 108, 0.4);
        }

        .goc-hero-img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .goc-btn {
          background: linear-gradient(90deg, #ff4b2b, #ff416c) !important;
          color: white !important;
          box-shadow: 0 4px 15px rgba(255, 65, 108, 0.4);
        }

        .hero-top-right {
          position: absolute;
          top: 24px;
          right: 24px;
          z-index: 10;
        }

        .hero-content {
          max-width: 550px;
        }

        .badge {
          background: var(--primary);
          color: black;
          padding: 4px 12px;
          border-radius: 20px;
          font-size: 11px;
          font-weight: 800;
          text-transform: uppercase;
          margin-bottom: 16px;
          display: inline-block;
        }

        .hero-title {
          font-size: 3.5rem;
          font-weight: 900;
          line-height: 1.1;
          margin-bottom: 24px;
          letter-spacing: -2px;
          max-width: 90%;
        }

        .hero-desc {
          font-size: 1.1rem;
          color: var(--text-secondary);
          margin-bottom: 32px;
          line-height: 1.6;
        }

        .hero-actions {
          display: flex;
          gap: 16px;
        }

        .btn-primary {
          background: var(--primary);
          color: black;
          padding: 14px 28px;
          border-radius: 30px;
          font-weight: 700;
          font-size: 1rem;
          transition: transform 0.2s;
        }

        .btn-outline {
          padding: 14px 28px;
          border-radius: 30px;
          font-weight: 700;
          font-size: 1rem;
        }

        .hero-visual {
          width: 180px;
          height: 180px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .visual-circle {
          width: 140px;
          height: 140px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          border: 2px dashed rgba(255,255,255,0.2);
        }

        .pulse-icon {
          color: var(--primary);
          animation: pulse 2s infinite;
        }

        @keyframes pulse {
          0% { transform: scale(1); opacity: 1; }
          50% { transform: scale(1.1); opacity: 0.7; }
          100% { transform: scale(1); opacity: 1; }
        }

        .section {
          margin-bottom: 48px;
        }

        .section-title {
          font-size: 1.5rem;
          font-weight: 800;
          margin-bottom: 24px;
        }

        .section-header-flex {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 24px;
          border-bottom: 1px solid rgba(255, 255, 255, 0.05);
          padding-bottom: 12px;
        }

        .section-title-group {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .program-badge {
          font-size: 14px; /* Increased from 10px */
          font-weight: 800;
          text-transform: uppercase;
          padding: 8px 16px;
          border-radius: 12px;
          background: rgba(255, 255, 255, 0.03);
          letter-spacing: 1.5px;
        }

        .program-badge.latin { color: #f7971e; border: 1px solid rgba(247, 151, 30, 0.3); }
        .program-badge.standard { color: #2193b0; border: 1px solid rgba(33, 147, 176, 0.3); }

        .styles-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
          gap: 20px;
        }

        .style-card {
          padding: 24px 16px;
          border-radius: 16px;
          display: flex;
          align-items: center;
          position: relative;
          transition: all 0.3s ease;
          overflow: hidden;
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid rgba(255, 255, 255, 0.05);
          height: 100px;
        }

        .card-inner-box {
          display: grid;
          grid-template-columns: 48px 1fr;
          align-items: center;
          width: 100%;
        }

        .style-card:hover { transform: translateY(-4px); background: rgba(255, 255, 255, 0.08); }

        .style-icon {
          width: 48px;
          height: 48px;
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: rgba(0, 0, 0, 0.2);
        }

        .style-info {
          display: flex;
          flex-direction: column;
          align-items: center;
          text-align: center;
          width: 100%;
        }

        .style-info h3 {
          font-size: 1rem;
          font-weight: 700;
          margin: 0;
        }

        .style-info p {
          font-size: 0.75rem;
          color: var(--text-secondary);
          margin-top: 2px;
          opacity: 0.8;
        }

        .play-button-small {
          position: absolute;
          bottom: 20px;
          right: 20px;
          width: 40px;
          height: 40px;
          border-radius: 50%;
          background: var(--primary);
          color: black;
          display: flex;
          align-items: center;
          justify-content: center;
          opacity: 0;
          transform: translateY(10px);
          transition: all 0.3s ease;
        }

        .style-card:hover .play-button-small {
          opacity: 1;
          transform: translateY(0);
        }

        .tracks-list {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }


        @media (max-width: 1024px) and (orientation: landscape) {
          .hero-section {
            padding: 32px;
            margin-bottom: 24px;
            max-height: 300px; /* Prevent over-stretch on tablets */
          }
          .hero-title { font-size: 2.2rem; }
          .hero-visual { width: 100px; height: 100px; }
        }

        @media (max-width: 768px) {
          .hero-section {
            flex-direction: column;
            padding: 16px 14px 14px 14px;
            text-align: left;
            align-items: stretch;
            gap: 14px;
            margin-bottom: 20px;
            border-radius: 20px;
          }

          .hero-content-wrapper {
            display: flex;
            flex-direction: row;
            align-items: center;
            gap: 12px;
            width: 100%;
          }

          .goc-hero-card-preview {
            order: -1;
            width: 38%;
            min-width: 125px;
            aspect-ratio: 16 / 9;
            height: auto;
            border-radius: 12px;
            box-shadow: 0 6px 18px rgba(0, 0, 0, 0.6), 0 0 12px rgba(255, 65, 108, 0.25);
            margin: 0;
            flex-shrink: 0;
            border: 1px solid rgba(255, 255, 255, 0.14);
            background: #000;
            display: flex;
            align-items: center;
            justify-content: center;
            overflow: hidden;
            align-self: center;
          }

          .goc-hero-img {
            width: 100%;
            height: 100%;
            object-fit: contain;
            object-position: center;
          }

          .hero-top-right {
             top: 10px;
             right: 10px;
             z-index: 10;
          }

          .hero-content {
            flex: 1;
            width: 60%;
            min-width: 0;
            display: flex;
            flex-direction: column;
            align-items: flex-start;
            padding-top: 2px;
            padding-right: 32px;
          }

          .goc-badge {
            font-size: 8px;
            padding: 3px 8px;
            margin-bottom: 4px;
          }

          .hero-title {
            font-size: 1.05rem;
            line-height: 1.15;
            letter-spacing: -0.3px;
            margin-bottom: 4px;
            max-width: 100%;
            text-align: left;
          }

          .hero-desc {
            font-size: 0.68rem;
            margin-bottom: 0;
            line-height: 1.25;
            max-width: 100%;
            text-align: left;
            opacity: 0.8;
          }

          .desktop-actions {
            display: none !important;
          }

          .mobile-actions {
            display: flex !important;
            flex-direction: row; 
            width: 100%;
            gap: 8px;
            margin-top: 2px;
          }

          .mobile-actions .btn-primary,
          .mobile-actions .btn-outline {
            flex: 1;
            padding: 10px;
            font-size: 0.78rem;
            font-weight: 800;
          }

          .btn-primary, .btn-outline {
            flex: 1;
            padding: 11px;
            font-size: 0.8rem;
            font-weight: 800;
          }

          .hero-visual {
            order: -1;
            width: 50px; /* Reduced */
            height: 50px;
          }

          .visual-circle {
            width: 50px;
            height: 50px;
          }

          .section-title {
            font-size: 1.25rem;
          }

          .styles-grid {
            grid-template-columns: repeat(2, 1fr);
            gap: 12px;
          }

          .style-card {
            padding: 16px;
          }


          .track-meta {
            gap: 12px;
          }

          .track-name {
            font-size: 13px;
          }
        }

        .empty-home-state {
          padding: 80px;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          text-align: center;
          gap: 16px;
          border-radius: 24px;
          background: rgba(255, 255, 255, 0.02);
        }

        .empty-home-state p {
          font-size: 1.25rem;
          font-weight: 700;
        }

        .empty-home-state .sub {
          font-size: 0.9rem;
          color: var(--text-secondary);
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

        .text-secondary { color: var(--text-secondary); }

        .load-more-container {
          display: flex;
          justify-content: center;
          margin-top: 24px;
          padding-bottom: 24px;
        }

        .load-more-btn {
          padding: 12px 32px;
          border-radius: 30px;
          font-weight: 700;
          font-size: 0.9rem;
          color: rgba(255, 255, 255, 0.6);
          border: 1px solid rgba(255, 255, 255, 0.1);
          background: rgba(255, 255, 255, 0.05);
          transition: all 0.2s ease;
        }

        .load-more-btn:hover {
          color: white;
          background: rgba(255, 255, 255, 0.1);
          border-color: rgba(255, 255, 255, 0.2);
          transform: translateY(-2px);
        }

        .load-more-btn:active {
          transform: translateY(0);
        }

        /* Skeletons */
        .skeleton { pointer-events: none; border-color: rgba(255,255,255,0.05) !important; }
        .skeleton-shimmer {
          background: linear-gradient(90deg, rgba(255,255,255,0.03) 25%, rgba(255,255,255,0.08) 50%, rgba(255,255,255,0.03) 75%);
          background-size: 200% 100%;
          animation: shimmer 1.5s infinite;
          border-radius: 4px;
        }
        .skeleton-shimmer-circle {
          background: linear-gradient(90deg, rgba(255,255,255,0.03) 25%, rgba(255,255,255,0.08) 50%, rgba(255,255,255,0.03) 75%);
          background-size: 200% 100%;
          animation: shimmer 1.5s infinite;
          border-radius: 50%;
          width: 32px; height: 32px;
        }
        .skeleton-line { height: 12px; margin-bottom: 8px; border-radius: 4px; }
        .skeleton-line.full { width: 100%; }
        .skeleton-line.half { width: 50%; }

        @keyframes shimmer {
          0% { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
      `}</style>
    </div>
  );
}
