"use client";

import React from 'react';
import Link from 'next/link';
import { Play, Mic2, Timer, Flame, Music2, Disc, Heart, ChevronLeft, ChevronRight, CheckCircle2 } from 'lucide-react';
import { useAudio } from '@/components/audio/AudioProvider';
import { useStudio } from '@/components/admin/StudioProvider';
import { useAuth } from '@/context/AuthContext';
import { useDownloadedTracks } from '@/hooks/useDownloadedTracks';
import { formatDuration } from '@/utils/format';
import { getMPMFromBPM } from '@/utils/audio';
import ConfirmModal from '@/components/admin/ConfirmModal';
import { useState, useEffect } from 'react';
import { UserBadge } from '@/components/auth/UserBadge';
import { TopSocialButtons } from '@/components/kofi/TopSocialButtons';
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
  const downloadedIds = useDownloadedTracks();

  const [infoModal, setInfoModal] = useState({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => { }
  });

  const [visibleTrackCount, setVisibleTrackCount] = useState(25);

  // 10-Second Hero Carousel State (0 = Dance Star Band, 1 = GOC 2026)
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isCarouselPaused, setIsCarouselPaused] = useState(false);

  // Touch Swipe Gesture State for Mobile Carousel
  const touchStartX = React.useRef<number | null>(null);
  const touchEndX = React.useRef<number | null>(null);

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.targetTouches[0].clientX;
    touchEndX.current = null;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    touchEndX.current = e.targetTouches[0].clientX;
  };

  const handleTouchEnd = () => {
    if (touchStartX.current === null || touchEndX.current === null) return;
    const distance = touchStartX.current - touchEndX.current;
    const minSwipeDistance = 35;
    if (distance > minSwipeDistance) {
      setCurrentSlide(prev => (prev === 0 ? 1 : 0));
    } else if (distance < -minSwipeDistance) {
      setCurrentSlide(prev => (prev === 0 ? 1 : 0));
    }
    touchStartX.current = null;
    touchEndX.current = null;
  };

  // Auto-hiding Carousel Arrow Controls (Fades out after 2 seconds of inactivity)
  const [areArrowsVisible, setAreArrowsVisible] = useState(true);
  const arrowsTimeoutRef = React.useRef<NodeJS.Timeout | null>(null);

  const resetArrowsTimer = React.useCallback(() => {
    setAreArrowsVisible(true);
    if (arrowsTimeoutRef.current) clearTimeout(arrowsTimeoutRef.current);
    arrowsTimeoutRef.current = setTimeout(() => {
      setAreArrowsVisible(false);
    }, 2000);
  }, []);

  useEffect(() => {
    resetArrowsTimer();
    return () => {
      if (arrowsTimeoutRef.current) clearTimeout(arrowsTimeoutRef.current);
    };
  }, [resetArrowsTimer]);

  useEffect(() => {
    if (isCarouselPaused) return;
    const timer = setInterval(() => {
      setCurrentSlide(prev => (prev === 0 ? 1 : 0));
    }, 10000);
    return () => clearInterval(timer);
  }, [isCarouselPaused]);

  // Auto-play shared track link when opening https://4and.one/?track=... in browser
  React.useEffect(() => {
    if (tracks.length > 0 && typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      const sharedTrackId = urlParams.get('track') || urlParams.get('id');
      if (sharedTrackId) {
        const foundTrack = tracks.find(
          t => String(t.id) === sharedTrackId || t.title.toLowerCase() === sharedTrackId.toLowerCase()
        );
        if (foundTrack) {
          loadTrack(foundTrack);
        }
      }
    }
  }, [tracks, loadTrack]);

  const isSpecialAlbumTrack = React.useCallback((t: any) => {
    if (!t) return false;
    const albumLower = (t.album || '').toLowerCase();
    if (albumLower === 'goc 2026' || albumLower === 'dance star band') return true;
    if (t.tags?.some((tag: string) => {
      const tg = tag.toLowerCase();
      return tg === 'goc 2026' || tg === 'goc' || tg === 'dance star band' || tg === 'dance star' || tg === 'dancestar';
    })) return true;
    return false;
  }, []);

  const newArrivals = React.useMemo(() => {
    return tracks.filter(t =>
      t.style?.toLowerCase() !== 'fitness' &&
      !t.tags?.some(tag => tag.toLowerCase() === 'closed' || tag === 'დახურული') &&
      !isSpecialAlbumTrack(t)
    );
  }, [tracks, isSpecialAlbumTrack]);

  const normalizeStyle = React.useCallback((s?: string) => (s || '').toLowerCase().replace(/[\s-]+/g, ''), []);

  const latinStyles = React.useMemo(() => {
    return styles.filter(s => s.program === 'Latin' && s.title.toLowerCase() !== 'fitness');
  }, [styles]);

  const standardStyles = React.useMemo(() => {
    return styles.filter(s => s.program === 'Standard' && s.title.toLowerCase() !== 'fitness');
  }, [styles]);

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
      <div className="track-icon-col">
        <div className="skeleton-shimmer" style={{ width: '20px', height: '20px', borderRadius: '4px', opacity: 0.2 }}></div>
      </div>
      <div className="track-info-col">
        <div className="skeleton-line full skeleton-shimmer" style={{ height: '14px', width: '120px', marginBottom: '4px' }}></div>
        <div className="skeleton-line half skeleton-shimmer" style={{ height: '10px', width: '80px' }}></div>
      </div>
      <div className="track-badge-col">
        <div className="skeleton-shimmer" style={{ width: '45px', height: '14px', borderRadius: '4px', opacity: 0.15 }}></div>
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
        {/* Core Keyword Primary H1 Tag & Multilingual SEO Block for Google Crawlers */}
        <h1 className="sr-only">4and.one - Free Web Music Player | Dancesport & Ballroom Music</h1>
        <div className="sr-only">
          <p>
            Listen to high-quality Dancesport and Ballroom music online. Free web music player with high-fidelity BPM tempo control. 
            Cha Cha Cha music, Samba music, Rumba music, Paso Doble music, Jive music, Slow Waltz music, Tango music, Viennese Waltz music, Slow Foxtrot music, and Quickstep music.
          </p>
          <p>
            სპორტული ცეკვების მუსიკა, სამეჯლისო ცეკვების მუსიკა, ჩა ჩა ჩა მუსიკა, სამბა მუსიკა, რუმბა მუსიკა, პასოდობლე მუსიკა, ჯაივი მუსიკა, ნელი ვალსი მუსიკა, ტანგო მუსიკა, ვენური ვალსი მუსიკა, ფოქსტროტი მუსიკა, ქვიქსტეპი მუსიკა.
          </p>
          <p>
            Música de Baile Deportivo, Música de baile de salón, Música de Cha Cha Cha, Música de Samba, Música de Rumba, Música de Pasodoble, Música de Jive, Música de Vals Lento, Música de Tango, Música de Quickstep.
          </p>
          <p>
            Tanzsport Musik, Tanzsport Player, Standard und Latein Tanzmusik, Cha Cha Cha Musik, Samba Musik, Rumba Musik, Paso Doble Musik, Jive Musik, Langsamer Walzer Musik, Tango Musik, Wiener Walzer Musik, Slowfox Musik, Quickstep Musik.
          </p>
          <p>
            Musica da Danza Sportiva, Player Musica Danza Sportiva, Musica da Ballo da Sala, Musica Cha Cha Cha, Musica Samba, Musica Rumba, Musica Paso Doble, Musica Jive, Musica Valzer Lento, Musica Tango.
          </p>
          <p>
            体育舞蹈音乐, 国标舞音乐, 拉丁舞音乐, 摩登舞音乐, 恰恰舞音乐, 桑巴舞音乐, 伦巴舞音乐, 斗牛舞音乐, 牛仔舞音乐, 慢华尔兹音乐, 探戈舞音乐, 维也纳华尔兹音乐, 狐步舞音乐, 快步舞音乐.
          </p>
          <p>
            競技ダンス音楽, 社交ダンス音楽, チャチャチャ音楽, サンバ音楽, ルンバ音楽, パソドブレ音楽, ジャイブ音楽, ワルツ音楽, タンゴ音楽.
          </p>
          <p>
            댄스스포츠 음악, 볼룸댄스 음악, 라틴댄스 음악, 모던댄스 음악, 차차차 음악, 삼바 음악, 룸바 음악, 파소도블레 음악, 자이브 음악, 왈츠 음악, 탱고 음악.
          </p>
          <p>
            Музыка для спортивных бальных танцев, Музыка для бальных танцев, Плеер для бальных танцев, Музыка Ча Ча Ча, Музыка Самба, Музыка Румба, Музыка Пасодобль, Музыка Джайв, Музыка Медленный Вальс, Музыка Танго, Музыка Венский Вальс.
          </p>
          <p>
            Սպորտային պարային երաժշտություն, Պարահանդեսային պարերի երաժշտություն, Չա Չա Չա երաժշտություն, Սամբա երաժշտություն, Ռումբա երաժշտություն.
          </p>
          <p>
            Dans Sporu Müziği, Dansspor Müzik Çalar, Salon Dansları Müziği, Latin Dans Müziği, Cha Cha Cha Müziği, Samba Müziği, Rumba Müziği, Paso Doble Müziği, Jive Müziği, Tango Müziği.
          </p>
          <p>
            Музика для спортивних бальних танців, Музика для бальних танців, Плеєр для бальних танців, Музика Ча Ча Ча, Музика Самба, Музика Румба, Музика Пасодобль, Музика Джайв, Музика Повільний Вальс, Музика Танго.
          </p>
          <p>
            Sportinių šokių muzika, Pramoginių šokių muzika, Sporta deju mūzika, Balles deju mūzika.
          </p>
        </div>

        {/* Top Header Row with Buy Me Coffee, Telegram, YouTube, Contact & Profile */}
        <div className="home-top-header">
          <TopSocialButtons />
          <UserBadge />
        </div>

        {/* 10-Second Auto-Rotating Hero Carousel Banner */}
        <div 
          className={`hero-carousel-wrapper ${currentSlide === 0 ? 'slide-dancestar' : 'slide-goc'}`}
          onMouseEnter={() => { setIsCarouselPaused(true); resetArrowsTimer(); }}
          onMouseLeave={() => { setIsCarouselPaused(false); setAreArrowsVisible(false); }}
          onMouseMove={resetArrowsTimer}
          onTouchStart={(e) => { resetArrowsTimer(); handleTouchStart(e); }}
          onTouchMove={(e) => { resetArrowsTimer(); handleTouchMove(e); }}
          onTouchEnd={handleTouchEnd}
        >
          {/* Navigation Controls: Smart Auto-Hiding Arrows */}
          <button 
            className={`carousel-nav-btn prev glass ${areArrowsVisible ? 'visible' : ''}`}
            onClick={() => { resetArrowsTimer(); setCurrentSlide(prev => (prev === 0 ? 1 : 0)); }}
            aria-label="Previous Banner"
          >
            <ChevronLeft size={16} className="nav-arrow-icon" />
          </button>
          <button 
            className={`carousel-nav-btn next glass ${areArrowsVisible ? 'visible' : ''}`}
            onClick={() => { resetArrowsTimer(); setCurrentSlide(prev => (prev === 0 ? 1 : 0)); }}
            aria-label="Next Banner"
          >
            <ChevronRight size={16} className="nav-arrow-icon" />
          </button>

          {/* Horizontal Slide Track */}
          <div 
            className="carousel-track"
            style={{
              transform: `translateX(-${currentSlide * 50}%)`
            }}
          >
            {/* SLIDE 0: DANCE STAR BAND (LIVE SOUNDS) - STARTS FIRST */}
            <header 
              className="hero-section glass dancestar-hero-section"
              style={{
                background: 'linear-gradient(135deg, rgba(217, 70, 239, 0.18) 0%, rgba(20, 20, 20, 0.7) 100%)',
                borderColor: 'rgba(217, 70, 239, 0.3)'
              }}
            >
              <div className="hero-content-wrapper">
                <div className="hero-content">
                  <span className="goc-badge" style={{ background: 'linear-gradient(90deg, #d946ef, #8b5cf6)', boxShadow: '0 4px 15px rgba(217, 70, 239, 0.3)' }}>
                    LIVE SOUNDS COLLECTION
                  </span>
                  <h2 className="hero-title text-gradient" style={{ background: 'linear-gradient(90deg, #ffffff, #d946ef, #a855f7)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                    DANCE STAR BAND<br />LIVE SOUNDS
                  </h2>
                  <p className="hero-desc">
                    Exclusive Live Dance Band Sounds. Isolated collection with dedicated Latin & Standard Final Mode practice.
                  </p>
                  <div className="hero-actions desktop-actions">
                    <button className="btn-primary" style={{ background: 'linear-gradient(90deg, #d946ef, #8b5cf6)', color: 'white', border: 'none', boxShadow: '0 4px 15px rgba(217, 70, 239, 0.4)' }} onClick={() => router.push('/album/dance-star-band')}>
                      Open Live Album
                    </button>
                    <button className="btn-outline glass" onClick={() => router.push('/album/dance-star-band')}>
                      Final Mode
                    </button>
                  </div>
                </div>
                <div className="goc-hero-card-preview" style={{ borderColor: 'rgba(217, 70, 239, 0.3)' }} onClick={() => router.push('/album/dance-star-band')}>
                  <img src="/dancestar.jpg" alt="Dance Star Band Live Sounds" className="goc-hero-img" />
                </div>
              </div>
              <div className="hero-actions mobile-actions">
                <button className="btn-primary" style={{ background: 'linear-gradient(90deg, #d946ef, #8b5cf6)', color: 'white', border: 'none' }} onClick={() => router.push('/album/dance-star-band')}>
                  Open Live Album
                </button>
                <button className="btn-outline glass" onClick={() => router.push('/album/dance-star-band')}>
                  Final Mode
                </button>
              </div>
            </header>

            {/* SLIDE 1: GOC FINAL 2026 MUSIC */}
            <header className="hero-section goc-hero-section glass">
              <div className="hero-content-wrapper">
                <div className="hero-content">
                  <span className="goc-badge">SPECIAL COLLECTION</span>
                  <h2 className="hero-title text-gradient">GOC FINAL 2026<br />MUSIC</h2>
                  <p className="hero-desc">
                    Exclusive German Open Championship finals music. Isolated collection with dedicated Latin & Standard Final Mode practice.
                  </p>
                  <div className="hero-actions desktop-actions">
                    <button className="btn-primary goc-btn" aria-label="Open GOC Album" onClick={() => router.push('/album/goc-2026')}>
                      Open GOC Album
                    </button>
                    <button className="btn-outline glass" aria-label="Open Final Mode" onClick={() => router.push('/album/goc-2026')}>
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
          </div>

          {/* Dot Indicators */}
          <div className="carousel-dots-container">
            <button 
              className={`carousel-dot ${currentSlide === 0 ? 'active dancestar' : ''}`}
              onClick={() => setCurrentSlide(0)}
              title="Dance Star Band"
            />
            <button 
              className={`carousel-dot ${currentSlide === 1 ? 'active goc' : ''}`}
              onClick={() => setCurrentSlide(1)}
              title="GOC Final 2026"
            />
          </div>
        </div>

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
              latinStyles.map((style) => {
                const count = tracks.filter(t => normalizeStyle(t.style) === normalizeStyle(style.title)).length;
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
              standardStyles.map((style) => {
                const count = tracks.filter(t => normalizeStyle(t.style) === normalizeStyle(style.title)).length;
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
                    <div className="track-icon-col">
                      <Disc size={18} />
                    </div>
                    <div className="track-info-col">
                      <div className="track-title-row">
                        <div className="track-title-marquee-wrapper">
                          <Marquee 
                            text={track.title} 
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
                        {track.artist}
                        {track.duration ? ` • ${formatDuration(track.duration)}` : ''}
                      </p>
                    </div>

                    <div className="track-badge-col">
                      {styles.find(s => s.title.toLowerCase() === track.style?.toLowerCase()) && (
                        <span 
                          className="style-badge-pill" 
                          style={{ backgroundColor: styles.find(s => s.title.toLowerCase() === track.style?.toLowerCase())?.color }}
                        >
                          {track.style}
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
        .home-top-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 16px;
          padding: 0 4px;
          position: relative;
          z-index: 20;
        }

        .carousel-nav-btn {
          position: absolute;
          top: 50%;
          transform: translateY(-50%);
          z-index: 15;
          width: 32px;
          height: 32px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          background: rgba(0, 0, 0, 0.45);
          backdrop-filter: blur(8px);
          border: 1px solid rgba(255, 255, 255, 0.15);
          color: rgba(255, 255, 255, 0.9);
          cursor: pointer;
          opacity: 0;
          pointer-events: none;
          transition: opacity 0.4s ease, transform 0.25s ease, background 0.25s ease, border-color 0.25s ease;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
        }

        .carousel-nav-btn.visible {
          opacity: 1;
          pointer-events: auto;
        }

        .carousel-nav-btn:hover {
          background: rgba(255, 255, 255, 0.2);
          border-color: rgba(255, 255, 255, 0.4);
          color: white;
          transform: translateY(-50%) scale(1.1);
        }

        .carousel-nav-btn.prev {
          left: 10px;
        }

        .carousel-nav-btn.next {
          right: 10px;
        }

        .carousel-dots-container {
          position: absolute;
          bottom: 12px;
          left: 50%;
          transform: translateX(-50%);
          display: flex;
          align-items: center;
          gap: 10px;
          z-index: 15;
        }

        .carousel-dot {
          width: 12px;
          height: 12px;
          border-radius: 50%;
          background: rgba(255, 255, 255, 0.25);
          border: 1px solid rgba(255, 255, 255, 0.4);
          cursor: pointer;
          transition: all 0.3s ease;
        }

        .carousel-dot.active.dancestar {
          width: 32px;
          border-radius: 12px;
          background: linear-gradient(90deg, #d946ef, #8b5cf6);
          border-color: #d946ef;
          box-shadow: 0 0 12px rgba(217, 70, 239, 0.6);
        }

        .carousel-dot.active.goc {
          width: 32px;
          border-radius: 12px;
          background: linear-gradient(90deg, #ff4b2b, #ff416c);
          border-color: #ff416c;
          box-shadow: 0 0 12px rgba(255, 65, 108, 0.6);
        }

        .animate-fade-in {
          animation: fadeIn 0.6s ease;
        }

        @keyframes fadeIn {
          from { opacity: 0; transform: scale(0.98); }
          to { opacity: 1; transform: scale(1); }
        }

        .hero-carousel-wrapper {
          position: relative;
          width: 100%;
          border-radius: 24px;
          overflow: hidden;
          margin-bottom: 48px;
          border: 1px solid rgba(255, 255, 255, 0.15);
          transition: border-color 0.6s ease, box-shadow 0.6s ease;
        }

        .hero-carousel-wrapper.slide-dancestar {
          border-color: rgba(217, 70, 239, 0.45);
          box-shadow: 0 12px 35px -5px rgba(217, 70, 239, 0.25);
        }

        .hero-carousel-wrapper.slide-goc {
          border-color: rgba(255, 65, 108, 0.45);
          box-shadow: 0 12px 35px -5px rgba(255, 65, 108, 0.25);
        }

        .carousel-track {
          display: flex;
          width: 200%;
          transition: transform 0.6s cubic-bezier(0.25, 1, 0.5, 1);
        }

        .hero-section {
          width: 50%;
          flex-shrink: 0;
          box-sizing: border-box;
          padding: 44px 40px 40px 40px;
          border-radius: 0 !important;
          border: none !important;
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 0;
          background: linear-gradient(135deg, rgba(229, 9, 20, 0.15) 0%, rgba(20, 20, 20, 0.6) 100%);
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
          .hero-carousel-wrapper {
            height: auto;
            min-height: 250px;
            margin-bottom: 24px;
            border-radius: 20px;
          }

          .carousel-nav-btn {
            width: 26px;
            height: 26px;
            background: rgba(0, 0, 0, 0.45);
            border: 1px solid rgba(255, 255, 255, 0.18);
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.4);
          }

          .carousel-nav-btn.prev {
            left: 5px;
          }

          .carousel-nav-btn.next {
            right: 5px;
          }

          :global(.nav-arrow-icon) {
            width: 14px !important;
            height: 14px !important;
          }

          .carousel-dots-container {
            bottom: 10px;
          }

          .hero-section {
            height: auto;
            min-height: 250px;
            flex-direction: column;
            padding: 16px 14px 40px 14px !important;
            text-align: left;
            align-items: stretch;
            gap: 14px;
            margin-bottom: 0;
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
