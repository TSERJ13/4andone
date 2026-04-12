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
  isExpanded: boolean;
  setIsExpanded: (val: boolean) => void;
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
  const [isExpanded, setIsExpanded] = useState(false);

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

  useEffect(() => { isPlayingRef.current = isPlaying; }, [isPlaying]);
  useEffect(() => { currentTimeRef.current = currentTime; }, [currentTime]);
  useEffect(() => { isPauseCountdownRef.current = isPauseCountdown; }, [isPauseCountdown]);
  useEffect(() => { pauseTimeRef.current = pauseTime; }, [pauseTime]);
  useEffect(() => { isFinalModeRef.current = isFinalMode; }, [isFinalMode]);
  useEffect(() => { sessionTracksRef.current = sessionTracks; }, [sessionTracks]);
  useEffect(() => { isFitnessRef.current = isFitness; }, [isFitness]);
  useEffect(() => { isRepeatRef.current = isRepeat; }, [isRepeat]);
  useEffect(() => { isShuffleRef.current = isShuffle; }, [isShuffle]);
  useEffect(() => { bpmRef.current = bpm; }, [bpm]);
  useEffect(() => { volumeRef.current = volume; }, [volume]);

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
        setPauseTime(15);
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
          // RESET VOLUME


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
          audio.onended = () => {
            if (currentToken !== loadingTokenRef.current) return;
            
            if (isFinalModeRef.current) {
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
              const isViennese = style.includes('viennese');
              const timeLimit = isPasoDoble ? Infinity : (isViennese ? 85 : 105);

              // NATIVE FADE-OUT Logic (3 seconds before limit)
              if (audio && !isPasoDoble) {
                  const isNearLimit = (timeLimit - currentTimeVal <= 3.5) && (timeLimit - currentTimeVal > 0);
                  
                  if (isNearLimit) {
                    const remaining = timeLimit - currentTimeVal;
                    // Smooth native volume reduction
                    const startVol = volumeRef.current * 0.8;
                    const steps = 20;
                    const stepDuration = (remaining * 1000) / steps;
                    
                    if (audio.volume > 0.01) {
                        const volumeInterval = setInterval(() => {
                           if (!audio || audio.volume <= 0.05) {
                               clearInterval(volumeInterval);
                               if (audio) audio.volume = 0;
                           } else {
                               audio.volume = Math.max(0, audio.volume - (startVol / steps));
                           }
                        }, stepDuration);
                    }
                  }
              }

              // TRIGGER NEXT or END
              if (currentTimeVal >= timeLimit || (isPasoDoble && audio.duration > 0 && currentTimeVal >= audio.duration - 0.5)) {
                audio.pause();
                audio.src = ''; // Force stop any remaining buffer
                setIsPlaying(false);
                isPlayingRef.current = false;

                const currentIdx = sessionTracksRef.current.findIndex(t => t.id === trackIdRef.current || t.title === title);
                const isLastTrack = currentIdx === sessionTracksRef.current.length - 1;

                if (isLastTrack) { 
                  stop(); 
                  return; 
                }
                
                if (isFitnessRef.current) { playNext(); return; }

                setIsPauseCountdown(true);
                isPauseCountdownRef.current = true;
                setPauseTime(15);
                pauseTimeRef.current = 15;
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

        if (currentToken !== loadingTokenRef.current) {
          audio.pause();
          return;
        }

        playPromiseRef.current = audio.play();
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

          if (isFinalMode) {
            setTrackCurrentTime(currentTimeVal);
            
            // Calculate Session-wide metrics for display if in a program
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
            } else {
              setCurrentTime(currentTimeVal);
            }
          } else {
            setCurrentTime(currentTimeVal);
            setTrackCurrentTime(currentTimeVal);
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
    // Unlock

    if (!isLoaded) return;

    if (isPlaying) {
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

      if (nativePlayerRef.current) {
        nativePlayerRef.current.currentTime = startTime;
        playPromiseRef.current = nativePlayerRef.current.play();
        playPromiseRef.current.catch(e => {
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
    if (nativePlayerRef.current) {
      const rate = newBpm / 100;
      // Keep preservesPitch true to maintain algorithm consistency
      nativePlayerRef.current.preservesPitch = true;
      nativePlayerRef.current.playbackRate = rate;
    }
  };

  const seek = (time: number) => {
    if (isLoaded && nativePlayerRef.current) {
      const safeTime = Math.max(0, Math.min(time, duration));
      const wasPlaying = isPlayingRef.current;

      // OPTIMIZATION: On mobile/iPad, excessive pause/play cycles cause stutter.
      // We directly update currentTime and only trigger play if it wasn't already in a play state.
      nativePlayerRef.current.currentTime = safeTime;
      setCurrentTime(safeTime);
      currentTimeRef.current = safeTime;

      if (wasPlaying) {
        // If it's already playing, we don't need to call play() again usually, 
        // but to be safe against buffer underruns during scrub:
        if (nativePlayerRef.current.paused) {
           playPromiseRef.current = nativePlayerRef.current.play();
           playPromiseRef.current.catch(() => {}).finally(() => { playPromiseRef.current = null; });
        }
        setIsPlaying(true);
      }
    }
  };

  const seekRelative = (seconds: number) => {
    if (nativePlayerRef.current && isLoaded) {
      const newTime = Math.max(0, Math.min(currentTimeRef.current + seconds, duration));
      seek(newTime);
    }
  };

  const setVolume = (v: number) => {
    setVolumeState(v);
    localStorage.setItem('4andone-volume', v.toString());
    if (nativePlayerRef.current) {
      nativePlayerRef.current.volume = v * 0.8;
    }
    if (masterGainRef.current) {
      // Update gain if needed
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
    if (nativePlayerRef.current) {
      nativePlayerRef.current.pause();
      nativePlayerRef.current.src = '';
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
      isExpanded,
      setIsExpanded,
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
