"use client";

import React, { createContext, useContext, useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { getAudioFile } from '@/utils/storage';
import { isNativeFinalTestEnabled } from '@/utils/iosFinalDiagnostic';
import IosFinalAudioTestBadge from './IosFinalAudioTestBadge';
import { getTrackCover } from '@/utils/trackCover';
import { playOrder } from '@/utils/playQueue';
import { recordTrackPlayed } from '@/utils/history';
import { FinalsClock, FINAL_DANCE_SECONDS, FINAL_REST_SECONDS, FINAL_FADE_SECONDS, FINAL_REST_URL, playbackRateFor, setMusicTempo } from '@/utils/finals';

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
  trackId: string | null;
  currentTrack: any | null;
  error: string | null;
  volume: number;
  isRepeat: boolean;
  isShuffle: boolean;
  /** Shuffle's order (same seed → same order) — null while Shuffle is off. */
  shuffleSeed: number | null;
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
  isAdModalOpen: boolean;
  setIsAdModalOpen: (open: boolean) => void;
  /** Ad break moved on to the Premium popup: pause music (resumes on close). */
  pauseForBreak: () => void;
  songsPlayedCount: number;
}

// PERFORMANCE: the fast-changing playback clock lives in its own context.
// Before, every progress tick (~5x/sec) re-rendered EVERY component using
// useAudio() — home page, track lists, albums… — which made phones lag/freeze
// while music played. Components that don't show the clock use
// useAudioControls() and no longer re-render on each tick.
type TimeKeys = 'currentTime' | 'trackCurrentTime' | 'pauseTime' | 'sessionDuration';
type AudioControlsType = Omit<AudioContextType, TimeKeys>;
type AudioTimeType = Pick<AudioContextType, TimeKeys>;

const PlayerContext = createContext<AudioControlsType | undefined>(undefined);
const PlayerTimeContext = createContext<AudioTimeType | undefined>(undefined);

// Every dance gets 105 real playback seconds, including its 3-second fade.
// Fitness retains its independent continuous-workout duration.
const finalLimitFor = (track: { duration?: number } | undefined, fitness: boolean): number =>
  fitness ? (track?.duration || 180) : FINAL_DANCE_SECONDS;

// Every 5 qualified tracks (15s+ of real listening) a free user gets an ad break.
const AD_EVERY_TRACKS = 5;
// The ad break (sponsored strip + Premium popup) is switched off for now —
// the list ad under the playing track is the only ad. Set true to bring it back.
const AD_BREAK_ENABLED = false;
// A track counts toward the ad break after this many seconds of real playback.
const QUALIFY_SECONDS = 15;
const AD_COUNT_KEY = '4andone-ad-track-count';

const SILENT_WAV = "data:audio/wav;base64,UklGRjIAAABXQVZFRm10IBAAAAABAAEAIlYAAESsAAACABAAZGF0YRAAAAAAAAAAAAAAAAAAAAAAAAAA";

const isIOS = (): boolean => {
  if (typeof navigator === 'undefined') return false;
  return /iPad|iPhone|iPod/.test(navigator.userAgent || '') ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
};

// SIGNED-URL CACHE: re-using the same signed URL for a track lets the browser
// HTTP cache serve replays instantly instead of re-downloading the whole file,
// and removes the /api/upload round-trip before every play. Entries are reused
// only while they still have plenty of validity left (server signs for 6h).
const R2_PUBLIC_FALLBACK = process.env.NEXT_PUBLIC_R2_PUBLIC_URL || 'https://pub-c41b1121b311f676bdc114d143278d18.r2.dev';
const SIGNED_URL_REUSE_MS = 2 * 60 * 60 * 1000;
const signedUrlCache = new Map<string, { url: string; signedAt: number }>();

const getStorageKey = (url: string): string => {
  const domainNormalized = R2_PUBLIC_FALLBACK.replace(/\/$/, '');
  if (url.includes(domainNormalized)) return url.split(`${domainNormalized}/`)[1] || '';
  return url.split('/').slice(3).join('/');
};

const resolvePlaybackUrl = async (rawUrl: string, forceFresh = false): Promise<string> => {
  let url = rawUrl;
  // AUTO-HEALING: tracks saved with "undefined/" due to missing env vars
  if (url.startsWith('undefined/')) url = url.replace('undefined/', `${R2_PUBLIC_FALLBACK}/`);
  if (!url.startsWith('http')) return url;

  const storageKey = getStorageKey(url);
  if (!storageKey) return url;

  const cached = signedUrlCache.get(storageKey);
  if (!forceFresh && cached && Date.now() - cached.signedAt < SIGNED_URL_REUSE_MS) {
    return cached.url;
  }
  try {
    const signRes = await fetch(`/api/upload?key=${encodeURIComponent(storageKey)}`, { cache: 'no-store' });
    if (signRes.ok) {
      const { url: signed } = await signRes.json();
      if (signed) {
        signedUrlCache.set(storageKey, { url: signed, signedAt: Date.now() });
        return signed;
      }
    }
  } catch (e) {
    console.error('[AUDIO-ENGINE] Playback signing failed:', e);
  }
  // FALLBACK: public R2 URL with the full key
  return `${R2_PUBLIC_FALLBACK.replace(/\/$/, '')}/${storageKey}`;
};

import { useStudio, Track } from '@/components/admin/StudioProvider';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/utils/supabase';

