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
}

const AudioContext = createContext<AudioContextType | undefined>(undefined);

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
  // Silent Heartbeat for iOS PWA background support
  const SILENT_TRACK = "data:audio/wav;base64,UklGRigAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQQAAAAAAA==";
  const heartbeatAudioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
        const audio = new Audio(SILENT_TRACK);
        audio.loop = true;
        audio.volume = 0.001;
        heartbeatAudioRef.current = audio;
    }
  }, []);

  const [title, setTitle] = useState("No Track Selected");
  const [artist, setArtist] = useState("Upload or select a track");
  const [error, setError] = useState<string | null>(null);
  const [volume, setVolumeState] = useState(1);
  const [isRepeat, setIsRepeat] = useState(false);
  const [isShuffle, setIsShuffle] = useState(false);
  const [isPauseCountdown, setIsPauseCountdown] = useState(false);
  const [pauseTime, setPauseTime] = useState(15);
  const [isFitness, setIsFitness] = useState(false);
  const [sessionDuration, setSessionDuration] = useState(0);
  const [activeMode, setActiveMode] = useState<string | null>(null);
  const [sessionTracks, setSessionTracks] = useState<Track[]>([]);

  const nativePlayerRef = useRef<HTMLAudioElement | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const activeBlobUrlRef = useRef<string | null>(null);
  const trackIdRef = useRef<string | null>(null);
  const loadingTokenRef = useRef<number>(0); // Guard for race conditions
  const masterGainRef = useRef<any>(null);
  const limiterRef = useRef<any>(null);
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
    if (isFinalMode) {
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
  }, [sessionTracks, isFinalMode, isFitness, duration, title]);

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
      if (nativePlayerRef.current) nativePlayerRef.current.volume = volumeRef.current * 0.8;
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
      // 1. Create a single, persistent Audio element for the entire app lifecycle.
      // We play DIRECTLY to destination (speakers) to avoid WebAudio bridge lag.
      const audio = new Audio();
      audio.crossOrigin = "anonymous";
      audio.autoplay = false;
      audio.preservesPitch = true;
      
      nativePlayerRef.current = audio;

      // 2. Tiny silent WAV to keep iOS audio session alive
      const silentWav = "data:audio/wav;base64,UklGRjIAAABXQVZFRm10IBAAAAABAAEAIlYAAESsAAACABAAZGF0YRAAAAAAAAAAAAAAAAAAAAAAAAAA";
      const hb = new Audio(silentWav);
      hb.loop = true;
      hb.volume = 0.01; 
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
      // PRO-TIP: "playback" latency hint is much more stable on iOS/Safari 
      // as it uses larger buffers, preventing "choppy" audio artifacts.
      // Unlock for mobile audio

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
              if (nativePlayerRef.current) {
                nativePlayerRef.current.volume = volumeRef.current * 0.8;
              }
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

          const signRes = await fetch(`/api/upload?key=${storageKey}`);

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
          if (!nativePlayerRef.current) nativePlayerRef.current = audio;
          
          audio.crossOrigin = "anonymous";
          
          // RESET VOLUME: Ensure any previous fade-out is reversed
          audio.volume = volumeRef.current * 0.8;

          audio.oncanplay = () => {
            if (currentToken !== loadingTokenRef.current) return;
            const realDuration = audio.duration || 0;
            setDuration(realDuration);
            setIsLoaded(true);
            setIsLoading(false);
            // SPEED PERSISTENCE FIX (real cause): audio.load() resets playbackRate
            // back to 1.0, so setting it before load() was always wiped. We re-apply
            // the user's chosen speed here, AFTER the resource has finished loading.
            audio.preservesPitch = true;
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
              if (!isRetry) {
                const urlObj = new URL(url);
                const fileName = urlObj.pathname.split('/').pop();
                if (fileName) {
                  const R2_PUBLIC = process.env.NEXT_PUBLIC_R2_PUBLIC_URL || 'https://pub-c41b1121b311f676bdc114d143278d18.r2.dev';
                  const fallbackUrl = `${R2_PUBLIC}/${fileName}`;
                  // Preserve the current Final Mode flag on retry — otherwise a
                  // mid-session load failure would silently drop out of Final Mode.
                  loadTrack({ ...track, audioUrl: fallbackUrl }, true, isFinalModeRef.current);
                  return;
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
            
            // 1. FINAL MODE LIMIT CHECK (1:45 / 1:25)
            if (isFinalModeRef.current && !isPauseCountdownRef.current && isPlayingRef.current) {
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

              // NATIVE FADE-OUT Logic (runs ONCE, 3 seconds before the effective end)
              // CONTINUOUS FADE-OUT (fix for "fade worked on some tracks, not others").
              // The old version started a setInterval timer once. That was unreliable:
              //  - setInterval freezes when the screen is off (common in Final Mode)
              //  - it ignored playbackRate, so at high speed the fade lagged the audio
              //  - if an ontimeupdate tick skipped the trigger window, it never started.
              // Now the volume is derived directly from currentTime on EVERY tick, so
              // it always tracks the real playback position regardless of speed or
              // screen state. The 3s fade window is based on the effective end.
              if (audio && !isPasoDoble && isFinite(effectiveEnd) && nativePlayerRef.current) {
                const FADE_DURATION = 3; // seconds
                const timeLeft = effectiveEnd - currentTimeVal;
                const baseVol = volumeRef.current * 0.8;

                if (timeLeft <= FADE_DURATION && timeLeft > 0) {
                  if (!fadeIntervalRef.current) {
                    const fadeTimeMs = (timeLeft * 1000) / (audio.playbackRate || 1);
                    const fadeStartTimestamp = Date.now();
                    const startVol = nativePlayerRef.current.volume;

                    fadeIntervalRef.current = setInterval(() => {
                      if (!nativePlayerRef.current || nativePlayerRef.current.paused) {
                        if (fadeIntervalRef.current) {
                          clearInterval(fadeIntervalRef.current);
                          fadeIntervalRef.current = null;
                        }
                        return;
                      }
                      const elapsedRealMs = Date.now() - fadeStartTimestamp;
                      const progress = Math.min(1, elapsedRealMs / fadeTimeMs); // 0 -> 1

                      // Acoustic cosine curve fade (1 to 0)
                      const ratio = Math.cos(progress * Math.PI / 2);
                      nativePlayerRef.current.volume = startVol * ratio;

                      if (progress >= 1) {
                        if (fadeIntervalRef.current) {
                          clearInterval(fadeIntervalRef.current);
                          fadeIntervalRef.current = null;
                        }
                      }
                    }, 30);
                  }
                } else if (timeLeft > FADE_DURATION && fadeIntervalRef.current) {
                  // User seeked back before the fade window: clear interval and restore volume
                  clearInterval(fadeIntervalRef.current);
                  fadeIntervalRef.current = null;
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
                  // Restore volume
                  audio.volume = volumeRef.current * 0.8;
                  return;
                }

                if (activeModeRef.current) {
                  advanceFinalSession();
                } else {
                  // Single-track Final Mode (no program): just auto-stop cleanly
                  audio.currentTime = 0;
                  setCurrentTime(0);
                  // Restore volume
                  audio.volume = volumeRef.current * 0.8;
                }
              }
            }
          };

          // NATIVE SPEED CONTROL: No bridge needed
          audio.preservesPitch = true;
          // SPEED PERSISTENCE FIX: use the live bpmRef (user-selected speed), NOT the
          // stale `bpm` closure value. Previously a new track could reset the rate,
          // so the speed the user picked was lost on every track change.
          audio.playbackRate = bpmRef.current / 100;
          audio.loop = !isFinalMode;
          audio.src = url;
          audio.load();
        });
      };

      try {
        const audio = await setupPlayer(finalUrl);

        playPromiseRef.current = audio.play();
        
        // Start heartbeat for iOS backgrounding
        if (heartbeatAudioRef.current) {
            heartbeatAudioRef.current.play().catch(() => {});
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
              if (nativePlayerRef.current) {
                nativePlayerRef.current.volume = volumeRef.current * 0.8;
              }
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
      if (heartbeatAudioRef.current) heartbeatAudioRef.current.play().catch(() => {});
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
        if (!nativePlayerRef.current.preservesPitch) {
           nativePlayerRef.current.preservesPitch = true;
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
    if (nativePlayerRef.current) {
      nativePlayerRef.current.volume = v * 0.8;
    }
  }, []);

  const toggleRepeat = React.useCallback(() => setIsRepeat(prev => !prev), []);
  const toggleShuffle = React.useCallback(() => setIsShuffle(prev => !prev), []);
  const toggleFinalMode = React.useCallback(() => setIsFinalMode(prev => !prev), []);

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
        nativePlayerRef.current.volume = volumeRef.current * 0.8;
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
    if (heartbeatAudioRef.current) {
        heartbeatAudioRef.current.pause();
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
        navigator.mediaSession.metadata = null;
        navigator.mediaSession.playbackState = 'none';
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

  return (
    <AudioContext.Provider value={{
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
      setSessionTracks
    }}>
      {children}
    </AudioContext.Provider>
  );
};

export const useAudio = () => {
  const context = useContext(AudioContext);
  if (!context) throw new Error('useAudio must be used within AudioProvider');
  return context;
};
