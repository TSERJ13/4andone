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
  duration: number;
  title: string;
  artist: string;
  error: string | null;
  volume: number;
  isRepeat: boolean;
  isShuffle: boolean;
  isLoading: boolean;
  togglePlay: () => void;
  loadTrack: (track: any, isRetry?: boolean, forceFinalMode?: boolean) => void;
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
}

const AudioContext = createContext<AudioContextType | undefined>(undefined);

import { useStudio } from '@/components/admin/StudioProvider';

export const AudioProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { tracks, finalTracks } = useStudio();
  const [isPlaying, setIsPlaying] = useState(false);
  const [bpm, setBpmState] = useState(100);
  const [isFinalMode, setIsFinalMode] = useState(false); // Default to Normal Mode
  const [currentTime, setCurrentTime] = useState(0);
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

  const playerRef = useRef<Tone.GrainPlayer | Tone.Player | null>(null);
  const nativePlayerRef = useRef<HTMLAudioElement | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const activeBlobUrlRef = useRef<string | null>(null);
  const trackIdRef = useRef<string | null>(null);
  const loadingTokenRef = useRef<number>(0); // Guard for race conditions
  const masterGainRef = useRef<Tone.Gain | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Refs to avoid circular re-renders on every tick
  const isPlayingRef = useRef(isPlaying);
  const currentTimeRef = useRef(currentTime);

  useEffect(() => { isPlayingRef.current = isPlaying; }, [isPlaying]);
  useEffect(() => { currentTimeRef.current = currentTime; }, [currentTime]);

  // Removed AI worker and processing hooks

  const initAudioChain = () => {
    if (!masterGainRef.current) {
      // 1. Create Main Gain for volume control with Safe Headroom (-4dB)
      // We use a fixed multiplier (0.65) instead of a Limiter to ensure volume NEVER 'pumps' or 'dances'.
      masterGainRef.current = new Tone.Gain(volume * 0.65); 
      masterGainRef.current.toDestination();
    }
    
    // Smoothly apply volume changes with the 0.65 headroom factor
    masterGainRef.current.gain.rampTo(volume * 0.65, 0.1);
    return masterGainRef.current;
  };

  useEffect(() => {
    const savedVol = localStorage.getItem('4andone-volume');
    if (savedVol) setVolumeState(parseFloat(savedVol));

    // Global "Unlock" for mobile audio
    const unlockAudio = async () => {
      if (Tone.getContext().state !== 'running') {
        await Tone.start();
        await Tone.getContext().resume();
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
          nativePlayerRef.current.pause();
          nativePlayerRef.current.src = "";
          nativePlayerRef.current.load();
          nativePlayerRef.current = null;
        }
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
      setTitle(track.title);
      setArtist(track.artist);
      trackIdRef.current = track.id;

      let finalUrl = track.audioUrl;
      
      // AUTO-HEALING: If track was saved with "undefined/" due to missing env vars
      if (finalUrl?.startsWith('undefined/')) {
        const R2_FALLBACK = 'https://pub-c41b1121b311f676bdc114d143278d18.r2.dev';
        finalUrl = finalUrl.replace('undefined/', `${R2_FALLBACK}/`);
        console.log(`[AUDIO-HEAL] Repaired broken URL: ${finalUrl}`);
      }

      const isRemote = finalUrl?.startsWith('http');

      // 1. If REMOTE (Cloudflare R2), we need a temporary signed URL for playback
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
          }
        } catch (e) {
          console.error("[AUDIO-SIGN] Error during signing:", e);
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

          console.log(`[AUDIO-STREAM] Opening stream for: ${track.title}`);
          
          // Create Native Audio Element for Streaming
          const audio = new Audio(url);
          audio.crossOrigin = "anonymous";
          audio.autoplay = false;
          audio.loop = !isFinalMode;
          nativePlayerRef.current = audio;

          // Connect to Tone.js for Gain/Pan control
          const node = Tone.getContext().createMediaElementSource(audio);
          const output = initAudioChain();
          Tone.connect(node, output);

          // Spotify-style: Start as soon as we have enough data to play without stuttering
          audio.oncanplay = () => {
            if (currentToken !== loadingTokenRef.current) return;
            console.log(`[AUDIO-READY] Stream buffered. Starting ${track.title}`);
            setDuration(audio.duration || 0);
            setIsLoaded(true);
            setIsLoading(false);
            resolve(audio);
          };

          audio.onerror = (e) => reject(new Error(`Stream error: ${track.title}`));
          
          // Set initial speed
          audio.playbackRate = bpm / 100;
        });
      };

      try {
        // ATTEMPT 1: INSTANT STREAMING (Spotify Method)
        const audio = await setupPlayer(finalUrl, 'streaming') as HTMLAudioElement;
        
        if (Tone.getContext().state === 'running') {
          audio.play().catch(e => console.error("Play prevented", e));
          setIsPlaying(true);
        }
      } catch (e: any) {
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
    if (isPlaying) {
      timerRef.current = setInterval(() => {
        if (nativePlayerRef.current) {
          const currentTimeVal = nativePlayerRef.current.currentTime;
          setCurrentTime(currentTimeVal);
          
          if (isFinalMode && currentTimeVal >= 105) {
            nativePlayerRef.current.pause();
            setIsPlaying(false);
            setCurrentTime(0);
            nativePlayerRef.current.currentTime = 0;
            
            // Start 15s Pause Countdown for Final Mode
            setIsPauseCountdown(true);
            setPauseTime(15);
            
            const countdownInterval = setInterval(() => {
              setPauseTime(p => {
                if (p <= 1) {
                  clearInterval(countdownInterval);
                  setIsPauseCountdown(false);
                  
                  // Sequential Playback for Final Mode
                  const currentIndex = finalTracks.findIndex(t => t.id === trackIdRef.current || t.title === title);
                  if (currentIndex !== -1 && currentIndex < finalTracks.length - 1) {
                    const nextTrack = finalTracks[currentIndex + 1];
                    loadTrack(nextTrack, false, true);
                  }
                  return 15;
                }
                return p - 1;
              });
            }, 1000);
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
        }
      }, 100);

      // Update Media Session Position State
      if ('mediaSession' in navigator && duration > 0) {
        navigator.mediaSession.setPositionState({
          duration: duration,
          playbackRate: bpm / 100,
          position: currentTime
        });
      }
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isPlaying, duration, bpm, isFinalMode, currentTime]);

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
      setIsPlaying(false);
    } else {
      const startTime = currentTimeRef.current >= duration ? 0 : currentTimeRef.current;
      
      if (playerRef.current) {
        playerRef.current.start(undefined, startTime);
      } else if (nativePlayerRef.current) {
        nativePlayerRef.current.currentTime = startTime;
        nativePlayerRef.current.play().catch(e => console.error("Native play failed", e));
      }
      setIsPlaying(true);
    }
  };

  const setBpm = (newBpm: number) => {
    setBpmState(newBpm);
    localStorage.setItem('4andone-bpm', newBpm.toString());
    if (playerRef.current) {
      playerRef.current.playbackRate = newBpm / 100;
    }
    if (nativePlayerRef.current) {
      nativePlayerRef.current.playbackRate = newBpm / 100;
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
        if (nativePlayerRef.current) nativePlayerRef.current.play().catch(e => console.error("Native play failed", e));
        setIsPlaying(true);
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
    const list = isFinalMode ? finalTracks : tracks;
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
    const list = isFinalMode ? finalTracks : tracks;
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
      duration,
      title,
      artist,
      error,
      volume,
      isRepeat,
      isShuffle,
      isLoading,
      togglePlay,
      loadTrack,
      setBpm,
      setVolume,
      toggleRepeat,
      toggleShuffle,
      toggleFinalMode,
      seek,
      seekRelative,
      playNext,
      playPrevious,
      stop
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
