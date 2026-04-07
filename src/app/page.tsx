"use client";

import React from 'react';
import Link from 'next/link';
import { Play, Mic2, Timer, Flame, Music2, Disc, Flag } from 'lucide-react';
import { useAudio } from '@/components/audio/AudioProvider';
import { useStudio } from '@/components/admin/StudioProvider';
import { formatDuration } from '@/utils/format';
import { getMPMFromBPM } from '@/utils/audio';
import { UserBadge } from '@/components/auth/UserBadge';

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
    removeFromFinal
  } = useStudio();

  const getStyleTrackCount = (styleName: string) => {
    return tracks.filter(t => t.style?.toLowerCase() === styleName.toLowerCase()).length;
  };

  const handlePlay = (track: any) => {
    loadTrack(track);
  };

  return (
    <div className="home-container">
      {/* ... Hero Section remains ... */}
      <header className="hero-section glass">
        <div className="hero-top-right">
          <UserBadge />
        </div>
        <div className="hero-content">
          <span className="badge">Featured: Final Mode Practice</span>
          <h1 className="hero-title text-gradient">Master Your Dance<br />with AI & BPM Control</h1>
          <p className="hero-desc">
            The ultimate tool for Dancesport. Isolate beats, remove vocals,
            and practice with professional-grade speed control.
          </p>
          <div className="hero-actions">
            <button className="btn-primary" onClick={togglePlay}>
              {isPlaying ? 'Pause Practice' : 'Start Practice'}
            </button>
            <button className="btn-outline glass">Learn Final Mode</button>
          </div>
        </div>
        <div className="hero-visual">
          <div className="visual-circle glass">
            <Flame size={48} className="pulse-icon" />
          </div>
        </div>
      </header>

      <section className="section">
        <div className="section-header-flex">
          <div className="section-title-group">
            <span className="program-badge latin">International Latin</span>
          </div>
        </div>
        <div className="styles-grid">
          {styles.filter(s => s.program === 'Latin').map((style) => {
            const count = getStyleTrackCount(style.title);
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
          })}
        </div>
      </section>

      <section className="section" style={{ marginTop: '40px' }}>
        <div className="section-header-flex">
          <div className="section-title-group">
            <span className="program-badge standard">International Standard</span>
          </div>
        </div>
        <div className="styles-grid">
          {styles.filter(s => s.program === 'Standard').map((style) => {
            const count = getStyleTrackCount(style.title);
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
          })}
        </div>
      </section>

      <section className="section">
        <h2 className="section-title">New Arrivals</h2>
        <div className="tracks-list">
          {tracks.length > 0 ? tracks.map((track, i) => (
            <div
              key={track.id}
              className={`track-row glass ${isPlaying && playingTitle === track.title ? 'is-active' : ''}`}
              onClick={() => handlePlay(track)}
              style={{ cursor: 'pointer' }}
            >
              <div className="track-number">{i + 1}</div>
              <div className="track-meta">
                <Disc size={20} className="text-secondary" />
                <div>
                  <p className="track-name">{track.title}</p>
                  <p className="track-artist">{track.artist}</p>
                </div>
              </div>
              <div className="track-duration text-secondary">{track.bpm ? `${getMPMFromBPM(Number(track.bpm), track.style)} Bars/Min` : formatDuration(track.duration)}</div>
              <div className="track-actions">
                <button
                  className={`feature-icon ${finalTracks.some(t => t.id === track.id) ? 'active-flag' : ''}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    finalTracks.some(t => t.id === track.id) ? removeFromFinal(track.id) : addToFinal(track);
                  }}
                  title="Add to Final"
                >
                  <Flag size={18} fill={finalTracks.some(t => t.id === track.id) ? "currentColor" : "none"} />
                </button>
                <div className="btn-play-row">
                  {isPlaying && playingTitle === track.title ? <div className="playing-bars"><span></span><span></span><span></span></div> : <Play size={20} fill="currentColor" />}
                </div>
              </div>
            </div>
          )) : (
            <div className="empty-home-state glass">
              <Music2 size={48} className="text-secondary" />
              <p>Your studio library is currently empty.</p>
              <p className="sub">Upload tracks in the Admin Panel to see them here.</p>
            </div>
          )}
        </div>
      </section>

      <style jsx>{`
        .home-container {
          padding-bottom: 140px;
        }

        .hero-section {
          padding: 60px 40px;
          border-radius: 24px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 48px;
          background: linear-gradient(135deg, rgba(29, 185, 84, 0.1) 0%, rgba(0, 0, 0, 0) 100%);
          gap: 40px;
          position: relative;
          overflow: hidden;
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

        .track-row {
          display: grid;
          grid-template-columns: 40px 1fr 60px 100px;
          align-items: center;
          padding: 12px 16px;
          border-radius: 12px;
          transition: background 0.2s;
        }

        .track-row:hover {
          background: rgba(255,255,255,0.08);
        }

        .track-meta {
          display: flex;
          align-items: center;
          gap: 16px;
        }

        .track-name {
          font-weight: 600;
          font-size: 14px;
        }

        .track-artist {
          font-size: 12px;
          color: var(--text-secondary);
        }

        .track-actions {
          display: flex;
          align-items: center;
          justify-content: flex-end;
          gap: 12px;
        }

        .feature-indicator {
          color: var(--text-secondary);
          opacity: 0.5;
        }

        .btn-play-row {
          color: white;
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
            padding: 18px 14px; /* Reduced by ~10-15% */
            text-align: center;
            align-items: center;
            gap: 10px; 
            margin-bottom: 18px;
            border-radius: 16px;
          }

          .hero-top-right {
             top: 12px;
             right: 12px;
          }

          .hero-title {
            font-size: 1.45rem; /* Reduced by ~10% */
            letter-spacing: -0.5px;
            margin-bottom: 6px;
            max-width: 100%;
          }

          .hero-desc {
            font-size: 0.75rem; /* Reduced */
            margin-bottom: 10px;
            line-height: 1.25;
            max-width: 280px;
            display: -webkit-box;
            -webkit-line-clamp: 2;
            -webkit-box-orient: vertical;
            overflow: hidden;
          }

          .badge {
            font-size: 8px; /* Reduced */
            padding: 2px 6px;
            margin-bottom: 6px;
          }

          .hero-actions {
            flex-direction: row; 
            width: 100%;
            gap: 6px;
          }

          .btn-primary, .btn-outline {
            flex: 1;
            padding: 9px; /* Reduced */
            font-size: 0.75rem; /* Reduced */
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

          .track-row {
            grid-template-columns: 32px 1fr 48px;
            padding: 8px 12px;
          }

          .track-duration, .feature-indicator {
            display: none;
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
      `}</style>
    </div>
  );
}
