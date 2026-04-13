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
  const fadeStartedRef = useRef(false); // Guard: prevent multiple fade intervals

  useEffect(() => { isPlayingRef.current = isPlaying; }, [isPlaying]);
  useEffect(() => { currentTimeRef.current = currentTime; }, [currentTime]);
  useEffect(() => { isPauseCountdownRef.current = isPauseCountdown; }, [isPauseCountdown]);
  useEffect(() => { pauseTimeRef.current = pauseTime; }, [pauseTime]);
  useEffect(() => { isFinalModeRef.current = isFinalMode; }, [isFinalMode]);
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

    document.addEventListener('touchstart', unlockAudio);
    document.addEventListener('mousedown', unlockAudio);

    return () => {
      document.removeEventListener('touchstart', unlockAudio);
      document.removeEventListener('mousedown', unlockAudio);
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
        setIsPauseCountdown(false);
        isPauseCountdownRef.current = false;
        setPauseTime(15);
        pauseTimeRef.current = 15;
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
          fadeStartedRef.current = false; // Allow fade to trigger for new track

          audio.oncanplay = () => {
            if (currentToken !== loadingTokenRef.current) return;
            const realDuration = audio.duration || 0;
            setDuration(realDuration);
            setIsLoaded(true);
            setIsLoading(false);
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
                  loadTrack({ ...track, audioUrl: fallbackUrl }, true);
                  return;
                }
              }
            }
            reject(new Error(msg));
          };

          // NATURAL END HANDLING
          // NOTE: In Final Mode, ontimeupdate handles the 1:45 cutoff.
          // onended only fires naturally for Paso Doble (full track) or if audio loops to end unexpectedly.
          // We guard with pauseTriggeredRef to prevent double-pause.
          audio.onended = () => {
            if (currentToken !== loadingTokenRef.current) return;
            
            if (isFinalModeRef.current) {
              // If pause was already triggered by ontimeupdate, do nothing
              if (isPauseCountdownRef.current) return;

              const style = playingTrackRef.current?.style?.toLowerCase() || '';
              const isPasoDoble = style.includes('paso');

              // Only handle natural end for Paso Doble here
              if (!isPasoDoble) return;

              const currentIdx = sessionTracksRef.current.findIndex(t => t.id === trackIdRef.current || t.title === title);
              const isLastTrack = currentIdx === sessionTracksRef.current.length - 1;

              if (isLastTrack) {
                stop();
                return;
              }

              if (isFitnessRef.current) {
                playNext();
                return;
              }

              setIsPauseCountdown(true);
              isPauseCountdownRef.current = true;
              setPauseTime(15);
              pauseTimeRef.current = 15;
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
              const timeLimit = isPasoDoble ? Infinity : 105; // Standardized to 1:45

              // NATIVE FADE-OUT Logic (runs ONCE, 3 seconds before limit)
              if (audio && !isPasoDoble && !fadeStartedRef.current) {
                  const isNearLimit = (timeLimit - currentTimeVal <= 3.5) && (timeLimit - currentTimeVal > 0);
                  
                  if (isNearLimit) {
                    fadeStartedRef.current = true; // Prevent re-entry on future ticks
                    const targetVol = volumeRef.current * 0.8;
                    const steps = 30;
                    const stepDuration = (3000) / steps; // spread over full 3 seconds
                    let stepCount = 0;

                    const volumeInterval = setInterval(() => {
                      stepCount++;
                      if (!nativePlayerRef.current || stepCount >= steps) {
                        clearInterval(volumeInterval);
                        if (nativePlayerRef.current) nativePlayerRef.current.volume = 0;
                      } else {
                        nativePlayerRef.current.volume = Math.max(0, targetVol - (targetVol / steps) * stepCount);
                      }
                    }, stepDuration);
                  }
              }

              // TRIGGER NEXT or END at 1:45 limit (ontimeupdate handles non-Paso tracks)
              // isPasoDoble is handled by onended, skip it here
              if (!isPasoDoble && currentTimeVal >= timeLimit) {
                // Guard: only trigger once
                if (isPauseCountdownRef.current) return;

                audio.onended = null;
                audio.pause();
                setIsPlaying(false);
                isPlayingRef.current = false;

                if (activeModeRef.current) {
                  const currentIdx = sessionTracksRef.current.findIndex(t => t.id === trackIdRef.current || t.title === title);
                  const isLastTrack = currentIdx === sessionTracksRef.current.length - 1;

                  if (isLastTrack) { stop(); return; }
                  if (isFitnessRef.current) { playNext(); return; }

                  setIsPauseCountdown(true);
                  isPauseCountdownRef.current = true;
                  setPauseTime(15);
                  pauseTimeRef.current = 15;
                } else {
                  // Regular Player Logic: Just Auto-Stop
                  audio.pause();
                  setIsPlaying(false);
                  audio.currentTime = 0;
                  setCurrentTime(0);
                }
              }
            }
          };

          // NATIVE SPEED CONTROL: No bridge needed
          audio.preservesPitch = true;
          audio.playbackRate = bpm / 100;
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
      try {
        const sessionId = typeof window !== 'undefined' ? sessionStorage.getItem('4andone_session_id') : null;
        const tgUser = typeof window !== 'undefined' ? (window as any).Telegram?.WebApp?.initDataUnsafe?.user : null;
        const userRef = user?.id?.toString() || tgUser?.id?.toString() || null;
        
        /*
        supabase.from('track_plays').insert({
          track_title: track.title,
          track_id: track.id,
          user_ref: userRef,
          session_id: sessionId,
          style: track.style || 'Unknown',
          bpm: track.bpm?.toString() || '0',
          duration_seconds: 0
        }).select('id').single().then(({ data }) => {
          if (data) trackLogIdRef.current = data.id;
        });
        */
      } catch (e) {}

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
          const newPauseTime = Math.max(0, pauseTimeRef.current - 0.1);
          pauseTimeRef.current = newPauseTime;
          setPauseTime(Math.ceil(newPauseTime));

          if (newPauseTime <= 0) {
            // CRITICAL: Use refs (not stale state) to find the correct next track
            const tracksList = sessionTracksRef.current;
            const currentIndex = tracksList.findIndex(t => t.id === trackIdRef.current);

            if (currentIndex !== -1 && currentIndex < tracksList.length - 1) {
              const nextTrack = tracksList[currentIndex + 1];
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
          setTrackCurrentTime(currentTimeVal);

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
              setCurrentTime(safeSessionElapsed);
            } else {
              setCurrentTime(currentTimeVal);
            }
          } else {
            // Normal Mode: Simply track the relative file time
            setCurrentTime(currentTimeVal);
          }

          // SAFE MEDIASESSION UPDATE: Guard against NaN, Infinity, and unsupported methods
          if ('mediaSession' in navigator && (navigator.mediaSession as any).setPositionState) {
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
      }, 100);
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
    loadTrack(list[nextIndex]);
  }, [tracks, loadTrack]);

  const playPrevious = React.useCallback(() => {
    const list = isFinalModeRef.current ? sessionTracksRef.current : tracks;
    if (list.length === 0) return;

    const currentIndex = list.findIndex(t => t.id === trackIdRef.current || t.title === playingTrackRef.current?.title);
    const prevIndex = currentIndex <= 0 ? list.length - 1 : currentIndex - 1;
    loadTrack(list[prevIndex]);
  }, [tracks, loadTrack]);

  const stop = React.useCallback(() => {
    if (nativePlayerRef.current) {
        nativePlayerRef.current.pause();
        nativePlayerRef.current.src = "";
    }
    if (heartbeatAudioRef.current) {
        heartbeatAudioRef.current.pause();
    }
    setIsPlaying(false);
    setCurrentTime(0);
    setTrackCurrentTime(0);
    setIsPauseCountdown(false);
    isPauseCountdownRef.current = false;
    setPauseTime(15);
    pauseTimeRef.current = 15;
    setActiveMode(null);
    setSessionTracks([]);
    setIsFinalMode(false);
    isFinalModeRef.current = false;
  }, []);

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