export const AudioProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { tracks, finalTracks, albums } = useStudio();
  const { user, isPremium, setIsSubscriptionModalOpen } = useAuth();
  const [isPlaying, setIsPlaying] = useState(false);
  const [bpm, setBpmState] = useState(100);
  const [isFinalMode, setIsFinalMode] = useState(false); // Default to Normal Mode
  const [showIosAudioTest, setShowIosAudioTest] = useState(false);
  useEffect(() => {
    // Capture the entry URL before login/navigation drops its query parameters.
    setShowIosAudioTest(isIOS() && isNativeFinalTestEnabled());
  }, []);
  const [currentTime, setCurrentTime] = useState(0);
  const [trackCurrentTime, setTrackCurrentTime] = useState(0); // For round-specific progress
  const [duration, setDuration] = useState(0);
  const [isLoaded, setIsLoaded] = useState(false);
  const [songsPlayedCount, setSongsPlayedCount] = useState(0);
  const [isAdModalOpen, setIsAdModalOpen] = useState(false);
  const songsPlayedRef = useRef(0);
  const currentTrackQualifiedRef = useRef(false);
  const isPremiumRef = useRef(isPremium);
  useEffect(() => { isPremiumRef.current = isPremium; }, [isPremium]);
  // AD BREAK STATE
  const adOpenRef = useRef(false);          // ad break currently on screen
  const breakPausedRef = useRef(false);     // break reached its Premium popup → music paused
  const pendingAdRef = useRef(false);       // break earned → shown when the user taps the next track
  const resumeAfterAdRef = useRef(false);   // music was playing when the ad opened → resume on close


  const [title, setTitle] = useState("No Track Selected");
  const [artist, setArtist] = useState("Upload or select a track");
  const [trackId, setTrackId] = useState<string | null>(null);
  const [currentTrack, setCurrentTrack] = useState<any | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [volume, setVolumeState] = useState(1);
  // Repeat ON = the track loops; OFF = at its end the next song of the same
  // dance plays. Shuffle = that queue in a fixed random order. Both remembered.
  const [isRepeat, setIsRepeat] = useState(false);
  const [shuffleSeed, setShuffleSeed] = useState<number | null>(null);
  const isShuffle = shuffleSeed !== null;
  const [isPauseCountdown, setIsPauseCountdown] = useState(false);
  const [pauseTime, setPauseTime] = useState(15);
  const [isFitness, setIsFitnessState] = useState(false);
  const [fitnessTargetTime, setFitnessTargetTime] = useState<number>(0);
  const [sessionDuration, setSessionDuration] = useState(0);
  const [activeMode, setActiveModeState] = useState<string | null>(null);
  const [sessionTracks, setSessionTracksState] = useState<Track[]>([]);

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
  // Program selection and loadTrack happen in the same click, before effects.
  const setSessionTracks = useCallback((next: Track[]) => {
    sessionTracksRef.current = next;
    sessionIndexRef.current = -1;
    setSessionTracksState(next);
  }, []);
  const finalsClockRef = useRef(new FinalsClock());
  const monitorPlaybackRef = useRef<(() => void) | null>(null);
  const restRunningRef = useRef(false);
  const cancelLoadRef = useRef<(() => void) | null>(null);
  const isFitnessRef = useRef(isFitness);
  const isRepeatRef = useRef(isRepeat);
  const shuffleSeedRef = useRef(shuffleSeed);
  const playNextRef = useRef<() => void>(() => {});
  const playPreviousRef = useRef<() => void>(() => {});
  const bpmRef = useRef(bpm);
  const volumeRef = useRef(volume);
  const activeModeRef = useRef(activeMode);
  const setIsFitness = useCallback((value: boolean) => {
    isFitnessRef.current = value;
    setIsFitnessState(value);
  }, []);
  const setActiveMode = useCallback((value: string | null) => {
    activeModeRef.current = value;
    setActiveModeState(value);
  }, []);
  const fadeIntervalRef = useRef<NodeJS.Timeout | null>(null); // Interval for smooth acoustic fade-out
  const finalEndHandledRef = useRef(false); // Guard: prevent double-advance on track end
  const sessionIndexRef = useRef<number>(-1); // Position in the Final Mode session (handles duplicate tracks)
  const pauseDeadlineRef = useRef<number>(0); // Wall-clock deadline for pause countdown (survives screen-off)
  const workerRef = useRef<Worker | null>(null);
  const checkPauseCountdownRef = useRef<() => void>(() => {});

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
    let pendingElement: HTMLAudioElement | null = null;
    let pendingContext: AudioContext | null = null;
    try {
      const Ctx: typeof AudioContext | undefined =
        window.AudioContext || (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!Ctx) { webAudioStateRef.current = 'failed'; return; }

      const el = new Audio();
      pendingElement = el;
      el.crossOrigin = "anonymous"; // must be set BEFORE any src
      el.autoplay = false;
      setMusicTempo(el, bpmRef.current);
      el.volume = 1.0; // loudness is controlled by the gain node from here on
      el.style.display = 'none';
      document.body.appendChild(el);

      const ctx = new Ctx({ latencyHint: 'playback' });
      pendingContext = ctx;
      const source = ctx.createMediaElementSource(el);
      const gain = ctx.createGain();
      gain.gain.value = volumeRef.current;
      source.connect(gain);
      gain.connect(ctx.destination);

      finalPlayerRef.current = el;
      audioCtxRef.current = ctx;
      mediaSourceRef.current = source;
      gainNodeRef.current = gain;
      webAudioStateRef.current = 'ready';
    } catch (e) {
      pendingElement?.remove();
      void pendingContext?.close().catch(() => {});
      console.warn('[AUDIO-ENGINE] Final-mode gain chain failed, falling back to plain element:', e);
      webAudioStateRef.current = 'failed';
    }
  }, []);

  // Device capability and diagnostic routing are separate: opting into native
  // playback does NOT make element.volume writable on iOS or implement a fade.
  const isVolumeWritable = () => !isIOS();
  const useNativeFinalDiagnostic = () => isIOS() && isNativeFinalTestEnabled();

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
    applyVolume(volumeRef.current);
  }, [applyVolume]);

  useEffect(() => { isPlayingRef.current = isPlaying; }, [isPlaying]);
  useEffect(() => { currentTimeRef.current = currentTime; }, [currentTime]);
  useEffect(() => { isPauseCountdownRef.current = isPauseCountdown; }, [isPauseCountdown]);
  useEffect(() => { pauseTimeRef.current = pauseTime; }, [pauseTime]);
  useEffect(() => {
    isFinalModeRef.current = isFinalMode;
    if (!isFinalMode) {
      finalsClockRef.current.reset();
    }
  }, [isFinalMode]);
  useEffect(() => { sessionTracksRef.current = sessionTracks; }, [sessionTracks]);
  useEffect(() => { isFitnessRef.current = isFitness; }, [isFitness]);
  useEffect(() => { isRepeatRef.current = isRepeat; }, [isRepeat]);
  useEffect(() => { shuffleSeedRef.current = shuffleSeed; }, [shuffleSeed]);
  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem('4andone_play_order') || '{}');
      if (saved.repeat === true) setIsRepeat(true);
      if (typeof saved.shuffleSeed === 'number') setShuffleSeed(saved.shuffleSeed);
    } catch { /* ignore */ }
  }, []);
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
        const getLimitForTrack = (track: Track) => finalLimitFor(track, false);

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
        // Single-track Final Mode uses the same 1:45 slot as programs.
        const t = playingTrackRef.current;
        setSessionDuration(finalLimitFor({ duration: duration || t?.duration }, false));
      }
    } else {
      const safeDur = Number.isFinite(duration) && duration >= 0 ? duration : 0;
      setSessionDuration(safeDur);
    }
  }, [sessionTracks, isFinalMode, isFitness, fitnessTargetTime, duration, title]);

  // Tab synchronization for audio control.
  // A unique per-tab ID prevents a tab from pausing itself when it receives
  // its own broadcast (the original bug: tab posted 'play', then its own
  // onmessage handler fired and immediately called nativePlayerRef.pause()).
  const tabIdRef = useRef<string>(`tab_${Math.random().toString(36).slice(2)}`);

  useEffect(() => {
    const channel = new BroadcastChannel('audio_control');
    channel.onmessage = (event) => {
      // Ignore messages sent by ourselves
      if (event.data?.sender === tabIdRef.current) return;
      if (event.data?.type === 'play' && isPlaying) {
        if (nativePlayerRef.current) nativePlayerRef.current.pause();
        setIsPlaying(false);
      }
    };
    return () => channel.close();
  }, [isPlaying]);

  const notifyOtherTabs = () => {
    const channel = new BroadcastChannel('audio_control');
    channel.postMessage({ type: 'play', sender: tabIdRef.current });
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
  type LoadOptions = { startAt?: number; paused?: boolean; fromRest?: boolean };
  const loadTrackRef = useRef<(track: any, isRetry?: boolean, forceFinalMode?: boolean, opts?: LoadOptions) => void>(() => {});
  const stopRef = useRef<() => void>(() => {});

  const checkPauseCountdown = React.useCallback(() => {
    if (!isPauseCountdownRef.current || !restRunningRef.current || !isPlayingRef.current) return;
    if (!pauseDeadlineRef.current) {
      pauseDeadlineRef.current = Date.now() + pauseTimeRef.current * 1000;
    }
    const remainingMs = pauseDeadlineRef.current - Date.now();
    const newPauseTime = Math.max(0, remainingMs / 1000);
    pauseTimeRef.current = newPauseTime;
    setPauseTime(Math.ceil(newPauseTime));

    // Update lockscreen / MediaSession countdown
    if ('mediaSession' in navigator && (navigator.mediaSession as any).metadata) {
      try {
        const sec = Math.ceil(newPauseTime);
        const meta = navigator.mediaSession.metadata;
        if (meta && meta.title !== `Rest (${sec}s)`) {
          meta.title = `Rest (${sec}s)`;
        }
      } catch {}
    }

    // Keep session clock moving smoothly through rest
    const list = sessionTracksRef.current;
    let idx = sessionIndexRef.current;
    if (idx < 0 || idx >= list.length || list[idx]?.id !== trackIdRef.current) {
      idx = list.findIndex(t => t.id === trackIdRef.current);
    }
    if (idx !== -1) {
      let elapsed = 0;
      for (let k = 0; k < idx; k++) elapsed += finalLimitFor(list[k], false) + 15;
      elapsed += finalLimitFor(list[idx], false) + (15 - newPauseTime);
      if (Number.isFinite(elapsed) && Math.abs((currentTimeRef.current ?? -1) - elapsed) >= 0.2) {
        currentTimeRef.current = elapsed;
        setCurrentTime(elapsed);
      }
    }

    if (newPauseTime <= 0) {
      pauseDeadlineRef.current = 0;
      restRunningRef.current = false;
      isPauseCountdownRef.current = false;
      setIsPauseCountdown(false);
      try { workerRef.current?.postMessage('stop'); } catch {}

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
        loadTrackRef.current(nextTrack, false, true, { fromRest: true });
      } else {
        // No more tracks - stop
        stopRef.current();
      }
    }
  }, []);

  useEffect(() => {
    checkPauseCountdownRef.current = checkPauseCountdown;
  }, [checkPauseCountdown]);

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

    // Isolate rest handlers from the song: old canplay/error handlers otherwise
    // reapply the song's speed or reload it during the silence.
    const audio = nativePlayerRef.current;
    restRunningRef.current = false;
    pauseDeadlineRef.current = 0;
    monitorPlaybackRef.current = null;
    if (audio) {
      audio.oncanplay = null;
      audio.onplay = null;
      audio.onseeked = null;
      audio.onended = null;
      audio.ontimeupdate = null;
      audio.onplaying = null;
      audio.onwaiting = null;
      audio.onpause = null;
      audio.onerror = null;
      audio.pause();
      audio.loop = false;
      setMusicTempo(audio, 100);
      audio.src = FINAL_REST_URL;
      audio.load();
      cancelFadeAndRestore();
      audio.onplaying = () => {
        if (!isPauseCountdownRef.current) return;
        restRunningRef.current = true;
        isPlayingRef.current = true;
        setIsPlaying(true);
        pauseDeadlineRef.current = Date.now() + pauseTimeRef.current * 1000;
      };
      audio.ontimeupdate = () => checkPauseCountdownRef.current();
      audio.onended = () => {
        if (!isPauseCountdownRef.current || !restRunningRef.current) return;
        // MP3 padding can make the decoded file slightly shorter than 15s.
        // Keep the existing deadline; never restart a new 15-second pause.
        checkPauseCountdownRef.current();
      };
      audio.onerror = () => {
        // A missing/offline rest asset still means 15 seconds of silence.
        restRunningRef.current = true;
        isPlayingRef.current = true;
        setIsPlaying(true);
        pauseDeadlineRef.current = Date.now() + pauseTimeRef.current * 1000;
      };
      audio.play().catch(() => {
        if (audio.error && isPauseCountdownRef.current && restRunningRef.current) return;
        restRunningRef.current = false;
        isPlayingRef.current = false;
        setIsPlaying(false);
        setError('Tap Play to continue the rest interval.');
      });
    }

    // CRITICAL: KEEP AUDIO SESSION ALIVE IN THE BACKGROUND!
    if (heartbeatRef.current) {
      try {
        heartbeatRef.current.currentTime = 0;
        heartbeatRef.current.play().catch(() => {});
      } catch {}
    }

    // Secondary ticker; the OS may suspend both workers and the main thread.
    try {
      workerRef.current?.postMessage('start');
    } catch {}

    // Update lockscreen / MediaSession so it stays in "playing" state and displays upcoming dance
    const nextIdx = currentIdx + 1;
    const nextTrack = tracksList[nextIdx];
    if ('mediaSession' in navigator) {
      navigator.mediaSession.playbackState = 'playing';
      try {
        const coverPath = nextTrack ? getTrackCover(nextTrack, albums) : '/icons/icon-512x512.png';
        const absoluteCover = (typeof window !== 'undefined' && coverPath.startsWith('/'))
          ? `${window.location.origin}${coverPath}`
          : coverPath;
        navigator.mediaSession.metadata = new MediaMetadata({
          title: 'Rest (15s)',
          artist: nextTrack ? `Next: ${nextTrack.title}` : 'Final Mode',
          album: activeModeRef.current ? `${activeModeRef.current.toUpperCase()} Final` : 'Final Mode',
          artwork: [
            { src: absoluteCover, sizes: '512x512', type: /\.png($|\?)/i.test(coverPath) ? 'image/png' : 'image/jpeg' },
            { src: `${window.location.origin}/icons/icon-512x512.png`, sizes: '512x512', type: 'image/png' }
          ]
        });
      } catch {}
    }

    // Pre-cache upcoming track's signed playback URL during the 15s pause for zero-latency start
    if (nextTrack?.audioUrl) {
      resolvePlaybackUrl(nextTrack.audioUrl).catch(() => {});
    }
  }, [albums]);


  useEffect(() => {
    // Initialize Persistent Player & Heartbeat
    if (typeof window !== 'undefined') {
      // 1. PLAIN element — used for ALL normal-mode playback. It is NEVER routed
      // through WebAudio, so normal listening keeps native playback and
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
      const hb = new Audio(SILENT_WAV);
      hb.loop = true;
      hb.volume = 0.01; 
      hb.style.display = 'none';
      // Hardware-driven ticker: ontimeupdate is triggered by native audio frames even when screen is locked
      hb.ontimeupdate = () => {
        if (isPauseCountdownRef.current && checkPauseCountdownRef.current) {
          checkPauseCountdownRef.current();
        }
      };
      document.body.appendChild(hb);
      heartbeatRef.current = hb;

      // 3. Secondary ticker for background tabs (not a guarantee against OS suspension).
      try {
        const workerBlob = new Blob([
          `let timer = null;
           self.onmessage = function(e) {
             if (e.data === 'start') {
               if (timer) clearInterval(timer);
               timer = setInterval(function() { self.postMessage('tick'); }, 500);
             } else if (e.data === 'stop') {
               if (timer) clearInterval(timer);
               timer = null;
             }
           };`
        ], { type: 'application/javascript' });
        const workerUrl = URL.createObjectURL(workerBlob);
        const worker = new Worker(workerUrl);
        URL.revokeObjectURL(workerUrl);
        worker.onmessage = (e) => {
          if (e.data === 'tick' && isPauseCountdownRef.current && checkPauseCountdownRef.current) {
            checkPauseCountdownRef.current();
          }
        };
        workerRef.current = worker;
      } catch (e) {
        console.warn('[AUDIO-ENGINE] Background WebWorker timer unavailable:', e);
      }
    }

    const savedVol = localStorage.getItem('4andone-volume');
    if (savedVol) setVolumeState(parseFloat(savedVol));

    // SPEED PERSISTENCE FIX: restore the user's last chosen speed on startup.
    // It was being saved to localStorage but never read back, so every reload
    // reset the speed to 100%.
    const savedBpm = localStorage.getItem('4andone-bpm');
    if (savedBpm) {
      const parsed = parseFloat(savedBpm);
      if (Number.isFinite(parsed) && parsed >= 50 && parsed <= 150) {
        setBpmState(parsed);
        bpmRef.current = parsed;
      }
    }

    // Global "Unlock" for mobile audio + Safari Optimizations
    const unlockAudio = async () => {
      // iOS 15+: Declare this page as a dedicated audio playback app.
      // Without this, Safari treats the audio session as 'ambient' and the OS
      // may auto-pause the tab when the screen locks or another audio source starts.
      if ('audioSession' in navigator) {
        try { (navigator as any).audioSession.type = 'playback'; } catch {}
      }

      // CRITICAL: Start the heartbeat (silent looping WAV) on first user gesture.
      // The heartbeat keeps the iOS audio session alive while the main audio is
      // paused. Without it, iOS releases the session after ~30s and the next
      // lockscreen Play produces silence (audio "plays" but no output).
      // Must be started inside a user-gesture handler — that's why it's here.
      if (heartbeatRef.current && heartbeatRef.current.paused) {
        heartbeatRef.current.play().catch(() => {});
      }

      // Resume the Final-Mode audio context if it exists (iOS suspends it).
      if (audioCtxRef.current && audioCtxRef.current.state === 'suspended') {
        audioCtxRef.current.resume().catch(() => {});
      }

      // Remove listeners once unlocked
      document.removeEventListener('touchstart', unlockAudio);
      document.removeEventListener('mousedown', unlockAudio);
    };

    // PWA Resume Support & Lockscreen Hardware Sync
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        // iOS suspends the AudioContext in the background — resume it or the
        // gain chain (and therefore all sound) stays silent.
        if (audioCtxRef.current && audioCtxRef.current.state === 'suspended') {
          audioCtxRef.current.resume().catch(() => {});
        }

        // Synchronize React state with actual hardware audio playback state
        if (nativePlayerRef.current && !isPauseCountdownRef.current) {
          const isHardwarePlaying = !nativePlayerRef.current.paused && !nativePlayerRef.current.ended;
          if (isPlayingRef.current !== isHardwarePlaying) {
            setIsPlaying(isHardwarePlaying);
            isPlayingRef.current = isHardwarePlaying;
            if ('mediaSession' in navigator) {
              navigator.mediaSession.playbackState = isHardwarePlaying ? 'playing' : 'paused';
            }
          }
        }

        // PAUSE COUNTDOWN CATCH-UP: Re-evaluate deadline immediately upon screen wake
        if (isPauseCountdownRef.current && pauseDeadlineRef.current && checkPauseCountdownRef.current) {
          checkPauseCountdownRef.current();
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
      loadingTokenRef.current += 1;
      cancelLoadRef.current?.();
      monitorPlaybackRef.current = null;
      for (const el of [plainPlayerRef.current, finalPlayerRef.current, heartbeatRef.current]) {
        if (!el) continue;
        el.onplay = el.onpause = el.onplaying = el.onwaiting = null;
        el.oncanplay = el.onended = el.ontimeupdate = el.onerror = el.onseeked = null;
        el.pause();
        el.removeAttribute('src');
        el.load();
        el.remove();
      }
      mediaSourceRef.current?.disconnect();
      gainNodeRef.current?.disconnect();
      audioCtxRef.current?.close().catch(() => {});
      plainPlayerRef.current = finalPlayerRef.current = nativePlayerRef.current = heartbeatRef.current = null;
      audioCtxRef.current = null;
      mediaSourceRef.current = null;
      gainNodeRef.current = null;
      webAudioStateRef.current = 'off';
      if (activeBlobUrlRef.current) URL.revokeObjectURL(activeBlobUrlRef.current);
      activeBlobUrlRef.current = null;
      wakeLockRef.current?.release().catch(() => {});
      if (workerRef.current) {
        try { workerRef.current.terminate(); } catch {}
        workerRef.current = null;
      }
    };
  }, []);

  // ---------------------------------------------------------------------------
  // AD BREAK (free users): every AD_EVERY_TRACKS qualified tracks the music is
  // paused and the ad break is shown; after it closes the music resumes. The
  // counter survives reloads. A Final Mode program is never interrupted — the
  // break is held back until the program ends or the next normal track starts.
  // ---------------------------------------------------------------------------
  useEffect(() => {
    try {
      const saved = parseInt(localStorage.getItem(AD_COUNT_KEY) || '0', 10);
      if (Number.isFinite(saved) && saved > 0) {
        songsPlayedRef.current = Math.min(saved, AD_EVERY_TRACKS);
        setSongsPlayedCount(songsPlayedRef.current);
      }
    } catch { /* storage unavailable */ }
  }, []);

  const isInFinalSession = () => isFinalModeRef.current && sessionTracksRef.current.length > 0;

  const openAdBreak = () => {
    if (adOpenRef.current || isPremiumRef.current) return;
    pendingAdRef.current = false;
    adOpenRef.current = true;
    breakPausedRef.current = false;
    resumeAfterAdRef.current = false;
    // The sponsored strip does NOT stop the music (AdSense: an ad must never
    // block the site or make people wait). Music pauses only for our own
    // Premium popup that follows — see pauseForBreak().
    setIsAdModalOpen(true);
  };

  const pauseForBreak = useCallback(() => {
    if (!adOpenRef.current || breakPausedRef.current) return;
    breakPausedRef.current = true;
    const audio = nativePlayerRef.current;
    resumeAfterAdRef.current = !!audio && !audio.paused;
    if (audio && !audio.paused) audio.pause();
  }, []);

  const registerQualifiedTrack = () => {
    if (!AD_BREAK_ENABLED) return;
    songsPlayedRef.current += 1;
    if (songsPlayedRef.current >= AD_EVERY_TRACKS) {
      songsPlayedRef.current = 0;
      // Not now: the break opens when the user taps the NEXT track — that
      // track waits until the break is closed (see loadTrack).
      pendingAdRef.current = true;
    }
    setSongsPlayedCount(songsPlayedRef.current);
    try { localStorage.setItem(AD_COUNT_KEY, String(songsPlayedRef.current)); } catch { /* ignore */ }
  };

  const closeAdBreak = useCallback(() => {
    adOpenRef.current = false;
    breakPausedRef.current = false;
    setIsAdModalOpen(false);
    const audio = nativePlayerRef.current;
    if (resumeAfterAdRef.current && audio && audio.src) {
      resumeAfterAdRef.current = false;
      playAudioRef.current();
    }
    resumeAfterAdRef.current = false;
  }, []);

  const setAdModalOpen = useCallback((open: boolean) => {
    if (open) openAdBreak();
    else closeAdBreak();
  }, [closeAdBreak]);

  const playAudioRef = useRef<() => Promise<void> | void>(() => {});

  const loadTrack = async (track: any, isRetry = false, forceFinalMode?: boolean, opts?: LoadOptions) => {
    // opts.startAt: continue the same track from this position (used when the
    // output element has to be swapped mid-track — see setBpm).
    const startAt = opts?.startAt && opts.startAt > 0 ? opts.startAt : 0;
    // Final Mode is Premium-only. Checked here so every entry point is covered
    // (Finals page, album "Start Final" buttons, the full player's FINALS tab).
    if (forceFinalMode === true && !isPremiumRef.current) {
      setActiveMode(null);
      setSessionTracks([]);
      setIsSubscriptionModalOpen(true);
      return;
    }
    // If the same track is clicked and it's already loaded, toggle play/pause instead of reloading
    if (!isRetry && !opts?.fromRest && forceFinalMode !== true && !isFinalModeRef.current && trackIdRef.current === track.id && isLoaded) {
      togglePlay();
      return;
    }

    // This device's history, with the play time (orders it with the account's plays)
    if (track?.id) recordTrackPlayed(track.id);

    cancelLoadRef.current?.();
    const currentToken = ++loadingTokenRef.current;
    isPlayingRef.current = false;
    monitorPlaybackRef.current = null;
    restRunningRef.current = false;

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

      // AD BREAK ON TAP: after 5 tracks the next track the user picks does
      // not start yet — the sponsored strip shows (site stays visible), then
      // the Premium popup, and the picked track starts when it is closed.
      // Never inside a Final program (its dances advance on their own).
      if (pendingAdRef.current && !isInFinalSession() && !isPremiumRef.current && !isRetry && !startAt) {
        openAdBreak();
        breakPausedRef.current = true;   // hold this track's autoplay
        resumeAfterAdRef.current = true; // …and start it when the break closes
      }

      // Use native pitch-corrected playback. iOS alone needs a gain path for fades.
      const needsGainElement = isFinalModeRef.current && !isVolumeWritable() && !useNativeFinalDiagnostic();
      if (needsGainElement) {
        ensureFinalGraph();
        if (webAudioStateRef.current === 'ready' && finalPlayerRef.current) {
          if (plainPlayerRef.current && !plainPlayerRef.current.paused) plainPlayerRef.current.pause();
          nativePlayerRef.current = finalPlayerRef.current;
        } else if (plainPlayerRef.current) {
          nativePlayerRef.current = plainPlayerRef.current; // graph failed → fallback
        }
      } else if (plainPlayerRef.current) {
        // Normal mode: plain element keeps pristine native speed control
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
          if (!isPauseCountdownRef.current && !opts?.fromRest) {
            nativePlayerRef.current.pause();
          }
        }
        if (fadeIntervalRef.current) {
          clearInterval(fadeIntervalRef.current);
          fadeIntervalRef.current = null;
        }
        setIsPauseCountdown(false);
        isPauseCountdownRef.current = false;
        pauseDeadlineRef.current = 0;
        try { workerRef.current?.postMessage('stop'); } catch {}
        setPauseTime(15);
        pauseTimeRef.current = 15;
        finalEndHandledRef.current = false; // Allow end-handling for the new track
        finalsClockRef.current.reset(startAt, playbackRateFor(bpmRef.current),
          startAt ? Math.min(FINAL_DANCE_SECONDS - FINAL_FADE_SECONDS, startAt / playbackRateFor(bpmRef.current)) : 0);
        currentTrackQualifiedRef.current = false;
      };

      stopAndPrepare();
      if (startAt >= QUALIFY_SECONDS) currentTrackQualifiedRef.current = true; // same play, already counted

      if (activeBlobUrlRef.current) {
        URL.revokeObjectURL(activeBlobUrlRef.current);
        activeBlobUrlRef.current = null;
      }

      // INSTANT FEEDBACK: Update UI info immediately so the PlayerBar pops up right away
      setIsPlaying(false);
      setIsLoaded(false);
      setIsLoading(true);
      setError(null);
      // In a Final program currentTime is the SESSION clock. Resetting it to 0
      // here made the progress line jump back to the start for a moment at
      // every dance change (the tick timer then restored it). Keep it.
      const continuesFinalSession = isFinalModeRef.current
        && sessionTracksRef.current.length > 0
        && sessionIndexRef.current > 0;
      if (!continuesFinalSession) {
        setCurrentTime(0);
        currentTimeRef.current = 0;
      }
      setTrackCurrentTime(startAt);
      trackCurrentTimeRef.current = startAt;
      setTitle(track.title);
      setArtist(track.artist);
      setTrackId(track.id || null);
      setCurrentTrack(track);
      trackIdRef.current = track.id;
      playingTrackRef.current = track;

      let finalUrl = track.audioUrl;

      // 0. LOCAL OFFLINE STORAGE (IndexedDB) CHECK FIRST
      let isLocalAvailable = false;
      if (track.id) {
        try {
          const cachedBlob = await getAudioFile(track.id);
          if (currentToken !== loadingTokenRef.current) return;
          if (cachedBlob && cachedBlob.size > 0) {
            finalUrl = URL.createObjectURL(cachedBlob);
            activeBlobUrlRef.current = finalUrl;
            isLocalAvailable = true;
          }
        } catch (idbErr) {
          console.warn('[AUDIO-ENGINE] IndexedDB check failed:', idbErr);
        }
      }

      // 1. If not available offline, sign the Cloudflare R2 URL (cached)
      if (!isLocalAvailable && finalUrl) {
        finalUrl = await resolvePlaybackUrl(finalUrl);
      }
      if (currentToken !== loadingTokenRef.current) return; // a newer track was picked meanwhile

      if (!finalUrl) {
        throw new Error("Missing Audio Source (File not found in storage)");
      }

      const setupPlayer = (url: string) => {
        return new Promise<HTMLAudioElement>((resolve, reject) => {
          let timeout: ReturnType<typeof setTimeout>;
          const finish = (audio?: HTMLAudioElement, error?: Error) => {
            clearTimeout(timeout);
            if (cancelLoadRef.current === cancel) cancelLoadRef.current = null;
            if (error) reject(error); else if (audio) resolve(audio);
          };
          const cancel = () => finish(undefined, new Error('Loading cancelled by new request'));
          cancelLoadRef.current = cancel;
          timeout = setTimeout(() => finish(undefined, new Error('Audio loading timed out. Please try again.')), 30000);
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
          audio.loop = false;
          
          // RESET VOLUME: Ensure any previous fade-out is reversed (works on iOS via gain)
          cancelFadeAndRestore();

          // oncanplay fires again after every buffering stall / seek. Only the
          // first one belongs to loading; re-running it mid-song re-applied the
          // pitch settings and rate while playing (audible hiccup on Safari).
          let readyOnce = false;
          let recoveries = 0;

          audio.oncanplay = () => {
            if (currentToken !== loadingTokenRef.current) return;
            if (readyOnce) return;
            readyOnce = true;
            const realDuration = audio.duration || 0;
            setDuration(realDuration);
            setIsLoaded(true);
            setIsLoading(false);
            // SPEED PERSISTENCE FIX (real cause): audio.load() resets playbackRate
            // back to 1.0, so setting it before load() was always wiped. We re-apply
            // the user's chosen speed here, AFTER the resource has finished loading.
            const pitchOn = true;
            audio.preservesPitch = pitchOn;
            (audio as HTMLAudioElement & { webkitPreservesPitch?: boolean }).webkitPreservesPitch = pitchOn;
            const desiredRate = playbackRateFor(bpmRef.current);
            if (desiredRate > 0 && Math.abs(audio.playbackRate - desiredRate) > 0.001) {
              audio.playbackRate = desiredRate;
            }
            finish(audio);
          };

          audio.onerror = () => {
            if (currentToken !== loadingTokenRef.current) return;
            const err = audio.error;
            const isRemoteSource = url.startsWith('http');

            // MID-PLAYBACK RECOVERY: a network drop or an expired signed URL used
            // to kill the song ("music stops / won't play"). Re-sign and continue
            // from the same position instead (up to 3 times per track).
            if (readyOnce && isRemoteSource && recoveries < 3) {
              recoveries += 1;
              const resumeAt = audio.currentTime || trackCurrentTimeRef.current || 0;
              const wasPlaying = isPlayingRef.current;
              resolvePlaybackUrl(track.audioUrl, true).then((freshUrl) => {
                if (currentToken !== loadingTokenRef.current) return;
                const onMeta = () => {
                  audio.removeEventListener('loadedmetadata', onMeta);
                  if (currentToken !== loadingTokenRef.current) return;
                  try { audio.currentTime = resumeAt; } catch { /* ignore */ }
                  setMusicTempo(audio, bpmRef.current);
                  if (wasPlaying) audio.play().catch(() => {});
                };
                audio.addEventListener('loadedmetadata', onMeta);
                audio.src = freshUrl;
                audio.load();
              });
              return;
            }

            // FIRST-LOAD FAILURE: retry once with a freshly signed URL (the old
            // one may have expired or been served from a stale cache).
            if (!readyOnce && isRemoteSource && !isRetry) {
              const key = track.audioUrl ? getStorageKey(String(track.audioUrl)) : '';
              if (key) signedUrlCache.delete(key);
              loadTrackRef.current(track, true, isFinalModeRef.current);
              return;
            }

            let msg = `Stream error: ${track.title}`;
            if (err && (err.code === 3 || err.code === 4)) {
              msg = `Format Error: ${track.title} (.mpa / unsupported codec). Convert to MP3 and re-upload.`;
            }
            if (readyOnce) {
              // Was already playing — surface the error instead of a dead promise
              setError(msg);
              setIsPlaying(false);
              isPlayingRef.current = false;
            }
            finish(undefined, new Error(msg));
          };

          // Finals normally loop short recordings until their real-time slot ends.
          // Also recover if a browser emits ended despite native loop being set.
          audio.onended = () => {
            if (currentToken !== loadingTokenRef.current) return;

            if (isFinalModeRef.current) {
              // If pause was already triggered by ontimeupdate, do nothing
              if (isPauseCountdownRef.current) return;
              if (!isFitnessRef.current && finalsClockRef.current.sample(audio.currentTime, audio.duration) < FINAL_DANCE_SECONDS) {
                audio.currentTime = 0;
                audio.play().catch(() => setError('Tap Play to continue this dance.'));
                return;
              }
              // Guard: prevent this handler running twice for the same track
              if (finalEndHandledRef.current) return;
              finalEndHandledRef.current = true;

              // Fitness advances on natural completion; Finals uses the slot clock.
              const isSession = Boolean(activeModeRef.current || (sessionTracksRef.current && sessionTracksRef.current.length > 1));
              if (!isSession) {
                // Single-track Final: same as the 1:45 stop — rewind and wait
                audio.pause();
                setIsPlaying(false);
                isPlayingRef.current = false;
                audio.currentTime = 0;
                setCurrentTime(0);
                cancelFadeAndRestore();
                finalEndHandledRef.current = false;
                return;
              }
              advanceFinalSession();
            } else {
              if (!isRepeatRef.current) {
                // Repeat off → the next song of the same dance (Shuffle order when on)
                playNextRef.current();
              } else {
                audio.currentTime = 0;
                setCurrentTime(0);
                audio.play().catch(() => {});
              }
            }
          };

          // SYNC AUDIO LIFECYCLE WITH MEDIASESSION & LOCK-SCREEN CONTROLS
          audio.onplay = () => {
            if (currentToken !== loadingTokenRef.current) return;
            setIsPlaying(true);
            isPlayingRef.current = true;
            if ('mediaSession' in navigator) {
              navigator.mediaSession.playbackState = 'playing';
              const trackDur = audio.duration || duration || 0;
              if ((navigator.mediaSession as any).setPositionState && trackDur > 0) {
                try {
                  navigator.mediaSession.setPositionState({
                    duration: trackDur,
                    playbackRate: audio.playbackRate || 1.0,
                    position: Math.min(audio.currentTime, trackDur)
                  });
                } catch {}
              }
            }
          };

          audio.onplaying = () => {
            if (currentToken !== loadingTokenRef.current || isPauseCountdownRef.current) return;
            // loadTrack/autoadvance can call play() without playAudio(). Apply the
            // same cleanup there: the song now owns the audio session, so the
            // sub-millisecond silent looping heartbeat must not keep rendering.
            heartbeatRef.current?.pause();
            monitorPlaybackRef.current?.();
          };
          audio.onwaiting = () => {
            if (currentToken !== loadingTokenRef.current || isPauseCountdownRef.current) return;
            cancelFadeAndRestore();
          };
          audio.onpause = () => {
            if (currentToken !== loadingTokenRef.current || isPauseCountdownRef.current) return;
            finalsClockRef.current.sample(audio.currentTime, audio.duration);
            cancelFadeAndRestore();
            setIsPlaying(false);
            isPlayingRef.current = false;
            if ('mediaSession' in navigator) {
              navigator.mediaSession.playbackState = 'paused';
              const trackDur = audio.duration || duration || 0;
              if ((navigator.mediaSession as any).setPositionState && trackDur > 0) {
                try {
                  navigator.mediaSession.setPositionState({
                    duration: trackDur,
                    playbackRate: audio.playbackRate || 1.0,
                    position: Math.min(audio.currentTime, trackDur)
                  });
                } catch {}
              }
            }
          };

          audio.onseeked = () => {
            if (currentToken !== loadingTokenRef.current) return;
            if ('mediaSession' in navigator) {
              const trackDur = audio.duration || duration || 0;
              if ((navigator.mediaSession as any).setPositionState && trackDur > 0) {
                try {
                  navigator.mediaSession.setPositionState({
                    duration: trackDur,
                    playbackRate: audio.playbackRate || 1.0,
                    position: Math.min(audio.currentTime, trackDur)
                  });
                } catch {}
              }
            }
          };

          // ATTACH EVENT-DRIVEN MONITORING (Frame-accurate limit checks)
          const monitorPlayback = () => {
            if (currentToken !== loadingTokenRef.current) return;

            // In pause countdown (looping SILENT_WAV): drive pause countdown directly from audio clock
            if (isPauseCountdownRef.current) {
              if (checkPauseCountdownRef.current) {
                checkPauseCountdownRef.current();
              }
              return;
            }

            const currentTimeVal = audio.currentTime;

            // 0. 15-SECOND REAL PLAYBACK QUALIFICATION (FOR THE 5-TRACK AD BREAK)
            // isPremiumRef (not the closure value) so a login/subscription made
            // while a track is loaded is respected immediately.
            if (!isPremiumRef.current && !currentTrackQualifiedRef.current && currentTimeVal >= QUALIFY_SECONDS) {
              currentTrackQualifiedRef.current = true;
              registerQualifiedTrack();
            }
            
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
                const baseVol = volumeRef.current;
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
                stopRef.current();
                return;
              }
            }

            // 2. Fixed real-time dance slot. Tempo affects music, not the timer.
            if (isFinalModeRef.current && !isFitnessRef.current && isPlayingRef.current && !audio.seeking) {
              const elapsed = finalsClockRef.current.sample(audio.currentTime, audio.duration);
              const remaining = FINAL_DANCE_SECONDS - elapsed;
              const g = gainNodeRef.current;
              const ctx = audioCtxRef.current;
              if (remaining <= 0) {
                if (finalEndHandledRef.current) return;
                finalEndHandledRef.current = true;
                audio.pause();
                audio.onended = null;
                if (sessionTracksRef.current.length > 0) advanceFinalSession();
                else {
                  audio.currentTime = 0;
                  finalsClockRef.current.reset(0, playbackRateFor(bpmRef.current));
                  setCurrentTime(0);
                  setTrackCurrentTime(0);
                  currentTimeRef.current = trackCurrentTimeRef.current = 0;
                  finalEndHandledRef.current = false;
                  cancelFadeAndRestore();
                }
                return;
              }
              const ratio = Math.min(1, remaining / FINAL_FADE_SECONDS);
              if (isGainActive() && g && ctx && audio.readyState >= 3 && !audio.paused) {
                // Schedule ahead on the audio clock; re-arm after pause/stall.
                if (!fadeScheduledRef.current) {
                  const now = ctx.currentTime;
                  g.gain.cancelScheduledValues(now);
                  g.gain.setValueAtTime(volumeRef.current * ratio, now);
                  g.gain.setValueAtTime(volumeRef.current * ratio, now + Math.max(0, remaining - FINAL_FADE_SECONDS));
                  g.gain.linearRampToValueAtTime(0, now + remaining);
                  fadeScheduledRef.current = true;
                }
              } else if (!isGainActive()) {
                audio.volume = Math.max(0, volumeRef.current * ratio);
              }
            }
          };
          audio.ontimeupdate = monitorPlayback;
          monitorPlaybackRef.current = monitorPlayback;

          // NATIVE SPEED CONTROL: No bridge needed
          {
            const pitchOn = true;
            audio.preservesPitch = pitchOn;
            (audio as HTMLAudioElement & { webkitPreservesPitch?: boolean }).webkitPreservesPitch = pitchOn;
          }
          // SPEED PERSISTENCE FIX: use the live bpmRef (user-selected speed), NOT the
          // stale `bpm` closure value. Previously a new track could reset the rate,
          // so the speed the user picked was lost on every track change.
          setMusicTempo(audio, bpmRef.current);
          // Loop short recordings to fill 105 real seconds at the selected speed.
          // The slot clock, not the recording's natural end, advances Finals.
          audio.loop = (isFinalModeRef.current && !isFitnessRef.current) || (!isFinalModeRef.current && isRepeatRef.current);
          audio.src = url;
          audio.load();
        });
      };

      try {
        const audio = await setupPlayer(finalUrl);
        if (currentToken !== loadingTokenRef.current) return;
        if (startAt > 0) {
          try { audio.currentTime = startAt; } catch { /* ignore */ }
        }

        // CRITICAL: if the AudioContext is suspended, everything routed through
        // it is SILENT even though the element "plays". This was the likely
        // cause of "plays but no sound" — always resume before playing.
        if (audioCtxRef.current && audioCtxRef.current.state === 'suspended') {
          try { await audioCtxRef.current.resume(); } catch { /* ignore */ }
        }
        if (currentToken !== loadingTokenRef.current) return;
        if (opts?.paused) {
          // Element swap of a paused track: stay paused at the same spot
          setIsPlaying(false);
        } else if (breakPausedRef.current) {
          // Premium popup on screen: keep the track ready and start it when it closes
          resumeAfterAdRef.current = true;
          setIsPlaying(false);
        } else {
          playPromiseRef.current = audio.play();

          // Ensure heartbeat is paused when regular audio is playing
          if (heartbeatRef.current && !heartbeatRef.current.paused) {
            heartbeatRef.current.pause();
          }

          playPromiseRef.current.catch(() => {
            // Autoplay refused (e.g. no user gesture) — show the real state
            if (currentToken !== loadingTokenRef.current) return;
            setIsPlaying(false);
            isPlayingRef.current = false;
          }).finally(() => {
            playPromiseRef.current = null;
          });
          setIsPlaying(true);
        }
      } catch (e: any) {
        if (currentToken !== loadingTokenRef.current || e.message === "Loading cancelled by new request") return;
        setError(e.message || "File Unreachable");
        setIsLoaded(false);
        setIsLoading(false);
      }

      if (currentToken !== loadingTokenRef.current) return;

      // MEDIA SESSION SETUP
      if ('mediaSession' in navigator) {
        const coverPath = getTrackCover(track, albums);
        const absoluteCover = (typeof window !== 'undefined' && coverPath.startsWith('/')) 
          ? `${window.location.origin}${coverPath}` 
          : coverPath;

        navigator.mediaSession.metadata = new MediaMetadata({
          title: track.title,
          artist: track.artist || '4ANDONE Artist',
          album: track.album || '4and.one Music',
          artwork: [
            // One entry with the cover's real type (a .png cover was declared
            // as image/jpeg), then the app icon as a fallback.
            { src: absoluteCover, sizes: '512x512', type: /\.png($|\?)/i.test(coverPath) ? 'image/png' : 'image/jpeg' },
            { src: `${window.location.origin}/icons/icon-512x512.png`, sizes: '512x512', type: 'image/png' },
          ]
        });

        // ACTION HANDLERS: Crucial for background playback on iOS PWA & Lock-Screen
        navigator.mediaSession.setActionHandler('play', () => { playAudio(); });
        navigator.mediaSession.setActionHandler('pause', () => { pauseAudio(); });
        navigator.mediaSession.setActionHandler('previoustrack', () => { playPreviousRef.current(); });
        navigator.mediaSession.setActionHandler('nexttrack', () => { playNextRef.current(); });
        // No ±10s handlers: when they exist, iPhone's lock screen shows
        // "skip 10 seconds" instead of the Previous/Next track buttons.
        try {
          navigator.mediaSession.setActionHandler('seekbackward', null);
          navigator.mediaSession.setActionHandler('seekforward', null);
        } catch { /* not supported */ }

        // Seek handlers
        navigator.mediaSession.setActionHandler('seekto', (details) => {
          if (details?.seekTime !== undefined) {
            seek(details.seekTime);
          }
        });
      }

      // ANALYTICS: Log track play event (not for a mid-track element swap)
      if (!startAt) try {
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
        }).then(({ error }) => {
          if (error) {
            console.warn('[ANALYTICS] track_plays insert failed:', error.message);
            return;
          }

        });
      } catch (e) {
        console.warn('[ANALYTICS] track play logging error:', e);
      }

    } catch (err: any) {
      if (currentToken !== loadingTokenRef.current) return;
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
        monitorPlaybackRef.current?.();
        if (isPauseCountdownRef.current) {
          if (checkPauseCountdownRef.current) {
            checkPauseCountdownRef.current();
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
            // Duplicate-safe: prefer the tracked session index (same track can repeat)
            let currentIdx = sessionIndexRef.current;
            if (currentIdx < 0 || currentIdx >= sessionTracksRef.current.length ||
                sessionTracksRef.current[currentIdx]?.id !== trackIdRef.current) {
              currentIdx = sessionTracksRef.current.findIndex(t => t.id === trackIdRef.current || t.title === title);
            }
            // While the next dance is still loading, the element is paused at the
            // previous dance's end (1:45). Reading it then made the session line
            // jump forward and back ("grows, then shrinks") — skip those ticks.
            const staleElement = !isPauseCountdownRef.current && nativePlayerRef.current.paused;
            if (currentIdx !== -1 && staleElement) {
              // keep the last session time
            } else if (currentIdx !== -1) {
              const getLimitForTrack = (track: Track) => finalLimitFor(track, isFitnessRef.current);

              let sessionElapsed = 0;
              for (let i = 0; i < currentIdx; i++) {
                const trackLimit = getLimitForTrack(sessionTracksRef.current[i]);
                sessionElapsed += trackLimit + (isFitnessRef.current ? 0 : 15);
              }

              const currentTrackLimit = getLimitForTrack(sessionTracksRef.current[currentIdx]);
              sessionElapsed += isPauseCountdownRef.current
                ? (currentTrackLimit + (15 - pauseTimeRef.current))
                : Math.min(isFitnessRef.current ? currentTimeVal : finalsClockRef.current.elapsed, currentTrackLimit); // never past this dance's slot

              const safeSessionElapsed = Number.isFinite(sessionElapsed) ? Math.max(0, sessionElapsed) : 0;
              if (Math.abs((currentTimeRef.current ?? -1) - safeSessionElapsed) >= 0.2) {
                currentTimeRef.current = safeSessionElapsed;
                setCurrentTime(safeSessionElapsed);
              }
            } else if (Math.abs(currentTimeRef.current - finalsClockRef.current.elapsed) >= 0.2) {
              currentTimeRef.current = finalsClockRef.current.elapsed;
              setCurrentTime(finalsClockRef.current.elapsed);
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
              const rawDurationVal = nativePlayerRef.current?.duration || 0;
              const safeDuration = Number.isFinite(rawDurationVal) && rawDurationVal > 0 ? rawDurationVal : 0;
              
              const rawPositionVal = currentTimeVal;
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

  const playAudio = React.useCallback(async () => {
    // Resume the same silent file and the saved remaining rest time.
    if (isPauseCountdownRef.current) {
      restRunningRef.current = true;
      isPlayingRef.current = true;
      setIsPlaying(true);
      pauseDeadlineRef.current = Date.now() + pauseTimeRef.current * 1000;
      const rest = nativePlayerRef.current;
      if (rest && !rest.ended) {
        setMusicTempo(rest, 100);
        try { await audioCtxRef.current?.resume(); await rest.play(); }
        catch { restRunningRef.current = false; isPlayingRef.current = false; setIsPlaying(false); }
      }
      try { workerRef.current?.postMessage('start'); } catch {}
      if ('mediaSession' in navigator) navigator.mediaSession.playbackState = isPlayingRef.current ? 'playing' : 'paused';
      return;
    }

    const audio = nativePlayerRef.current;
    if (!audio) return;
    try {
      // iOS 15+: declare this page as a dedicated playback app so the OS
      // treats it like a music player and does NOT auto-pause on lock-screen.
      if ('audioSession' in navigator) {
        try { (navigator as any).audioSession.type = 'playback'; } catch {}
      }

      if (audioCtxRef.current && audioCtxRef.current.state === 'suspended') {
        try { await audioCtxRef.current.resume(); } catch {}
      }

      // If the heartbeat (session-keeper) is paused, restart it briefly so iOS
      // re-opens the audio session before we try to play the main audio.
      // Without this, calling audio.play() into a released session produces silence.
      if (heartbeatRef.current && heartbeatRef.current.paused) {
        try { await heartbeatRef.current.play(); } catch {}
      }

      if (audio.ended || (duration > 0 && audio.currentTime >= duration)) {
        audio.currentTime = 0;
      }

      // CRITICAL FIX: set playbackState = 'playing' SYNCHRONOUSLY — before
      // awaiting the play promise. iOS/Android OS expects the mediaSession state
      // to be confirmed synchronously inside the action handler. If we update it
      // only after await, the OS treats the command as rejected and immediately
      // sends a 'pause' action back, causing the lockscreen auto-pause.
      if ('mediaSession' in navigator) {
        navigator.mediaSession.playbackState = 'playing';
      }
      setIsPlaying(true);
      isPlayingRef.current = true;

      playPromiseRef.current = audio.play();
      await playPromiseRef.current;

      // Main audio is now running — pause the heartbeat so it doesn't
      // waste CPU/battery. The main element now holds the iOS audio session.
      if (heartbeatRef.current && !heartbeatRef.current.paused) {
        heartbeatRef.current.pause();
      }

      if ('mediaSession' in navigator) {
        navigator.mediaSession.playbackState = 'playing'; // confirm again after resolved
        const trackDur = audio.duration || duration || 0;
        if ((navigator.mediaSession as any).setPositionState && trackDur > 0) {
          try {
            navigator.mediaSession.setPositionState({
              duration: trackDur,
              playbackRate: audio.playbackRate || 1.0,
              position: Math.min(audio.currentTime, trackDur)
            });
          } catch {}
        }
      }

      if ('wakeLock' in navigator) {
        (navigator as any).wakeLock.request('screen').then((lock: any) => {
          wakeLockRef.current = lock;
        }).catch(() => {});
      }
      notifyOtherTabs();
    } catch (err) {
      // If play() was rejected (e.g. browser policy), roll back the optimistic state
      setIsPlaying(false);
      isPlayingRef.current = false;
      if ('mediaSession' in navigator) {
        navigator.mediaSession.playbackState = 'paused';
      }
      console.warn('[AUDIO-ENGINE] playAudio failed:', err);
    } finally {
      playPromiseRef.current = null;
    }
  }, [duration]);

  const pauseAudio = React.useCallback(() => {
    if (nativePlayerRef.current) {
      nativePlayerRef.current.pause();
    }
    // Pause during Final Mode rest: save remaining wall-clock time
    if (isPauseCountdownRef.current) {
      if (pauseDeadlineRef.current) {
        const remaining = Math.max(0, (pauseDeadlineRef.current - Date.now()) / 1000);
        pauseTimeRef.current = remaining;
        pauseDeadlineRef.current = 0;
      }
      restRunningRef.current = false;
      try { workerRef.current?.postMessage('stop'); } catch {}
    }
    // NOTE: heartbeat is intentionally NOT paused here. The silent looping WAV
    // must keep running while the main audio is paused so that iOS does not
    // release the audio session. If both are paused, the OS drops the session
    // and the next lockscreen Play produces silence.
    if (wakeLockRef.current) {
      wakeLockRef.current.release().then(() => { wakeLockRef.current = null; }).catch(() => {});
    }
    setIsPlaying(false);
    isPlayingRef.current = false;

    if ('mediaSession' in navigator) {
      navigator.mediaSession.playbackState = 'paused';
      const trackDur = nativePlayerRef.current?.duration || duration || 0;
      if ((navigator.mediaSession as any).setPositionState && trackDur > 0 && nativePlayerRef.current) {
        try {
          navigator.mediaSession.setPositionState({
            duration: trackDur,
            playbackRate: nativePlayerRef.current.playbackRate || 1.0,
            position: Math.min(nativePlayerRef.current.currentTime, trackDur)
          });
        } catch {}
      }
    }
  }, [duration]);

  const togglePlay = React.useCallback(async () => {
    if (!isLoaded) return;
    if (isPlayingRef.current) {
      pauseAudio();
    } else {
      await playAudio();
    }
  }, [isLoaded, playAudio, pauseAudio]);

  const setBpm = React.useCallback((newBpm: number, persistent = true) => {
    const rate = playbackRateFor(newBpm);
    const audio = nativePlayerRef.current;
    if (audio && !isPauseCountdownRef.current) {
      finalsClockRef.current.changeRate(audio.currentTime, audio.duration, rate);
      setMusicTempo(audio, rate * 100);
    }
    // Sync immediately, even during slider drag: the next track must use it.
    bpmRef.current = rate * 100;
    if (persistent) {
      setBpmState(rate * 100);
      try { localStorage.setItem('4andone-bpm', String(rate * 100)); } catch {}
    }
  }, []);

  const seek = React.useCallback((time: number) => {
    // Finals exposes a session timeline, not a seekable track timeline.
    if (isFinalModeRef.current || isPauseCountdownRef.current || !Number.isFinite(time)) return;
    if (nativePlayerRef.current) {
      const trackDur = duration || nativePlayerRef.current.duration || 0;
      const safeTime = Math.max(0, Math.min(time, trackDur || 999999));
      const wasPlaying = isPlayingRef.current;
      nativePlayerRef.current.currentTime = safeTime;
      setCurrentTime(safeTime);
      currentTimeRef.current = safeTime;

      if ('mediaSession' in navigator && (navigator.mediaSession as any).setPositionState && trackDur > 0) {
        try {
          navigator.mediaSession.setPositionState({
            duration: trackDur,
            playbackRate: nativePlayerRef.current.playbackRate || 1.0,
            position: safeTime
          });
        } catch {}
      }

      if (wasPlaying && nativePlayerRef.current.paused) {
        playPromiseRef.current = nativePlayerRef.current.play();
        playPromiseRef.current.catch(() => {}).finally(() => { playPromiseRef.current = null; });
      }
    }
  }, [duration]);

  const seekRelative = React.useCallback((seconds: number) => {
    const audio = nativePlayerRef.current;
    if (!audio) return;
    const trackDur = audio.duration || duration || 0;
    const cur = audio.currentTime || currentTimeRef.current || 0;
    const target = Math.max(0, trackDur > 0 ? Math.min(cur + seconds, trackDur) : cur + seconds);
    seek(target);
  }, [duration, seek]);

  const setVolume = React.useCallback((v: number) => {
    v = Number.isFinite(v) ? Math.max(0, Math.min(1, v)) : 1;
    volumeRef.current = v;
    setVolumeState(v);
    localStorage.setItem('4andone-volume', v.toString());
    // Route through the gain chain so the slider also works on iOS.
    applyVolume(v);
  }, []);

  const savePlayOrder = () => {
    try {
      localStorage.setItem('4andone_play_order', JSON.stringify({ repeat: isRepeatRef.current, shuffleSeed: shuffleSeedRef.current }));
    } catch { /* ignore */ }
  };
  const toggleRepeat = React.useCallback(() => {
    const next = !isRepeatRef.current;
    isRepeatRef.current = next;
    setIsRepeat(next);
    // Takes effect on the playing song right away (Final keeps its own ending)
    const audio = nativePlayerRef.current;
    if (audio && !isFinalModeRef.current) audio.loop = next;
    savePlayOrder();
  }, []);
  const toggleShuffle = React.useCallback(() => {
    const next = shuffleSeedRef.current === null ? Math.floor(Math.random() * 2 ** 31) + 1 : null;
    shuffleSeedRef.current = next;
    setShuffleSeed(next);
    savePlayOrder();
  }, []);
  const toggleFinalMode = React.useCallback(() => {
    if (!isPremiumRef.current) {
      setIsSubscriptionModalOpen(true);
      return;
    }
    const nextVal = !isFinalModeRef.current;
    isFinalModeRef.current = nextVal;
    setIsFinalMode(nextVal);
    // A new Final run on this track may end again (the guard stayed set after
    // the previous 1:45 stop, so the next play ran past 1:45 — "wrong timing").
    finalEndHandledRef.current = false;

    const audio = nativePlayerRef.current;
    if (audio) audio.loop = nextVal || isRepeatRef.current;
    finalsClockRef.current.reset(audio?.currentTime || 0, playbackRateFor(bpmRef.current),
      nextVal ? Math.min(FINAL_DANCE_SECONDS - FINAL_FADE_SECONDS, (audio?.currentTime || 0) / playbackRateFor(bpmRef.current)) : 0);
    cancelFadeAndRestore();

    // iOS needs the gain path for fades; desktop keeps the native element.
    const track = playingTrackRef.current;
    if (audio && track && audio.src && !isPauseCountdownRef.current) {
      const wantGain = nextVal && !isVolumeWritable() && !useNativeFinalDiagnostic();
      const onGain = audio === finalPlayerRef.current;
      if (wantGain !== onGain) {
        loadTrackRef.current(track, true, nextVal, { startAt: audio.currentTime || 0, paused: audio.paused });
      }
    }
  }, []);

  // Normal mode: Next/Previous stay in the current dance (all albums) —
  // the same list the full player shows under UP NEXT.
  // Shuffle on → the same queue in Shuffle's fixed order (what STYLE shows).
  const playNext = React.useCallback(() => {
    const list = isFinalModeRef.current ? sessionTracksRef.current : playOrder(tracks, playingTrackRef.current, shuffleSeedRef.current);
    if (list.length === 0) return;

    let nextIndex = 0;
    if (isFinalModeRef.current && sessionTracksRef.current.length > 0) {
      let cur = sessionIndexRef.current;
      if (cur < 0 || cur >= list.length || list[cur]?.id !== trackIdRef.current) {
        cur = list.findIndex(t => t.id === trackIdRef.current);
      }
      if (cur !== -1 && cur < list.length - 1) {
        nextIndex = cur + 1;
      } else {
        stopRef.current();
        return;
      }
    } else {
      const currentIndex = list.findIndex(t => t.id === trackIdRef.current || t.title === playingTrackRef.current?.title);
      nextIndex = (currentIndex + 1) % list.length;
    }
    if (isFinalModeRef.current) sessionIndexRef.current = nextIndex;
    loadTrackRef.current(list[nextIndex], isFinalModeRef.current, isFinalModeRef.current);
  }, [tracks]);

  const playPrevious = React.useCallback(() => {
    const list = isFinalModeRef.current ? sessionTracksRef.current : playOrder(tracks, playingTrackRef.current, shuffleSeedRef.current);
    if (list.length === 0) return;

    const currentIndex = isFinalModeRef.current ? sessionIndexRef.current : list.findIndex(t => t.id === trackIdRef.current || t.title === playingTrackRef.current?.title);
    const prevIndex = currentIndex <= 0 ? list.length - 1 : currentIndex - 1;
    if (isFinalModeRef.current) sessionIndexRef.current = prevIndex;
    loadTrackRef.current(list[prevIndex], isFinalModeRef.current, isFinalModeRef.current);
  }, [tracks]);

  const stop = React.useCallback(() => {
    cancelLoadRef.current?.();
    monitorPlaybackRef.current = null;
    restRunningRef.current = false;
    finalsClockRef.current.reset();
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
        nativePlayerRef.current.oncanplay = null;
        nativePlayerRef.current.onplaying = null;
        nativePlayerRef.current.onwaiting = null;
        nativePlayerRef.current.onseeked = null;
        nativePlayerRef.current.src = "";
        nativePlayerRef.current.removeAttribute('src');
    }
    if (fadeIntervalRef.current) {
      clearInterval(fadeIntervalRef.current);
      fadeIntervalRef.current = null;
    }
    if (heartbeatRef.current) heartbeatRef.current.pause();
    if (activeBlobUrlRef.current) URL.revokeObjectURL(activeBlobUrlRef.current);
    activeBlobUrlRef.current = null;
    wakeLockRef.current?.release().catch(() => {});
    try { workerRef.current?.postMessage('stop'); } catch {}
    setIsPlaying(false);
    isPlayingRef.current = false;
    setCurrentTime(0);
    setTrackCurrentTime(0);
    currentTimeRef.current = 0;
    trackCurrentTimeRef.current = 0;
    setDuration(0);
    setIsLoaded(false);
    setIsLoading(false);
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
    setTrackId(null);
    setCurrentTrack(null);
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
    playNextRef.current = playNext;
    playPreviousRef.current = playPrevious;
    playAudioRef.current = playAudio;
  });

  // REGISTER MEDIA SESSION ACTIONS
  useEffect(() => {
    if ('mediaSession' in navigator) {
      navigator.mediaSession.setActionHandler('play', () => playAudio());
      navigator.mediaSession.setActionHandler('pause', () => pauseAudio());
      // Previous/Next track on the lock screen (no ±10s handlers — see loadTrack)
      try {
        navigator.mediaSession.setActionHandler('seekbackward', null);
        navigator.mediaSession.setActionHandler('seekforward', null);
      } catch { /* not supported */ }
      navigator.mediaSession.setActionHandler('previoustrack', () => playPreviousRef.current());
      navigator.mediaSession.setActionHandler('nexttrack', () => playNextRef.current());
      navigator.mediaSession.setActionHandler('seekto', (details) => {
        if (details.seekTime !== undefined) {
          seek(details.seekTime);
        }
      });
    }
    return () => {
      if (!('mediaSession' in navigator)) return;
      for (const action of ['play', 'pause', 'previoustrack', 'nexttrack', 'seekto'] as const) {
        try { navigator.mediaSession.setActionHandler(action, null); } catch { /* unsupported */ }
      }
    };
  }, [playAudio, pauseAudio, seek]);

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

  // Stable entry point: loadTrack itself is re-created every render.
  const loadTrackStable = useCallback(
    (track: any, isRetry?: boolean, forceFinalMode?: boolean) => loadTrackRef.current(track, isRetry, forceFinalMode),
    []
  );

  const controlsValue = useMemo<AudioControlsType>(() => ({
    isPlaying,
    isLoaded,
    bpm,
    isFinalMode,
    duration,
    title,
    artist,
    trackId,
    currentTrack,
    error,
    volume,
    isRepeat,
    isShuffle,
    shuffleSeed,
    isLoading,
    isPauseCountdown,
    isFitness,
    togglePlay,
    loadTrack: loadTrackStable,
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
    activeMode,
    setActiveMode,
    sessionTracks,
    setSessionTracks,
    fitnessTargetTime,
    setFitnessTargetTime,
    isAdModalOpen,
    setIsAdModalOpen: setAdModalOpen,
    pauseForBreak,
    songsPlayedCount
  }), [
    isPlaying, isLoaded, bpm, isFinalMode, duration, title, artist, trackId, currentTrack,
    error, volume, isRepeat, isShuffle, shuffleSeed, isLoading, isPauseCountdown, isFitness, togglePlay,
    loadTrackStable, setBpm, setVolume, toggleRepeat, toggleShuffle, toggleFinalMode, seek,
    seekRelative, playNext, playPrevious, stop, activeMode, sessionTracks, fitnessTargetTime,
    isAdModalOpen, setAdModalOpen, pauseForBreak, songsPlayedCount
  ]);

  const timeValue = useMemo<AudioTimeType>(() => ({
    currentTime,
    trackCurrentTime,
    pauseTime,
    sessionDuration
  }), [currentTime, trackCurrentTime, pauseTime, sessionDuration]);

  return (
    <PlayerContext.Provider value={controlsValue}>
      <PlayerTimeContext.Provider value={timeValue}>
        {children}
        {showIosAudioTest && <IosFinalAudioTestBadge audio={nativePlayerRef.current}
          gainActive={isGainActive()} finalMode={isFinalMode} rest={isPauseCountdown} />}
      </PlayerTimeContext.Provider>
    </PlayerContext.Provider>
  );
};

/** Everything except the playback clock — use this when the component does not display time. */
export const useAudioControls = () => {
  const context = useContext(PlayerContext);
  if (!context) throw new Error('useAudioControls must be used within AudioProvider');
  return context;
};

/** Full player state including the playback clock (re-renders on every progress tick). */
export const useAudio = (): AudioContextType => {
  const context = useContext(PlayerContext);
  const time = useContext(PlayerTimeContext);
  if (!context || !time) throw new Error('useAudio must be used within AudioProvider');
  return { ...context, ...time };
};
