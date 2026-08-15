"use client";

import React, { useEffect, useState, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { 
  X, 
  Disc, 
  Play, 
  Pause, 
  SkipBack, 
  SkipForward, 
  Heart,
  Volume2,
  LayoutGrid,
  Timer,
  ChevronLeft,
  ChevronRight,
  Gauge,
  Shuffle,
  Repeat,
  Repeat1,
  ArrowLeft,
  Infinity,
  ListMusic,
  Music2
} from 'lucide-react';
import { Marquee } from '@/components/layout/Marquee';
import { useAudio } from '@/components/audio/AudioProvider';
import { useStudio } from '@/components/admin/StudioProvider';
import { useAuth } from '@/context/AuthContext';
import SpeedSelector from '@/components/audio/SpeedSelector';
import { formatDuration } from '@/utils/format';

const LATIN_FIRST_ORDER: Record<string, number> = {
  // Latin First
  'Samba': 1,
  'Cha-Cha-Cha': 2,
  'Cha-cha-cha': 2,
  'Rumba': 3,
  'Paso Doble': 4,
  'Jive': 5,
  // Standard Second
  'Slow Waltz': 6,
  'Tango': 7,
  'Viennese Waltz': 8,
  'Slow Foxtrot': 9,
  'Quickstep': 10
};

export default function DesktopFullPlayer({ onClose }: { onClose: () => void }) {
  const [mounted, setMounted] = useState(false);
  const [selectedStyle, setSelectedStyle] = useState<string | null>(null);
  const [showSpeed, setShowSpeed] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [dragProgress, setDragProgress] = useState(0);
  const progressRef = useRef<HTMLDivElement>(null);
  const speedPopoverRef = useRef<HTMLDivElement>(null);

  // Click outside to close speed selector
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (speedPopoverRef.current && !speedPopoverRef.current.contains(event.target as Node)) {
        // Also check if we didn't click the trigger button
        const trigger = document.querySelector('.gauge-trigger-v19');
        if (trigger && trigger.contains(event.target as Node)) return;
        
        setShowSpeed(false);
      }
    };

    if (showSpeed) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showSpeed]);

  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  const {
    isPlaying,
    togglePlay,
    title,
    artist,
    currentTime,
    duration,
    playNext,
    playPrevious,
    volume,
    setVolume,
    isFinalMode,
    toggleFinalMode,
    bpm,
    setBpm,
    isPauseCountdown,
    pauseTime,
    loadTrack,
    seek,
    isShuffle,
    isRepeat,
    toggleShuffle,
    toggleRepeat,
    sessionDuration,
    isLoaded,
    activeMode,
    sessionTracks
  } = useAudio();

  const { tracks, styles, toggleFavorite } = useStudio();
  
  // Latin First Sorting
  const sortedStyles = [...styles].sort((a, b) => {
    const orderA = LATIN_FIRST_ORDER[a.title] || 99;
    const orderB = LATIN_FIRST_ORDER[b.title] || 99;
    return orderA - orderB;
  });

  const danceStyles = sortedStyles.filter(s => s.program?.toLowerCase() !== 'fitness' && s.title.toLowerCase() !== 'fitness');
  const latinStyles = danceStyles.filter(s => s.program === 'Latin');
  const standardStyles = danceStyles.filter(s => s.program === 'Standard');
  const fitnessStyles = sortedStyles.filter(s => s.program?.toLowerCase() === 'fitness' || s.title.toLowerCase() === 'fitness');

  const currentTrack = tracks.find(t => t.title === title);

  const filteredTracks = selectedStyle 
    ? tracks.filter(t => t.style === selectedStyle)
    : [];

  const totalDur = isFinalMode ? sessionDuration : duration;
  const displayProgress = isDragging ? dragProgress : (currentTime / (totalDur || 1)) * 100;

  const handleSeek = (clientX: number) => {
    if (!progressRef.current || !totalDur) return;
    const rect = progressRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(clientX - rect.left, rect.width));
    const percentage = x / rect.width;
    const newTime = percentage * totalDur;
    setDragProgress(percentage * 100);
    return newTime;
  };

  const handleInteractionStart = (e: React.MouseEvent | React.TouchEvent) => {
    if (isFinalMode) return;
    setIsDragging(true);
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    handleSeek(clientX);
  };

  const handleInteractionMove = useCallback((e: MouseEvent | TouchEvent) => {
    if (!isDragging) return;
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    handleSeek(clientX);
  }, [isDragging, totalDur]);

  const handleInteractionEnd = useCallback((e: MouseEvent | TouchEvent) => {
    if (!isDragging) return;
    const clientX = 'touches' in e ? (e.changedTouches[0]?.clientX || 0) : e.clientX;
    const newTime = handleSeek(clientX);
    if (newTime !== undefined) seek(newTime);
    setIsDragging(false);
  }, [isDragging, seek, totalDur]);

  useEffect(() => {
    if (isDragging && !isFinalMode) {
      window.addEventListener('mousemove', handleInteractionMove);
      window.addEventListener('mouseup', handleInteractionEnd);
      window.addEventListener('touchmove', handleInteractionMove, { passive: false });
      window.addEventListener('touchend', handleInteractionEnd);
    }
    return () => {
      window.removeEventListener('mousemove', handleInteractionMove);
      window.removeEventListener('mouseup', handleInteractionEnd);
      window.removeEventListener('touchmove', handleInteractionMove);
      window.removeEventListener('touchend', handleInteractionEnd);
    };
  }, [isDragging, isFinalMode, handleInteractionMove, handleInteractionEnd]);

  // V13 Cycle: Repeat -> Repeat1 -> Shuffle -> None
  const [cycleState, setCycleState] = useState<'none' | 'repeat' | 'repeat1' | 'shuffle'>('none');
  
  const handleCycleMode = () => {
    if (cycleState === 'none') {
       toggleRepeat();
       setCycleState('repeat');
    } else if (cycleState === 'repeat') {
       setCycleState('repeat1');
    } else if (cycleState === 'repeat1') {
       toggleRepeat(); // Stop repeat (logic for repeat1 is same as repeat for now)
       toggleShuffle(); // Start shuffle
       setCycleState('shuffle');
    } else {
       toggleShuffle(); // Stop shuffle
       setCycleState('none');
    }
  };

  if (!mounted) return null;

  return createPortal(
    <div className={`desktop-player-overlay animate-fade-in ${isFinalMode ? 'final-active' : ''}`} style={{ zIndex: 9999, background: '#121212' }}>
      <div className="dp-console-wrapper">
        <main className="dp-player-console">
          <div className="console-body">
             <div className="visualizer-stage-v8">
                <div 
                  className={`vinyl-disc-v8 glass ${isFinalMode ? 'final-active' : 'standard-active'}`} 
                  style={isPlaying && !isPauseCountdown ? { animation: 'spin 12s linear infinite' } : {}}
                >
                  {currentTrack?.artworkUrl && (
                    <img src={currentTrack.artworkUrl} alt="Track Artwork" className="disc-art-img-v8" />
                  )}
                  <div className="disc-inner-glow-v8"></div>
                </div>

                {isPauseCountdown && (
                  <div className="countdown-ring animate-in">
                    <span className="count">{pauseTime}</span>
                    <span className="label">Next Round</span>
                  </div>
                )}
             </div>

             <div className="metadata-stage">
                 <div className="metadata-actions-refined">
                    <button 
                      className={`console-action-btn-v13 favorite-btn-pro ${currentTrack?.isFavorite ? 'active' : ''}`}
                      onClick={() => currentTrack && toggleFavorite(currentTrack.id)}
                    >
                      <Heart size={36} fill={currentTrack?.isFavorite ? "#ef4444" : "none"} />
                    </button>
                    
                    <div className="text-center min-w-0 px-64">
                       <h1 className="refined-title-v8 truncate">{title}</h1>
                       <p className="refined-artist-v8 truncate">{artist}</p>
                    </div>
                    
                    {/* Speed Selector - Improved Proximity V19 */}
                       <div className="relative">
                          <button 
                            className={`console-action-btn-v13 gauge-trigger-v19 ${showSpeed ? 'active' : ''}`} 
                            onClick={(e) => {
                              e.stopPropagation();
                              setShowSpeed(!showSpeed);
                            }}
                          >
                             <Gauge size={36} />
                          </button>

                          {showSpeed && (
                            <div className="speed-popover-v17 animate-in" ref={speedPopoverRef} onClick={(e) => e.stopPropagation()}>
                               <SpeedSelector 
                                 currentBpm={bpm} 
                                 onSelect={val => setBpm(val)} 
                                 onClose={() => setShowSpeed(false)} 
                                 isFinalMode={isFinalMode}
                               />
                            </div>
                          )}
                       </div>
                 </div>
                
                <div className="bpm-pill glass mt-8" style={isFinalMode ? { color: '#ef4444', borderColor: 'rgba(239, 68, 68, 0.3)' } : {}}>
                  {currentTrack?.style} • {currentTrack?.bpm} BPM
                </div>
             </div>

             <div className="control-stage">
                <div className="timeline-strip-pro-v13">
                   <span className="time-code">{formatDuration(isDragging ? (dragProgress / 100) * (totalDur || 1) : currentTime)}</span>
                   <div 
                     className="timeline-track-thick" 
                     ref={progressRef}
                     onMouseDown={handleInteractionStart}
                     onTouchStart={handleInteractionStart}
                   >
                     <div className="timeline-bg"></div>
                     <div className="timeline-fill" style={{ width: `${displayProgress}%` }}></div>
                     <div className="timeline-head-bold" style={{ left: `${displayProgress}%` }}></div>
                   </div>
                   <span className="time-code">{formatDuration(totalDur)}</span>
                </div>

                <div className="transport-deck-v17">
                   <div className="side-params-v17 left-side">
                      <button 
                        className={`universal-mode-btn-v17 ${cycleState !== 'none' ? 'active' : ''}`}
                        onClick={handleCycleMode}
                        disabled={isFinalMode}
                      >
                        {cycleState === 'repeat' ? <Repeat size={28} /> : 
                         cycleState === 'repeat1' ? <Repeat1 size={28} /> : 
                         cycleState === 'shuffle' ? <Shuffle size={28} /> :
                         <div className="opacity-10 scale-90"><Repeat size={28} /></div>}
                      </button>
                   </div>
                   
                   <div className="main-nav-deck-v17">
                     <button onClick={playPrevious} className="nav-icon-btn" disabled={isFinalMode}>
                       <SkipBack size={36} fill="currentColor" />
                     </button>
                     <button onClick={togglePlay} className="play-giant-v17">
                       {!isLoaded && !isFinalMode ? (
                         <div className="deck-spinner"></div>
                       ) : isPlaying ? (
                         <Pause size={44} fill="currentColor" />
                       ) : (
                         <Play size={44} fill="currentColor" className="ml-1" />
                       )}
                     </button>
                     <button onClick={playNext} className="nav-icon-btn" disabled={isFinalMode}>
                       <SkipForward size={36} fill="currentColor" />
                     </button>
                   </div>

                   <div className="side-params-v17 right-side relative">
                      <div className="vol-v17-row">
                        <Volume2 size={24} className="opacity-40" />
                        <input 
                          type="range" 
                          min="0" 
                          max="1" 
                          step="0.01" 
                          value={volume}
                          onChange={(e) => setVolume(parseFloat(e.target.value))}
                          className="vol-v17-slider"
                          style={{ '--volume-perc': `${volume * 100}%` } as any}
                        />
                      </div>

                      <div className="final-mode-lockdown-v17">
                         <div className="practice-info-v13">
                            <Timer size={16} className={isFinalMode ? 'text-danger' : 'opacity-20'} />
                            <span className={isFinalMode ? 'text-danger' : 'opacity-20'}>Final Mode</span>
                         </div>
                         <label className="switch-v13">
                           <input 
                             type="checkbox" 
                             checked={isFinalMode} 
                             onChange={toggleFinalMode} 
                             disabled={!!activeMode}
                           />
                           <span className="slider-v13 round-v11"></span>
                         </label>
                      </div>
                   </div>
                </div>
             </div>
          </div>
        </main>

        <aside className="dp-sidebar-console-v8 glass">
           <header className="sidebar-header-minimal-v8">
             {selectedStyle ? (
               <button onClick={() => setSelectedStyle(null)} className="better-back-btn">
                 <ArrowLeft size={16} />
                 <span>Back</span>
               </button>
             ) : (
               <div style={{ height: '32px' }}></div>
             )}
             <button onClick={onClose} className="console-exit-btn glass"><X size={18} /></button>
           </header>
           
           <div className="sidebar-scroll custom-scrollbar">
              {activeMode ? (
                <div className="competition-queue-v32">
                   <div className="px-1" style={{ marginBottom: '24px', paddingTop: '16px' }}>
                     <span className="program-badge active-session">Competition Queue: {activeMode}</span>
                   </div>
                   <div className="queue-list-v32">
                      {sessionTracks.map((t, i) => {
                        const isActive = t.title === title || t.id === title;
                        const isUpcoming = !isActive && i > sessionTracks.findIndex(tr => tr.title === title || tr.id === title);
                        const isPlayed = !isActive && i < sessionTracks.findIndex(tr => tr.title === title || tr.id === title);
                        
                        return (
                          <div 
                            key={`${t.id}-${i}`} 
                            className={`session-track-row ${isActive ? 'is-active' : ''} ${isPlayed ? 'is-played' : ''}`}
                            onClick={() => loadTrack(t, false, true)}
                          >
                            <span className="queue-idx">{(i + 1).toString().padStart(2, '0')}</span>
                            <div className="queue-blob">
                              {isActive ? (
                                <div className="queue-marquee-wrap">
                                  <Marquee text={t.title} speed={45} isActive={true} className="track-name-marquee" />
                                </div>
                              ) : (
                                <span className="track-name truncate">{t.title}</span>
                              )}
                              <div className="artist-badge-row">
                                <span className="track-origin truncate">{t.artist}</span>
                                {styles.find(s => s.title.toLowerCase() === t.style?.toLowerCase()) && (
                                  <span 
                                    className="style-badge-pill" 
                                    style={{ backgroundColor: styles.find(s => s.title.toLowerCase() === t.style?.toLowerCase())?.color }}
                                  >
                                    {t.style}
                                  </span>
                                )}
                              </div>
                            </div>
                            <div className="queue-status">
                               {isActive ? <div className="playing-pulse"></div> : 
                                isPlayed ? <span className="text-[10px] opacity-30 italic">Played</span> :
                                <span className="text-[10px] opacity-30">Next</span>}
                            </div>
                          </div>
                        );
                      })}
                   </div>
                </div>
              ) : !selectedStyle ? (
                <div className="catalog-sections flex flex-col" style={{ gap: '40px' }}>
                {/* Latin Section */}
                {latinStyles.length > 0 && (
                  <section>
                    <div className="px-1" style={{ marginBottom: '16px', paddingTop: '16px' }}>
                      <span className="program-badge latin">International Latin</span>
                    </div>
                    <div className="sidebar-catalog-grid">
                      {latinStyles.map(style => {
                        const count = tracks.filter(t => t.style === style.title).length;
                        return (
                          <div 
                            key={style.id} 
                            className="sidebar-style-card glass"
                            style={{ backgroundColor: `${style.color}15` }}
                            onClick={() => setSelectedStyle(style.title)}
                          >
                            <div className="card-inner-sidebar">
                              <div className="style-icon-small">
                                <Music2 size={16} color={style.color} />
                              </div>
                              <div className="style-info-sidebar">
                                <h3>{style.title}</h3>
                                <p>{count} {count === 1 ? 'Track' : 'Tracks'}</p>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </section>
                )}

                {/* Standard Section */}
                {standardStyles.length > 0 && (
                  <section>
                    <div className="px-1" style={{ marginBottom: '16px', paddingTop: '16px' }}>
                      <span className="program-badge standard">International Standard</span>
                    </div>
                    <div className="sidebar-catalog-grid">
                      {standardStyles.map(style => {
                        const count = tracks.filter(t => t.style === style.title).length;
                        return (
                          <div 
                            key={style.id} 
                            className="sidebar-style-card glass"
                            style={{ backgroundColor: `${style.color}15` }}
                            onClick={() => setSelectedStyle(style.title)}
                          >
                            <div className="card-inner-sidebar">
                              <div className="style-icon-small">
                                <Music2 size={16} color={style.color} />
                              </div>
                              <div className="style-info-sidebar">
                                <h3>{style.title}</h3>
                                <p>{count} {count === 1 ? 'Track' : 'Tracks'}</p>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </section>
                )}

                {/* Fitness Section */}
                {fitnessStyles.length > 0 && (
                  <section>
                    <div className="px-1" style={{ marginBottom: '16px', paddingTop: '16px' }}>
                      <span className="program-badge fitness">Fitness</span>
                    </div>
                    <div className="sidebar-catalog-grid">
                      {fitnessStyles.map(style => {
                        const count = tracks.filter(t => t.style === style.title).length;
                        return (
                          <div 
                            key={style.id} 
                            className="sidebar-style-card glass"
                            style={{ backgroundColor: `${style.color}15` }}
                            onClick={() => setSelectedStyle(style.title)}
                          >
                            <div className="card-inner-sidebar">
                              <div className="style-icon-small">
                                <Music2 size={16} color={style.color} />
                              </div>
                              <div className="style-info-sidebar">
                                <h3>{style.title}</h3>
                                <p>{count} {count === 1 ? 'Track' : 'Tracks'}</p>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </section>
                )}
              </div>
             ) : (
               <div className="tracklist-deck-v6">
                  {filteredTracks.map((t, i) => (
                    <button 
                      key={t.id} 
                      className={`deck-track-row ${t.title === title ? 'is-active' : ''}`}
                      onClick={() => loadTrack(t)}
                    >
                      <span className="track-idx-pro">{(i + 1).toString().padStart(2, '0')}</span>
                      <div className="track-blob">
                        {t.title === title ? (
                          <div className="track-marquee-wrap">
                            <Marquee text={t.title} speed={45} isActive={true} className="track-name-marquee" />
                          </div>
                        ) : (
                          <span className="track-name truncate">{t.title}</span>
                        )}
                        <div className="artist-badge-row">
                          <span className="track-origin truncate">{t.artist}</span>
                          {styles.find(s => s.title.toLowerCase() === t.style?.toLowerCase()) && (
                            <span 
                              className="style-badge-pill" 
                              style={{ backgroundColor: styles.find(s => s.title.toLowerCase() === t.style?.toLowerCase())?.color }}
                            >
                              {t.style}
                            </span>
                          )}
                        </div>
                      </div>
                      <span className="track-tag-pro">{t.bpm}</span>
                    </button>
                  ))}
               </div>
             )}
           </div>
        </aside>
      </div>

      <style jsx>{`
        .desktop-player-overlay {
          position: fixed;
          inset: 0;
          z-index: 9999;
          background: #121212;
          display: flex;
          overflow: hidden;
          color: white;
          --accent: #1db954;
          font-family: 'Inter', sans-serif;
        }

        .final-active { --accent: #ef4444; }
        .text-danger { color: #ef4444; }

        .dp-console-wrapper {
          position: relative;
          z-index: 3;
          display: grid;
          grid-template-columns: 1fr 440px;
          width: 100%;
          height: 100vh;
          padding: 0 0 0 64px;
          gap: 0;
        }

        @media (max-width: 1360px) {
          .dp-console-wrapper {
            grid-template-columns: 1fr 340px;
            padding: 0 0 0 32px;
            gap: 0;
          }
        }

        .dp-player-console {
          display: flex;
          flex-direction: column;
          height: 100%;
          justify-content: center;
          transform: translateY(-6%); /* Raised total 6% per user request */
        }
               @media (max-height: 950px) {
          .console-body { gap: 32px !important; }
          .metadata-stage { transform: scale(0.95); }
        }

        @media (max-height: 850px) {
          .dp-player-console { transform: scale(0.9) translateY(-6%); transform-origin: left center; }
          .console-body { gap: 24px !important; }
          .metadata-stage { transform: scale(0.9); margin-top: -10px; }
          .transport-section { margin-top: 10px; }
        }
        
        @media (max-height: 750px) {
          .dp-player-console { transform: scale(0.85) translateY(-6%); transform-origin: left center; }
          .console-body { gap: 16px !important; }
          .metadata-stage { transform: scale(0.85); margin-top: -20px; }
          .transport-section { margin-top: 0; }
        }

        @media (max-height: 680px) {
          .dp-player-console { transform: scale(0.75) translateY(-6%); transform-origin: left center; }
          .console-header-v3 { margin-bottom: 0 !important; }
        }

        .console-body { 
          flex: 1; 
          display: flex; 
          flex-direction: column; 
          align-items: center; 
          justify-content: center; 
          gap: 64px; 
          position: relative;
        }

         .visualizer-stage-v8 { position: relative; }

        .vinyl-disc-v8 { 
          width: 288px; 
          height: 288px; 
          border-radius: 50%; 
          background: #121212; 
          position: relative; 
          overflow: hidden; 
          transition: all 0.5s cubic-bezier(0.16, 1, 0.3, 1);
          border: 4px solid var(--accent);
        }
        .vinyl-disc-v8.final-active { --accent: #ef4444; border-color: #ef4444; box-shadow: 0 20px 60px rgba(0,0,0,0.6), inset 0 0 0 1px rgba(255,255,255,0.1); }
        .vinyl-disc-v8.standard-active { border-color: #1db954; box-shadow: 0 20px 60px rgba(0,0,0,0.6), inset 0 0 0 1px rgba(255,255,255,0.1); }

        @media (max-width: 1360px) {
          .vinyl-disc-v8 { width: 220px; height: 220px; }
        }
        
        @media (max-height: 900px) {
          .vinyl-disc-v8 { width: 180px; height: 180px; }
        }
        
        @media (max-height: 800px) {
          .vinyl-disc-v8 { width: 140px; height: 140px; }
        }

        .disc-inner-glow-v8 {
          position: absolute;
          inset: 0;
          background: radial-gradient(circle at center, rgba(29, 185, 84, 0.3) 0%, transparent 70%);
          z-index: 2;
        }
        .final-active .disc-inner-glow-v8 { background: radial-gradient(circle at center, rgba(239, 68, 68, 0.3) 0%, transparent 70%); }

        .disc-art-img-v8 { width: 100%; height: 100%; object-fit: cover; opacity: 0.9; position: relative; z-index: 1; }
        
        .countdown-ring {
          position: absolute;
          inset: 0;
          background: rgba(0,0,0,0.98);
          border-radius: 50%;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          z-index: 10;
          backdrop-filter: blur(30px);
          border: 2px solid var(--accent);
        }
        .countdown-ring .count { font-size: 80px; font-weight: 900; color: var(--accent); }
        .countdown-ring .label { font-size: 10px; font-weight: 900; text-transform: uppercase; letter-spacing: 5px; opacity: 0.2; }

        .metadata-stage { width: 100%; max-width: 900px; display: flex; flex-direction: column; align-items: center; position: relative; z-index: 1000; }
        .metadata-actions-refined { display: flex; align-items: center; justify-content: center; width: 100%; }
        
        .refined-title-v8 { font-size: 22.8px; font-weight: 900; letter-spacing: -0.4px; line-height: 1.2; color: white; text-align: center; }
        .refined-artist-v8 { font-size: 13px; text-transform: uppercase; font-weight: 800; letter-spacing: 4px; opacity: 0.4; margin-top: 8px; text-align: center; color: white; }

        @media (max-width: 1360px) {
          .refined-title-v8 { font-size: 18px; }
          .refined-artist-v8 { font-size: 11px; letter-spacing: 3px; }
        }
        
        .console-action-btn-v13 { color: rgba(255,255,255,0.6); transition: all 0.2s; padding: 12px; transform: translateY(48px); cursor: pointer; }
        .favorite-btn-pro { transform: translate(-120px, 48px) !important; }
        .gauge-trigger-v19 { transform: translate(120px, 48px) !important; }
        .console-action-btn-v13:hover { color: white; opacity: 1; }
        .favorite-btn-pro:hover { transform: translate(-120px, 48px) scale(1.1) !important; }
        .gauge-trigger-v19:hover { transform: translate(120px, 48px) scale(1.1) !important; }
        .console-action-btn-v13.active { color: var(--accent); opacity: 1; }
        .favorite-btn-pro.active { color: #ef4444 !important; }

        .speed-popover-v17 {
          position: absolute;
          bottom: 100%;
          right: 0;
          transform: translateY(380px);
          margin-bottom: 0;
          z-index: 99999;
          background: #0d0d0d;
          border: 1px solid rgba(255,255,255,0.1);
          border-radius: 20px;
          padding: 24px;
          box-shadow: 0 16px 48px rgba(0,0,0,0.8);
          width: 380px;
        }

        .program-badge {
          font-size: 10.45px;
          font-weight: 800;
          text-transform: uppercase;
          padding: 6px 12px;
          border-radius: 10px;
          background: rgba(255, 255, 255, 0.03);
          letter-spacing: 1.2px;
          display: inline-block;
        }
        .program-badge.latin { color: #f7971e; border: 1px solid rgba(247, 151, 30, 0.3); }
        .program-badge.standard { color: #2193b0; border: 1px solid rgba(33, 147, 176, 0.3); }
        .program-badge.fitness { color: #1db954; border: 1px solid rgba(29, 185, 84, 0.3); }

        .sidebar-catalog-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 10px;
        }

        .sidebar-style-card {
          padding: 12px 10px;
          border-radius: 14px;
          display: flex;
          align-items: center;
          position: relative;
          transition: all 0.3s ease;
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid rgba(255, 255, 255, 0.05);
          cursor: pointer;
        }
        .sidebar-style-card:hover { transform: translateY(-2px); background: rgba(255, 255, 255, 0.08); }

        .card-inner-sidebar {
          display: flex;
          align-items: center;
          gap: 10px;
          width: 100%;
        }

        .style-icon-small {
          width: 32px;
          height: 32px;
          border-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: rgba(0, 0, 0, 0.2);
          flex-shrink: 0;
        }

        .style-info-sidebar h3 {
          font-size: 10.45px;
          font-weight: 700;
          margin: 0;
          line-height: 1.2;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          max-width: 90px;
        }
        .style-info-sidebar p {
          font-size: 8.55px;
          color: rgba(255,255,255,0.4);
          margin-top: 1px;
        }

        .bpm-pill { 
          padding: 10px 32px; 
          border-radius: 40px; 
          font-weight: 900; 
          font-size: 10.45px; 
          text-transform: uppercase; 
          letter-spacing: 3px;
          color: var(--accent); 
          background: rgba(255,255,255,0.05);
          border: 1px solid rgba(255,255,255,0.1);
        }

        /* CONTROL STAGE: stacks the timeline and the transport deck with a
           guaranteed vertical gap. Previously control-stage had no styling, so
           the progress bar and the buttons could collide on shorter screens
           (e.g. iPad, or a desktop window with the bookmarks bar showing). */
        .control-stage {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 28px;
          width: 100%;
        }
        @media (max-height: 850px) { .control-stage { gap: 20px; } }
        @media (max-height: 750px) { .control-stage { gap: 14px; } }

        /* TIMELINE V13 */
        .timeline-strip-pro-v13 { 
          display: flex; 
          align-items: center; 
          gap: 24px; 
          width: 740px; 
          margin-bottom: 0;
          transform: none;
        }

        @media (max-width: 1360px) {
          .timeline-strip-pro-v13 { width: 100%; max-width: 600px; gap: 16px; }
        }
        .time-code { font-family: 'JetBrains Mono', monospace; font-size: 10.45px; opacity: 0.15; width: 44px; text-align: center; }
        .timeline-track-thick { flex: 1; height: 10px; background: rgba(255,255,255,0.06); border-radius: 5px; position: relative; cursor: pointer; display: flex; align-items: center; }
        .timeline-fill { height: 100%; background: var(--accent); border-radius: 5px; transition: width 0.1s linear; }
        .timeline-head-bold { width: 18px; height: 18px; background: white; border-radius: 50%; position: absolute; transform: translate(-50%, -50%); top: 50%; box-shadow: 0 4px 16px rgba(0,0,0,1); }

        /* V17: Parametric Lockdown CSS */
        .transport-deck-v17 { 
          display: flex; 
          align-items: center; 
          gap: 48px; 
          width: 740px; 
          justify-content: space-between; 
          height: 90px;
          position: relative;
        }

        @media (max-width: 1360px) {
          .transport-deck-v17 { width: 100%; max-width: 600px; gap: 24px; height: 70px; }
          .side-params-v17 { width: 160px; }
          .main-nav-deck-v17 { gap: 32px; }
          .play-giant-v17 { width: 70px; height: 70px; }
          .play-giant-v17 :global(svg) { width: 32px; height: 32px; }
        }
        
        .side-params-v17 { width: 220px; height: 100%; display: flex; align-items: center; }
        .side-params-v17.left-side { justify-content: flex-start; }
        .side-params-v17.right-side { justify-content: flex-end; }

        .universal-mode-btn-v17 { color: rgba(255,255,255,0.2); transition: all 0.2s; }
        .universal-mode-btn-v17.active { color: var(--accent); opacity: 1; }

        .main-nav-deck-v17 { display: flex; align-items: center; gap: 48px; height: 100%; }
        .play-giant-v17 { 
          width: 90px; height: 90px; background: var(--accent); border-radius: 50%; display: flex; align-items: center; justify-content: center; color: black; box-shadow: 0 16px 40px rgba(0,0,0,0.6); transition: all 0.3s; 
        }

        .vol-v17-row { display: flex; align-items: center; gap: 16px; width: 100%; justify-content: flex-end; }
        .vol-v17-slider { 
          width: 120px; 
          height: 4px; 
          -webkit-appearance: none; 
          background: linear-gradient(to right, 
            var(--accent) 0%, 
            var(--accent) var(--volume-perc), 
            rgba(255,255,255,0.1) var(--volume-perc), 
            rgba(255,255,255,0.1) 100%
          );
          border-radius: 2px; 
          outline: none;
        }
        .vol-v17-slider::-webkit-slider-thumb { 
          -webkit-appearance: none; 
          width: 14px; 
          height: 14px; 
          border-radius: 50%; 
          background: white; 
          cursor: pointer; 
          border: 2px solid black; 
          box-shadow: 0 0 5px rgba(0,0,0,0.5);
          transition: transform 0.2s;
        }
        .vol-v17-slider:hover::-webkit-slider-thumb {
          transform: scale(1.15);
        }

        /* DECOUPLED FINAL MODE - The key fix */
        .final-mode-lockdown-v17 { 
          position: absolute;
          top: 100%;
          right: 0;
          margin-top: 48px; /* High margin for clear separation */
          display: flex; 
          align-items: center; 
          gap: 12px; 
          padding: 8px 16px; 
          border-radius: 20px; 
          background: rgba(255,255,255,0.03); 
          border: 1px solid rgba(255,255,255,0.05);
          white-space: nowrap;
        }

        .stage-footer-v15-absolute { 
          position: absolute; 
          bottom: -20px; 
          right: 0; 
          width: 740px; 
          left: 50%; 
          transform: translateX(-50%);
          display: flex;
          justify-content: flex-end;
          z-index: 50;
        }

        .switch-v13 { position: relative; display: inline-block; width: 32px; height: 18px; }
        .switch-v13 input { opacity: 0; width: 0; height: 0; }
        .slider-v13 { position: absolute; cursor: pointer; inset: 0; background-color: rgba(255,255,255,0.1); transition: .3s; }
        .slider-v13:before { position: absolute; content: ""; height: 10px; width: 10px; left: 4px; bottom: 4px; background-color: white; transition: .3s; }
        input:checked + .slider-v13 { background-color: var(--accent); }
        input:checked + .slider-v13:before { transform: translateX(14px); }

        .round-v11 { border-radius: 30px; }
        .round-v11:before { border-radius: 50%; }

        /* SIDEBAR - Straight Divider Redesign */
        .dp-sidebar-console-v8 { 
          border-radius: 0; 
          display: flex; 
          flex-direction: column; 
          overflow: hidden; 
          border: none;
          border-left: 1px solid rgba(255,255,255,0.15); /* THE STRAIGHT DIVIDER */
          background: rgba(0,0,0,0.3); 
          backdrop-filter: blur(40px); 
          height: 100vh;
        }
        .sidebar-header-minimal-v8 { 
          padding: 16px 32px; 
          display: flex; 
          justify-content: space-between; 
          align-items: center; 
          border-bottom: none; 
          min-height: 70px; /* Reduced to help lift content */
          transform: translateY(5px); /* Lowered 2% for better button ergonomics */
        }
        
        .better-back-btn { display: flex; align-items: center; gap: 12px; padding: 10px 24px; border-radius: 16px; background: rgba(255,255,255,0.06); font-size: 10.45px; font-weight: 900; text-transform: uppercase; color: var(--accent); transition: all 0.3s; }
        .better-back-btn:hover { background: var(--accent); color: black; }

        .console-exit-btn { width: 48px; height: 48px; border-radius: 14px; display: flex; align-items: center; justify-content: center; }

        .sidebar-scroll { 
          flex: 1; 
          overflow-y: auto; 
          padding: 16px 32px 32px 32px; /* Reduced top padding to lift containers */
          transform: translateY(-12px); /* Lowered 2% from previous -20px position */
        }
        .section-label-v9 { font-size: 10.45px; font-weight: 900; text-transform: uppercase; letter-spacing: 4px; opacity: 0.1; }

        .catalog-grid-v8 { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
        .catalog-box-v8 { 
          padding: 20px 24px; 
          border-radius: 16px; 
          text-align: left; 
          display: flex; 
          justify-content: space-between; 
          align-items: center; 
          background: rgba(255,255,255,0.04); 
          border: 1px solid rgba(255,255,255,0.03);
        }
        .catalog-box-v8:hover { background: rgba(255,255,255,0.08); transform: translateY(-2px); }
        .style-name-v8 { font-weight: 900; font-size: 13.3px; color: white; }
        .style-count-v8 { font-size: 9.5px; font-weight: 800; opacity: 0.3; }

        .tracklist-deck-v6 { display: flex; flex-direction: column; gap: 4px; }
        .deck-track-row { 
          display: flex; 
          align-items: center; 
          gap: 16px; 
          padding: 16px 24px; 
          border-radius: 12px; /* Standard refined radius from other pages */
          width: 100%; 
          text-align: left; 
          background: rgba(255,255,255,0.03); /* Matched to global row style */
          border: 1px solid rgba(255,255,255,0.05); /* Added border to match other list styles */
          transition: all 0.2s;
        }
        .deck-track-row:hover { background: rgba(255,255,255,0.08); }
        .deck-track-row.is-active { 
          background: rgba(29, 185, 84, 0.1); 
          border: 1px solid rgba(29, 185, 84, 0.4);
          color: white; /* Changed from green to white for better contrast */
        }
        .track-idx-pro { font-weight: 900; opacity: 0.15; font-size: 11.4px; width: 24px; }
        .track-blob { flex: 1; min-width: 0; display: flex; flex-direction: column; overflow: hidden; }
        .track-name { font-weight: 900; font-size: 13.3px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; display: block; }
        .queue-marquee-wrap, .track-marquee-wrap { width: 100%; overflow: hidden; height: 1.2em; display: flex; align-items: center; }
        .track-name-marquee { font-weight: 900 !important; font-size: 13.3px; color: inherit; width: 100%; }
        .track-name-marquee :global(.marquee-text) { font-weight: 900 !important; display: inline-block; }
        .track-origin { font-size: 10.45px; opacity: 0.4; text-transform: uppercase; font-weight: 700; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .track-tag-pro { font-weight: 900; font-size: 9.5px; opacity: 0.3; flex-shrink: 0; }
        .track-name-marquee :global(.marquee-content) { font-weight: 900 !important; }

        .deck-spinner { width: 24px; height: 24px; border: 3px solid rgba(0,0,0,0.1); border-top: 3px solid black; border-radius: 50%; animation: spin 1s linear infinite; }
        @keyframes smooth-spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }

        .custom-scrollbar::-webkit-scrollbar { width: 2px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.06); border-radius: 10px; }
        .competition-queue-v32 { padding-bottom: 40px; }
        .queue-list-v32 { display: flex; flex-direction: column; gap: 8px; }
        .session-track-row { 
          display: flex; align-items: center; gap: 16px; padding: 14px 16px; 
          background: rgba(255,255,255,0.03); border-radius: 16px; 
          border: 1px solid rgba(255,255,255,0.05); transition: all 0.2s;
          cursor: pointer;
        }
        .session-track-row:hover {
          background: rgba(255,255,255,0.06);
          transform: translateX(4px);
        }
        .session-track-row.is-active { 
          background: rgba(29, 185, 84, 0.1); border-color: rgba(29, 185, 84, 0.4); 
          box-shadow: 0 0 20px rgba(0,0,0,0.3);
          transform: none; /* No shift for active track */
        }
        .session-track-row.is-played { opacity: 0.4; filter: grayscale(1); }
        .queue-idx { font-size: 11px; font-weight: 900; opacity: 0.3; font-family: 'JetBrains Mono', monospace; min-width: 20px; }
        .queue-blob { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 2px; }
        .queue-status { min-width: 50px; text-align: right; }
        .playing-pulse { width: 8px; height: 8px; background: #1db954; border-radius: 50%; display: inline-block; animation: pulse 1.5s infinite; }
        @keyframes pulse { 0% { transform: scale(1); opacity: 1; } 50% { transform: scale(1.5); opacity: 0.5; } 100% { transform: scale(1); opacity: 1; } }
        .program-badge.active-session { background: rgba(29, 185, 84, 0.2); color: #1db954; border: 1px solid rgba(29, 185, 84, 0.4); }
      `}</style>
    </div>,
    document.body
  );
}
