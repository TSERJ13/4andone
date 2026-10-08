"use client";

import { FINAL_USER_STOP_EVENT } from '@/components/audio/FinalStopButton';
import React, { useState, useRef, useEffect } from 'react';
import {
  Play,
  Music2,
  Disc,
  Zap,
  Activity,
  MicOff,
  Dumbbell,
  Info,
  ArrowRight,
  Heart,
  Settings,
  X,
  Sparkles,
  Trophy,
  Flame,
  Clock,
  Shuffle
} from 'lucide-react';
import Link from 'next/link';
import { useAudio, useAudioControls } from '@/components/audio/AudioProvider';
import { useStudio, Track } from '@/components/admin/StudioProvider';
import { useAuth } from '@/context/AuthContext';
import { useDownloadedTracks } from '@/hooks/useDownloadedTracks';
import ConfirmModal from '@/components/admin/ConfirmModal';
import { TrackRow } from '@/components/tracks/TrackRow';

// Clock formatting helper
const formatClock = (seconds: number) => {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

const SessionProgressPath = ({ d }: { d: string }) => {
  const { currentTime, sessionDuration, isPauseCountdown } = useAudio();
  const resting = isPauseCountdown;
  const totalProgress = sessionDuration > 0 ? Math.min(currentTime / sessionDuration, 1) : 0;
  return (
    <path
      d={d}
      className={`border-rect-progress ${resting ? 'resting' : 'playing'}`}
      vectorEffect="non-scaling-stroke"
      pathLength="1"
      style={{ strokeDasharray: `${totalProgress} 10`, strokeDashoffset: '0' }}
    />
  );
};

// Only during the 15s rest between dances (it used to show all the time).
const RestCountdown = () => {
  const { pauseTime, isPauseCountdown } = useAudio();
  if (!isPauseCountdown) return null;
  return <div className="rest-timer-overlay pulse-intense">{pauseTime}</div>;
};

const SessionClock = () => {
  const { currentTime, sessionDuration } = useAudio();
  return <p className="session-timer">{formatClock(currentTime)} / {formatClock(sessionDuration)}</p>;
};

export interface ProgramDef {
  key: string;
  label: string;
  category: 'official' | 'multi' | 'specials' | 'favorites' | 'fitness';
  subtitle: string;
  color: string;
  coverImg: string;
  icon: React.ReactNode;
  tag?: string;
}

const PROGRAMS: ProgramDef[] = [
  // 1. Official Competition Finals
  {
    key: 'Latin',
    label: 'Latin Final',
    category: 'official',
    subtitle: '5 Dances • ~9 Min • Samba to Jive',
    color: '#ef4444',
    coverImg: '/styles/samba.jpg',
    icon: <Zap size={22} />
  },
  {
    key: 'Standard',
    label: 'Standard Final',
    category: 'official',
    subtitle: '5 Dances • ~9 Min • Waltz to Quickstep',
    color: '#3b82f6',
    coverImg: '/styles/slow-waltz.jpg',
    icon: <Activity size={22} />
  },
  {
    key: '10Dance',
    label: '10-Dance Final',
    category: 'official',
    subtitle: '10 Dances • ~18 Min • Full Marathon',
    color: '#10b981',
    coverImg: '/styles/paso-doble.jpg',
    icon: <Disc size={22} />
  },

  // 2. Multi-Dance Programs
  {
    key: '2Dance',
    label: '2-Dance Warmup',
    category: 'multi',
    subtitle: '2 Dances • ~4 Min • Slow Waltz & Cha-Cha',
    color: '#8b5cf6',
    coverImg: '/styles/cha-cha-cha.jpg',
    icon: <Music2 size={22} />
  },
  {
    key: '4Dance',
    label: '4-Dance Session',
    category: 'multi',
    subtitle: '4 Dances • ~7 Min • Mixed Selection',
    color: '#f59e0b',
    coverImg: '/styles/jive.jpg',
    icon: <Music2 size={22} />
  },
  {
    key: '6Dance',
    label: '6-Dance Session',
    category: 'multi',
    subtitle: '6 Dances • ~11 Min • Extended Practice',
    color: '#ec4899',
    coverImg: '/styles/rumba.jpg',
    icon: <Zap size={22} />
  },
  {
    key: '8Dance',
    label: '8-Dance Session',
    category: 'multi',
    subtitle: '8 Dances • ~15 Min • Advanced Final',
    color: '#f97316',
    coverImg: '/styles/quickstep.jpg',
    icon: <Music2 size={22} />
  },

  // 3. Specials & Tagged Editions
  {
    key: 'InstLatin',
    label: 'Inst. Latin',
    category: 'specials',
    subtitle: '5 Instrumental Latin Tracks',
    color: '#a855f7',
    coverImg: '/styles/samba.jpg',
    icon: <MicOff size={22} />,
    tag: 'Instrumental'
  },
  {
    key: 'InstStandard',
    label: 'Inst. Standard',
    category: 'specials',
    subtitle: '5 Instrumental Standard Tracks',
    color: '#06b6d4',
    coverImg: '/styles/slow-foxtrot.jpg',
    icon: <MicOff size={22} />,
    tag: 'Instrumental'
  },
  {
    key: 'JiveLatin',
    label: 'Jive Mode',
    category: 'specials',
    subtitle: 'High Energy Jive Practice',
    color: '#eab308',
    coverImg: '/styles/jive.jpg',
    icon: <Zap size={22} />
  },
  {
    key: 'QuickstepStandard',
    label: 'Quickstep Mode',
    category: 'specials',
    subtitle: 'Fast Pace Quickstep Session',
    color: '#14b8a6',
    coverImg: '/styles/quickstep.jpg',
    icon: <Activity size={22} />
  },
  {
    key: 'BlackpoolLt',
    label: 'Blackpool Lt',
    category: 'specials',
    subtitle: 'Blackpool Festival Latin Edition',
    color: '#f43f5e',
    coverImg: '/styles/paso-doble.jpg',
    icon: <Disc size={22} />,
    tag: 'Blackpool'
  },
  {
    key: 'BlackpoolSt',
    label: 'Blackpool St',
    category: 'specials',
    subtitle: 'Blackpool Festival Standard Edition',
    color: '#3b82f6',
    coverImg: '/styles/viennese-waltz.jpg',
    icon: <Disc size={22} />,
    tag: 'Blackpool'
  },

  // 4. Favorites & Fitness (Separated)
  {
    key: 'LikedSongs',
    label: 'Liked Songs Final',
    category: 'favorites',
    subtitle: 'Final practice from your Favorites',
    color: '#ef4444',
    coverImg: '/styles/tango.jpg',
    icon: <Heart size={22} />
  },
  {
    key: 'Fitness',
    label: 'Fitness Workout',
    category: 'fitness',
    subtitle: 'Non-stop Dance Cardio Session',
    color: '#f97316',
    coverImg: '/styles/fitness.jpg',
    icon: <Dumbbell size={22} />
  }
];

const FILTER_CATEGORIES = [
  { id: 'all', label: 'All Modes' },
  { id: 'official', label: 'Official Finals' },
  { id: 'multi', label: 'Multi-Dance' },
  { id: 'specials', label: 'Specials & Tags' },
  { id: 'favorites', label: 'Favorites' },
  { id: 'fitness', label: 'Fitness' }
];

const FinalsPage = () => {
  const {
    tracks,
    styles,
    finalTracks,
    toggleFavorite
  } = useStudio();

  const {
    loadTrack,
    isPlaying,
    title: playingTitle,
    trackId: playingTrackId,
    stop,
    setIsFitness,
    activeMode,
    setActiveMode,
    sessionTracks,
    setSessionTracks,
    isFinalMode,
    setFitnessTargetTime
  } = useAudioControls();

  const { isAuthenticated, setIsAuthModalOpen } = useAuth();
  const downloadedIds = useDownloadedTracks();

  const [activeCategoryChip, setActiveCategoryChip] = useState('all');
  const [lastPlayedProgramKey, setLastPlayedProgramKey] = useState<string>('Latin');

  const [showStopConfirm, setShowStopConfirm] = useState(false);
  const [showFinalOver, setShowFinalOver] = useState(false);
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

  const userManuallyStoppedRef = useRef(false);
  const lastActiveModeRef = useRef<string | null>(null);
  const lastSessionTracksRef = useRef<any[]>([]);

  const [cardDim, setCardDim] = useState({ w: 0, h: 0 });
  const activeCardRef = useRef<HTMLDivElement>(null);
  const [showFitnessModal, setShowFitnessModal] = useState(false);
  const [fitnessDuration, setFitnessDuration] = useState(10);
  const [showLikedSongsModal, setShowLikedSongsModal] = useState(false);

  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [latinStartDance, setLatinStartDance] = useState('Samba');
  const [pasoDuration, setPasoDuration] = useState('All');
  const [pasoVersion, setPasoVersion] = useState('All');

  // Load last played final program & prefs
  useEffect(() => {
    try {
      const savedLast = localStorage.getItem('4andone_last_played_final');
      if (savedLast) {
        setLastPlayedProgramKey(savedLast);
      }
    } catch (e) {}

    const savedPrefs = localStorage.getItem('final_mode_prefs');
    if (savedPrefs) {
      try {
        const parsed = JSON.parse(savedPrefs);
        if (parsed.latinStartDance) setLatinStartDance(parsed.latinStartDance);
        if (parsed.pasoDuration) setPasoDuration(parsed.pasoDuration);
        if (parsed.pasoVersion) setPasoVersion(parsed.pasoVersion);
      } catch (e) {}
    }
  }, []);

  const updateLastPlayed = (key: string) => {
    setLastPlayedProgramKey(key);
    try {
      localStorage.setItem('4andone_last_played_final', key);
    } catch (e) {}
  };

  const saveSettings = () => {
    localStorage.setItem('final_mode_prefs', JSON.stringify({
      latinStartDance,
      pasoDuration,
      pasoVersion
    }));
    setShowSettingsModal(false);
  };

  const checkAuthAndExecute = (action: () => void, actionName: string) => {
    if (!isAuthenticated) {
      setIsAuthModalOpen(true);
      return;
    }
    action();
  };

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

  useEffect(() => {
    if (activeMode && sessionTracks.length > 0) {
      lastActiveModeRef.current = activeMode;
      lastSessionTracksRef.current = sessionTracks;
    }
  }, [activeMode, sessionTracks]);

  useEffect(() => {
    const onUserStop = () => { userManuallyStoppedRef.current = true; };
    window.addEventListener(FINAL_USER_STOP_EVENT, onUserStop);
    return () => window.removeEventListener(FINAL_USER_STOP_EVENT, onUserStop);
  }, []);

  useEffect(() => {
    if (!isFinalMode && lastActiveModeRef.current && !userManuallyStoppedRef.current) {
      setShowFinalOver(true);
    }
    if (!isFinalMode) {
      userManuallyStoppedRef.current = false;
    }
  }, [isFinalMode]);

  const generateDynamicPath = (w: number, h: number, r: number) => {
    if (w === 0 || h === 0) return "";
    const inset = 2;
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

  const sessionList = (activeMode && sessionTracks.length > 0) ? sessionTracks : finalTracks;

  const latinOrder = latinStartDance === 'Cha-Cha-Cha' || latinStartDance === 'Cha-cha-cha'
    ? ["Cha-Cha-Cha", "Samba", "Rumba", "Paso Doble", "Jive"]
    : ["Samba", "Cha-Cha-Cha", "Rumba", "Paso Doble", "Jive"];
  const standardOrder = ["Slow Waltz", "Tango", "Viennese Waltz", "Slow Foxtrot", "Quickstep"];

  const handleProgramShuffle = (type: string) => {
    updateLastPlayed(type);

    if (type === 'Fitness') {
      setShowFitnessModal(true);
      return;
    }
    if (type === 'LikedSongs') {
      setShowLikedSongsModal(true);
      return;
    }

    let order: string[] = [];
    let filterFn: (t: Track) => boolean = () => true;

    const programDef = PROGRAMS.find(p => p.key === type);
    const requiredTag = programDef?.tag?.toLowerCase();
    if (requiredTag) {
      filterFn = (t) => t.tags?.some(tag => tag.toLowerCase().includes(requiredTag)) || false;
    }

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
      case '2Dance':
        order = ['Slow Waltz', 'Cha-Cha-Cha'];
        break;
      case '4Dance':
        order = ['Slow Waltz', 'Quickstep', 'Cha-Cha-Cha', 'Jive'];
        break;
      case '6Dance':
        order = [...standardOrder, ...latinOrder].filter(s => !['Slow Foxtrot', 'Paso Doble', 'Viennese Waltz', 'Rumba'].includes(s));
        break;
      case '8Dance':
        order = [...standardOrder, ...latinOrder].filter(s => s !== 'Slow Foxtrot' && s !== 'Paso Doble');
        break;
      case 'InstLatin':
        order = latinOrder;
        break;
      case 'InstStandard':
        order = standardOrder;
        break;
      // Jive + Latin: Samba-Jive, Cha-Jive, Rumba-Jive, Paso-Jive, Jive-Jive
      case 'JiveLatin':
        order = ['Samba', 'Jive', 'Cha-Cha-Cha', 'Jive', 'Rumba', 'Jive', 'Paso Doble', 'Jive', 'Jive', 'Jive'];
        break;
      // Quickstep + Standard: Waltz-QS, Tango-QS, Viennese-QS, Foxtrot-QS, QS-QS
      case 'QuickstepStandard':
        order = ['Slow Waltz', 'Quickstep', 'Tango', 'Quickstep', 'Viennese Waltz', 'Quickstep', 'Slow Foxtrot', 'Quickstep', 'Quickstep', 'Quickstep'];
        break;
      case 'BlackpoolLt':
        order = latinOrder;
        break;
      case 'BlackpoolSt':
        order = standardOrder;
        break;
      default:
        order = latinOrder;
    }

    const availableTracks = tracks.filter(t =>
      !t.tags?.some(tag => tag.toLowerCase() === 'closed' || tag === 'დახურული') &&
      filterFn(t)
    );

    const selectedTracks: Track[] = [];
    order.forEach((styleName) => {
      let styleTracks = availableTracks.filter(t => t.style?.toLowerCase() === styleName.toLowerCase());

      if (styleName.toLowerCase() === 'paso doble') {
        // Soft filters (as on main): narrow only when something matches,
        // otherwise keep the whole Paso pool so the dance is never skipped.
        const narrow = (fn: (t: Track) => boolean) => {
          const hit = styleTracks.filter(fn);
          if (hit.length > 0) styleTracks = hit;
        };
        if (pasoDuration === 'short') {
          narrow(t => (t.duration || 0) > 0 && (t.duration || 0) < 110);
        } else if (pasoDuration === 'long') {
          narrow(t => (t.duration || 0) >= 110);
        }

        if (pasoVersion === '2') {
          narrow(t => !!t.tags?.some(tag => tag.toLowerCase().includes('2 highlight') || tag.toLowerCase().includes('2 accents')));
        } else if (pasoVersion === '3') {
          narrow(t => !!t.tags?.some(tag => tag.toLowerCase().includes('3 highlight') || tag.toLowerCase().includes('3 accents')));
        }
      }

      if (styleTracks.length > 0) {
        // Prefer a track not already in this session (Jive/QS repeat several times)
        const fresh = styleTracks.filter(t => !selectedTracks.some(s => s.id === t.id));
        const pool = fresh.length > 0 ? fresh : styleTracks;
        selectedTracks.push(pool[Math.floor(Math.random() * pool.length)]);
      }
    });

    if (selectedTracks.length > 0) {
      setActiveMode(type);
      setSessionTracks(selectedTracks);
      loadTrack(selectedTracks[0], false, true);
    } else {
      const tagName = programDef?.tag;
      if (tagName) {
        setInfoModal({
          isOpen: true,
          title: `${programDef.label} Is Empty`,
          message: `This program only uses tracks tagged "${tagName}". Add tracks in Admin Panel.`,
          confirmText: 'OK',
          variant: 'primary',
          showCancel: false,
          onConfirm: () => setInfoModal(prev => ({ ...prev, isOpen: false }))
        });
      } else {
        setInfoModal({
          isOpen: true,
          title: 'No Tracks Found',
          message: 'No tracks found for this program.',
          confirmText: 'OK',
          variant: 'primary',
          showCancel: false,
          onConfirm: () => setInfoModal(prev => ({ ...prev, isOpen: false }))
        });
      }
    }
  };

  const handleStopProgram = () => {
    userManuallyStoppedRef.current = true;
    lastActiveModeRef.current = null;
    stop();
    setShowStopConfirm(false);
    setIsFitness(false);
  };

  const startLikedSongsProgram = (discipline: 'Latin' | 'Standard') => {
    updateLastPlayed('LikedSongs');
    const liked = tracks.filter(t => t.isFavorite);
    if (liked.length === 0) {
      setInfoModal({
        isOpen: true,
        title: 'No Liked Songs',
        message: 'No liked songs yet. Tap heart to add tracks to favorites.',
        confirmText: 'OK',
        variant: 'primary',
        showCancel: false,
        onConfirm: () => setInfoModal(prev => ({ ...prev, isOpen: false }))
      });
      setShowLikedSongsModal(false);
      return;
    }

    const order = discipline === 'Latin' ? latinOrder : standardOrder;
    const selectedTracks: Track[] = [];

    order.forEach(styleName => {
      const styleTracks = liked.filter(t => t.style?.toLowerCase() === styleName.toLowerCase());
      if (styleTracks.length > 0) {
        const randomTrack = styleTracks[Math.floor(Math.random() * styleTracks.length)];
        selectedTracks.push(randomTrack);
      }
    });

    if (selectedTracks.length > 0) {
      setActiveMode('LikedSongs');
      setSessionTracks(selectedTracks);
      loadTrack(selectedTracks[0], false, true);
    }
    setShowLikedSongsModal(false);
  };

  const startFitness = (selectedTargetSeconds: number) => {
    updateLastPlayed('Fitness');
    const fitnessPool = tracks.filter(t => t.style?.toLowerCase() === 'fitness');
    setIsFitness(true);

    if (fitnessPool.length === 0) {
      setInfoModal({
        isOpen: true,
        title: 'No Fitness Tracks',
        message: "No tracks found with Style 'Fitness'.",
        confirmText: 'OK',
        variant: 'primary',
        showCancel: false,
        onConfirm: () => setInfoModal(prev => ({ ...prev, isOpen: false }))
      });
      setShowFitnessModal(false);
      return;
    }

    const targetSeconds = selectedTargetSeconds;
    let currentSeconds = 0;
    const selectedTracks: Track[] = [];
    const pool = [...fitnessPool].sort(() => 0.5 - Math.random());

    let iterations = 0;
    while (currentSeconds < (targetSeconds + 600) && iterations < 50) {
      const track = pool[iterations % pool.length];
      selectedTracks.push(track);
      currentSeconds += (track.duration || 180);
      iterations++;
    }

    setFitnessTargetTime(targetSeconds);
    setActiveMode('Fitness');
    setSessionTracks(selectedTracks);
    setShowFitnessModal(false);
    setIsFitness(true);
    loadTrack(selectedTracks[0], false, true);
  };

  const handleReplayFinalMode = () => {
    setShowFinalOver(false);
    const modeToReplay = lastActiveModeRef.current;
    lastActiveModeRef.current = null;
    if (modeToReplay) {
      setTimeout(() => handleProgramShuffle(modeToReplay), 100);
    }
  };

  const filteredPrograms = PROGRAMS.filter(p =>
    activeCategoryChip === 'all' || p.category === activeCategoryChip
  );

  const heroProgram = PROGRAMS.find(p => p.key === lastPlayedProgramKey) || PROGRAMS[0];

  return (
    <div className="yt-finals-page animate-in">
      {/* 1. YouTube Music Page Header */}
      <div className="yt-finals-header">
        <div className="yt-finals-header-title">
          <span className="yt-kicker">4ANDONE PRACTICE</span>
          <h1 className="yt-title">Finals Practice</h1>
        </div>

        <div className="yt-finals-header-right">
          <Link href="/learn-final-mode" className="yt-small-how-link">
            <Info size={13} />
            <span>How it works?</span>
          </Link>

          <button
            type="button"
            className="yt-header-pill-btn settings"
            onClick={() => setShowSettingsModal(true)}
          >
            <Settings size={15} />
            <span>Settings</span>
          </button>
        </div>
      </div>

      {/* 2. Last Played Final Practice Hero Banner */}
      <div
        className="yt-hero-practice-banner"
        style={{
          background: `linear-gradient(135deg, ${heroProgram.color}33 0%, ${heroProgram.color}12 50%, #0c0c0c 100%)`,
          borderColor: `${heroProgram.color}44`
        }}
      >
        <div className="yt-hero-content">
          <div
            className="yt-hero-badge"
            style={{
              color: heroProgram.color,
              borderColor: `${heroProgram.color}66`,
              background: `${heroProgram.color}22`
            }}
          >
            <Trophy size={14} color={heroProgram.color} />
            <span>LAST PLAYED PRACTICE</span>
          </div>

          <h2 className="yt-hero-heading">{heroProgram.label}</h2>
          <p className="yt-hero-desc">{heroProgram.subtitle}</p>

          <button
            type="button"
            className="yt-hero-play-btn"
            onClick={() => handleProgramShuffle(heroProgram.key)}
          >
            <Play fill="#000000" color="#000000" size={18} />
            <span>START {heroProgram.label.toUpperCase()}</span>
          </button>
        </div>

        <div className="yt-hero-cover-wrap">
          <img
            src={heroProgram.coverImg}
            alt={heroProgram.label}
            className="yt-hero-cover-img"
          />
        </div>
      </div>

      {/* 3. Category Filter Chips Row */}
      <div className="yt-category-chips-row">
        {FILTER_CATEGORIES.map((cat) => (
          <button
            key={cat.id}
            type="button"
            className={`yt-category-chip ${activeCategoryChip === cat.id ? 'active' : ''}`}
            onClick={() => setActiveCategoryChip(cat.id)}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* 4. Programs Shelves / Grid */}
      <div className="yt-programs-grid">
        {filteredPrograms.map((prog) => {
          const isActive = activeMode === prog.key;

          return (
            <div
              key={prog.key}
              className={`yt-program-card ${isActive ? 'active' : ''}`}
              style={{
                background: `linear-gradient(135deg, ${prog.color}22 0%, #181818 100%)`
              }}
              onClick={() => isActive ? setShowStopConfirm(true) : handleProgramShuffle(prog.key)}
            >
              {isActive && (
                <>
                  <div className="rectangular-timer-border" ref={activeCardRef}>
                    <svg
                      width={cardDim.w}
                      height={cardDim.h}
                      viewBox={`0 0 ${cardDim.w} ${cardDim.h}`}
                      className="timer-svg"
                    >
                      <SessionProgressPath
                        d={generateDynamicPath(cardDim.w, cardDim.h, 16)}
                      />
                    </svg>
                  </div>
                  {/* Rest countdown */}
                  <RestCountdown />
                </>
              )}

              <div className="yt-card-top-row">
                <div
                  className="yt-card-icon-circle"
                  style={{ background: `${prog.color}25`, color: prog.color }}
                >
                  {prog.icon}
                </div>

                <div className="yt-card-play-btn">
                  <Play fill="#ffffff" color="#ffffff" size={16} />
                </div>
              </div>

              <div className="yt-card-body">
                <h3 className="yt-card-title">{prog.label}</h3>
                {/* The clock sits over the subtitle so the active card keeps its size */}
                <div className="yt-card-subtitle-wrap">
                  <p className="yt-card-subtitle" style={isActive ? { visibility: 'hidden' } : undefined}>{prog.subtitle}</p>
                  {isActive && (
                    <div className="yt-card-active-clock">
                      <SessionClock />
                    </div>
                  )}
                </div>
              </div>

              <div className="yt-card-thumb-bg">
                <img src={prog.coverImg} alt={prog.label} className="yt-card-thumb" />
              </div>
            </div>
          );
        })}
      </div>

      {/* 5. Live Practice Session Tracklist */}
      {sessionList.length > 0 && (
        <div className="yt-session-tracklist-container animate-in">
          <div className="yt-tracklist-header">
            <h3 className="yt-tracklist-title">Current Session Tracklist</h3>
            <span className="yt-tracklist-count">{sessionList.length} Tracks</span>
          </div>

          <div className="yt-tracks-list">
            {sessionList.map((track, i) => {
              const isTrackActive =
                isPlaying &&
                (playingTrackId
                  ? playingTrackId === track.id
                  : playingTitle === track.title || playingTitle === track.id);

              return (
                <TrackRow
                  key={`${track.id}-${i}`}
                  track={track}
                  isActive={isTrackActive}
                  onPlay={() => loadTrack(track, false, true)}
                  onToggleFavorite={() =>
                    checkAuthAndExecute(
                      () => toggleFavorite?.(track.id),
                      'favorite tracks'
                    )
                  }
                  badge="style"
                  styleColor={
                    styles.find(
                      s => s.title.toLowerCase() === track.style?.toLowerCase()
                    )?.color
                  }
                  isDownloaded={downloadedIds.includes(track.id)}
                />
              );
            })}
          </div>
        </div>
      )}

      {/* MODALS */}
      {/* 1. Stop Confirmation Modal */}
      <ConfirmModal
        isOpen={showStopConfirm}
        title="Stop Practice Session?"
        message="Are you sure you want to stop the current final practice session?"
        confirmText="Stop Session"
        variant="danger"
        showCancel={true}
        onClose={() => setShowStopConfirm(false)}
        onConfirm={handleStopProgram}
      />

      {/* 2. Session Over Celebration Modal */}
      <ConfirmModal
        isOpen={showFinalOver}
        title="🎉 Session Completed!"
        message="Great job! You finished your final practice session."
        confirmText="Practice Again"
        variant="primary"
        showCancel={true}
        onClose={() => setShowFinalOver(false)}
        onConfirm={handleReplayFinalMode}
      />

      {/* 3. Settings Modal */}
      {showSettingsModal && (
        <div className="yt-modal-overlay" onClick={() => setShowSettingsModal(false)}>
          <div className="yt-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="yt-modal-header">
              <h3>Final Practice Settings</h3>
              <button type="button" className="yt-modal-close" onClick={() => setShowSettingsModal(false)}>
                <X size={20} />
              </button>
            </div>

            <div className="yt-modal-body">
              <div className="yt-setting-group">
                <label>Latin Start Dance</label>
                <div className="yt-modal-chips-group">
                  <button
                    type="button"
                    className={`yt-modal-chip ${latinStartDance === 'Samba' ? 'active' : ''}`}
                    onClick={() => setLatinStartDance('Samba')}
                  >
                    Samba First
                  </button>
                  <button
                    type="button"
                    className={`yt-modal-chip ${latinStartDance === 'Cha-Cha-Cha' ? 'active' : ''}`}
                    onClick={() => setLatinStartDance('Cha-Cha-Cha')}
                  >
                    Cha-Cha First
                  </button>
                </div>
              </div>

              <div className="yt-setting-group">
                <label>Paso Doble Length</label>
                <div className="yt-modal-chips-group">
                  <button
                    type="button"
                    className={`yt-modal-chip ${pasoDuration === 'All' ? 'active' : ''}`}
                    onClick={() => setPasoDuration('All')}
                  >
                    All Durations
                  </button>
                  <button
                    type="button"
                    className={`yt-modal-chip ${pasoDuration === 'short' ? 'active' : ''}`}
                    onClick={() => setPasoDuration('short')}
                  >
                    Short (&lt;1:50)
                  </button>
                  <button
                    type="button"
                    className={`yt-modal-chip ${pasoDuration === 'long' ? 'active' : ''}`}
                    onClick={() => setPasoDuration('long')}
                  >
                    Long (&gt;1:50)
                  </button>
                </div>
              </div>

              <div className="yt-setting-group">
                <label>Paso Doble Accents</label>
                <div className="yt-modal-chips-group">
                  <button
                    type="button"
                    className={`yt-modal-chip ${pasoVersion === 'All' ? 'active' : ''}`}
                    onClick={() => setPasoVersion('All')}
                  >
                    All Accents
                  </button>
                  <button
                    type="button"
                    className={`yt-modal-chip ${pasoVersion === '2' ? 'active' : ''}`}
                    onClick={() => setPasoVersion('2')}
                  >
                    2 Accents
                  </button>
                  <button
                    type="button"
                    className={`yt-modal-chip ${pasoVersion === '3' ? 'active' : ''}`}
                    onClick={() => setPasoVersion('3')}
                  >
                    3 Accents
                  </button>
                </div>
              </div>
            </div>

            <div className="yt-modal-footer">
              <button type="button" className="yt-save-btn" onClick={saveSettings}>
                Save Settings
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 4. Fitness Modal */}
      {showFitnessModal && (
        <div className="yt-modal-overlay" onClick={() => setShowFitnessModal(false)}>
          <div className="yt-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="yt-modal-header">
              <h3>Fitness Cardio Practice</h3>
              <button type="button" className="yt-modal-close" onClick={() => setShowFitnessModal(false)}>
                <X size={20} />
              </button>
            </div>

            <div className="yt-modal-body">
              <label>Select Target Duration</label>
              <div className="yt-modal-chips-group">
                {[5, 10, 15, 20, 30].map(mins => (
                  <button
                    key={mins}
                    type="button"
                    className={`yt-modal-chip ${fitnessDuration === mins ? 'active' : ''}`}
                    onClick={() => setFitnessDuration(mins)}
                  >
                    {mins} Minutes
                  </button>
                ))}
              </div>
            </div>

            <div className="yt-modal-footer">
              <button type="button" className="yt-save-btn" onClick={() => startFitness(fitnessDuration * 60)}>
                Start Fitness Session
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 5. Liked Songs Modal */}
      {showLikedSongsModal && (
        <div className="yt-modal-overlay" onClick={() => setShowLikedSongsModal(false)}>
          <div className="yt-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="yt-modal-header">
              <h3>Liked Songs Final</h3>
              <button type="button" className="yt-modal-close" onClick={() => setShowLikedSongsModal(false)}>
                <X size={20} />
              </button>
            </div>

            <div className="yt-modal-body">
              <label>Choose Discipline</label>
              <div className="yt-modal-chips-group">
                <button type="button" className="yt-modal-chip active" onClick={() => startLikedSongsProgram('Latin')}>
                  Latin Discipline
                </button>
                <button type="button" className="yt-modal-chip active" onClick={() => startLikedSongsProgram('Standard')}>
                  Standard Discipline
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 6. Information Alert Modal */}
      <ConfirmModal
        isOpen={infoModal.isOpen}
        title={infoModal.title}
        message={infoModal.message}
        confirmText={infoModal.confirmText}
        variant={infoModal.variant}
        showCancel={infoModal.showCancel}
        onClose={() => setInfoModal(prev => ({ ...prev, isOpen: false }))}
        onConfirm={infoModal.onConfirm}
      />

      <style jsx>{`
        .yt-finals-page {
          padding: 16px 24px 140px 24px;
          max-width: 1300px;
          margin: 0 auto;
        }

        .yt-finals-header {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          margin-bottom: 20px;
        }

        .yt-kicker {
          font-size: 11px;
          font-weight: 700;
          letter-spacing: 1.2px;
          color: #aaaaaa;
          text-transform: uppercase;
          display: block;
          margin-bottom: 2px;
        }

        .yt-title {
          font-size: 28px;
          font-weight: 800;
          color: #ffffff;
          margin: 0;
          letter-spacing: -0.5px;
        }

        .yt-finals-header-right {
          display: flex;
          flex-direction: column;
          align-items: flex-end;
          gap: 4px;
          margin-top: -10px;
        }

        .yt-small-how-link {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          color: #888888;
          font-size: 11px;
          font-weight: 500;
          text-decoration: none;
          transition: color 0.15s ease;
          padding-bottom: 2px;
        }

        .yt-small-how-link:hover {
          color: #10b981;
        }

        .yt-header-pill-btn {
          display: flex;
          align-items: center;
          gap: 8px;
          background: rgba(255, 255, 255, 0.08);
          border: 1px solid rgba(255, 255, 255, 0.1);
          color: #ffffff;
          font-size: 13px;
          font-weight: 600;
          padding: 6px 16px;
          border-radius: 20px;
          text-decoration: none;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .yt-header-pill-btn:hover {
          background: rgba(255, 255, 255, 0.16);
        }

        /* Hero Practice Banner */
        .yt-hero-practice-banner {
          border-radius: 20px;
          padding: 24px 28px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 24px;
          box-shadow: 0 16px 40px rgba(0, 0, 0, 0.6);
          position: relative;
          overflow: hidden;
          border: 1px solid rgba(255, 255, 255, 0.1);
          transition: all 0.3s ease;
        }

        .yt-hero-content {
          max-width: 600px;
          z-index: 2;
        }

        .yt-hero-badge {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          font-size: 11px;
          font-weight: 800;
          letter-spacing: 0.8px;
          padding: 4px 10px;
          border-radius: 12px;
          margin-bottom: 10px;
          border: 1px solid transparent;
        }

        .yt-hero-heading {
          font-size: 24px;
          font-weight: 900;
          color: #ffffff;
          margin: 0 0 6px 0;
          letter-spacing: -0.5px;
        }

        .yt-hero-desc {
          font-size: 13px;
          color: #cccccc;
          margin: 0 0 18px 0;
          line-height: 1.4;
        }

        .yt-hero-play-btn {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          background: #ffffff;
          color: #000000;
          font-size: 13px;
          font-weight: 800;
          letter-spacing: 0.5px;
          padding: 9px 20px;
          border-radius: 22px;
          border: none;
          cursor: pointer;
          box-shadow: 0 6px 20px rgba(255, 255, 255, 0.3);
          transition: transform 0.2s ease, box-shadow 0.2s ease;
        }

        .yt-hero-play-btn:hover {
          transform: scale(1.04);
          box-shadow: 0 8px 28px rgba(255, 255, 255, 0.45);
        }

        .yt-hero-cover-wrap {
          width: 125px;
          height: 125px;
          border-radius: 14px;
          overflow: hidden;
          box-shadow: 0 12px 32px rgba(0, 0, 0, 0.7);
          transform: rotate(6deg);
          border: 2px solid rgba(255, 255, 255, 0.2);
          z-index: 2;
        }

        .yt-hero-cover-img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        /* Category Chips */
        .yt-category-chips-row {
          display: flex;
          align-items: center;
          gap: 10px;
          overflow-x: auto;
          scrollbar-width: none;
          margin-bottom: 24px;
        }

        .yt-category-chips-row::-webkit-scrollbar {
          display: none;
        }

        .yt-category-chip {
          background: rgba(255, 255, 255, 0.08);
          border: 1px solid rgba(255, 255, 255, 0.08);
          color: #ffffff;
          font-size: 13px;
          font-weight: 600;
          padding: 7px 18px;
          border-radius: 20px;
          cursor: pointer;
          white-space: nowrap;
          transition: all 0.2s ease;
        }

        .yt-category-chip.active {
          background: #ffffff;
          color: #000000;
          border-color: #ffffff;
        }

        /* Programs Grid */
        .yt-programs-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
          gap: 16px;
          margin-bottom: 36px;
        }

        .yt-program-card {
          position: relative;
          border-radius: 16px;
          padding: 20px;
          min-height: 130px;
          cursor: pointer;
          overflow: hidden;
          border: 1px solid rgba(255, 255, 255, 0.08);
          box-shadow: 0 8px 24px rgba(0, 0, 0, 0.4);
          transition: transform 0.25s ease, box-shadow 0.25s ease;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
        }

        .yt-program-card:hover {
          transform: translateY(-4px) scale(1.02);
          box-shadow: 0 16px 36px rgba(0, 0, 0, 0.6);
        }

        .yt-program-card.active {
          border-color: #ef4444;
          box-shadow: 0 0 30px rgba(239, 68, 68, 0.35);
        }

        /* Running program: red progress ring around the card + rest countdown.
           :global — rendered by small components outside this one. */
        .rectangular-timer-border {
          position: absolute;
          inset: 0;
          border-radius: 16px;
          pointer-events: none;
          z-index: 5;
        }
        .timer-svg { width: 100%; height: 100%; overflow: visible; }
        :global(.border-rect-progress) {
          fill: none;
          stroke-width: 4px;
          stroke-linecap: round;
          transition: stroke-dasharray 0.3s ease-out;
        }
        :global(.border-rect-progress.playing) {
          stroke: #ef4444;
          filter: drop-shadow(0 0 8px rgba(239, 68, 68, 0.45));
        }
        :global(.border-rect-progress.resting) {
          stroke: #f44336;
          filter: drop-shadow(0 0 12px rgba(244, 67, 54, 0.6));
        }
        @keyframes pulse-intense {
          0% { transform: scale(1); opacity: 0.8; }
          50% { transform: scale(1.06); opacity: 1; }
          100% { transform: scale(1); opacity: 0.8; }
        }
        :global(.rest-timer-overlay) {
          position: absolute;
          inset: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          background: radial-gradient(circle, rgba(244, 67, 54, 0.35) 0%, rgba(20, 20, 20, 0.8) 100%);
          border-radius: 16px;
          font-size: 48px;
          font-weight: 900;
          color: #ff3b30;
          z-index: 15;
          animation: pulse-intense 1s infinite ease-in-out;
          text-shadow: 0 0 25px rgba(255, 59, 48, 0.8);
        }

        .yt-card-top-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          z-index: 2;
        }

        .yt-card-icon-circle {
          width: 42px;
          height: 42px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .yt-card-play-btn {
          width: 34px;
          height: 34px;
          border-radius: 50%;
          background: rgba(255, 255, 255, 0.15);
          backdrop-filter: blur(8px);
          display: flex;
          align-items: center;
          justify-content: center;
          opacity: 0.8;
          transition: transform 0.2s ease, opacity 0.2s ease;
        }

        .yt-program-card:hover .yt-card-play-btn {
          opacity: 1;
          transform: scale(1.1);
        }

        .yt-card-body {
          z-index: 2;
          margin-top: 12px;
        }

        .yt-card-title {
          font-size: 17px;
          font-weight: 800;
          color: #ffffff;
          margin: 0 0 4px 0;
          letter-spacing: -0.3px;
        }

        .yt-card-subtitle {
          font-size: 12px;
          color: #aaaaaa;
          margin: 0;
          line-height: 1.3;
        }

        .yt-card-subtitle-wrap {
          position: relative;
        }

        .yt-card-active-clock {
          position: absolute;
          left: 0;
          top: 50%;
          transform: translateY(-50%);
          font-size: 13px;
          font-weight: 700;
          color: #ef4444;
        }

        .yt-card-active-clock :global(.session-timer) {
          margin: 0;
        }

        .yt-card-thumb-bg {
          position: absolute;
          right: -12px;
          bottom: -12px;
          width: 85px;
          height: 85px;
          border-radius: 12px;
          overflow: hidden;
          transform: rotate(15deg);
          opacity: 0.35;
          box-shadow: -4px 4px 16px rgba(0, 0, 0, 0.6);
          transition: transform 0.3s ease, opacity 0.3s ease;
        }

        .yt-program-card:hover .yt-card-thumb-bg {
          transform: rotate(6deg) scale(1.1);
          opacity: 0.6;
        }

        .yt-card-thumb {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        /* Session Tracklist */
        .yt-session-tracklist-container {
          background: #141414;
          border-radius: 16px;
          padding: 20px;
          border: 1px solid rgba(255, 255, 255, 0.08);
        }

        .yt-tracklist-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 16px;
        }

        .yt-tracklist-title {
          font-size: 18px;
          font-weight: 800;
          color: #ffffff;
          margin: 0;
        }

        .yt-tracklist-count {
          font-size: 12px;
          color: #aaaaaa;
          font-weight: 600;
        }

        .yt-tracks-list {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        /* Modal Styles */
        .yt-modal-overlay {
          position: fixed;
          inset: 0;
          background: rgba(0, 0, 0, 0.8);
          backdrop-filter: blur(12px);
          z-index: 1000;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 20px;
        }

        .yt-modal-card {
          background: #1c1c1c;
          border: 1px solid rgba(255, 255, 255, 0.15);
          border-radius: 20px;
          width: 100%;
          max-width: 480px;
          padding: 24px;
          box-shadow: 0 20px 60px rgba(0, 0, 0, 0.9);
        }

        .yt-modal-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 20px;
        }

        .yt-modal-header h3 {
          font-size: 18px;
          font-weight: 800;
          color: #ffffff;
          margin: 0;
        }

        .yt-modal-close {
          background: none;
          border: none;
          color: #aaaaaa;
          cursor: pointer;
          padding: 4px;
        }

        .yt-modal-body {
          display: flex;
          flex-direction: column;
          gap: 18px;
          margin-bottom: 24px;
        }

        .yt-setting-group label,
        .yt-modal-body label {
          font-size: 12px;
          font-weight: 700;
          color: #aaaaaa;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          display: block;
          margin-bottom: 8px;
        }

        .yt-modal-chips-group {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
        }

        .yt-modal-chip {
          background: rgba(255, 255, 255, 0.08);
          border: 1px solid rgba(255, 255, 255, 0.1);
          color: #ffffff;
          font-size: 13px;
          font-weight: 600;
          padding: 8px 16px;
          border-radius: 16px;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .yt-modal-chip.active {
          background: #ffffff;
          color: #000000;
        }

        .yt-modal-footer {
          display: flex;
          justify-content: flex-end;
        }

        .yt-save-btn {
          background: #ffffff;
          color: #000000;
          font-size: 14px;
          font-weight: 800;
          padding: 10px 24px;
          border-radius: 20px;
          border: none;
          cursor: pointer;
        }

        @media (max-width: 768px) {
          .yt-finals-page {
            padding: 12px 16px 140px 16px;
          }

          .yt-hero-practice-banner {
            flex-direction: column;
            align-items: flex-start;
            gap: 16px;
            padding: 20px;
          }

          .yt-hero-cover-wrap {
            display: none;
          }

          .yt-programs-grid {
            grid-template-columns: repeat(2, 1fr);
            gap: 12px;
          }

          .yt-program-card {
            padding: 14px;
            min-height: 110px;
          }

          .yt-card-title {
            font-size: 15px;
          }
        }
      `}</style>
    </div>
  );
};

export default FinalsPage;
