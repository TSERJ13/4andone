"use client";

import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { getAudioFile } from '@/utils/storage';

interface AudioContextType {
  isPlaying: boolean;
  isLoaded: boolean;
  bpm: number;
  isFinalMode: boolean;
  currentTime: number;
  trackCurrentTime: number;
  duration: number;
  title: string;
  artist: string;
  error: string | null;
  volume: number;
  isRepeat: boolean;
  isShuffle: boolean;
  isLoading: boolean;
  isPauseCountdown: boolean;
  isFitness: boolean;
  pauseTime: number;
  setIsFitness: (val: boolean) => void;
  togglePlay: () => void;
  loadTrack: (track: any, isRetry?: boolean, forceFinalMode?: boolean) => void;
  setBpm: (bpm: number, persistent?: boolean) => void;
  setVolume: (volume: number) => void;
  toggleRepeat: () => void;
  toggleShuffle: () => void;
  toggleFinalMode: () => void;
  seek: (time: number) => void;
  seekRelative: (seconds: number) => void;
  playNext: () => void;
  playPrevious: () => void;
  stop: () => void;
  sessionDuration: number;
  activeMode: string | null;
  setActiveMode: (mode: string | null) => void;
  sessionTracks: Track[];
  setSessionTracks: (tracks: Track[]) => void;
  fitnessTargetTime: number;
  setFitnessTargetTime: (sec: number) => void;
}

const PlayerContext = createContext<AudioContextType | undefined>(undefined);

import { useStudio, Track } from '@/components/admin/StudioProvider';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/utils/supabase';

