// @vitest-environment jsdom
import React, { act } from 'react';
import { createRoot, Root } from 'react-dom/client';
import { beforeEach, afterEach, describe, it, expect, vi } from 'vitest';
vi.mock('@/utils/storage', () => ({ getAudioFile: async () => null }));
vi.mock('@/utils/history', () => ({ recordTrackPlayed: vi.fn() }));
vi.mock('@/utils/trackCover', () => ({ getTrackCover: () => '/cover.png' }));
vi.mock('@/components/admin/StudioProvider', () => ({ useStudio: () => ({ tracks: [], finalTracks: [], albums: [] }) }));
vi.mock('@/context/AuthContext', () => ({ useAuth: () => ({ user: null, isPremium: true, setIsSubscriptionModalOpen: vi.fn() }) }));
vi.mock('@/utils/supabase', () => ({ supabase: { from: () => ({ insert: async () => ({ error: null }) }) } }));
import { AudioProvider, useAudio } from '../src/components/audio/AudioProvider';
let api: ReturnType<typeof useAudio>;
let root: Root;
let elements: HTMLAudioElement[];
let states: Map<HTMLAudioElement, { time: number; paused: boolean }>;
function Probe() { api = useAudio(); return null; }
const track = (id: string, style = 'Samba') => ({ id, title: id, artist: 'Test', style, audioUrl: '/test.mp3', duration: 180, bpm: 100 });
const flush = async () => { await act(async () => { await Promise.resolve(); await Promise.resolve(); }); };
const active = () => elements.find(e => e.src.endsWith('/test.mp3') || e.src.endsWith('/audio/rest-15s.mp3'))!;
async function tick(seconds: number) {
  for (let ms = 0; ms < Math.round(seconds * 1000); ms += 100) {
    const step = Math.min(100, Math.round(seconds * 1000) - ms);
    await act(async () => {
      const audio = active();
      if (audio) { const state = states.get(audio)!; if (!state.paused) state.time = (state.time + step / 1000 * audio.playbackRate) % audio.duration; }
      vi.advanceTimersByTime(step);
      await Promise.resolve(); await Promise.resolve();
    });
  }
  await flush();
}
beforeEach(async () => {
  vi.useFakeTimers(); elements = []; states = new Map(); localStorage.clear();
  (globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;
  URL.createObjectURL = vi.fn(() => 'blob:test'); URL.revokeObjectURL = vi.fn();
  vi.stubGlobal('Worker', class { postMessage() {} terminate() {} onmessage = null; });
  vi.stubGlobal('BroadcastChannel', class { postMessage() {} close() {} onmessage = null; });
  vi.stubGlobal('Audio', function Audio(src?: string) {
    const audio = document.createElement('audio'); const state = { time: 0, paused: true }; states.set(audio, state);
    Object.defineProperties(audio, {
      preservesPitch: { value: true, writable: true },
      currentTime: { get: () => state.time, set: v => { state.time = v; } },
      duration: { get: () => audio.src.includes('rest-15s') ? 15 : 180 },
      paused: { get: () => state.paused }, ended: { get: () => false }, readyState: { get: () => 4 },
    });
    audio.play = vi.fn(async () => { state.paused = false; audio.dispatchEvent(new Event('play')); audio.dispatchEvent(new Event('playing')); });
    audio.pause = vi.fn(() => { if (!state.paused) { state.paused = true; audio.dispatchEvent(new Event('pause')); } });
    audio.load = vi.fn(() => { state.time = 0; audio.playbackRate = audio.defaultPlaybackRate; queueMicrotask(() => audio.dispatchEvent(new Event('canplay'))); });
    if (src) audio.src = src;
    elements.push(audio); return audio;
  });
  const div = document.createElement('div'); document.body.appendChild(div); root = createRoot(div);
  await act(async () => { root.render(<AudioProvider><Probe /></AudioProvider>); });
});
afterEach(async () => { await act(async () => root.unmount()); document.body.innerHTML = ''; vi.useRealTimers(); vi.unstubAllGlobals(); });
describe('AudioProvider complete Finals flow', () => {
  it('plays 105 seconds at 80%, fades, rests at 100%, then plays a duplicate track', async () => {
    const song = track('same');
    await act(async () => { api.setBpm(80); api.setSessionTracks([song, song] as any); api.loadTrack(song, false, true); });
    await flush();
    expect(api.sessionDuration).toBe(225);
    expect(active().preservesPitch).toBe(true);
    expect(active().playbackRate).toBe(.8);
    await tick(102); await tick(1.5);
    expect(active().volume).toBeCloseTo(.5);
    await tick(1.5);
    expect(api.isPauseCountdown).toBe(true);
    expect(active().src).toContain('rest-15s.mp3');
    expect(active().playbackRate).toBe(1);
    await tick(15);
    expect(api.isPauseCountdown).toBe(false);
    expect(api.isPlaying).toBe(true);
    expect(active().src).toContain('test.mp3');
    expect(active().playbackRate).toBe(.8);
    await tick(105);
    expect(api.isFinalMode).toBe(false);
    expect(api.isPlaying).toBe(false);
    expect(api.title).toBe('No Track Selected');
  });
  it('freezes rest on pause, resumes remaining 10 seconds and isolates speed changes', async () => {
    await act(async () => { api.setSessionTracks([track('a'), track('b')] as any); api.loadTrack(track('a'), false, true); }); await flush();
    await tick(105); await tick(5);
    await act(async () => { await api.togglePlay(); api.setBpm(120, false); });
    await tick(20);
    expect(api.pauseTime).toBe(10);
    expect(active().playbackRate).toBe(1);
    await act(async () => { await api.togglePlay(); });
    await tick(10);
    expect(api.title).toBe('b');
    expect(active().playbackRate).toBe(1.2);
  });
  it('uses the same duration for Viennese Waltz and Paso and cleans up media', async () => {
    await act(async () => { api.setSessionTracks([track('a', 'Viennese Waltz'), track('b', 'Paso Doble')] as any); api.loadTrack(track('a', 'Viennese Waltz'), false, true); }); await flush();
    await tick(85); expect(api.isPauseCountdown).toBe(false);
    await tick(20); expect(api.isPauseCountdown).toBe(true);
    await act(async () => api.stop());
    expect(api.isPlaying).toBe(false);
    expect(active()).toBeUndefined();
  });
});

describe('iOS gain-path regression', () => {
  it('keeps pitch correction while scheduling the fade and closing the context', async () => {
    const ua = vi.spyOn(navigator, 'userAgent', 'get').mockReturnValue('Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X)');
    const gain = { value: 1, cancelScheduledValues: vi.fn(), setValueAtTime: vi.fn(), setTargetAtTime: vi.fn(), linearRampToValueAtTime: vi.fn() };
    const node = { gain, connect: vi.fn(), disconnect: vi.fn() };
    const close = vi.fn(async () => {});
    const context = { state: 'running', currentTime: 0, destination: {}, createGain: () => node,
      createMediaElementSource: () => ({ connect: vi.fn(), disconnect: vi.fn() }), resume: vi.fn(async () => {}), close };
    vi.stubGlobal('AudioContext', function () { return context; });
    try {
      await act(async () => { api.setBpm(95); api.setSessionTracks([track('ios'), track('next')] as any); api.loadTrack(track('ios'), false, true); });
      await flush(); await tick(.1);
      expect(active().preservesPitch).toBe(true);
      expect(active().playbackRate).toBe(.95);
      expect(gain.linearRampToValueAtTime).toHaveBeenCalledWith(0, expect.any(Number));
      await tick(104.9);
      expect(api.isPauseCountdown).toBe(true);
      expect(active().playbackRate).toBe(1);
      await tick(15);
      expect(api.title).toBe('next');
      expect(active().playbackRate).toBe(.95);
      await act(async () => root.unmount());
      expect(close).toHaveBeenCalledTimes(1);
    } finally { ua.mockRestore(); }
  });
});


describe('iOS native Finals test entry and media cleanup', () => {
  it('retains native routing after navigation and displays the actual audio route', async () => {
    const ua = vi.spyOn(navigator, 'userAgent', 'get').mockReturnValue('Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X)');
    const createContext = vi.fn();
    vi.stubGlobal('AudioContext', createContext);
    try {
      window.history.replaceState(null, '', '/?iosFinalNative=1');
      await act(async () => { root.render(<AudioProvider key="ios-native-test"><Probe /></AudioProvider>); });
      window.history.pushState(null, '', '/library/finals');
      await act(async () => { api.setBpm(95); api.setSessionTracks([track('native')] as any); api.loadTrack(track('native'), false, true); });
      await flush();
      expect(createContext).not.toHaveBeenCalled();
      expect(active().playbackRate).toBe(.95);
      expect(active().preservesPitch).toBe(true);
      const badge = document.querySelector('[data-testid="ios-finals-audio-test"]');
      expect(badge?.getAttribute('data-audio-route')).toBe('NATIVE');
      expect(badge?.textContent).toContain('FINALS');
      expect(badge?.textContent).toContain('95%');
    } finally {
      window.history.replaceState(null, '', '/');
      ua.mockRestore();
    }
  });
  it('stops the heartbeat when a track is automatically started', async () => {
    await act(async () => { document.dispatchEvent(new Event('mousedown')); });
    const heartbeat = elements.find(e => e.src.startsWith('data:audio/wav'))!;
    expect(heartbeat.paused).toBe(false);
    await act(async () => { api.loadTrack(track('auto'), false, true); });
    await flush();
    expect(active().paused).toBe(false);
    expect(heartbeat.paused).toBe(true);
  });
});
