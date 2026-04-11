"use client";

import React, { useState, useRef, useEffect } from 'react';
import {
  Play,
  Pause,
  Trash2,
  GripVertical,
  Music2,
  Disc,
  Zap,
  Activity,
  MicOff,
  Dumbbell,
  Info,
  ArrowRight
} from 'lucide-react';
import Link from 'next/link';
import { useAudio } from '@/components/audio/AudioProvider';
import { useStudio, Track } from '@/components/admin/StudioProvider';
import { useAuth } from '@/context/AuthContext';
import { getMPMFromBPM } from '@/utils/audio';
import ConfirmModal from '@/components/admin/ConfirmModal';
import { formatDuration } from '@/utils/format';

const FinalsPage = () => {
  const { 
    tracks, 
    finalTracks, 
    removeFromFinal, 
    reorderFinalTracks,
    setFinalTracks
  } = useStudio();
  const { 
    loadTrack, isPlaying, title: playingTitle, currentTime, trackCurrentTime, duration, 
    isPauseCountdown, pauseTime, stop, isFitness, setIsFitness,
    activeMode, setActiveMode, sessionTracks, setSessionTracks, sessionDuration
  } = useAudio();
  const { isAuthenticated, setIsAuthModalOpen } = useAuth();
  const [showStopConfirm, setShowStopConfirm] = useState(false);
  const [cardDim, setCardDim] = useState({ w: 0, h: 0 });
  const activeCardRef = useRef<HTMLDivElement>(null);
  const [showFitnessModal, setShowFitnessModal] = useState(false);
  const [fitnessDuration, setFitnessDuration] = useState(10); // Minutes
  const [fitnessDurationSecs, setFitnessDurationSecs] = useState(0); // Seconds

  useEffect(() => {
    if (!activeCardRef.current) return;
    const obs = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setCardDim({ w: entry.contentRect.width, h: entry.contentRect.height });
      }
    });
    obs.observe(activeCardRef.current);
    return () => obs.disconnect();
  }, [activeMode]);

  const generateDynamicPath = (w: number, h: number, r: number) => {
    if (w === 0 || h === 0) return "";
    const inset = 2; // Keep line perfectly centered on border
    // Start at Top-Middle (w/2, inset)
    return `M ${w/2} ${inset} 
            L ${w - r} ${inset} 
            Q ${w - inset} ${inset} ${w - inset} ${r} 
            L ${w - inset} ${h - r} 
            Q ${w - inset} ${h - inset} ${w - r} ${h - inset} 
            L ${r} ${h - inset} 
            Q ${inset} ${h - inset} ${inset} ${h - r} 
            L ${inset} ${r} 
            Q ${inset} ${inset} ${r} ${inset} 
            L ${w/2} ${inset}`;
  };
  
  const getTrackLimit = (t: Track) => t.style?.toLowerCase().includes('paso') ? (t.duration || 240) : 105;

  // Use global sessionTracks instead of Studio's finalTracks for active session UI
  const sessionList = (activeMode && sessionTracks.length > 0) ? sessionTracks : finalTracks;

  const currentTrackIndex = sessionList.findIndex(t => (t.id === playingTitle || t.title === playingTitle));
  const currentTrack = currentTrackIndex !== -1 ? sessionList[currentTrackIndex] : null;
  const currentTrackLimit = currentTrack ? getTrackLimit(currentTrack) : 100;
  const currentLimit = isPauseCountdown ? 15 : currentTrackLimit;
  const trackProgress = Math.min(trackCurrentTime / currentLimit, 1);

  // Source of truth for session progress is the AudioProvider
  const displayElapsedTime = currentTime;
  const displayTotalDuration = sessionDuration;
  const totalProgress = displayTotalDuration > 0 ? Math.min(displayElapsedTime / displayTotalDuration, 1) : 0;

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };
  
  const latinOrder = ["Samba", "Cha-cha-cha", "Rumba", "Paso Doble", "Jive"];
  const standardOrder = ["Slow Waltz", "Tango", "Viennese Waltz", "Slow Foxtrot", "Quickstep"];

  const handleProgramShuffle = (type: string) => {
    let order: string[] = [];
    let filterFn: (t: Track) => boolean = () => true;

    setIsFitness(false);
    switch (type) {
      case 'Latin':
        order = latinOrder;
        break;
      case 'Standard':
        order = standardOrder;
        break;
      case '10Dance':
        order = [...standardOrder, ...latinOrder];
        break;
      case '8Dance':
        order = [...standardOrder, ...latinOrder].filter(s => s !== "Slow Foxtrot" && s !== "Paso Doble");
        break;
      case '6Dance':
        order = [...standardOrder, ...latinOrder].filter(s => !["Slow Foxtrot", "Paso Doble", "Viennese Waltz", "Rumba"].includes(s));
        break;
      case 'InstLatin':
        order = latinOrder;
        filterFn = (t) => t.tags?.some(tag => tag.toLowerCase() === 'instrumental') || false;
        break;
      case 'InstStandard':
        order = standardOrder;
        filterFn = (t) => t.tags?.some(tag => tag.toLowerCase() === 'instrumental') || false;
        break;
      case 'JiveLatin':
        const jivePool = tracks.filter(t => t.style.toLowerCase() === 'jive');
        const latinPools = {
          Samba: tracks.filter(t => t.style.toLowerCase() === 'samba'),
          'Cha-cha-cha': tracks.filter(t => t.style.toLowerCase() === 'cha-cha-cha'),
          Rumba: tracks.filter(t => t.style.toLowerCase() === 'rumba'),
          'Paso Doble': tracks.filter(t => t.style.toLowerCase() === 'paso doble')
        };
        const jiveLatinTracks: Track[] = [];
        const pick = (pool: Track[]) => pool[Math.floor(Math.random() * pool.length)];
        
        // 1. Samba - Jive
        if (latinPools.Samba.length) jiveLatinTracks.push(pick(latinPools.Samba));
        if (jivePool.length) jiveLatinTracks.push(pick(jivePool));
        // 2. Cha-cha - Jive
        if (latinPools['Cha-cha-cha'].length) jiveLatinTracks.push(pick(latinPools['Cha-cha-cha']));
        if (jivePool.length) jiveLatinTracks.push(pick(jivePool));
        // 3. Rumba - Jive
        if (latinPools.Rumba.length) jiveLatinTracks.push(pick(latinPools.Rumba));
        if (jivePool.length) jiveLatinTracks.push(pick(jivePool));
        // 4. Paso - Jive
        if (latinPools['Paso Doble'].length) jiveLatinTracks.push(pick(latinPools['Paso Doble']));
        if (jivePool.length) jiveLatinTracks.push(pick(jivePool));
        // 5. Jive - Jive
        if (jivePool.length) {
          jiveLatinTracks.push(pick(jivePool));
          jiveLatinTracks.push(pick(jivePool));
        }
        if (jiveLatinTracks.length) {
          setActiveMode('JiveLatin');
          setSessionTracks(jiveLatinTracks);
          loadTrack(jiveLatinTracks[0], false, true);
        }
        return;
      case 'QuickstepStandard':
        const qsPool = tracks.filter(t => t.style.toLowerCase() === 'quickstep');
        const stdPools = {
          'Slow Waltz': tracks.filter(t => t.style.toLowerCase() === 'slow waltz'),
          Tango: tracks.filter(t => t.style.toLowerCase() === 'tango'),
          'Viennese Waltz': tracks.filter(t => t.style.toLowerCase() === 'viennese waltz'),
          'Slow Foxtrot': tracks.filter(t => t.style.toLowerCase() === 'slow foxtrot')
        };
        const qsStdTracks: Track[] = [];
        const pickStd = (pool: Track[]) => pool[Math.floor(Math.random() * pool.length)];

        // 1. Waltz - QS
        if (stdPools['Slow Waltz'].length) qsStdTracks.push(pickStd(stdPools['Slow Waltz']));
        if (qsPool.length) qsStdTracks.push(pickStd(qsPool));
        // 2. Tango - QS
        if (stdPools.Tango.length) qsStdTracks.push(pickStd(stdPools.Tango));
        if (qsPool.length) qsStdTracks.push(pickStd(qsPool));
        // 3. Viennese - QS
        if (stdPools['Viennese Waltz'].length) qsStdTracks.push(pickStd(stdPools['Viennese Waltz']));
        if (qsPool.length) qsStdTracks.push(pickStd(qsPool));
        // 4. Foxtrot - QS
        if (stdPools['Slow Foxtrot'].length) qsStdTracks.push(pickStd(stdPools['Slow Foxtrot']));
        if (qsPool.length) qsStdTracks.push(pickStd(qsPool));
        // 5. QS - QS
        if (qsPool.length) {
          qsStdTracks.push(pickStd(qsPool));
          qsStdTracks.push(pickStd(qsPool));
        }
        if (qsStdTracks.length) {
          setActiveMode('QuickstepStandard');
          setSessionTracks(qsStdTracks);
          loadTrack(qsStdTracks[0], false, true);
        }
        return;
      case 'Fitness':
        setShowFitnessModal(true);
        return;
    }

    const selectedTracks: Track[] = [];
    order.forEach((styleName: string) => {
      const styleTracks = tracks.filter((t: Track) => 
        t.style.toLowerCase() === styleName.toLowerCase() && filterFn(t)
      );
      if (styleTracks.length > 0) {
        const randomTrack = styleTracks[Math.floor(Math.random() * styleTracks.length)];
        selectedTracks.push(randomTrack);
      }
    });

    if (selectedTracks.length) {
      setActiveMode(type);
      setSessionTracks(selectedTracks);
      // Ensure we start playing
      loadTrack(selectedTracks[0], false, true);
    }
  };

  const handleStopProgram = () => {
    stop(); // stop() in context now handles setActiveMode(null) and setSessionTracks([])
    setShowStopConfirm(false);
    setIsFitness(false);
  };

  const startFitness = (selectedTargetSeconds: number) => {
    // 1. Filter by "Fitness" Style
    const fitnessPool = tracks.filter(t => 
      t.style?.toLowerCase() === 'fitness'
    );

    setIsFitness(true);
    
    if (fitnessPool.length === 0) {
      alert("No tracks found with Style 'Fitness'. Please assign tracks to the Fitness style in the Admin Panel.");
      setShowFitnessModal(false);
      return;
    }

    const targetSeconds = selectedTargetSeconds;
    let currentSeconds = 0;
    const selectedTracks: Track[] = [];
    const pool = [...fitnessPool].sort(() => 0.5 - Math.random());

    // Fill the queue until we hit the time limit
    let iterations = 0;
    while (currentSeconds < targetSeconds && iterations < 50) {
      const track = pool[iterations % pool.length];
      selectedTracks.push(track);
      currentSeconds += (track.duration || 120);
      iterations++;
    }

    setActiveMode('Fitness');
    setSessionTracks(selectedTracks);
    setShowFitnessModal(false);
    setIsFitness(true);
    // Fitness acts as a continuous Final session, so we MUST enable isFinalMode to use the queue
    loadTrack(selectedTracks[0], false, true);
  };

  const handleDragStart = (e: React.DragEvent, trackId: string) => {
    e.dataTransfer.setData('trackId', trackId);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  return (
    <div className="page-wrapper">
      <div className="finals-container animate-in">
        <header className="page-header-unified">
          <div>
            <h1>Final Mode</h1>
            <p className="text-secondary">Tournament Simulation & Practice</p>
          </div>
          <Link href="/learn-final-mode" className="learn-finals-btn">
            <Info size={18} />
            <span>&nbsp;How it works?</span>
            <ArrowRight size={16} className="arrow" />
          </Link>
        </header>

        <div className="finals-sectors-unified animate-in">
        
        <section className="programs-section">
          <header className="section-header">
          </header>
          
          <div className="programs-grid">
            <div className="prog-card-wrapper">
              <div 
                className={`prog-card latin glass ${activeMode === 'Latin' ? 'active' : ''}`} 
                onClick={() => activeMode === 'Latin' ? setShowStopConfirm(true) : handleProgramShuffle('Latin')}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => e.key === 'Enter' && (activeMode === 'Latin' ? setShowStopConfirm(true) : handleProgramShuffle('Latin'))}
              >
                {activeMode === 'Latin' && (
                  <>
                    <div className="rectangular-timer-border" ref={activeCardRef}>
                       <svg 
                         width={cardDim.w} 
                         height={cardDim.h} 
                         viewBox={`0 0 ${cardDim.w} ${cardDim.h}`} 
                         className="timer-svg"
                       >
                         <path 
                           d={generateDynamicPath(cardDim.w, cardDim.h, 20)}
                           className={`border-rect-progress ${isPauseCountdown ? 'resting' : 'playing'}`}
                           vectorEffect="non-scaling-stroke"
                           pathLength="1"
                           style={{ 
                             strokeDasharray: `${totalProgress} 10`,
                             strokeDashoffset: '0'
                           }}
                         />
                       </svg>
                    </div>
                    {isPauseCountdown && <div className="rest-timer-overlay pulse-intense">{pauseTime}</div>}
                  </>
                )}
                <div className="card-icon"><Zap size={24} /></div>
                <div className="card-info">
                  <h4>Latin</h4>
                  {activeMode === 'Latin' && <p className="session-timer">{formatTime(displayElapsedTime)} / {formatTime(displayTotalDuration)}</p>}
                </div>
              </div>
            </div>

            <div className="prog-card-wrapper">
              <div 
                className={`prog-card standard glass ${activeMode === 'Standard' ? 'active' : ''}`} 
                onClick={() => activeMode === 'Standard' ? setShowStopConfirm(true) : handleProgramShuffle('Standard')}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => e.key === 'Enter' && (activeMode === 'Standard' ? setShowStopConfirm(true) : handleProgramShuffle('Standard'))}
              >
                {activeMode === 'Standard' && (
                  <>
                    <div className="rectangular-timer-border" ref={activeCardRef}>
                       <svg 
                         width={cardDim.w} 
                         height={cardDim.h} 
                         viewBox={`0 0 ${cardDim.w} ${cardDim.h}`} 
                         className="timer-svg"
                       >
                         <path 
                           d={generateDynamicPath(cardDim.w, cardDim.h, 20)}
                           className={`border-rect-progress ${isPauseCountdown ? 'resting' : 'playing'}`}
                           vectorEffect="non-scaling-stroke"
                           pathLength="1"
                           style={{ 
                             strokeDasharray: `${totalProgress} 10`,
                             strokeDashoffset: '0'
                           }}
                         />
                       </svg>
                    </div>
                    {isPauseCountdown && <div className="rest-timer-overlay pulse-intense">{pauseTime}</div>}
                  </>
                )}
                <div className="card-icon"><Activity size={24} /></div>
                <div className="card-info">
                  <h4>Standard</h4>
                  {activeMode === 'Standard' && <p className="session-timer">{formatTime(displayElapsedTime)} / {formatTime(displayTotalDuration)}</p>}
                </div>
              </div>
            </div>

            <div className="prog-card-wrapper">
              <div 
                className={`prog-card all-dance glass ${activeMode === '10Dance' ? 'active' : ''}`} 
                onClick={() => activeMode === '10Dance' ? setShowStopConfirm(true) : handleProgramShuffle('10Dance')}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => e.key === 'Enter' && (activeMode === '10Dance' ? setShowStopConfirm(true) : handleProgramShuffle('10Dance'))}
              >
                {activeMode === '10Dance' && (
                  <>
                    <div className="rectangular-timer-border" ref={activeCardRef}>
                       <svg 
                         width={cardDim.w} 
                         height={cardDim.h} 
                         viewBox={`0 0 ${cardDim.w} ${cardDim.h}`} 
                         className="timer-svg"
                       >
                         <path 
                           d={generateDynamicPath(cardDim.w, cardDim.h, 20)}
                           className={`border-rect-progress ${isPauseCountdown ? 'resting' : 'playing'}`}
                           vectorEffect="non-scaling-stroke"
                           pathLength="1"
                           style={{ 
                             strokeDasharray: `${totalProgress} 10`,
                             strokeDashoffset: '0'
                           }}
                         />
                       </svg>
                    </div>
                    {isPauseCountdown && <div className="rest-timer-overlay pulse-intense">{pauseTime}</div>}
                  </>
                )}
                <div className="card-icon"><Disc size={24} /></div>
                <div className="card-info">
                  <h4>10-Dance</h4>
                  {activeMode === '10Dance' && <p className="session-timer">{formatTime(displayElapsedTime)} / {formatTime(displayTotalDuration)}</p>}
                </div>
              </div>
            </div>

            <div className="prog-card-wrapper">
              <div 
                className={`prog-card eight-dance glass ${activeMode === '8Dance' ? 'active' : ''}`} 
                onClick={() => activeMode === '8Dance' ? setShowStopConfirm(true) : handleProgramShuffle('8Dance')}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => e.key === 'Enter' && (activeMode === '8Dance' ? setShowStopConfirm(true) : handleProgramShuffle('8Dance'))}
              >
                {activeMode === '8Dance' && (
                  <>
                    <div className="rectangular-timer-border" ref={activeCardRef}>
                       <svg 
                         width={cardDim.w} 
                         height={cardDim.h} 
                         viewBox={`0 0 ${cardDim.w} ${cardDim.h}`} 
                         className="timer-svg"
                       >
                         <path 
                           d={generateDynamicPath(cardDim.w, cardDim.h, 20)}
                           className={`border-rect-progress ${isPauseCountdown ? 'resting' : 'playing'}`}
                           vectorEffect="non-scaling-stroke"
                           pathLength="1"
                           style={{ 
                             strokeDasharray: `${totalProgress} 10`,
                             strokeDashoffset: '0'
                           }}
                         />
                       </svg>
                    </div>
                    {isPauseCountdown && <div className="rest-timer-overlay pulse-intense">{pauseTime}</div>}
                  </>
                )}
                <div className="card-icon"><Music2 size={24} /></div>
                <div className="card-info">
                  <h4>8-Dance</h4>
                  {activeMode === '8Dance' && <p className="session-timer">{formatTime(displayElapsedTime)} / {formatTime(displayTotalDuration)}</p>}
                </div>
              </div>
            </div>

            <div className="prog-card-wrapper">
              <div 
                className={`prog-card six-dance glass ${activeMode === '6Dance' ? 'active' : ''}`} 
                onClick={() => activeMode === '6Dance' ? setShowStopConfirm(true) : handleProgramShuffle('6Dance')}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => e.key === 'Enter' && (activeMode === '6Dance' ? setShowStopConfirm(true) : handleProgramShuffle('6Dance'))}
              >
                {activeMode === '6Dance' && (
                  <>
                    <div className="rectangular-timer-border" ref={activeCardRef}>
                       <svg 
                         width={cardDim.w} 
                         height={cardDim.h} 
                         viewBox={`0 0 ${cardDim.w} ${cardDim.h}`} 
                         className="timer-svg"
                       >
                         <path 
                           d={generateDynamicPath(cardDim.w, cardDim.h, 20)}
                           className={`border-rect-progress ${isPauseCountdown ? 'resting' : 'playing'}`}
                           vectorEffect="non-scaling-stroke"
                           pathLength="1"
                           style={{ 
                             strokeDasharray: `${totalProgress} 10`,
                             strokeDashoffset: '0'
                           }}
                         />
                       </svg>
                    </div>
                    {isPauseCountdown && <div className="rest-timer-overlay pulse-intense">{pauseTime}</div>}
                  </>
                )}
                <div className="card-icon"><Zap size={20} /></div>
                <div className="card-info">
                  <h4>6-Dance</h4>
                  {activeMode === '6Dance' && <p className="session-timer">{formatTime(displayElapsedTime)} / {formatTime(displayTotalDuration)}</p>}
                </div>
              </div>
            </div>

            <div className="prog-card-wrapper">
              <div 
                className={`prog-card inst-latin glass ${activeMode === 'InstLatin' ? 'active' : ''}`} 
                onClick={() => activeMode === 'InstLatin' ? setShowStopConfirm(true) : handleProgramShuffle('InstLatin')}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => e.key === 'Enter' && (activeMode === 'InstLatin' ? setShowStopConfirm(true) : handleProgramShuffle('InstLatin'))}
              >
                {activeMode === 'InstLatin' && (
                  <>
                    <div className="rectangular-timer-border" ref={activeCardRef}>
                       <svg 
                         width={cardDim.w} 
                         height={cardDim.h} 
                         viewBox={`0 0 ${cardDim.w} ${cardDim.h}`} 
                         className="timer-svg"
                       >
                         <path 
                           d={generateDynamicPath(cardDim.w, cardDim.h, 20)}
                           className={`border-rect-progress ${isPauseCountdown ? 'resting' : 'playing'}`}
                           vectorEffect="non-scaling-stroke"
                           pathLength="1"
                           style={{ 
                             strokeDasharray: `${totalProgress} 10`,
                             strokeDashoffset: '0'
                           }}
                         />
                       </svg>
                    </div>
                    {isPauseCountdown && <div className="rest-timer-overlay pulse-intense">{pauseTime}</div>}
                  </>
                )}
                <div className="card-icon"><MicOff size={24} /></div>
                <div className="card-info">
                  <h4>Inst. Latin</h4>
                  {activeMode === 'InstLatin' && <p className="session-timer">{formatTime(displayElapsedTime)} / {formatTime(displayTotalDuration)}</p>}
                </div>
              </div>
            </div>

            <div className="prog-card-wrapper">
              <div 
                className={`prog-card inst-std glass ${activeMode === 'InstStandard' ? 'active' : ''}`} 
                onClick={() => activeMode === 'InstStandard' ? setShowStopConfirm(true) : handleProgramShuffle('InstStandard')}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => e.key === 'Enter' && (activeMode === 'InstStandard' ? setShowStopConfirm(true) : handleProgramShuffle('InstStandard'))}
              >
                {activeMode === 'InstStandard' && (
                  <>
                    <div className="rectangular-timer-border" ref={activeCardRef}>
                       <svg 
                         width={cardDim.w} 
                         height={cardDim.h} 
                         viewBox={`0 0 ${cardDim.w} ${cardDim.h}`} 
                         className="timer-svg"
                       >
                         <path 
                           d={generateDynamicPath(cardDim.w, cardDim.h, 20)}
                           className={`border-rect-progress ${isPauseCountdown ? 'resting' : 'playing'}`}
                           vectorEffect="non-scaling-stroke"
                           pathLength="1"
                           style={{ 
                             strokeDasharray: `${totalProgress} 10`,
                             strokeDashoffset: '0'
                           }}
                         />
                       </svg>
                    </div>
                    {isPauseCountdown && <div className="rest-timer-overlay pulse-intense">{pauseTime}</div>}
                  </>
                )}
                <div className="card-icon"><MicOff size={24} /></div>
                <div className="card-info">
                  <h4>Inst. Standard</h4>
                  {activeMode === 'InstStandard' && <p className="session-timer">{formatTime(displayElapsedTime)} / {formatTime(displayTotalDuration)}</p>}
                </div>
              </div>
            </div>

            <div className="prog-card-wrapper">
              <div 
                className={`prog-card jive-mode glass ${activeMode === 'JiveLatin' ? 'active' : ''}`} 
                onClick={() => activeMode === 'JiveLatin' ? setShowStopConfirm(true) : handleProgramShuffle('JiveLatin')}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => e.key === 'Enter' && (activeMode === 'JiveLatin' ? setShowStopConfirm(true) : handleProgramShuffle('JiveLatin'))}
              >
                {activeMode === 'JiveLatin' && (
                  <>
                    <div className="rectangular-timer-border" ref={activeCardRef}>
                       <svg 
                         width={cardDim.w} 
                         height={cardDim.h} 
                         viewBox={`0 0 ${cardDim.w} ${cardDim.h}`} 
                         className="timer-svg"
                       >
                         <path 
                           d={generateDynamicPath(cardDim.w, cardDim.h, 20)}
                           className={`border-rect-progress ${isPauseCountdown ? 'resting' : 'playing'}`}
                           vectorEffect="non-scaling-stroke"
                           pathLength="1"
                           style={{ 
                             strokeDasharray: `${totalProgress} 10`,
                             strokeDashoffset: '0'
                           }}
                         />
                       </svg>
                    </div>
                    {isPauseCountdown && <div className="rest-timer-overlay pulse-intense">{pauseTime}</div>}
                  </>
                )}
                <div className="card-icon"><Zap size={24} /></div>
                <div className="card-info">
                  <h4>Jive Mode</h4>
                  {activeMode === 'JiveLatin' && <p className="session-timer">{formatTime(displayElapsedTime)} / {formatTime(displayTotalDuration)}</p>}
                </div>
              </div>
            </div>

            <div className="prog-card-wrapper">
              <div 
                className={`prog-card quickstep-mode glass ${activeMode === 'QuickstepStandard' ? 'active' : ''}`} 
                onClick={() => activeMode === 'QuickstepStandard' ? setShowStopConfirm(true) : handleProgramShuffle('QuickstepStandard')}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => e.key === 'Enter' && (activeMode === 'QuickstepStandard' ? setShowStopConfirm(true) : handleProgramShuffle('QuickstepStandard'))}
              >
                {activeMode === 'QuickstepStandard' && (
                  <>
                    <div className="rectangular-timer-border" ref={activeCardRef}>
                       <svg 
                         width={cardDim.w} 
                         height={cardDim.h} 
                         viewBox={`0 0 ${cardDim.w} ${cardDim.h}`} 
                         className="timer-svg"
                       >
                         <path 
                           d={generateDynamicPath(cardDim.w, cardDim.h, 20)}
                           className={`border-rect-progress ${isPauseCountdown ? 'resting' : 'playing'}`}
                           vectorEffect="non-scaling-stroke"
                           pathLength="1"
                           style={{ 
                             strokeDasharray: `${totalProgress} 10`,
                             strokeDashoffset: '0'
                           }}
                         />
                       </svg>
                    </div>
                    {isPauseCountdown && <div className="rest-timer-overlay pulse-intense">{pauseTime}</div>}
                  </>
                )}
                <div className="card-icon"><Activity size={24} /></div>
                <div className="card-info">
                  <h4>Quickstep Mode</h4>
                  {activeMode === 'QuickstepStandard' && <p className="session-timer">{formatTime(displayElapsedTime)} / {formatTime(displayTotalDuration)}</p>}
                </div>
              </div>
            </div>

            <div className="prog-card-wrapper">
              <div 
                className={`prog-card fitness glass ${activeMode === 'Fitness' ? 'active' : ''}`} 
                onClick={() => activeMode === 'Fitness' ? setShowStopConfirm(true) : handleProgramShuffle('Fitness')}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => e.key === 'Enter' && (activeMode === 'Fitness' ? setShowStopConfirm(true) : handleProgramShuffle('Fitness'))}
              >
                {activeMode === 'Fitness' && (
                  <>
                    <div className="rectangular-timer-border" ref={activeCardRef}>
                       <svg 
                         width={cardDim.w} 
                         height={cardDim.h} 
                         viewBox={`0 0 ${cardDim.w} ${cardDim.h}`} 
                         className="timer-svg"
                       >
                         <path 
                           d={generateDynamicPath(cardDim.w, cardDim.h, 20)}
                           className={`border-rect-progress ${isPauseCountdown ? 'resting' : 'playing'}`}
                           vectorEffect="non-scaling-stroke"
                           pathLength="1"
                           style={{ 
                             strokeDasharray: `${totalProgress} 10`,
                             strokeDashoffset: '0'
                           }}
                         />
                       </svg>
                    </div>
                    {isPauseCountdown && <div className="rest-timer-overlay pulse-intense">{pauseTime}</div>}
                  </>
                )}
                <div className="card-icon"><Dumbbell size={24} /></div>
                <div className="card-info">
                  <h4>Fitness</h4>
                  {activeMode === 'Fitness' && <p className="session-timer">{formatTime(displayElapsedTime)} / {formatTime(displayTotalDuration)}</p>}
                </div>
              </div>
            </div>
          </div>
        </section>



      </div>
    </div>

      <style jsx>{`
        .finals-container {
          padding: 32px;
          padding-bottom: 140px;
          display: flex;
          flex-direction: column;
          gap: 40px;
        }

        .page-header-unified {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 8px;
        }

        .page-header-unified h1 {
          font-size: 32px;
          font-weight: 900;
          letter-spacing: -1.5px;
        }

        .learn-finals-btn {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 10px 18px;
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 99px;
          font-size: 13px;
          font-weight: 700;
          color: var(--primary);
          transition: all 0.2s;
        }

        .learn-finals-btn:hover {
          background: rgba(255, 255, 255, 0.08);
          border-color: var(--primary);
          transform: translateX(4px);
        }

        .learn-finals-btn .arrow {
          opacity: 0.5;
          transition: transform 0.2s;
        }

        .learn-finals-btn:hover .arrow {
          opacity: 1;
          transform: translateX(4px);
        }

        .programs-section {
          margin-bottom: 40px;
        }

        .section-header h3 {
          font-size: 0.9rem;
          font-weight: 800;
          opacity: 0.6;
          text-transform: uppercase;
          letter-spacing: 1px;
          margin-bottom: 24px;
        }

        .programs-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
          gap: 16px;
        }

        .prog-card {
          padding: 20px;
          border-radius: 20px;
          display: flex;
          align-items: center;
          gap: 16px;
          cursor: pointer;
          transition: all 0.2s;
          border: 1px solid rgba(255, 255, 255, 0.05);
          text-align: left;
        }

        .prog-card:hover { 
          transform: translateY(-4px); 
          background: rgba(255, 255, 255, 0.08);
          border-color: var(--primary);
        }

        .prog-card-wrapper { position: relative; }

        .rectangular-timer-border {
          position: absolute;
          inset: -2px;
          border-radius: 22px;
          pointer-events: none;
          z-index: 5;
        }

        .timer-svg {
          width: 100%;
          height: 100%;
          overflow: visible;
        }

        .border-rect-progress {
          fill: none;
          stroke-width: 4px;
          stroke-linecap: round;
          transition: stroke-dasharray 0.3s ease-out;
        }

        .border-rect-progress.playing {
          stroke: #1ed760;
          filter: drop-shadow(0 0 8px rgba(30, 215, 96, 0.4));
        }

        .border-rect-progress.resting {
          stroke: #f44336;
          filter: drop-shadow(0 0 12px rgba(244, 67, 54, 0.6));
        }

        @keyframes pulse-intense {
          0% { transform: scale(1); opacity: 0.8; }
          50% { transform: scale(1.1); opacity: 1; }
          100% { transform: scale(1); opacity: 0.8; }
        }

        .rest-timer-overlay {
          position: absolute;
          inset: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          background: radial-gradient(circle, rgba(244, 67, 54, 0.5) 0%, rgba(244, 67, 54, 0.1) 100%);
          border-radius: 20px;
          font-size: 48px;
          font-weight: 1000;
          color: white;
          z-index: 15;
          backdrop-filter: blur(12px);
          animation: pulse-intense 1s infinite ease-in-out;
          text-shadow: 0 0 20px rgba(0,0,0,0.5);
        }

        .card-icon {
          width: 48px;
          height: 48px;
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: rgba(255, 255, 255, 0.05);
        }

        .prog-card.latin .card-icon { color: #f7971e; background: rgba(247, 151, 30, 0.1); }
        .prog-card.standard .card-icon { color: #00d2ff; background: rgba(0, 210, 255, 0.1); }
        .prog-card.all-dance .card-icon { color: #1db954; background: rgba(29, 185, 84, 0.1); }
        .prog-card.eight-dance .card-icon { color: #ffeb3b; background: rgba(255, 235, 59, 0.1); }
        .prog-card.six-dance .card-icon { color: #e91e63; background: rgba(233, 30, 99, 0.1); }
        .prog-card.inst-latin .card-icon { color: #9c27b0; background: rgba(156, 39, 176, 0.1); }
        .prog-card.inst-std .card-icon { color: #3f51b5; background: rgba(63, 81, 181, 0.1); }
        .prog-card.fitness .card-icon { color: #ff5722; background: rgba(255, 87, 34, 0.1); }

        .card-info h4 { font-size: 14px; font-weight: 800; margin-bottom: 2px; }
        .card-info p { font-size: 11px; opacity: 0.5; font-weight: 600; }
        .session-timer { 
          font-size: 12px !important; 
          color: var(--primary) !important; 
          opacity: 1 !important; 
          font-family: monospace;
          margin-top: 4px;
        }

        .track-queue-section { padding: 32px; border-radius: 32px; background: rgba(255,255,255,0.02); }
        .queue-header { margin-bottom: 24px; }
        .queue-header h3 { font-size: 1.2rem; font-weight: 900; }
        .queue-header .description { font-size: 12px; opacity: 0.5; margin-top: 4px; }

        .tracks-list { display: flex; flex-direction: column; gap: 8px; }
        
        /* Unified List Style */
        .track-row {
          display: grid;
          grid-template-columns: 40px 1fr 140px 100px;
          align-items: center;
          padding: 12px 16px;
          border-radius: 12px;
          transition: background 0.2s;
          cursor: pointer;
        }

        .track-row:hover { background: rgba(255,255,255,0.08); }
        .track-row.is-active {
          background: rgba(29, 185, 84, 0.08);
          border-left: 3px solid #1db954;
        }
        .track-row.is-active .track-name { color: #1db954; }

        .track-number { font-size: 12px; font-weight: 800; opacity: 0.3; text-align: center; }
        .track-meta { display: flex; align-items: center; gap: 16px; min-width: 0; }
        .track-name { font-weight: 600; font-size: 14px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .track-artist { font-size: 12px; opacity: 0.5; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .track-duration { font-size: 13px; font-weight: 600; }
        .track-actions { display: flex; align-items: center; justify-content: flex-end; gap: 16px; }
        
        .remove-btn { color: #555; transition: color 0.2s; }
        .remove-btn:hover { color: #ff4b2b; }
        
        .btn-play-row { color: var(--primary); }

        .playing-bars { display: flex; align-items: flex-end; gap: 2px; width: 16px; height: 16px; }
        .playing-bars span { width: 2px; background: var(--primary); animation: dance 1s infinite ease-in-out; }
        .playing-bars span:nth-child(1) { height: 60%; animation-delay: -0.4s; }
        .playing-bars span:nth-child(2) { height: 100%; animation-delay: -0.2s; }
        .playing-bars span:nth-child(3) { height: 80%; animation-delay: 0s; }
        @keyframes dance {
          0%, 100% { transform: scaleY(0.5); }
          50% { transform: scaleY(1); }
        }

        .empty-msg { padding: 40px; text-align: center; opacity: 0.3; font-weight: 700; font-size: 14px; }

        @media (max-width: 768px) {
          .finals-container { padding: 16px; padding-bottom: 120px; }
          .programs-grid { 
             grid-template-columns: repeat(2, 1fr); 
             gap: 10px;
          }
          .prog-card {
             padding: 12px;
             gap: 10px;
             border-radius: 16px;
          }
          .card-icon {
             width: 36px;
             height: 36px;
          }
          .card-info h4 { font-size: 13px; font-weight: 700; }
          .track-row { grid-template-columns: 32px 1fr 48px; }
          .track-duration { display: none; }
          .track-queue-section { padding: 20px; border-radius: 24px; }
        }
      `}</style>
      <style jsx>{`
        .modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          width: 100dvw;
          height: 100dvh;
          background: rgba(0,0,0,0.8);
          backdrop-filter: blur(8px);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 5002;
          padding: 20px;
        }
        
        .modal-content {
          width: 100%;
          position: relative;
        }

        .fitness-modal {
          max-width: 400px;
          padding: 32px;
          text-align: center;
        }

        .modal-header {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 16px;
          margin-bottom: 32px;
        }

        .modal-header h2 { font-size: 24px; font-weight: 800; }
        .modal-header p { font-size: 14px; color: #71717a; }

        .custom-duration-selector {
          display: flex;
          justify-content: center;
          align-items: center;
          gap: 16px;
          margin-bottom: 32px;
        }

        .time-group {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 8px;
        }

        .time-separator {
          font-size: 40px;
          font-weight: 900;
          color: rgba(255, 255, 255, 0.4);
          margin-bottom: 24px;
        }

        .duration-input {
          background: rgba(255,255,255,0.05);
          border: 2px solid rgba(255, 255, 255, 0.08);
          border-radius: 20px;
          width: 100px;
          height: 100px;
          text-align: center;
          font-size: 44px;
          font-weight: 900;
          color: white;
          outline: none;
          transition: all 0.2s;
        }

        .duration-input:focus {
          border-color: #1db954;
          box-shadow: 0 0 0 4px rgba(29, 185, 84, 0.2);
          background: rgba(29, 185, 84, 0.05);
        }
        
        .duration-input::-webkit-outer-spin-button,
        .duration-input::-webkit-inner-spin-button {
          -webkit-appearance: none;
          margin: 0;
        }

        .duration-label {
          font-size: 13px;
          font-weight: 800;
          letter-spacing: 2px;
          text-transform: uppercase;
          color: #71717a;
        }

        .start-fitness-btn {
          width: 100%;
          height: 56px;
          font-size: 16px;
          font-weight: 800;
          border-radius: 14px;
        }

        .cancel-btn { margin-top: 8px; width: 100%; height: 48px; border-radius: 12px; }
      `}</style>
      
      {showStopConfirm && (
        <ConfirmModal 
          isOpen={showStopConfirm}
          onClose={() => setShowStopConfirm(false)}
          onConfirm={handleStopProgram}
          title="End Finals Practice?"
          message={`You are on track ${currentTrackIndex + 1} of ${sessionList.length}. Do you want to stop the practice session?`}
          confirmText="Finish"
          variant="danger"
        />
      )}

      {/* Fitness Duration Modal */}
      {showFitnessModal && (
        <div className="modal-overlay" onClick={() => setShowFitnessModal(false)}>
          <div className="modal-content glass fitness-modal animate-in" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <Dumbbell className="text-primary" size={28} />
              <div>
                <h2>Fitness Session</h2>
                <p>Select duration for non-stop music</p>
              </div>
            </div>
            
            <div className="custom-duration-selector">
              <div className="time-group">
                <input 
                   type="number"
                   min="0"
                   max="300"
                   value={fitnessDuration}
                   onChange={e => setFitnessDuration(Math.max(0, Number(e.target.value)))}
                   className="duration-input"
                   placeholder="0"
                />
                <span className="duration-label">Min</span>
              </div>
              
              <div className="time-separator">:</div>

              <div className="time-group">
                <input 
                   type="number"
                   min="0"
                   max="59"
                   value={fitnessDurationSecs}
                   onChange={e => {
                     let val = Number(e.target.value);
                     if (val >= 60) {
                        setFitnessDuration(prev => prev + Math.floor(val / 60));
                        val = val % 60;
                     }
                     setFitnessDurationSecs(Math.max(0, val));
                   }}
                   className="duration-input"
                   placeholder="00"
                />
                <span className="duration-label">Sec</span>
              </div>
            </div>

            <button className="primary-btn start-fitness-btn" onClick={() => {
              const totalSecs = (fitnessDuration * 60) + fitnessDurationSecs;
              if (totalSecs > 0) startFitness(totalSecs);
            }}>
              Start Session
            </button>

            <button className="cancel-btn text-btn" onClick={() => setShowFitnessModal(false)}>
              Cancel
            </button>
          </div>
        </div>
      )}

    </div>
  );
};

export default FinalsPage;
