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
  togglePlay: () => void;
  loadTrack: (track: any, isRetry?: boolean, forceFinalMode?: boolean) => void;
  setBpm: (bpm: number) => void;
  setVolume: (volume: number) => void;
  toggleRepeat: () => void;
  toggleShuffle: () => void;
  toggleFinalMode: () => void;
  seek: (time: number) => void;
  seekRelative: (seconds: number) => void;
  stop: () => void;
}

const AudioContext = createContext<AudioContextType | undefined>(undefined);

import { useStudio } from '@/components/admin/StudioProvider';

export const AudioProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { finalTracks } = useStudio();
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

  const playerRef = useRef<Tone.GrainPlayer | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const activeBlobUrlRef = useRef<string | null>(null);
  const trackIdRef = useRef<string | null>(null);

  // Refs to avoid circular re-renders on every tick
  const isPlayingRef = useRef(isPlaying);
  const currentTimeRef = useRef(currentTime);

  useEffect(() => { isPlayingRef.current = isPlaying; }, [isPlaying]);
  useEffect(() => { currentTimeRef.current = currentTime; }, [currentTime]);

  // Removed AI worker and processing hooks

  const initAudioChain = () => {
    const gain = new Tone.Gain(volume).toDestination();
    return gain;
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
    try {
      if (forceFinalMode !== undefined) setIsFinalMode(forceFinalMode);
      if (Tone.getContext().state !== 'running') await Tone.start();
      const output = initAudioChain();

      if (playerRef.current) {
        playerRef.current.stop();
        playerRef.current.dispose();
        playerRef.current = null;
      }

      if (!isRetry && activeBlobUrlRef.current) {
        URL.revokeObjectURL(activeBlobUrlRef.current);
        activeBlobUrlRef.current = null;
      }

      setIsPlaying(false);
      setIsLoaded(false);
      setError(null);
      setCurrentTime(0);
      setTitle(track.title);
      setArtist(track.artist);
      trackIdRef.current = track.id;

      let finalUrl = track.audioUrl;
      const isRemote = finalUrl?.startsWith('http');

      // 1. If REMOTE (Cloudflare R2), we need a temporary signed URL for playback
      if (isRemote) {
        try {
          console.log(`[AUDIO-SIGN] Requesting playback pass for: ${track.title}`);
          const fileName = finalUrl.split('/').pop(); // Extract safeFileName from the URL
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
        throw new Error("Missing Audio Source");
      }

      // 3. SECURE PRE-FETCH (REMOVED BLOCKING FETCO TO SPEED UP START)
      // We pass the finalUrl (usually signed) directly to Tone loader.

      const player = new Tone.GrainPlayer({
        url: finalUrl,
        onload: () => {
          setDuration(player.buffer.duration);
          setIsLoaded(true);
          player.playbackRate = bpm / 100;
          
          if (Tone.getContext().state === 'running') {
            player.start();
            setIsPlaying(true);
          }
          setError(null);

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
        },
        onerror: (err) => {
          console.error("[PLAYER-ERROR]", err);
          setError("Codec or Memory Error (Incompatible file)");
          setIsLoaded(false);
        },
        loop: !isFinalMode // Loop in practice, not in final
      });

      player.connect(output);
      playerRef.current = player;
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
        if (playerRef.current) {
          const nextVal = currentTime + 0.1 * (bpm / 100);
          setCurrentTime(nextVal);
          
          if (isFinalMode && nextVal >= 105) {
            if (playerRef.current) playerRef.current.stop();
            setIsPlaying(false);
            setCurrentTime(0);
            
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
          } else if (!isFinalMode && duration > 0 && nextVal >= duration) {
             if (!isRepeat) {
                if (playerRef.current) playerRef.current.stop();
                setIsPlaying(false);
                setCurrentTime(0);
             } else {
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

    if (!isLoaded || !playerRef.current) return;

    if (isPlaying) {
      playerRef.current.stop();
      setIsPlaying(false);
    } else {
      // Resume from last position (currentTime)
      const startTime = currentTimeRef.current >= duration ? 0 : currentTimeRef.current;
      playerRef.current.start(undefined, startTime);
      setIsPlaying(true);
    }
  };

  const setBpm = (newBpm: number) => {
    setBpmState(newBpm);
    localStorage.setItem('4andone-bpm', newBpm.toString());
    if (playerRef.current) {
      playerRef.current.playbackRate = newBpm / 100;
    }
  };

  const seek = (time: number) => {
    if (playerRef.current && isLoaded) {
      const isWasPlaying = isPlayingRef.current;
      playerRef.current.stop();
      const safeTime = Math.max(0, Math.min(time, duration));
      playerRef.current.start(undefined, safeTime);
      setCurrentTime(safeTime);
      if (!isWasPlaying) {
        playerRef.current.stop();
        setIsPlaying(false);
      } else {
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
    if (playerRef.current) {
      // In Tone.js GrainPlayer doesn't have direct volume, it's connected to Gain
      // We'd need to keep a ref to the Gain node or just dispose/reload.
      // For now, let's just update the state and it will apply on next track.
    }
  };

  const toggleRepeat = () => setIsRepeat(!isRepeat);
  const toggleShuffle = () => setIsShuffle(!isShuffle);
  const toggleFinalMode = () => setIsFinalMode(!isFinalMode);

  const stop = () => {
    if (playerRef.current) {
      playerRef.current.stop();
      setIsPlaying(false);
    }
  };

  // REGISTER MEDIA SESSION ACTIONS
  useEffect(() => {
    if ('mediaSession' in navigator) {
      navigator.mediaSession.setActionHandler('play', () => togglePlay());
      navigator.mediaSession.setActionHandler('pause', () => togglePlay());
      navigator.mediaSession.setActionHandler('seekbackward', () => seekRelative(-10));
      navigator.mediaSession.setActionHandler('seekforward', () => seekRelative(10));
      navigator.mediaSession.setActionHandler('previoustrack', () => seekRelative(-30));
      navigator.mediaSession.setActionHandler('nexttrack', () => {
          // Future: Logic for next song in playlist
          seekRelative(30);
      });
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
      togglePlay,
      loadTrack,
      setBpm,
      setVolume,
      toggleRepeat,
      toggleShuffle,
      toggleFinalMode,
      seek,
      seekRelative,
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