export const AudioProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { tracks, finalTracks } = useStudio();
  const { user } = useAuth();
  const [isPlaying, setIsPlaying] = useState(false);
  const [bpm, setBpmState] = useState(100);
  const [isFinalMode, setIsFinalMode] = useState(false); // Default to Normal Mode
  const [currentTime, setCurrentTime] = useState(0);
  const [trackCurrentTime, setTrackCurrentTime] = useState(0); // For round-specific progress
  const [duration, setDuration] = useState(0);
  const [isLoaded, setIsLoaded] = useState(false);


  const [title, setTitle] = useState("No Track Selected");
  const [artist, setArtist] = useState("Upload or select a track");
  const [error, setError] = useState<string | null>(null);
  const [volume, setVolumeState] = useState(1);
  const [isRepeat, setIsRepeat] = useState(false);
  const [isShuffle, setIsShuffle] = useState(false);
  const [isPauseCountdown, setIsPauseCountdown] = useState(false);
  const [pauseTime, setPauseTime] = useState(15);
  const [isFitness, setIsFitness] = useState(false);
  const [fitnessTargetTime, setFitnessTargetTime] = useState<number>(0);
  const [sessionDuration, setSessionDuration] = useState(0);
  const [activeMode, setActiveMode] = useState<string | null>(null);
  const [sessionTracks, setSessionTracks] = useState<Track[]>([]);

  const fitnessTargetTimeRef = useRef(fitnessTargetTime);
  useEffect(() => { fitnessTargetTimeRef.current = fitnessTargetTime; }, [fitnessTargetTime]);

  const nativePlayerRef = useRef<HTMLAudioElement | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const activeBlobUrlRef = useRef<string | null>(null);
  const trackIdRef = useRef<string | null>(null);
  const loadingTokenRef = useRef<number>(0); // Guard for race conditions

  const wakeLockRef = useRef<any>(null);
  const heartbeatRef = useRef<HTMLAudioElement | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const playingTrackRef = useRef<any>(null);
  const trackLogIdRef = useRef<string | null>(null);
  const playPromiseRef = useRef<Promise<void> | null>(null);

  // Refs to avoid circular re-renders on every tick
  const isPlayingRef = useRef(isPlaying);
  const currentTimeRef = useRef(currentTime);
  const trackCurrentTimeRef = useRef(0); // PERF: skip no-op renders in the tick timer
  const lastPositionSyncRef = useRef(0); // PERF: throttle mediaSession.setPositionState
  const isPauseCountdownRef = useRef(isPauseCountdown);
  const pauseTimeRef = useRef(pauseTime);
  const isFinalModeRef = useRef(isFinalMode);
  const sessionTracksRef = useRef(sessionTracks);
  const isFitnessRef = useRef(isFitness);
  const isRepeatRef = useRef(isRepeat);
  const isShuffleRef = useRef(isShuffle);
  const bpmRef = useRef(bpm);
  const volumeRef = useRef(volume);
  const activeModeRef = useRef(activeMode);
  const fadeIntervalRef = useRef<NodeJS.Timeout | null>(null); // Interval for smooth acoustic fade-out
  const finalEndHandledRef = useRef(false); // Guard: prevent double-advance on track end
  const sessionIndexRef = useRef<number>(-1); // Position in the Final Mode session (handles duplicate tracks)
  const pauseDeadlineRef = useRef<number>(0); // Wall-clock deadline for pause countdown (survives screen-off)
  const customTimeLimitRef = useRef<number | null>(null); // Custom dynamic limit when Finals Mode is toggled mid-playback
  const toggledPastLimitRef = useRef(false); // Flag indicating if Finals Mode was manually toggled past the 1:45 mark

  // ---------------------------------------------------------------------------
  // WEB AUDIO GAIN CHAIN (the ONLY way volume control works on iPhone/iPad).
  // On iOS, HTMLMediaElement.volume is READ-ONLY — assignments are silently
  // ignored by the OS, which is why every previous fade-out attempt did nothing
  // on Apple devices. A GainNode IS honored on iOS.
  //
  // Anti-choppiness rules (this is what went wrong in the previous attempt):
  //  * ONE AudioContext for the whole app lifetime, created on a user gesture.
  //  * latencyHint 'playback' → larger buffers → no crackling on iOS/Safari.
  //  * createMediaElementSource is called ONCE per element, ever (re-calling
  //    it throws and kills sound).
  //  * The fade is scheduled on the AUDIO CLOCK (linearRampToValueAtTime), not
  //    on JS timers — so it stays perfectly smooth and even finishes while the
  //    screen is off.
  // If anything fails we fall back to direct playback + element volume, so
  // playback itself can never break because of this chain.
  // ---------------------------------------------------------------------------
  const plainPlayerRef = useRef<HTMLAudioElement | null>(null);
  const finalPlayerRef = useRef<HTMLAudioElement | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const gainNodeRef = useRef<GainNode | null>(null);
  const mediaSourceRef = useRef<MediaElementAudioSourceNode | null>(null);
  const webAudioStateRef = useRef<'off' | 'ready' | 'failed'>('off');
  const fadeScheduledRef = useRef(false); // A ramp-to-zero is currently scheduled

  // DUAL-ELEMENT ARCHITECTURE:
  // plainPlayerRef — normal-mode element. Direct playback, NO WebAudio, ever.
  //                  Native quality and native pitch-corrected speed. (WebKit
  //                  distorts rate-changed audio inside a graph — that was the
  //                  "speed garbles the sound" regression.)
  // finalPlayerRef — Final-Mode element, routed ONCE through a GainNode. On
  //                  iPhone/iPad element.volume is READ-ONLY, so the gain node
  //                  is the only way the 1:42→1:45 fade-out can work there.
  // nativePlayerRef — points at whichever element is ACTIVE. All existing code
  //                  (play/pause/seek/speed/timer) reads it at call time, so it
  //                  automatically drives the right element.
  // Built lazily from loadTrack when a Final session starts (that call stack
  // begins at a click — satisfies iOS's user-gesture rule for AudioContext).
  const ensureFinalGraph = React.useCallback(() => {
    if (webAudioStateRef.current !== 'off') return; // already ready or failed
    try {
      const Ctx: typeof AudioContext | undefined =
        window.AudioContext || (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!Ctx) { webAudioStateRef.current = 'failed'; return; }

      const el = new Audio();
      el.crossOrigin = "anonymous"; // must be set BEFORE any src
      el.autoplay = false;
      // PITCH CORRECTION OFF on this element only: WebKit's pitch-correction
      // is what garbles rate-changed audio inside a WebAudio graph ("skipping
      // vocals"). Without it, speed changes shift pitch slightly (turntable
      // behaviour) but the sound stays clean AND the fade works at any speed.
      el.preservesPitch = false;
      (el as HTMLAudioElement & { webkitPreservesPitch?: boolean }).webkitPreservesPitch = false;
      el.volume = 1.0; // loudness is controlled by the gain node from here on
      el.style.display = 'none';
      document.body.appendChild(el);

      const ctx = new Ctx({ latencyHint: 'playback' });
      const source = ctx.createMediaElementSource(el);
      const gain = ctx.createGain();
      gain.gain.value = volumeRef.current * 0.8;
      source.connect(gain);
      gain.connect(ctx.destination);

      finalPlayerRef.current = el;
      audioCtxRef.current = ctx;
      mediaSourceRef.current = source;
      gainNodeRef.current = gain;
      webAudioStateRef.current = 'ready';
    } catch (e) {
      console.warn('[AUDIO-ENGINE] Final-mode gain chain failed, falling back to plain element:', e);
      webAudioStateRef.current = 'failed';
    }
  }, []);

  // True when the CURRENTLY ACTIVE element is the gain-routed Final one.
  const isGainActive = () =>
    webAudioStateRef.current === 'ready' &&
    !!finalPlayerRef.current &&
    nativePlayerRef.current === finalPlayerRef.current;

  // Set loudness on whichever path is active. `smooth` avoids clicks by using
  // a very short ramp instead of a hard jump.
  const applyVolume = React.useCallback((v: number, smooth = true) => {
    const g = gainNodeRef.current;
    const ctx = audioCtxRef.current;
    if (isGainActive() && g && ctx) {
      const now = ctx.currentTime;
      try {
        g.gain.cancelScheduledValues(now);
        if (smooth) {
          g.gain.setValueAtTime(g.gain.value, now);
          g.gain.linearRampToValueAtTime(Math.max(0.0001, v), now + 0.05);
        } else {
          g.gain.setValueAtTime(Math.max(0.0001, v), now);
        }
      } catch { /* scheduling on a closed context — ignore */ }
      fadeScheduledRef.current = false;
    } else if (nativePlayerRef.current) {
      nativePlayerRef.current.volume = Math.max(0, Math.min(1, v));
    }
  }, []);

  // Cancel any in-flight fade and restore normal loudness (new track, seek back, stop…)
  const cancelFadeAndRestore = React.useCallback(() => {
    applyVolume(volumeRef.current * 0.8);
  }, [applyVolume]);

  useEffect(() => { isPlayingRef.current = isPlaying; }, [isPlaying]);
  useEffect(() => { currentTimeRef.current = currentTime; }, [currentTime]);
  useEffect(() => { isPauseCountdownRef.current = isPauseCountdown; }, [isPauseCountdown]);
  useEffect(() => { pauseTimeRef.current = pauseTime; }, [pauseTime]);
  useEffect(() => {
    isFinalModeRef.current = isFinalMode;
    if (!isFinalMode) {
      customTimeLimitRef.current = null;
    }
  }, [isFinalMode]);
  useEffect(() => { sessionTracksRef.current = sessionTracks; }, [sessionTracks]);
  useEffect(() => { isFitnessRef.current = isFitness; }, [isFitness]);
  useEffect(() => { isRepeatRef.current = isRepeat; }, [isRepeat]);
  useEffect(() => { isShuffleRef.current = isShuffle; }, [isShuffle]);
  useEffect(() => { activeModeRef.current = activeMode; }, [activeMode]);
  useEffect(() => { bpmRef.current = bpm; }, [bpm]);
  useEffect(() => { volumeRef.current = volume; }, [volume]);

  // Reactive Session Duration Calculation
  // This ensures the total time is known immediately when sessionTracks changes,
  // preventing the "duration flicker" from one track's time to the full session time.
  useEffect(() => {
    if (isFitness && fitnessTargetTime > 0) {
      setSessionDuration(fitnessTargetTime);
    } else if (isFinalMode) {
      if (sessionTracks.length > 0) {
        const getLimitForTrack = (track: Track) => {
          const style = track.style?.toLowerCase() || '';
          if (style.includes('paso')) return track.duration || 210; 
          return 105; // Standardized to 1:45 per user request
        };

        const total = sessionTracks.reduce((acc, t, idx) => {
          if (!t) return acc;
          const limit = getLimitForTrack(t);
          const safeLimit = Number.isFinite(limit) && limit > 0 ? limit : 0;
          const rest = (idx < sessionTracks.length - 1 && !isFitness) ? 15 : 0;
          return acc + safeLimit + rest;
        }, 0);
        
        const safeTotal = Number.isFinite(total) && total >= 0 ? total : 0;
        setSessionDuration(safeTotal);
      } else {
        // Single track Final Mode logic
        const style = playingTrackRef.current?.style?.toLowerCase() || '';
        const limit = style.includes('paso') ? (duration || 210) : 105;
        setSessionDuration(limit);
      }
    } else {
      const safeDur = Number.isFinite(duration) && duration >= 0 ? duration : 0;
      setSessionDuration(safeDur);
    }
  }, [sessionTracks, isFinalMode, isFitness, fitnessTargetTime, duration, title]);

  // Tab synchronization for audio control
  useEffect(() => {
    const channel = new BroadcastChannel('audio_control');
    channel.onmessage = (event) => {
      if (event.data === 'play' && isPlaying) {
        if (nativePlayerRef.current) nativePlayerRef.current.pause();
        setIsPlaying(false);
      }
    };
    return () => channel.close();
  }, [isPlaying]);

  const notifyOtherTabs = () => {
    const channel = new BroadcastChannel('audio_control');
    channel.postMessage('play');
    channel.close();
  };

  // Removed AI worker and processing hooks

  const initAudioChain = () => {
    return null;
  };

  // CENTRAL FINAL-MODE ADVANCE LOGIC
  // Decides what happens when a Final Mode track finishes (by natural end OR by 1:45 limit).
  // Fixes three bugs:
  //  1. Duplicate tracks: uses sessionIndexRef (position) instead of searching by id/title,
  //     so two identical tracks no longer make the session loop forever.
  //  2. Last track: stops cleanly with NO 15s pause countdown — Final Mode just ends.
  //  3. Short tracks: this is reached via onended for tracks shorter than 1:45 too.
  // NOTE: loadTrack and stop are defined later in this component, so we call them
  // through refs to avoid the temporal-dead-zone / stale-closure problem.
  const loadTrackRef = useRef<(track: any, isRetry?: boolean, forceFinalMode?: boolean) => void>(() => {});
  const stopRef = useRef<() => void>(() => {});

  const advanceFinalSession = React.useCallback(() => {
    const tracksList = sessionTracksRef.current;

    // Resolve current position. Prefer the tracked index; fall back to a search only if needed.
    let currentIdx = sessionIndexRef.current;
    if (currentIdx < 0 || currentIdx >= tracksList.length || tracksList[currentIdx]?.id !== trackIdRef.current) {
      currentIdx = tracksList.findIndex(t => t.id === trackIdRef.current);
    }

    const isLastTrack = currentIdx === -1 || currentIdx >= tracksList.length - 1;

    // BUG FIX: On the last track, Final Mode must STOP — no 15s countdown.
    if (isLastTrack) {
      stopRef.current();
      return;
    }

    // Fitness mode: skip the rest pause, jump straight to next track.
    if (isFitnessRef.current) {
      const nextIdx = currentIdx + 1;
      sessionIndexRef.current = nextIdx;
      const next = tracksList[nextIdx];
      cancelFadeAndRestore();
      loadTrackRef.current(next, false, true);
      return;
    }

    // Standard Final Mode: start the 15s rest countdown before the next track.
    setIsPauseCountdown(true);
    isPauseCountdownRef.current = true;
    setPauseTime(15);
    pauseTimeRef.current = 15;
    pauseDeadlineRef.current = Date.now() + 15000; // wall-clock deadline (screen-off safe)
  }, []);


  useEffect(() => {
    // Initialize Persistent Player & Heartbeat
    if (typeof window !== 'undefined') {
      // 1. PLAIN element — used for ALL normal-mode playback. It is NEVER routed
      // through WebAudio, so normal listening keeps native, pristine quality and
      // native speed control (this is what fixed the "speed garbles the sound"
      // regression: WebKit distorts rate-changed audio inside a WebAudio graph).
      const audio = new Audio();
      audio.crossOrigin = "anonymous";
      audio.autoplay = false;
      audio.preservesPitch = true;
      // Older iOS Safari needs the prefixed property for pitch-corrected speed.
      (audio as HTMLAudioElement & { webkitPreservesPitch?: boolean }).webkitPreservesPitch = true;
      audio.style.display = 'none';
      document.body.appendChild(audio);

      plainPlayerRef.current = audio;
      nativePlayerRef.current = audio; // active element = plain by default

      // 2. Tiny silent WAV to keep iOS audio session alive
      const silentWav = "data:audio/wav;base64,UklGRjIAAABXQVZFRm10IBAAAAABAAEAIlYAAESsAAACABAAZGF0YRAAAAAAAAAAAAAAAAAAAAAAAAAA";
      const hb = new Audio(silentWav);
      hb.loop = true;
      hb.volume = 0.01; 
      hb.style.display = 'none';
      document.body.appendChild(hb);
      heartbeatRef.current = hb;
    }

    const savedVol = localStorage.getItem('4andone-volume');
    if (savedVol) setVolumeState(parseFloat(savedVol));

    // SPEED PERSISTENCE FIX: restore the user's last chosen speed on startup.
    // It was being saved to localStorage but never read back, so every reload
    // reset the speed to 100%.
    const savedBpm = localStorage.getItem('4andone-bpm');
    if (savedBpm) {
      const parsed = parseFloat(savedBpm);
      if (!isNaN(parsed) && parsed > 0) {
        setBpmState(parsed);
        bpmRef.current = parsed;
      }
    }

    // Global "Unlock" for mobile audio + Safari Optimizations
    const unlockAudio = async () => {
      // Resume the Final-Mode audio context if it exists (iOS suspends it).
      if (audioCtxRef.current && audioCtxRef.current.state === 'suspended') {
        audioCtxRef.current.resume().catch(() => {});
      }

      // Start heartbeat on first interaction
      if (heartbeatRef.current && heartbeatRef.current.paused) {
        heartbeatRef.current.play().catch(() => { });
        // Set to loop and never stop for session persistence
        heartbeatRef.current.loop = true;
      }

      // Remove listeners once unlocked
      document.removeEventListener('touchstart', unlockAudio);
      document.removeEventListener('mousedown', unlockAudio);
    };

    // PWA Resume Support
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        // iOS suspends the AudioContext in the background — resume it or the
        // gain chain (and therefore all sound) stays silent.
        if (audioCtxRef.current && audioCtxRef.current.state === 'suspended') {
          audioCtxRef.current.resume().catch(() => {});
        }
        // App backgrounding/foregrounding can pause heartbeat on some iOS versions
        if (heartbeatRef.current && heartbeatRef.current.paused && isPlayingRef.current) {
          heartbeatRef.current.play().catch(() => {});
        }

        // PAUSE COUNTDOWN CATCH-UP: setInterval is frozen while the screen is off,
        // so when we come back we must re-evaluate the wall-clock deadline immediately.
        // If the rest period already elapsed in the background, advance right away.
        if (isPauseCountdownRef.current && pauseDeadlineRef.current) {
          const remainingMs = pauseDeadlineRef.current - Date.now();
          if (remainingMs <= 0) {
            pauseDeadlineRef.current = 0;
            const tracksList = sessionTracksRef.current;
            let currentIndex = sessionIndexRef.current;
            if (currentIndex < 0 || currentIndex >= tracksList.length ||
                tracksList[currentIndex]?.id !== trackIdRef.current) {
              currentIndex = tracksList.findIndex(t => t.id === trackIdRef.current);
            }
            if (currentIndex !== -1 && currentIndex < tracksList.length - 1) {
              const nextIndex = currentIndex + 1;
              sessionIndexRef.current = nextIndex;
              cancelFadeAndRestore();
              loadTrack(tracksList[nextIndex], false, true);
            } else {
              stop();
            }
          } else {
            // Still counting — sync the visible number to the real remaining time
            pauseTimeRef.current = remainingMs / 1000;
            setPauseTime(Math.ceil(remainingMs / 1000));
          }
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    document.addEventListener('touchstart', unlockAudio, { passive: true });
    document.addEventListener('mousedown', unlockAudio);

    return () => {
      document.removeEventListener('touchstart', unlockAudio);
      document.removeEventListener('mousedown', unlockAudio);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  const loadTrack = async (track: any, isRetry = false, forceFinalMode?: boolean) => {
    // If the same track is clicked and it's already loaded, toggle play/pause instead of reloading
    if (trackIdRef.current === track.id && isLoaded) {
      togglePlay();
      return;
    }

    const currentToken = ++loadingTokenRef.current;

    try {
      if (forceFinalMode !== undefined) {
        setIsFinalMode(forceFinalMode);
        isFinalModeRef.current = forceFinalMode; // IMMEDIATE SYNC for closure
      } else {
        // PLAIN PLAYBACK: loadTrack called WITHOUT forceFinalMode means the user
        // picked a normal track (e.g. after a Final Mode session ended). Final
        // Mode must be turned OFF here — otherwise the 1:45 cutoff stayed active
        // and kept trimming normal tracks. Final Mode sessions always pass
        // forceFinalMode === true, so this never affects a real session.
        if (isFinalModeRef.current) {
          setIsFinalMode(false);
          isFinalModeRef.current = false;
        }
        setActiveMode(null);
        setSessionTracks([]);
        sessionIndexRef.current = -1;
        setIsPauseCountdown(false);
        isPauseCountdownRef.current = false;
        pauseDeadlineRef.current = 0;
      }
      finalEndHandledRef.current = false;

      // ELEMENT SWAP: pick the right output path for this track.
      // Final Mode → gain-routed element (iOS fade works). Normal → plain
      // element (pristine native quality + native speed). Pause the inactive
      // element so two tracks never play at once.
      if (isFinalModeRef.current) {
        // Final Mode ALWAYS uses the gain element so the fade works at every
        // speed on iOS. The WebKit garble was caused by the PITCH-CORRECTION
        // algorithm running inside the graph, so pitch correction is disabled
        // on this element only (see ensureFinalGraph): speed changes shift the
        // pitch slightly, like a turntable, but the sound stays clean.
        ensureFinalGraph();
        if (webAudioStateRef.current === 'ready' && finalPlayerRef.current) {
          if (plainPlayerRef.current && !plainPlayerRef.current.paused) plainPlayerRef.current.pause();
          nativePlayerRef.current = finalPlayerRef.current;
        } else if (plainPlayerRef.current) {
          nativePlayerRef.current = plainPlayerRef.current; // graph failed → fallback
        }
      } else if (plainPlayerRef.current) {
        // Normal mode OR Final Mode at non-100% speed → plain element.
        if (finalPlayerRef.current && !finalPlayerRef.current.paused) finalPlayerRef.current.pause();
        nativePlayerRef.current = plainPlayerRef.current;
      }

      // SESSION INDEX TRACKING (duplicate-track safe).
      // When a Final Mode program starts, loadTrack is always called with the first
      // track (index 0). advanceFinalSession / the pause timer then increment the
      // index themselves. If loadTrack is called some other way during a session,
      // we keep the index in sync by matching the track object identity first,
      // and only fall back to a title/id search when that fails.
      if (sessionTracksRef.current.length > 0) {
        if (sessionIndexRef.current >= 0 && 
            sessionTracksRef.current[sessionIndexRef.current]?.id === track.id) {
          // Trust the existing index (it was set by advance logic)
        } else {
          const exactIdx = sessionTracksRef.current.indexOf(track);
          if (exactIdx !== -1) {
            sessionIndexRef.current = exactIdx;
          } else {
            const byId = sessionTracksRef.current.findIndex(t => t.id === track.id);
            sessionIndexRef.current = byId; // -1 if not part of the session
          }
        }
      } else {
        sessionIndexRef.current = -1;
      }
      // A brand-new program always begins at index 0.
      if (forceFinalMode === true && sessionIndexRef.current < 0) {
        sessionIndexRef.current = 0;
      }
      // Context start

      // Cleanup previous state immediately
      const stopAndPrepare = () => {
        if (nativePlayerRef.current) {
          nativePlayerRef.current.onerror = null;
          nativePlayerRef.current.oncanplay = null;
          nativePlayerRef.current.ontimeupdate = null;
          nativePlayerRef.current.onended = null;
          nativePlayerRef.current.pause();
        }
        if (fadeIntervalRef.current) {
          clearInterval(fadeIntervalRef.current);
          fadeIntervalRef.current = null;
        }
        setIsPauseCountdown(false);
        isPauseCountdownRef.current = false;
        setPauseTime(15);
        pauseTimeRef.current = 15;
        finalEndHandledRef.current = false; // Allow end-handling for the new track
        customTimeLimitRef.current = null;
        toggledPastLimitRef.current = false;
      };

      stopAndPrepare();

      if (!isRetry && activeBlobUrlRef.current) {
        URL.revokeObjectURL(activeBlobUrlRef.current);
        activeBlobUrlRef.current = null;
      }

      // INSTANT FEEDBACK: Update UI info immediately so the PlayerBar pops up right away
      setIsPlaying(false);
      setIsLoaded(false);
      setIsLoading(true);
      setError(null);
      setCurrentTime(0);
      setTrackCurrentTime(0);
      currentTimeRef.current = 0;
      trackCurrentTimeRef.current = 0;
      setTitle(track.title);
      setArtist(track.artist);
      trackIdRef.current = track.id;
      playingTrackRef.current = track;

      let finalUrl = track.audioUrl;

      // AUTO-HEALING: If track was saved with "undefined/" due to missing env vars
      if (finalUrl?.startsWith('undefined/')) {
        const R2_FALLBACK = process.env.NEXT_PUBLIC_R2_PUBLIC_URL || 'https://pub-c41b1121b311f676bdc114d143278d18.r2.dev';
        finalUrl = finalUrl.replace('undefined/', `${R2_FALLBACK}/`);
      }

      const isRemote = finalUrl?.startsWith('http');

      // 1. If REMOTE (Cloudflare R2), we try signed first, fallback to public on error if needed
      if (isRemote && finalUrl) {
        try {
          const R2_DOMAIN = process.env.NEXT_PUBLIC_R2_PUBLIC_URL || 'https://pub-c41b1121b311f676bdc114d143278d18.r2.dev';
          const domainNormalized = R2_DOMAIN.replace(/\/$/, '');
          
          // EXTRACT FULL KEY: Take everything after the domain to handle nested paths
          let storageKey = '';
          if (finalUrl.includes(domainNormalized)) {
            storageKey = finalUrl.split(`${domainNormalized}/`)[1];
          } else {
            // Fallback for custom or direct URLs
            storageKey = finalUrl.split('/').slice(3).join('/');
          }

          if (!storageKey) throw new Error("Invalid remote URL storage key");

          const signRes = await fetch(`/api/upload?key=${encodeURIComponent(storageKey)}`);

          if (signRes.ok) {
            const { url } = await signRes.json();
            finalUrl = url;
          } else {
            // FALLBACK: Use environment Public R2 URL with the full gathered path
            finalUrl = `${domainNormalized}/${storageKey}`;
          }
        } catch (e) {
          console.error("[AUDIO-ENGINE] Playback signing failed:", e);
        }
      }
      // 2. Legacy Fallback (IndexedDB)
      else if (track.id) {
        const file = await getAudioFile(track.id);
        if (file) {
          finalUrl = URL.createObjectURL(file);
          activeBlobUrlRef.current = finalUrl;
        }
      }

      if (!finalUrl) {
        throw new Error("Missing Audio Source (File not found in storage)");
      }

      const setupPlayer = (url: string) => {
        return new Promise<HTMLAudioElement>((resolve, reject) => {
          if (currentToken !== loadingTokenRef.current) {
            reject(new Error("Loading cancelled by new request"));
            return;
          }

          const audio = nativePlayerRef.current || new Audio();
          if (!nativePlayerRef.current) {
            nativePlayerRef.current = audio;
            audio.crossOrigin = "anonymous";
          }
          
          audio.crossOrigin = "anonymous";
          
          // RESET VOLUME: Ensure any previous fade-out is reversed (works on iOS via gain)
          cancelFadeAndRestore();

          audio.oncanplay = () => {
            if (currentToken !== loadingTokenRef.current) return;
            const realDuration = audio.duration || 0;
            setDuration(realDuration);
            setIsLoaded(true);
            setIsLoading(false);
            // SPEED PERSISTENCE FIX (real cause): audio.load() resets playbackRate
            // back to 1.0, so setting it before load() was always wiped. We re-apply
            // the user's chosen speed here, AFTER the resource has finished loading.
            const pitchOn = audio !== finalPlayerRef.current; // final element keeps pitch correction OFF
            audio.preservesPitch = pitchOn;
            (audio as HTMLAudioElement & { webkitPreservesPitch?: boolean }).webkitPreservesPitch = pitchOn;
            const desiredRate = bpmRef.current / 100;
            if (desiredRate > 0 && Math.abs(audio.playbackRate - desiredRate) > 0.001) {
              audio.playbackRate = desiredRate;
            }
            resolve(audio);
          };

          audio.onerror = (e) => {
            const err = audio.error;
            let msg = `Stream error: ${track.title}`;
            if (err) {
              if (err.code === 3 || err.code === 4) {
                msg = `Format Error: ${track.title} (.mpa / unsupported codec). Convert to MP3 and re-upload.`;
              } else if (!isRetry) {
                try {
                  const urlObj = new URL(url);
                  const fileName = urlObj.pathname.split('/').pop();
                  if (fileName) {
                    const R2_PUBLIC = process.env.NEXT_PUBLIC_R2_PUBLIC_URL || 'https://pub-c41b1121b311f676bdc114d143278d18.r2.dev';
                    const fallbackUrl = `${R2_PUBLIC}/${fileName}`;
                    loadTrack({ ...track, audioUrl: fallbackUrl }, true, isFinalModeRef.current);
                    return;
                  }
                } catch (e) {
                  // Fallthrough
                }
              }
            }
            reject(new Error(msg));
          };

          // NATURAL END HANDLING
          // NOTE: In Final Mode, ontimeupdate handles the 1:45 cutoff for tracks LONGER than 1:45.
          // onended fires for: Paso Doble (full track) AND for any track SHORTER than 1:45
          // (which never reaches the 105s limit). This is the fix for the "freeze" bug.
          // We guard with isPauseCountdownRef + finalEndHandledRef to prevent double-pause.
          audio.onended = () => {
            if (currentToken !== loadingTokenRef.current) return;

            if (isFinalModeRef.current) {
              // If pause was already triggered by ontimeupdate, do nothing
              if (isPauseCountdownRef.current) return;
              // Guard: prevent this handler running twice for the same track
              if (finalEndHandledRef.current) return;
              finalEndHandledRef.current = true;

              // This handler now covers BOTH cases:
              //  1. Paso Doble — plays the full track, ends naturally.
              //  2. Any track shorter than 1:45 — ends before reaching the 105s limit.
              // In both cases we must advance the session (or finish it).
              advanceFinalSession();
            } else {
              if (!isRepeat) {
                audio.pause();
                setIsPlaying(false);
                setCurrentTime(0);
                audio.currentTime = 0;
              } else {
                audio.currentTime = 0;
                setCurrentTime(0);
                audio.play().catch(() => {});
              }
            }
          };

          // ATTACH EVENT-DRIVEN MONITORING (Frame-accurate limit checks)
          audio.ontimeupdate = () => {
            if (currentToken !== loadingTokenRef.current) return;
            const currentTimeVal = audio.currentTime;
            
            // 1. FITNESS TARGET DURATION OVERALL CUTOFF & FADE-OUT
            if (isFitnessRef.current && fitnessTargetTimeRef.current > 0 && isPlayingRef.current) {
              let prevElapsed = 0;
              const currIndex = sessionIndexRef.current >= 0 ? sessionIndexRef.current : 0;
              for (let i = 0; i < currIndex; i++) {
                const tr = sessionTracksRef.current[i];
                prevElapsed += (tr?.duration || 180);
              }
              const totalSessionElapsed = prevElapsed + currentTimeVal;
              const remainingSessionSecs = fitnessTargetTimeRef.current - totalSessionElapsed;

              if (remainingSessionSecs <= 3 && remainingSessionSecs > 0) {
                const baseVol = volumeRef.current * 0.8;
                const g = gainNodeRef.current;
                const ctx = audioCtxRef.current;
                if (isGainActive() && g && ctx) {
                  if (!fadeScheduledRef.current) {
                    fadeScheduledRef.current = true;
                    const now = ctx.currentTime;
                    try {
                      g.gain.cancelScheduledValues(now);
                      g.gain.setValueAtTime(g.gain.value, now);
                      g.gain.linearRampToValueAtTime(0.0001, now + remainingSessionSecs);
                    } catch { fadeScheduledRef.current = false; }
                  }
                } else if (nativePlayerRef.current) {
                  const progress = Math.min(1, Math.max(0, (3 - remainingSessionSecs) / 3));
                  const ratio = Math.cos(progress * Math.PI / 2);
                  nativePlayerRef.current.volume = baseVol * ratio;
                }
              }

              if (remainingSessionSecs <= 0) {
                if (finalEndHandledRef.current) return;
                finalEndHandledRef.current = true;
                audio.onended = null;
                audio.pause();
                setIsPlaying(false);
                isPlayingRef.current = false;
                stop();
                return;
              }
            }

            // 2. FINAL MODE LIMIT CHECK (1:45 / 1:25)
            if (isFinalModeRef.current && !isFitnessRef.current && !isPauseCountdownRef.current && isPlayingRef.current) {
              const style = playingTrackRef.current?.style?.toLowerCase() || '';
              const isPasoDoble = style.includes('paso');
              const isVW = style.includes('viennese') || (style.includes('waltz') && style.includes('v'));
              const standardLimit = isPasoDoble ? Infinity : (isVW ? 85 : 105);

              // Dynamically set custom override limit if playing past standard limit - 3
              if (!isPasoDoble && currentTimeVal > (standardLimit - 3) && customTimeLimitRef.current === null) {
                customTimeLimitRef.current = currentTimeVal + 3;
                if (currentTimeVal >= standardLimit) {
                  toggledPastLimitRef.current = true;
                }
              }

              // Reset override limit if seeking back before standard limit - 3
              if (!isPasoDoble && currentTimeVal < (standardLimit - 3) && customTimeLimitRef.current !== null) {
                customTimeLimitRef.current = null;
                toggledPastLimitRef.current = false;
              }

              const timeLimit = isPasoDoble ? Infinity : (customTimeLimitRef.current || standardLimit);

              // EFFECTIVE END = whichever comes first: the limit OR the track's
              // natural end. This is the fix for "fade doesn't run on every track":
              // tracks shorter than the limit never reached the limit mark, so the fade
              // never started. Now short tracks fade out before their real end too.
              const trackDuration = (audio.duration && isFinite(audio.duration)) ? audio.duration : timeLimit;
              const effectiveEnd = Math.min(timeLimit, trackDuration);

              // Smooth Acoustic Fade-Out — iOS-compatible.
              // On Apple devices element.volume is read-only, so the fade is done
              // through the GainNode. We schedule ONE linear ramp on the audio
              // clock when entering the window (1:42), ending exactly at the
              // limit (1:45). The audio clock keeps running with the screen off,
              // so the fade completes in the background too.
              if (audio && !isPasoDoble && isFinite(effectiveEnd)) {
                const FADE_DURATION = 3; // track-seconds before the effective end
                const timeLeft = effectiveEnd - currentTimeVal;
                const baseVol = volumeRef.current * 0.8;
                const g = gainNodeRef.current;
                const ctx = audioCtxRef.current;

                if (timeLeft <= FADE_DURATION && timeLeft > 0) {
                  if (isGainActive() && g && ctx) {
                    if (!fadeScheduledRef.current) {
                      fadeScheduledRef.current = true;
                      // Convert track-seconds to real seconds (speed matters!)
                      const realSecondsLeft = timeLeft / (audio.playbackRate || 1);
                      const now = ctx.currentTime;
                      try {
                        g.gain.cancelScheduledValues(now);
                        g.gain.setValueAtTime(g.gain.value, now);
                        g.gain.linearRampToValueAtTime(0.0001, now + realSecondsLeft);
                      } catch { fadeScheduledRef.current = false; }
                    }
                  } else if (nativePlayerRef.current) {
                    // Desktop fallback: per-tick cosine fade on the element volume
                    const progress = Math.min(1, Math.max(0, (FADE_DURATION - timeLeft) / FADE_DURATION));
                    const ratio = Math.cos(progress * Math.PI / 2);
                    nativePlayerRef.current.volume = baseVol * ratio;
                  }
                } else if (timeLeft > FADE_DURATION && fadeScheduledRef.current) {
                  // User seeked back before the window — cancel the ramp, restore.
                  cancelFadeAndRestore();
                } else if (timeLeft > FADE_DURATION && !isGainActive()
                           && nativePlayerRef.current
                           && Math.abs(nativePlayerRef.current.volume - baseVol) > 0.01) {
                  nativePlayerRef.current.volume = baseVol;
                }
              }

              // TRIGGER NEXT or END at 1:45 limit (ontimeupdate handles non-Paso tracks
              // that are LONGER than 1:45). Tracks shorter than 1:45 are handled by onended.
              // isPasoDoble is handled by onended, skip it here
              if (!isPasoDoble && currentTimeVal >= timeLimit) {
                // Guard: only trigger once
                if (isPauseCountdownRef.current) return;
                if (finalEndHandledRef.current) return;
                finalEndHandledRef.current = true;

                audio.onended = null;
                audio.pause();
                setIsPlaying(false);
                isPlayingRef.current = false;

                if (toggledPastLimitRef.current) {
                  toggledPastLimitRef.current = false;
                  audio.currentTime = 0;
                  setCurrentTime(0);
                  trackCurrentTimeRef.current = 0;
                  // Restore volume (iOS-safe)
                  cancelFadeAndRestore();
                  return;
                }

                if (activeModeRef.current) {
                  advanceFinalSession();
                } else {
                  // Single-track Final Mode (no program): just auto-stop cleanly
                  audio.currentTime = 0;
                  setCurrentTime(0);
                  // Restore volume (iOS-safe)
                  cancelFadeAndRestore();
                }
              }
            }
          };

          // NATIVE SPEED CONTROL: No bridge needed
          {
            const pitchOn = audio !== finalPlayerRef.current; // final element keeps pitch correction OFF
            audio.preservesPitch = pitchOn;
            (audio as HTMLAudioElement & { webkitPreservesPitch?: boolean }).webkitPreservesPitch = pitchOn;
          }
          // SPEED PERSISTENCE FIX: use the live bpmRef (user-selected speed), NOT the
          // stale `bpm` closure value. Previously a new track could reset the rate,
          // so the speed the user picked was lost on every track change.
          audio.playbackRate = bpmRef.current / 100;
          // Use the REF, not the state: when a Final session starts, the state in
          // this closure is still stale (false), which set loop=true on the Final
          // element — the track silently restarted at its end instead of firing
          // onended, so the session never advanced ("starts over at the end" bug).
          audio.loop = !isFinalModeRef.current;
          audio.src = url;
          audio.load();
        });
      };

      try {
        const audio = await setupPlayer(finalUrl);

        // CRITICAL: if the AudioContext is suspended, everything routed through
        // it is SILENT even though the element "plays". This was the likely
        // cause of "plays but no sound" — always resume before playing.
        if (audioCtxRef.current && audioCtxRef.current.state === 'suspended') {
          try { await audioCtxRef.current.resume(); } catch { /* ignore */ }
        }
        playPromiseRef.current = audio.play();
        
        // Start heartbeat for iOS backgrounding
        if (heartbeatRef.current) {
            heartbeatRef.current.play().catch(() => {});
        }

        playPromiseRef.current.catch(e => {
        }).finally(() => {
          playPromiseRef.current = null;
        });
        setIsPlaying(true);
      } catch (e: any) {
        if (e.message === "Loading cancelled by new request") return;
        setError(e.message || "File Unreachable");
        setIsLoaded(false);
        setIsLoading(false);
      }

      // MEDIA SESSION SETUP
      if ('mediaSession' in navigator) {
        navigator.mediaSession.metadata = new MediaMetadata({
          title: track.title,
          artist: track.artist,
          album: track.album || '4and.one Music',
          artwork: track.artworkUrl ? [
            { src: track.artworkUrl, sizes: '512x512', type: 'image/jpeg' },
          ] : [
            { src: '/icons/icon-192x192.png', sizes: '192x192', type: 'image/png' },
            { src: '/icons/icon-512x512.png', sizes: '512x512', type: 'image/png' },
          ]
        });

        // ACTION HANDLERS: Crucial for background playback on iOS PWA
        navigator.mediaSession.setActionHandler('play', () => { togglePlay(); });
        navigator.mediaSession.setActionHandler('pause', () => { togglePlay(); });
        navigator.mediaSession.setActionHandler('previoustrack', () => { playPrevious(); });
        navigator.mediaSession.setActionHandler('nexttrack', () => { playNext(); });
        
        // Seek handlers
        navigator.mediaSession.setActionHandler('seekto', (details) => {
            if (details.seekTime !== undefined) {
               seek(details.seekTime);
            }
        });
      }

      // ANALYTICS: Log track play event
      // Previously this whole block was commented out, so track_plays never received
      // any rows — that's why "Most Played" and "Style Popularity" stayed empty.
      try {
        const sessionId = typeof window !== 'undefined' ? sessionStorage.getItem('4andone_session_id') : null;
        const tgUser = typeof window !== 'undefined' ? (window as any).Telegram?.WebApp?.initDataUnsafe?.user : null;
        const userRef = user?.id?.toString() || tgUser?.id?.toString() || null;

        trackLogIdRef.current = null;
        supabase.from('track_plays').insert({
          track_id: track.id,
          user_ref: userRef,
          session_id: sessionId,
          style: track.style || 'Unknown',
          bpm: track.bpm?.toString() || '0',
          duration_seconds: 0
        }).select('id').single().then(({ data, error }) => {
          if (error) {
            console.warn('[ANALYTICS] track_plays insert failed:', error.message);
            return;
          }
          if (data) trackLogIdRef.current = data.id;
        });
      } catch (e) {
        console.warn('[ANALYTICS] track play logging error:', e);
      }

    } catch (err: any) {
      setError(err.message || "Failed to load track");
      setIsLoaded(false);
      setIsLoading(false);
    }
  };

  // Removed specialized filters

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  useEffect(() => {
    // RUN DURING PLAYER ACTIVE OR LOADING OR COUNTDOWN
    if (isPlaying || isPauseCountdown || isLoading) {
      timerRef.current = setInterval(() => {
        if (isPauseCountdownRef.current) {
          // WALL-CLOCK COUNTDOWN: derive remaining time from a real timestamp deadline
          // instead of decrementing a counter. setInterval is throttled/frozen when the
          // screen is off (iOS), so a counter would "pause" with it. Date.now() keeps
          // advancing, so when the screen wakes the countdown is already correct.
          if (!pauseDeadlineRef.current) {
            pauseDeadlineRef.current = Date.now() + pauseTimeRef.current * 1000;
          }
          const remainingMs = pauseDeadlineRef.current - Date.now();
          const newPauseTime = Math.max(0, remainingMs / 1000);
          pauseTimeRef.current = newPauseTime;
          setPauseTime(Math.ceil(newPauseTime));

          if (newPauseTime <= 0) {
            pauseDeadlineRef.current = 0;
            // CRITICAL: use the tracked session index (duplicate-safe), with a fallback search
            const tracksList = sessionTracksRef.current;
            let currentIndex = sessionIndexRef.current;
            if (currentIndex < 0 || currentIndex >= tracksList.length ||
                tracksList[currentIndex]?.id !== trackIdRef.current) {
              currentIndex = tracksList.findIndex(t => t.id === trackIdRef.current);
            }

            if (currentIndex !== -1 && currentIndex < tracksList.length - 1) {
              const nextIndex = currentIndex + 1;
              sessionIndexRef.current = nextIndex;
              const nextTrack = tracksList[nextIndex];
              // Restore volume before loading next track
              cancelFadeAndRestore();
              loadTrack(nextTrack, false, true);
            } else {
              // No more tracks - stop
              stop();
            }
          }
          return;
        }

        if (nativePlayerRef.current) {
          const currentTimeVal = nativePlayerRef.current.currentTime;
          // PERF: only push a state update when the displayed value actually
          // changes by a noticeable amount. Previously this fired ~10x/sec
          // unconditionally, re-rendering the whole component tree and starving
          // the main thread — that's why buttons felt unresponsive / CPU spiked.
          if (Math.abs((trackCurrentTimeRef.current ?? -1) - currentTimeVal) >= 0.2) {
            trackCurrentTimeRef.current = currentTimeVal;
            setTrackCurrentTime(currentTimeVal);
          }

          if (isFinalModeRef.current) {
            // Calculate Session-wide metrics for display if in a program
            const currentIdx = sessionTracksRef.current.findIndex(t => t.id === trackIdRef.current || t.title === title);
            if (currentIdx !== -1) {
              const getLimitForTrack = (track: Track) => {
                if (!track) return 105;
                if (isFitnessRef.current) return track.duration || 180;
                const style = track.style?.toLowerCase() || '';
                if (style.includes('paso')) return track.duration || 120;
                if (style.includes('viennese')) return 85;
                return 105;
              };

              let sessionElapsed = 0;
              for (let i = 0; i < currentIdx; i++) {
                const trackLimit = getLimitForTrack(sessionTracksRef.current[i]);
                sessionElapsed += trackLimit + (isFitnessRef.current ? 0 : 15);
              }

              const currentTrackLimit = getLimitForTrack(sessionTracksRef.current[currentIdx]);
              sessionElapsed += isPauseCountdownRef.current ? (currentTrackLimit + (15 - pauseTimeRef.current)) : currentTimeVal;

              const safeSessionElapsed = Number.isFinite(sessionElapsed) ? Math.max(0, sessionElapsed) : 0;
              if (Math.abs((currentTimeRef.current ?? -1) - safeSessionElapsed) >= 0.2) {
                currentTimeRef.current = safeSessionElapsed;
                setCurrentTime(safeSessionElapsed);
              }
            } else if (Math.abs((currentTimeRef.current ?? -1) - currentTimeVal) >= 0.2) {
              currentTimeRef.current = currentTimeVal;
              setCurrentTime(currentTimeVal);
            }
          } else {
            // Normal Mode: Simply track the relative file time
            if (Math.abs((currentTimeRef.current ?? -1) - currentTimeVal) >= 0.2) {
              currentTimeRef.current = currentTimeVal;
              setCurrentTime(currentTimeVal);
            }
          }

          // SAFE MEDIASESSION UPDATE: throttled to ~once per second (it does not
          // need 10x/sec updates and the native call is comparatively expensive).
          const nowTs = Date.now();
          if ('mediaSession' in navigator && (navigator.mediaSession as any).setPositionState
              && nowTs - (lastPositionSyncRef.current || 0) > 1000) {
            lastPositionSyncRef.current = nowTs;
            try {
              // Ensure all values are finite and valid numbers before calling native API
              const rawDurationVal = isFinalMode && sessionTracks.length > 0 ? (sessionDuration || 0) : (nativePlayerRef.current?.duration || 0);
              const safeDuration = Number.isFinite(rawDurationVal) && rawDurationVal > 0 ? rawDurationVal : 0;
              
              const rawPositionVal = isFinalMode && sessionTracks.length > 0 ? (currentTime || 0) : currentTimeVal;
              const safePosition = Number.isFinite(rawPositionVal) && rawPositionVal >= 0 ? Math.min(rawPositionVal, safeDuration) : 0;
              
              const safeRate = Number.isFinite(bpmRef.current) && bpmRef.current > 0 ? bpmRef.current / 100 : 1.0;

              if (safeDuration > 0 && safePosition >= 0) {
                navigator.mediaSession.setPositionState({
                  duration: safeDuration,
                  playbackRate: safeRate,
                  position: safePosition
                });
              }
            } catch (msError) {
              // Silently catch media session errors to prevent UI crash
              console.warn("[AUDIO-ENGINE] MediaSession position update failed:", msError);
            }
          }

          // PERIODIC ANALYTICS UPDATE: Update track play duration
              /*
              .from('track_plays')
              .update({ duration_seconds: Math.floor(currentTimeVal) })
              .eq('id', trackLogIdRef.current)
              .then(() => {});
              */
        }
      }, 250);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isPlaying, isPauseCountdown, isLoading, duration, isFinalMode, title]);

  const togglePlay = React.useCallback(async () => {
    // Mobile browsers require resume() on user gesture
    if (!isLoaded) return;

    if (isPlayingRef.current) {
      if (nativePlayerRef.current) nativePlayerRef.current.pause();
      if (wakeLockRef.current) {
        wakeLockRef.current.release().then(() => { wakeLockRef.current = null; });
      }
      setIsPlaying(false);
      if ('mediaSession' in navigator) navigator.mediaSession.playbackState = 'paused';
    } else {
      const startTime = currentTimeRef.current >= duration ? 0 : currentTimeRef.current;
      if (nativePlayerRef.current) {
        nativePlayerRef.current.currentTime = startTime;
        playPromiseRef.current = nativePlayerRef.current.play();
        playPromiseRef.current.catch(() => {}).finally(() => { playPromiseRef.current = null; });
      }
      if (heartbeatRef.current) heartbeatRef.current.play().catch(() => {});
      if ('wakeLock' in navigator) {
        (navigator as any).wakeLock.request('screen').then((lock: any) => {
          wakeLockRef.current = lock;
        }).catch(() => {});
      }
      setIsPlaying(true);
      if ('mediaSession' in navigator) navigator.mediaSession.playbackState = 'playing';
      notifyOtherTabs();
    }
  }, [isLoaded, duration]);

  const setBpm = React.useCallback((newBpm: number, persistent = true) => {
    // 1. ALWAYS UPDATE NATIVE IMMEDIATELY (Near-zero latency)
    if (nativePlayerRef.current) {
      const rate = newBpm / 100;
      if (Math.abs(nativePlayerRef.current.playbackRate - rate) > 0.001) {
        {
          const pitchOn = nativePlayerRef.current !== finalPlayerRef.current; // final element keeps pitch correction OFF
          nativePlayerRef.current.preservesPitch = pitchOn;
          (nativePlayerRef.current as HTMLAudioElement & { webkitPreservesPitch?: boolean }).webkitPreservesPitch = pitchOn;
        }
        nativePlayerRef.current.playbackRate = rate;
      }
    }
    // 2. Only update state and local storage if it's the final value 
    if (persistent) {
      setBpmState(newBpm);
      localStorage.setItem('4andone-bpm', newBpm.toString());
    }
  }, []);

  const seek = React.useCallback((time: number) => {
    if (isLoaded && nativePlayerRef.current) {
      const safeTime = Math.max(0, Math.min(time, duration));
      const wasPlaying = isPlayingRef.current;
      nativePlayerRef.current.currentTime = safeTime;
      setCurrentTime(safeTime);
      currentTimeRef.current = safeTime;
      if (wasPlaying) {
        if (nativePlayerRef.current.paused) {
           playPromiseRef.current = nativePlayerRef.current.play();
           playPromiseRef.current.catch(() => {}).finally(() => { playPromiseRef.current = null; });
        }
        setIsPlaying(true);
      }
    }
  }, [isLoaded, duration]);

  const seekRelative = React.useCallback((seconds: number) => {
    if (nativePlayerRef.current && isLoaded) {
      const newTime = Math.max(0, Math.min(currentTimeRef.current + seconds, duration));
      seek(newTime);
    }
  }, [isLoaded, duration, seek]);

  const setVolume = React.useCallback((v: number) => {
    setVolumeState(v);
    localStorage.setItem('4andone-volume', v.toString());
    // Route through the gain chain so the slider also works on iOS.
    applyVolume(v * 0.8);
  }, []);

  const toggleRepeat = React.useCallback(() => setIsRepeat(prev => !prev), []);
  const toggleShuffle = React.useCallback(() => setIsShuffle(prev => !prev), []);
  const toggleFinalMode = React.useCallback(() => {
    setIsFinalMode(prev => {
      const nextVal = !prev;
      if (nextVal) {
        // Turning ON: if we are already past (standardLimit - 2), set custom time limit
        const audio = nativePlayerRef.current;
        if (audio && playingTrackRef.current) {
          const style = playingTrackRef.current.style?.toLowerCase() || '';
          const isPasoDoble = style.includes('paso');
          const isVW = style.includes('viennese') || (style.includes('waltz') && style.includes('v'));
          const standardLimit = isPasoDoble ? Infinity : (isVW ? 85 : 105);
          
          if (!isPasoDoble && audio.currentTime > (standardLimit - 2)) {
            customTimeLimitRef.current = audio.currentTime + 2;
            if (audio.currentTime >= standardLimit) {
              toggledPastLimitRef.current = true;
            }
          }
        }
      } else {
        // Turning OFF: clear it
        customTimeLimitRef.current = null;
        toggledPastLimitRef.current = false;
        // Restore volume in case it was fading
        if (nativePlayerRef.current) {
          cancelFadeAndRestore();
        }
      }
      return nextVal;
    });
  }, []);

  const playNext = React.useCallback(() => {
    const list = isFinalModeRef.current ? sessionTracksRef.current : tracks;
    if (list.length === 0) return;

    let currentIndex = list.findIndex(t => t.id === trackIdRef.current || t.title === playingTrackRef.current?.title);

    if (isShuffleRef.current) {
      let nextIndex = Math.floor(Math.random() * list.length);
      while (nextIndex === currentIndex && list.length > 1) {
        nextIndex = Math.floor(Math.random() * list.length);
      }
      currentIndex = nextIndex - 1;
    }

    const nextIndex = (currentIndex + 1) % list.length;
    // Pass forceFinalMode so navigating inside a Final Mode session stays in it,
    // and a normal next-track stays normal. (Without this, a plain loadTrack call
    // would now always drop out of Final Mode.)
    loadTrack(list[nextIndex], false, isFinalModeRef.current);
  }, [tracks, loadTrack]);

  const playPrevious = React.useCallback(() => {
    const list = isFinalModeRef.current ? sessionTracksRef.current : tracks;
    if (list.length === 0) return;

    const currentIndex = list.findIndex(t => t.id === trackIdRef.current || t.title === playingTrackRef.current?.title);
    const prevIndex = currentIndex <= 0 ? list.length - 1 : currentIndex - 1;
    loadTrack(list[prevIndex], false, isFinalModeRef.current);
  }, [tracks, loadTrack]);

  const stop = React.useCallback(() => {
    loadingTokenRef.current += 1; // Invalidate any pending async callbacks like onerror
    if (nativePlayerRef.current) {
        nativePlayerRef.current.pause();
        cancelFadeAndRestore();
        // Remove event handlers to prevent onerror from firing when src is cleared
        nativePlayerRef.current.onerror = null;
        nativePlayerRef.current.onended = null;
        nativePlayerRef.current.ontimeupdate = null;
        nativePlayerRef.current.onplay = null;
        nativePlayerRef.current.onpause = null;
        nativePlayerRef.current.src = "";
        nativePlayerRef.current.removeAttribute('src');
    }
    if (fadeIntervalRef.current) {
      clearInterval(fadeIntervalRef.current);
      fadeIntervalRef.current = null;
    }
    if (heartbeatRef.current) {
        heartbeatRef.current.pause();
    }
    setIsPlaying(false);
    isPlayingRef.current = false;
    setCurrentTime(0);
    setTrackCurrentTime(0);
    currentTimeRef.current = 0;
    trackCurrentTimeRef.current = 0;
    setDuration(0);
    setIsLoaded(false);
    setIsPauseCountdown(false);
    isPauseCountdownRef.current = false;
    setPauseTime(15);
    pauseTimeRef.current = 15;
    pauseDeadlineRef.current = 0;
    finalEndHandledRef.current = false;
    sessionIndexRef.current = -1;
    setActiveMode(null);
    setSessionTracks([]);
    setIsFinalMode(false);
    isFinalModeRef.current = false;
    setIsFitness(false);
    isFitnessRef.current = false;
    setFitnessTargetTime(0);
    fitnessTargetTimeRef.current = 0;
    // FULL RESET: clear the track identity too. The bottom PlayerBar and the
    // full player both key their visibility off title === "No Track Selected",
    // so without this the last track stayed on screen after Final Mode ended.
    setTitle("No Track Selected");
    setArtist("Upload or select a track");
    setError(null);
    trackIdRef.current = null;
    playingTrackRef.current = null;
    // Clear OS media-session metadata so lock-screen controls also disappear.
    if ('mediaSession' in navigator) {
      try {
        (navigator.mediaSession as any).metadata = null;
        (navigator.mediaSession as any).playbackState = 'none';
      } catch { /* ignore */ }
    }
  }, []);

  // Keep the function refs current so advanceFinalSession (defined earlier) can
  // safely call loadTrack/stop without a temporal-dead-zone error.
  useEffect(() => {
    loadTrackRef.current = loadTrack;
    stopRef.current = stop;
  });

  // REGISTER MEDIA SESSION ACTIONS
  useEffect(() => {
    if ('mediaSession' in navigator) {
      navigator.mediaSession.setActionHandler('play', () => togglePlay());
      navigator.mediaSession.setActionHandler('pause', () => togglePlay());
      navigator.mediaSession.setActionHandler('seekbackward', () => seekRelative(-10));
      navigator.mediaSession.setActionHandler('seekforward', () => seekRelative(10));
      navigator.mediaSession.setActionHandler('previoustrack', () => playPrevious());
      navigator.mediaSession.setActionHandler('nexttrack', () => playNext());
      navigator.mediaSession.setActionHandler('seekto', (details) => {
        if (details.seekTime !== undefined) seek(details.seekTime);
      });
    }
  }, [togglePlay, seek, seekRelative]);

  // Global Keyboard Shortcuts for Dancers & Coaches
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const activeEl = document.activeElement;
      if (
        activeEl &&
        (activeEl.tagName === 'INPUT' ||
          activeEl.tagName === 'TEXTAREA' ||
          (activeEl as HTMLElement).isContentEditable)
      ) {
        return;
      }

      if (e.code === 'Space') {
        e.preventDefault();
        togglePlay();
      } else if (e.code === 'ArrowLeft') {
        e.preventDefault();
        seekRelative(-5);
      } else if (e.code === 'ArrowRight') {
        e.preventDefault();
        seekRelative(5);
      } else if (e.code === 'ArrowUp') {
        e.preventDefault();
        setVolume(Math.min(1, volumeRef.current + 0.1));
      } else if (e.code === 'ArrowDown') {
        e.preventDefault();
        setVolume(Math.max(0, volumeRef.current - 0.1));
      } else if (e.code === 'KeyN') {
        e.preventDefault();
        playNext();
      } else if (e.code === 'KeyP') {
        e.preventDefault();
        playPrevious();
      } else if (e.code === 'KeyF') {
        e.preventDefault();
        toggleFinalMode();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [togglePlay, seekRelative, setVolume, playNext, playPrevious, toggleFinalMode]);

  return (
    <PlayerContext.Provider value={{
      isPlaying,
      isLoaded,
      bpm,
      isFinalMode,
      currentTime,
      trackCurrentTime,
      duration,
      title,
      artist,
      error,
      volume,
      isRepeat,
      isShuffle,
      isLoading,
      isPauseCountdown,
      isFitness,
      pauseTime,
      togglePlay,
      loadTrack,
      setIsFitness,
      setBpm,
      setVolume,
      toggleRepeat,
      toggleShuffle,
      toggleFinalMode,
      seek,
      seekRelative,
      playNext,
      playPrevious,
      stop,
      sessionDuration,
      activeMode,
      setActiveMode,
      sessionTracks,
      setSessionTracks,
      fitnessTargetTime,
      setFitnessTargetTime
    }}>
      {children}
    </PlayerContext.Provider>
  );
};

export const useAudio = () => {
  const context = useContext(PlayerContext);
  if (!context) throw new Error('useAudio must be used within AudioProvider');
  return context;
};
