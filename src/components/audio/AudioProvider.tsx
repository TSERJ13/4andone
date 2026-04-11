"use client";

import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import * as Tone from 'tone';
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
  togglePlay: () => void;
  loadTrack: (track: any, isRetry?: boolean, forceFinalMode?: boolean) => void;
  setIsFitness: (val: boolean) => void;
  setBpm: (bpm: number) => void;
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

  const playerRef = useRef<Tone.GrainPlayer | Tone.Player | null>(null);
  const nativePlayerRef = useRef<HTMLAudioElement | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const activeBlobUrlRef = useRef<string | null>(null);
  const trackIdRef = useRef<string | null>(null);
  const loadingTokenRef = useRef<number>(0); // Guard for race conditions
  const masterGainRef = useRef<Tone.Gain | null>(null);
  const limiterRef = useRef<Tone.Limiter | null>(null);
  const wakeLockRef = useRef<any>(null);
  const heartbeatRef = useRef<HTMLAudioElement | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const playingTrackRef = useRef<any>(null);
  const trackLogIdRef = useRef<string | null>(null);
  const playPromiseRef = useRef<Promise<void> | null>(null);
  const compressorRef = useRef<Tone.Compressor | null>(null);
  const eqRef = useRef<Tone.EQ3 | null>(null);

  // Refs to avoid circular re-renders on every tick
  const isPlayingRef = useRef(isPlaying);
  const currentTimeRef = useRef(currentTime);
  const isPauseCountdownRef = useRef(isPauseCountdown);
  const pauseTimeRef = useRef(pauseTime);

  useEffect(() => { isPlayingRef.current = isPlaying; }, [isPlaying]);
  useEffect(() => { currentTimeRef.current = currentTime; }, [currentTime]);
  useEffect(() => { isPauseCountdownRef.current = isPauseCountdown; }, [isPauseCountdown]);
  useEffect(() => { pauseTimeRef.current = pauseTime; }, [pauseTime]);

  // Reactive Session Duration Calculation
  // This ensures the total time is known immediately when sessionTracks changes,
  // preventing the "duration flicker" from one track's time to the full session time.
  useEffect(() => {
    if (isFinalMode && sessionTracks.length > 0) {
      const getLimitForTrack = (track: Track) => {
        const style = track.style?.toLowerCase() || '';
        if (style.includes('paso')) return track.duration || 210; // Standard Paso length approx
        if (style.includes('viennese')) return 85;
        return 105;
      };

      const total = sessionTracks.reduce((acc, t, idx) => {
        const rest = (idx < sessionTracks.length - 1 && !isFitness) ? 15 : 0;
        return acc + getLimitForTrack(t) + rest;
      }, 0);
      setSessionDuration(total);
    } else if (!isFinalMode) {
      setSessionDuration(duration);
    }
  }, [sessionTracks, isFinalMode, isFitness, duration]);

  // Tab synchronization for audio control
  useEffect(() => {
    const channel = new BroadcastChannel('audio_control');
    channel.onmessage = (event) => {
      if (event.data === 'play' && isPlaying) {
        if (nativePlayerRef.current) nativePlayerRef.current.pause();
        if (playerRef.current) playerRef.current.stop();
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
    if (!limiterRef.current) {
      limiterRef.current = new Tone.Limiter(-1).toDestination();
    }
    if (!masterGainRef.current) {
      // 1. Create Main Gain for volume control with Safe Headroom (-4dB)
      masterGainRef.current = new Tone.Gain(volume * 0.65).connect(limiterRef.current);
    }

    if (!compressorRef.current) {
      // 2. Add a High-Quality Compressor for better transients when slowed
      compressorRef.current = new Tone.Compressor({
        threshold: -20,
        ratio: 2,
        attack: 0.003,
        release: 0.25
      }).connect(masterGainRef.current);
    }

    if (!eqRef.current) {
      // 3. Add a specialized EQ to boost "warmth" and reduce "fizz" during time-stretches
      eqRef.current = new Tone.EQ3({
        low: 1.5,
        mid: 0,
        high: -1.5,
        lowFrequency: 250,
        highFrequency: 2500
      }).connect(compressorRef.current);
    }

    // Smoothly apply volume changes with the 0.65 headroom factor
    masterGainRef.current.gain.rampTo(volume * 0.65, 0.1);
    return eqRef.current;
  };

  useEffect(() => {
    // Initialize Heartbeat
    if (typeof window !== 'undefined') {
      // Tiny silent WAV (approx 1s) to keep iOS audio session alive
      const silentWav = "data:audio/wav;base64,UklGRjIAAABXQVZFRm10IBAAAAABAAEAIlYAAESsAAACABAAZGF0YRAAAAAAAAAAAAAAAAAAAAAAAAAA";
      const hb = new Audio(silentWav);
      hb.loop = true;
      hb.volume = 0.01; // Minimal volume to satisfy iOS "active" requirement
      heartbeatRef.current = hb;
    }

    const savedVol = localStorage.getItem('4andone-volume');
    if (savedVol) setVolumeState(parseFloat(savedVol));

    // Global "Unlock" for mobile audio + Safari Optimizations
    const unlockAudio = async () => {
      // PRO-TIP: "playback" latency hint is much more stable on iOS/Safari 
      // as it uses larger buffers, preventing "choppy" audio artifacts.
      if (Tone.getContext().lookAhead < 0.1) {
        Tone.getContext().lookAhead = 0.1;
      }

      if (Tone.getContext().state !== 'running') {
        await Tone.start();
        await Tone.getContext().resume();
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
      if (forceFinalMode !== undefined) setIsFinalMode(forceFinalMode);
      if (Tone.getContext().state !== 'running') await Tone.start();

      // Cleanup previous player immediately
      const stopAndDispose = () => {
        if (playerRef.current) {
          playerRef.current.stop();
          playerRef.current.dispose();
          playerRef.current = null;
        }
        if (nativePlayerRef.current) {
          nativePlayerRef.current.onerror = null;
          nativePlayerRef.current.oncanplay = null;
          nativePlayerRef.current.pause();
          nativePlayerRef.current.src = "";
          nativePlayerRef.current.load();
          nativePlayerRef.current = null;
        }
        setIsPauseCountdown(false);
        setPauseTime(15);
      };

      stopAndDispose();

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
        console.log(`[AUDIO-HEAL] Repaired broken URL based on current environment: ${finalUrl}`);
      }

      const isRemote = finalUrl?.startsWith('http');

      // 1. If REMOTE (Cloudflare R2), we try signed first, fallback to public on error if needed
      if (isRemote && finalUrl) {
        try {
          console.log(`[AUDIO-SIGN] Requesting playback pass for: ${track.title}`);
          const fileName = finalUrl.split('/').pop();
          if (!fileName) throw new Error("Invalid remote URL");
          const signRes = await fetch(`/api/upload?key=${fileName}`);

          if (signRes.ok) {
            const { url } = await signRes.json();
            finalUrl = url;
            console.log(`[AUDIO-SIGN] Success. Secure link active.`);
          } else {
            console.error("[AUDIO-SIGN] Failed to sign, falling back to public link");
            // FALLBACK: Use environment Public R2 URL for stability
            const R2_PUBLIC = process.env.NEXT_PUBLIC_R2_PUBLIC_URL || 'https://pub-c41b1121b311f676bdc114d143278d18.r2.dev';
            finalUrl = `${R2_PUBLIC}/${fileName}`;
          }
        } catch (e) {
          console.error("[AUDIO-SIGN] Error during signing, using original link:", e);
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

      const setupPlayer = (url: string, type: 'streaming' | 'grain' | 'native' = 'streaming') => {
        return new Promise<Tone.Player | HTMLAudioElement>((resolve, reject) => {
          if (currentToken !== loadingTokenRef.current) {
            reject(new Error("Loading cancelled by new request"));
            return;
          }

          // RESET VOLUME: Ensure any previous fade-out is reversed
          if (masterGainRef.current) {
            masterGainRef.current.gain.cancelScheduledValues(0);
            masterGainRef.current.gain.rampTo(volume * 0.65, 0.1);
          }

          console.log(`[AUDIO-STREAM] Opening stream for: ${track.title}`);

          // Create Native Audio Element for Streaming
          const audio = new Audio(url);
          audio.crossOrigin = "anonymous";
          audio.autoplay = false;
          audio.loop = !isFinalMode;
          // HIGH QUALITY SPEED CHANGE: Ensure pitch is preserved
          // Always keep true to avoid algorithm switching clicks
          // @ts-ignore
          audio.preservesPitch = true;
          // @ts-ignore
          audio.mozPreservesPitch = true;
          // @ts-ignore
          audio.webkitPreservesPitch = true;

          nativePlayerRef.current = audio;

          // Connect to Tone.js for Gain/Pan control
          const node = Tone.getContext().createMediaElementSource(audio);
          const output = initAudioChain();
          Tone.connect(node, output);

          // Spotify-style: Start as soon as we have enough data to play without stuttering
          audio.oncanplay = () => {
            if (currentToken !== loadingTokenRef.current) return;
            console.log(`[AUDIO-READY] Stream buffered. Starting ${track.title}`);

            // Adjust duration for Final Mode reporting
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
              const errorTypes = {
                1: 'MEDIA_ERR_ABORTED',
                2: 'MEDIA_ERR_NETWORK',
                3: 'MEDIA_ERR_DECODE',
                4: 'MEDIA_ERR_SRC_NOT_SUPPORTED'
              };
              const errorType = errorTypes[err.code as keyof typeof errorTypes] || 'UNKNOWN';
              console.error(`[AUDIO-ERROR] Mode: ${isRetry ? 'Retry' : 'Initial'}, Code: ${err.code} (${errorType}), Message: ${err.message || 'No specific metadata'}`);

              if (!isRetry) {
                // ROBUST AUTO-HEALING: Extract fileName from complex R2 URLs
                // Handles: ...r2.cloudflarestorage.com/BUCKET/FILENAME?Signature...
                const urlObj = new URL(url);
                const pathParts = urlObj.pathname.split('/');
                const fileName = pathParts.pop(); // The last part is always the file

                if (fileName) {
                  const R2_PUBLIC = process.env.NEXT_PUBLIC_R2_PUBLIC_URL || 'https://pub-c41b1121b311f676bdc114d143278d18.r2.dev';
                  // Some R2 dev URLs require the bucket name in path, some don't. 
                  // We'll try the most standard: root + filename
                  const fallbackUrl = `${R2_PUBLIC}/${fileName}`;

                  console.warn(`[AUDIO-STREAM-HEAL] Playback failure. Instantly falling back to public CDN: ${fallbackUrl}`);
                  loadTrack({ ...track, audioUrl: fallbackUrl }, true);
                  return;
                }
              }
              msg += ` (${errorType})`;
            }
            console.error(`[AUDIO-STREAM-FAIL] URL: ${url}`, err);
            reject(new Error(msg));
          };

          // Set initial speed
          audio.playbackRate = bpm / 100;
        });
      };

      try {
        // ATTEMPT 1: INSTANT STREAMING (Spotify Method)
        const audio = await setupPlayer(finalUrl, 'streaming') as HTMLAudioElement;

        if (currentToken !== loadingTokenRef.current) {
          audio.pause();
          return;
        }

        if (Tone.getContext().state === 'running') {
          playPromiseRef.current = audio.play();
          playPromiseRef.current.catch(e => {
            if (e.name !== 'AbortError') console.error("Play prevented", e);
          }).finally(() => {
            playPromiseRef.current = null;
          });
          setIsPlaying(true);
        }
      } catch (e: any) {
        if (e.message === "Loading cancelled by new request") return;
        console.error("[AUDIO-CRITICAL] Global failure.", e);
        setError(e.message || "File Unreachable (Check Connection)");
        setIsLoaded(false);
        setIsLoading(false);
      }

      // MEDIA SESSION SETUP
      if ('mediaSession' in navigator) {
        navigator.mediaSession.metadata = new MediaMetadata({
          title: track.title,
          artist: track.artist,
          album: track.album || '4and.one Music',
          artwork: [
            { src: '/icons/icon-192x192.png', sizes: '192x192', type: 'image/png' },
            { src: '/icons/icon-512x512.png', sizes: '512x512', type: 'image/png' },
          ]
        });
      }

      // ANALYTICS: Log track play event
      try {
        const sessionId = typeof window !== 'undefined' ? sessionStorage.getItem('4andone_session_id') : null;
        const tgUser = typeof window !== 'undefined' ? (window as any).Telegram?.WebApp?.initDataUnsafe?.user : null;
        const userRef = user?.id?.toString() || tgUser?.id?.toString() || null;

        supabase.from('track_plays').insert({
          track_id: track.id,
          user_ref: userRef,
          session_id: sessionId,
          style: track.style || 'Unknown',
          bpm: track.bpm?.toString() || '0',
          duration_seconds: 0
        })
        .select('id')
        .single()
        .then(({ data, error }) => {
          if (error) console.warn("[ANALYTICS-ERROR] Failed to log track play:", error);
          if (data) trackLogIdRef.current = data.id;
        });
      } catch (e) { }

    } catch (err: any) {
      console.error("[LOAD-ERROR]", err);
      setError(err.message || "Failed to load track");
      setIsLoaded(false);
    }
  };

  // Removed specialized filters

  useEffect(() => {
    return () => {
      if (playerRef.current) playerRef.current.dispose();
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
            const tracksList = isFinalMode ? sessionTracks : tracks;
            const currentIndex = tracksList.findIndex(t => t.id === trackIdRef.current || t.title === title);

            if (currentIndex !== -1 && currentIndex < tracksList.length - 1) {
              const nextTrack = tracksList[currentIndex + 1];
              loadTrack(nextTrack, false, true);
            }
          }
          return;
        }

        if (nativePlayerRef.current) {
          const currentTimeVal = nativePlayerRef.current.currentTime;

          const isPasoDoble = playingTrackRef.current?.style?.toLowerCase().includes('paso');
          const isViennese = playingTrackRef.current?.style?.toLowerCase().includes('viennese');
          // Standard: 1:45 (105s). Viennese: 1:25 (85s). Paso plays to end.
          const timeLimit = isPasoDoble ? Infinity : (isViennese ? 85 : 105);

          if (isFinalMode) {
            // Calculate Session-wide metrics
            const currentIdx = sessionTracks.findIndex(t => t.id === trackIdRef.current || t.title === title);
            if (currentIdx !== -1) {
              const getLimitForTrack = (track: Track) => {
                const style = track.style?.toLowerCase() || '';
                if (style.includes('paso')) return track.duration || 120;
                if (style.includes('viennese')) return 85;
                return 105;
              };

              let sessionElapsed = 0;
              for (let i = 0; i < currentIdx; i++) {
                sessionElapsed += getLimitForTrack(sessionTracks[i]) + (isFitness ? 0 : 15);
              }

              const currentTrackLimit = getLimitForTrack(sessionTracks[currentIdx]);
              sessionElapsed += isPauseCountdown ? (currentTrackLimit + (15 - pauseTime)) : currentTimeVal;

              setCurrentTime(sessionElapsed);
              setTrackCurrentTime(currentTimeVal);
            }
          } else {
            setCurrentTime(currentTimeVal);
          }

          // FINAL MODE: FADE-OUT logic (starts 3 seconds before limit or song end for Paso)
          if (isFinalMode && masterGainRef.current) {
            const isNearLimit = !isPasoDoble && (timeLimit - currentTimeVal <= 3) && (timeLimit - currentTimeVal > 0);
            const isNearSongEnd = isPasoDoble && (duration - currentTimeVal <= 3) && (duration - currentTimeVal > 0);

            if (isNearLimit) {
              masterGainRef.current.gain.rampTo(0, timeLimit - currentTimeVal);
            } else if (isNearSongEnd) {
              masterGainRef.current.gain.rampTo(0, duration - currentTimeVal);
            }
          }

          // TRIGGER NEXT TRACK: If reached limit OR if Paso Doble reached song end
          const reachedFinalLimit = isFinalMode && isPlaying && !isPauseCountdownRef.current && (
            (currentTimeVal >= timeLimit) ||
            (isPasoDoble && duration > 0 && currentTimeVal >= duration - 0.5)
          );

          if (reachedFinalLimit) {
            nativePlayerRef.current.pause();
            setIsPlaying(false);
            isPlayingRef.current = false;

            // End of session logic
            const currentIdx = sessionTracks.findIndex(t => t.id === trackIdRef.current || t.title === title);
            const isLastTrack = currentIdx === sessionTracks.length - 1;

            if (isLastTrack) {
              stop();
              return;
            }

            if (isFitness) {
              playNext();
              return;
            }

            setIsPauseCountdown(true);
            isPauseCountdownRef.current = true;
            setPauseTime(15);
            pauseTimeRef.current = 15;
          } else if (!isFinalMode && duration > 0 && currentTimeVal >= duration) {
            if (!isRepeat) {
              nativePlayerRef.current.pause();
              setIsPlaying(false);
              setCurrentTime(0);
              nativePlayerRef.current.currentTime = 0;
            } else {
              nativePlayerRef.current.currentTime = 0;
              setCurrentTime(0);
            }
          }

          // Update Media Session Position State
          if ('mediaSession' in navigator && sessionDuration > 0) {
            navigator.mediaSession.setPositionState({
              duration: sessionDuration,
              playbackRate: bpm / 100,
              position: currentTime
            });
          }

          // PERIODIC ANALYTICS UPDATE: Update track play duration
          if (trackLogIdRef.current && Math.floor(currentTimeVal) % 10 === 0) {
            supabase
              .from('track_plays')
              .update({ duration_seconds: Math.floor(currentTimeVal) })
              .eq('id', trackLogIdRef.current)
              .then(() => {});
          }
        }
      }, 100);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isPlaying, isPauseCountdown, isLoading, duration, bpm, isFinalMode, title]);

  const togglePlay = async () => {
    // Mobile browsers require resume() on user gesture
    if (Tone.getContext().state !== 'running') {
      await Tone.start();
      await Tone.getContext().resume();
    }

    if (!isLoaded) return;

    if (isPlaying) {
      if (playerRef.current) playerRef.current.stop();
      if (nativePlayerRef.current) nativePlayerRef.current.pause();
      
      // LOGIC FIX: Do NOT pause the heartbeat on iPad/mobile. 
      // Keeping it playing (silently) ensures the browser doesn't suspend 
      // the audio session during the pause, allowing a smooth resume.
      // if (heartbeatRef.current) heartbeatRef.current.pause();

      // Release Wake Lock
      if (wakeLockRef.current) {
        wakeLockRef.current.release().then(() => { wakeLockRef.current = null; });
      }

      setIsPlaying(false);
      if ('mediaSession' in navigator) navigator.mediaSession.playbackState = 'paused';
    } else {
      const startTime = currentTimeRef.current >= duration ? 0 : currentTimeRef.current;

      if (playerRef.current) {
        playerRef.current.start(undefined, startTime);
      } else if (nativePlayerRef.current) {
        nativePlayerRef.current.currentTime = startTime;
        playPromiseRef.current = nativePlayerRef.current.play();
        playPromiseRef.current.catch(e => {
          if (e.name !== 'AbortError') console.error("Native play failed", e);
        }).finally(() => {
          playPromiseRef.current = null;
        });
      }

      // Start Heartbeat & Wake Lock
      if (heartbeatRef.current) {
        heartbeatRef.current.play().catch(() => { });
      }
      if ('wakeLock' in navigator) {
        (navigator as any).wakeLock.request('screen').then((lock: any) => {
          wakeLockRef.current = lock;
        }).catch(() => { });
      }

      setIsPlaying(true);
      if ('mediaSession' in navigator) navigator.mediaSession.playbackState = 'playing';
      notifyOtherTabs();
    }
  };

  const setBpm = (newBpm: number) => {
    setBpmState(newBpm);
    localStorage.setItem('4andone-bpm', newBpm.toString());
    if (playerRef.current) {
      playerRef.current.playbackRate = newBpm / 100;
    }
    if (nativePlayerRef.current) {
      const rate = newBpm / 100;
      // Keep preservesPitch true to maintain algorithm consistency
      nativePlayerRef.current.preservesPitch = true;
      nativePlayerRef.current.playbackRate = rate;
    }
  };

  const seek = (time: number) => {
    if (isLoaded) {
      const isWasPlaying = isPlayingRef.current;
      const safeTime = Math.max(0, Math.min(time, duration));

      if (playerRef.current) {
        playerRef.current.stop();
        playerRef.current.start(undefined, safeTime);
      } else if (nativePlayerRef.current) {
        nativePlayerRef.current.pause();
        nativePlayerRef.current.currentTime = safeTime;
      }

      setCurrentTime(safeTime);

      if (!isWasPlaying) {
        if (nativePlayerRef.current) nativePlayerRef.current.pause();
        setIsPlaying(false);
      } else {
        if (nativePlayerRef.current) {
          playPromiseRef.current = nativePlayerRef.current.play();
          playPromiseRef.current.catch(e => {
            if (e.name !== 'AbortError') console.error("Native play failed during seek", e);
          }).finally(() => {
            playPromiseRef.current = null;
          });
        }
        setIsPlaying(true);
        notifyOtherTabs();
      }
    }
  };

  const seekRelative = (seconds: number) => {
    if (playerRef.current && isLoaded) {
      const newTime = Math.max(0, Math.min(currentTimeRef.current + seconds, duration));
      seek(newTime);
    }
  };

  const setVolume = (v: number) => {
    setVolumeState(v);
    localStorage.setItem('4andone-volume', v.toString());
    if (masterGainRef.current) {
      // Apply the 0.65 headroom logic
      masterGainRef.current.gain.rampTo(v * 0.65, 0.1);
    }
  };

  const toggleRepeat = () => setIsRepeat(!isRepeat);
  const toggleShuffle = () => setIsShuffle(!isShuffle);
  const toggleFinalMode = () => setIsFinalMode(!isFinalMode);

  const playNext = () => {
    const list = isFinalMode ? sessionTracks : tracks;
    if (list.length === 0) return;

    let currentIndex = list.findIndex(t => t.id === trackIdRef.current || t.title === title);

    // Handle shuffle
    if (isShuffle) {
      let nextIndex = Math.floor(Math.random() * list.length);
      while (nextIndex === currentIndex && list.length > 1) {
        nextIndex = Math.floor(Math.random() * list.length);
      }
      currentIndex = nextIndex - 1; // offset by 1 because we increment below
    }

    const nextIndex = (currentIndex + 1) % list.length;
    const nextTrack = list[nextIndex];
    loadTrack(nextTrack);
  };

  const playPrevious = () => {
    const list = isFinalMode ? sessionTracks : tracks;
    if (list.length === 0) return;

    const currentIndex = list.findIndex(t => t.id === trackIdRef.current || t.title === title);
    const prevIndex = currentIndex <= 0 ? list.length - 1 : currentIndex - 1;
    const prevTrack = list[prevIndex];
    loadTrack(prevTrack);
  };

  const stop = () => {
    if (playerRef.current) playerRef.current.stop();
    if (nativePlayerRef.current) nativePlayerRef.current.pause();
    setIsPlaying(false);
    setCurrentTime(0);
    setTrackCurrentTime(0);
    setIsPauseCountdown(false);
    setPauseTime(15);
    setActiveMode(null);
    setSessionTracks([]);
  };

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
