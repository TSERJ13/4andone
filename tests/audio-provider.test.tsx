// @vitest-environment jsdom
import React, { act } from 'react';
import { createRoot, Root } from 'react-dom/client';
import { beforeEach, afterEach, describe, it, expect, vi } from 'vitest';
const renderState = vi.hoisted(() => ({ duration: 105, fail: false, requests: [] as any[], gate: null as Promise<void> | null }));
vi.mock('@/utils/renderFinalAudio', async (original) => {
  const actual = await original<typeof import('../src/utils/renderFinalAudio')>();
  return { ...actual, renderFinalAudio: vi.fn(async (request) => {
    renderState.requests.push(request);
    if (renderState.gate) await renderState.gate;
    if (renderState.fail) throw new Error('Test rendering failure');
    renderState.duration = 105 - (request.elapsedStart ?? 0);
    return { blob: new Blob(['test'], { type: 'audio/wav' }), percent: request.percent,
      sourceStart: request.sourceStart ?? 0, sourceDuration: 180,
      elapsedStart: request.elapsedStart ?? 0, duration: renderState.duration };
  }) };
});
const liveState = vi.hoisted(() => ({ calls: [] as string[], engines: 0 }));
vi.mock('@/utils/finalsLiveEngine', async (original) => {
  const actual = await original<typeof import('../src/utils/finalsLiveEngine')>();
  class FakeEngine {
    ctx: any; running = false; duration = 180; constructor(ctx: any) { this.ctx = ctx; liveState.engines++; }
    get sourceDuration() { return this.duration; } get isRunning() { return this.running; } get ready() { return true; }
    async decodeAndLoad(_u: string, key: string) { liveState.calls.push('load ' + key); }
    async start(o: any) { this.running = true; liveState.calls.push(`start ${o.percent} @${o.sourceStart} slot ${Math.round(o.slotSeconds)}`); return 0; }
    setRate(p: number) { if (this.running) liveState.calls.push('rate ' + p); return Promise.resolve(); }
    async pause() { if (this.running) { this.running = false; liveState.calls.push('pause'); } }
    async resume(slot: number) { if (!this.running) { this.running = true; liveState.calls.push('resume ' + Math.round(slot)); } }
    setVolume() {} stop() { this.running = false; liveState.calls.push('stop'); } dispose() {}
  }
  return { ...actual, FinalsLiveEngine: FakeEngine };
});
vi.mock('@/utils/storage', () => ({ getAudioFile: async () => null }));
vi.mock('@/utils/history', () => ({ recordTrackPlayed: vi.fn() }));
vi.mock('@/utils/trackCover', () => ({ getTrackCover: () => '/cover.png' }));
vi.mock('@/components/admin/StudioProvider', () => ({ useStudio: () => ({ tracks: [], finalTracks: [], albums: [] }) }));
vi.mock('@/context/AuthContext', () => ({ useAuth: () => ({ user: null, isPremium: true, setIsSubscriptionModalOpen: vi.fn() }) }));
vi.mock('@/utils/supabase', () => ({ supabase: { from: () => ({ insert: async () => ({ error: null }) }) } }));
import { rolloutState } from '../src/utils/renderedFinalTest';
import { AudioProvider, useAudio } from '../src/components/audio/AudioProvider';
let api: ReturnType<typeof useAudio>;
let root: Root;
let elements: HTMLAudioElement[];
let states: Map<HTMLAudioElement, { time: number; paused: boolean }>;
function Probe() { api = useAudio(); return null; }
const track = (id: string, style = 'Samba') => ({ id, title: id, artist: 'Test', style, audioUrl: '/test.mp3', duration: 180, bpm: 100 });
const flush = async () => { await act(async () => { await Promise.resolve(); await Promise.resolve(); }); };
const active = () => elements.find(e => e.src.endsWith('/test.mp3') || e.src.endsWith('/audio/rest-15s.mp3') || e.src === 'blob:rendered-final')!;
async function tick(seconds: number) {
  for (let ms = 0; ms < Math.round(seconds * 1000); ms += 100) {
    const step = Math.min(100, Math.round(seconds * 1000) - ms);
    await act(async () => {
      for (const audio of elements) { const state = states.get(audio)!; if (!state.paused && audio.src) state.time = (state.time + step / 1000 * audio.playbackRate) % audio.duration; }
      vi.advanceTimersByTime(step);
      await Promise.resolve(); await Promise.resolve();
    });
  }
  await flush();
}
beforeEach(async () => {
  vi.useFakeTimers(); elements = []; states = new Map(); localStorage.clear();
  window.history.replaceState(null, '', '/');
  renderState.duration = 105; renderState.fail = false; renderState.requests = []; renderState.gate = null; liveState.calls = []; liveState.engines = 0;
  (globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;
  URL.createObjectURL = vi.fn((blob: Blob) => blob.type === 'audio/wav' ? 'blob:rendered-final' : 'blob:test'); URL.revokeObjectURL = vi.fn();
  vi.stubGlobal('Worker', class { postMessage() {} terminate() {} onmessage = null; });
  vi.stubGlobal('BroadcastChannel', class { postMessage() {} close() {} onmessage = null; });
  vi.stubGlobal('Audio', function Audio(src?: string) {
    const audio = document.createElement('audio'); const state = { time: 0, paused: true }; states.set(audio, state);
    Object.defineProperties(audio, {
      preservesPitch: { value: true, writable: true },
      currentTime: { get: () => state.time, set: v => { state.time = v; } },
      duration: { get: () => audio.src.includes('rest-15s') ? 15 : audio.src === 'blob:rendered-final' ? renderState.duration : 180 },
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
    window.history.replaceState(null, '', '/?finalsRender=0'); // exercise the previous route explicitly
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


describe('Finals native media-control stability', () => {
  it('never writes native iOS volume through tempo, pause, fade and rest transitions', async () => {
    const ua = vi.spyOn(navigator, 'userAgent', 'get').mockReturnValue('Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X)');
    const createContext = vi.fn();
    vi.stubGlobal('AudioContext', createContext);
    const volumeWrite = vi.fn();
    const plain = elements[0];
    Object.defineProperty(plain, 'volume', { configurable: true, get: () => 1, set: volumeWrite });
    try {
      window.history.replaceState(null, '', '/?iosFinalNative=1');
      await act(async () => { api.setBpm(95); api.setSessionTracks([track('native-a'), track('native-b')] as any); api.loadTrack(track('native-a'), false, true); });
      await flush();
      expect(createContext).not.toHaveBeenCalled();
      expect(active()).toBe(plain);
      await tick(10);
      await act(async () => { api.setVolume(.4); await api.togglePlay(); });
      await tick(5);
      expect(api.isPlaying).toBe(false);
      await act(async () => { await api.togglePlay(); api.setBpm(80); });
      await tick(95);
      expect(api.isPauseCountdown).toBe(true);
      expect(active().playbackRate).toBe(1);
      await tick(15);
      expect(api.isPauseCountdown).toBe(false);
      expect(api.title).toBe('native-b');
      expect(active().playbackRate).toBe(.8);
      expect(active().preservesPitch).toBe(true);
      expect(volumeWrite).not.toHaveBeenCalled();
    } finally {
      window.history.replaceState(null, '', '/');
      localStorage.clear();
      ua.mockRestore();
    }
  });
  it('shows requested test diagnostics on desktop without changing desktop routing', async () => {
    const ua = vi.spyOn(navigator, 'userAgent', 'get').mockReturnValue('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)');
    const createContext = vi.fn();
    vi.stubGlobal('AudioContext', createContext);
    try {
      window.history.replaceState(null, '', '/?iosFinalNative=1');
      await act(async () => { root.render(<AudioProvider key="desktop-native-test"><Probe /></AudioProvider>); });
      await act(async () => { api.setBpm(95); api.loadTrack(track('desktop'), false, true); });
      await flush();
      expect(createContext).not.toHaveBeenCalled();
      const badge = document.querySelector('[data-testid="ios-finals-audio-test"]');
      expect(badge?.textContent).toContain('AUDIO TEST 3');
      expect(badge?.textContent).toContain('PITCH SETTING ON');
      expect(badge?.getAttribute('data-audio-route')).toBe('NATIVE');
      expect(active().playbackRate).toBe(.95);
    } finally {
      window.history.replaceState(null, '', '/');
      localStorage.clear();
      ua.mockRestore();
    }
  });
});


async function enableRenderedFinals() {
  window.history.replaceState(null, '', '/?finalsRender=1');
  await act(async () => { root.render(<AudioProvider key="rendered-mode"><Probe /></AudioProvider>); });
}
describe('rendered Finals integration', () => {
  it('plays prepared audio at 1x for a 105/15/105 program while retaining the requested tempo', async () => {
    await enableRenderedFinals(); const song = track('rendered');
    await act(async () => { api.setBpm(95); api.setSessionTracks([song, song] as any); api.loadTrack(song, false, true); }); await flush();
    expect(api.bpm).toBe(95); expect(active().playbackRate).toBe(1); expect(active().defaultPlaybackRate).toBe(1); expect(active().loop).toBe(false);
    expect(document.querySelector('[data-testid="rendered-finals-test"]')?.getAttribute('data-rendered-ready')).toBe('true');
    await tick(103.5); expect(active().volume).toBe(1); // Fade is in the samples, not doubled in the element.
    await tick(1.5); expect(api.isPauseCountdown).toBe(true); expect(active().src).toContain('rest-15s');
    await tick(15); expect(api.isPauseCountdown).toBe(false); expect(active().playbackRate).toBe(1);
    await tick(105); expect(api.isPlaying).toBe(false); expect(api.isFinalMode).toBe(false);
  });
  it('locks the speed during Finals: the chosen tempo plays unchanged, nothing is re-rendered, swapped or reloaded, and the fade ends the dance', async () => {
    await enableRenderedFinals(); const song = track('locked');
    await act(async () => { api.setBpm(90); api.setSessionTracks([song, track('next')] as any); api.loadTrack(song, false, true); }); await flush();
    await tick(10);
    const body = active();
    await act(async () => { api.setBpm(80); }); await act(async () => { api.setBpm(120); }); await tick(1); await flush();
    expect(api.bpm).toBe(90); expect(renderState.requests).toHaveLength(1); expect(renderState.requests[0].percent).toBe(90);
    expect(active()).toBe(body); expect(body.playbackRate).toBe(1); expect(api.isPlaying).toBe(true);
    const playing = () => elements.filter(e => !states.get(e)!.paused && e.src === 'blob:rendered-final');
    await tick(90); expect(playing()).toEqual([body]); expect(body.volume).toBe(1); // the fade is baked into the file
    await tick(5); expect(api.isPauseCountdown).toBe(true); expect(Math.abs(api.pauseTime - 15)).toBeLessThan(1.5);
  });
  it('a speed chosen before Finals starts is used for every dance, including after the rest', async () => {
    await enableRenderedFinals(); const song = track('chosen');
    await act(async () => { api.setBpm(85); api.setSessionTracks([song, track('after')] as any); api.loadTrack(song, false, true); }); await flush();
    await tick(105); await flush();
    expect(api.isPauseCountdown).toBe(true);
    await act(async () => { api.setBpm(110); }); await tick(15); await flush();
    expect(api.isPauseCountdown).toBe(false); expect(api.title).toBe('after');
    expect(renderState.requests.at(-1)).toMatchObject({ percent: 85, elapsedStart: 0 }); expect(api.bpm).toBe(85);
  });
  it('keeps a paused dance paused when preparing a different tempo', async () => {
    await enableRenderedFinals();
    await act(async () => { api.setBpm(95); api.loadTrack(track('paused'), false, true); }); await flush(); await tick(5);
    await act(async () => { await api.togglePlay(); api.setBpm(80); }); await tick(0.3); await flush();
    expect(api.isPlaying).toBe(false); expect(active().paused).toBe(true); expect(active().playbackRate).toBe(1);
  });
  it('returns to the original file and source position when Finals is disabled', async () => {
    await enableRenderedFinals();
    await act(async () => { api.setBpm(95); api.loadTrack(track('return'), false, true); }); await flush(); await tick(10);
    await act(async () => { api.toggleFinalMode(); }); await flush();
    expect(api.isFinalMode).toBe(false); expect(active().src).toContain('test.mp3');
    expect(active().currentTime).toBeCloseTo(9.5); expect(active().playbackRate).toBe(.95);
  });
  it('reports preparation failure instead of silently playing a detuned fallback', async () => {
    await enableRenderedFinals(); renderState.fail = true;
    await act(async () => { api.loadTrack(track('error'), false, true); }); await flush();
    expect(api.error).toBe('Test rendering failure'); expect(api.isPlaying).toBe(false); expect(api.isLoaded).toBe(false);
  });
  it('cancels preparation on Stop and never adopts a late result', async () => {
    await enableRenderedFinals(); let finish!: () => void;
    renderState.gate = new Promise<void>(resolve => { finish = resolve; });
    await act(async () => { api.loadTrack(track('cancel'), false, true); }); await flush();
    const request = renderState.requests[0]; expect(request).toBeDefined();
    await act(async () => { api.stop(); }); expect(request.signal.aborted).toBe(true);
    await act(async () => { finish(); }); await flush();
    expect(api.isPlaying).toBe(false); expect(api.title).toBe('No Track Selected'); expect(active()).toBeUndefined();
  });
});

const IPHONE = 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X)';
async function renderIosDefault() {
  window.history.replaceState(null, '', '/'); // no test flag: production behaviour
  await act(async () => { root.render(<AudioProvider key={'ios-default-' + Math.random()}><Probe /></AudioProvider>); });
}
describe('live Finals engine (?finalsLive=1)', () => {
  const enableLive = async () => {
    vi.stubGlobal('AudioContext', class { state = 'running'; sampleRate = 48000; currentTime = 0; destination = {};
      resume = async () => {}; createBuffer() { return {}; } createBufferSource() { return { connect() {}, start() {}, buffer: null }; } close = async () => {}; });
    window.history.replaceState(null, '', '/?finalsRender=1&finalsLive=1');
    await act(async () => { root.render(<AudioProvider key="live-mode"><Probe /></AudioProvider>); });
  };
  it('changes speed on the running engine: no new file, no reload, the timeline element keeps playing', async () => {
    await enableLive(); const song = track('live');
    await act(async () => { api.setBpm(95); api.setSessionTracks([song, track('next')] as any); api.loadTrack(song, false, true); }); await flush();
    expect(renderState.requests).toHaveLength(0); // nothing is rendered
    expect(liveState.calls.some(c => c.startsWith('start 95'))).toBe(true);
    await tick(10);
    const body = active();
    await act(async () => { api.setBpm(80); }); await tick(0.5); await flush();
    expect(liveState.calls).toContain('rate 80'); expect(renderState.requests).toHaveLength(0);
    expect(active()).toBe(body); expect(body.playbackRate).toBe(1); expect(api.isPlaying).toBe(true);
    await tick(60); expect(active()).toBe(body); expect(Math.abs(api.currentTime - 70.5)).toBeLessThan(1.5);
  });
  it('pauses and resumes the engine with the element, then stops it at the rest and starts the next dance', async () => {
    await enableLive(); const song = track('livepause');
    await act(async () => { api.setBpm(90); api.setSessionTracks([song, track('after')] as any); api.loadTrack(song, false, true); }); await flush();
    await tick(5);
    await act(async () => { await api.togglePlay(); }); await flush();
    expect(liveState.calls).toContain('pause');
    await act(async () => { await api.togglePlay(); }); await flush();
    expect(liveState.calls.some(c => c.startsWith('resume'))).toBe(true);
    await tick(101); await flush();
    expect(api.isPauseCountdown).toBe(true); expect(liveState.calls).toContain('stop');
    const startsBefore = liveState.calls.filter(c => c.startsWith('start')).length;
    await tick(16); await flush();
    expect(api.isPauseCountdown).toBe(false); expect(api.title).toBe('after');
    expect(liveState.calls.filter(c => c.startsWith('start')).length).toBe(startsBefore + 1);
  });
});
describe('live engine in ordinary listening (?finalsLive=1)', () => {
  it('plays through the engine, changes speed and follows seeks without reloading the element', async () => {
    vi.stubGlobal('AudioContext', class { state = 'running'; sampleRate = 48000; currentTime = 0; destination = {};
      resume = async () => {}; createBuffer() { return {}; } createBufferSource() { return { connect() {}, start() {}, buffer: null }; } close = async () => {}; });
    window.history.replaceState(null, '', '/?finalsLive=1');
    await act(async () => { root.render(<AudioProvider key="live-normal"><Probe /></AudioProvider>); });
    const song = track('normal-live');
    await act(async () => { api.setBpm(90); api.loadTrack(song); }); await flush();
    expect(api.isFinalMode).toBe(false);
    expect(liveState.calls.some(c => c.startsWith('load normal-live'))).toBe(true);
    expect(liveState.calls.some(c => c.startsWith('start 90') && c.includes('slot Infinity'))).toBe(true);
    const el = active() ?? elements.find(e => e.src === 'blob:rendered-final' || e.src === 'blob:test')!;
    expect(el.playbackRate).toBeCloseTo(0.9, 3);
    await tick(5);
    await act(async () => { api.setBpm(80); }); await flush();
    expect(liveState.calls).toContain('rate 80'); expect(el.playbackRate).toBeCloseTo(0.8, 3); expect(api.isPlaying).toBe(true);
    const before = liveState.calls.filter(c => c.startsWith('start')).length;
    await act(async () => { api.seek(60); el.dispatchEvent(new Event('seeked')); }); await flush();
    expect(liveState.calls.filter(c => c.startsWith('start')).length).toBe(before + 1);
    await act(async () => { await api.togglePlay(); }); await flush();
    expect(liveState.calls).toContain('pause');
  });
});
describe('live listening is the default on iPhone/iPad', () => {
  const fakeCtx = () => vi.stubGlobal('AudioContext', class { state = 'running'; sampleRate = 48000; currentTime = 0; destination = {};
    resume = async () => {}; createBuffer() { return {}; } createBufferSource() { return { connect() {}, start() {}, buffer: null }; } close = async () => {}; });
  it('uses the stretch engine for ordinary listening without any URL flag, and ?finalsLive=0 switches it off', async () => {
    rolloutState.liveListeningOnApple = true;
    const ua = vi.spyOn(navigator, 'userAgent', 'get').mockReturnValue('Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X)');
    try {
      fakeCtx();
      await act(async () => { root.render(<AudioProvider key="apple-live"><Probe /></AudioProvider>); });
      await act(async () => { api.setBpm(85); api.loadTrack(track('apple')); }); await flush();
      expect(liveState.calls.some(c => c.startsWith('start 85'))).toBe(true);
      liveState.calls = [];
      window.history.replaceState(null, '', '/?finalsLive=0');
      await act(async () => { root.render(<AudioProvider key="apple-live-off"><Probe /></AudioProvider>); });
      await act(async () => { api.setBpm(85); api.loadTrack(track('apple2')); }); await flush();
      expect(liveState.calls.some(c => c.startsWith('start'))).toBe(false);
      expect(active().playbackRate).toBeCloseTo(0.85, 3); // the normal player
    } finally { ua.mockRestore(); localStorage.clear(); rolloutState.liveListeningOnApple = false; }
  });
  it('falls back to the normal player when the audio context cannot run', async () => {
    rolloutState.liveListeningOnApple = true;
    const ua = vi.spyOn(navigator, 'userAgent', 'get').mockReturnValue('Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X)');
    try {
      vi.stubGlobal('AudioContext', class { state = 'suspended'; sampleRate = 48000; currentTime = 0; destination = {};
        resume = async () => {}; createBuffer() { return {}; } createBufferSource() { return { connect() {}, start() {}, buffer: null }; } close = async () => {}; });
      await act(async () => { root.render(<AudioProvider key="apple-suspended"><Probe /></AudioProvider>); });
      await act(async () => { api.setBpm(90); api.loadTrack(track('fallback')); }); await tick(1); await flush();
      expect(liveState.calls.some(c => c.startsWith('start'))).toBe(false);
      expect(api.isPlaying).toBe(true); expect(active().playbackRate).toBeCloseTo(0.9, 3);
    } finally { ua.mockRestore(); localStorage.clear(); rolloutState.liveListeningOnApple = false; }
  });
});
describe('rendered Finals is the default on iPhone', () => {
  beforeEach(() => { rolloutState.defaultOnApple = true; });
  afterEach(() => { rolloutState.defaultOnApple = true; });
  it('uses prepared 1x audio without any URL flag and keeps the requested tempo', async () => {
    const ua = vi.spyOn(navigator, 'userAgent', 'get').mockReturnValue(IPHONE);
    try {
      await renderIosDefault();
      await act(async () => { api.setBpm(95); api.loadTrack(track('ios'), false, true); }); await flush();
      expect(renderState.requests).toHaveLength(1);
      expect(renderState.requests[0].percent).toBe(95);
      expect(active().playbackRate).toBe(1); expect(api.bpm).toBe(95); expect(api.error).toBeNull();
    } finally { ua.mockRestore(); }
  });
  it('can be turned off with ?finalsRender=0', async () => {
    const ua = vi.spyOn(navigator, 'userAgent', 'get').mockReturnValue(IPHONE);
    try {
      window.history.replaceState(null, '', '/?finalsRender=0');
      await act(async () => { root.render(<AudioProvider key="ios-off"><Probe /></AudioProvider>); });
      await act(async () => { api.setBpm(95); api.loadTrack(track('off'), false, true); }); await flush();
      expect(renderState.requests).toHaveLength(0);
    } finally { ua.mockRestore(); }
  });
  it('keeps the dance playing on the previous route if preparation fails, without retrying every dance', async () => {
    const ua = vi.spyOn(navigator, 'userAgent', 'get').mockReturnValue(IPHONE);
    try {
      await renderIosDefault(); renderState.fail = true;
      await act(async () => { api.setBpm(95); api.setSessionTracks([track('a'), track('b')] as any); api.loadTrack(track('a'), false, true); }); await flush();
      expect(renderState.requests).toHaveLength(1);
      expect(api.error).toBeNull(); expect(api.isPlaying).toBe(true); expect(api.isFinalMode).toBe(true);
      expect(api.bpm).toBe(95);
      await tick(105); expect(api.isPauseCountdown).toBe(true);
      const attempts = renderState.requests.length; // the failed first dance only
      await tick(15); await flush();
      expect(renderState.requests.length).toBe(attempts); // no repeated attempts after a failure
      expect(api.error).toBeNull(); expect(api.isPlaying).toBe(true);
    } finally { ua.mockRestore(); }
  });
  it('prepares the next dance during the rest and reuses it at the start of the next dance', async () => {
    const ua = vi.spyOn(navigator, 'userAgent', 'get').mockReturnValue(IPHONE);
    try {
      await renderIosDefault();
      const a = track('first'), b = track('second');
      await act(async () => { api.setBpm(95); api.setSessionTracks([a, b] as any); api.loadTrack(a, false, true); }); await flush();
      expect(renderState.requests).toHaveLength(1);
      await tick(105.5); await flush(); expect(api.isPauseCountdown).toBe(true);
      expect(renderState.requests).toHaveLength(2); // next dance prepared during the rest
      expect(renderState.requests[1]).toMatchObject({ percent: 95, sourceStart: 0, elapsedStart: 0 });
      await tick(15); await flush();
      expect(renderState.requests).toHaveLength(2); // reused, not rendered again
      expect(api.isPauseCountdown).toBe(false); expect(api.isPlaying).toBe(true); expect(active().playbackRate).toBe(1);
    } finally { ua.mockRestore(); }
  });
});

describe('lock-screen metadata in Finals', () => {
  const withCover = (id: string, cover: string) => ({ ...track(id), coverUrl: cover });
  const install = () => {
    const session: any = { metadata: null, playbackState: 'none', setActionHandler: vi.fn(), setPositionState: vi.fn() };
    Object.defineProperty(navigator, 'mediaSession', { value: session, configurable: true });
    (globalThis as any).MediaMetadata = class { constructor(init: any) { Object.assign(this, init); } };
    return session;
  };
  afterEach(() => { delete (navigator as any).mediaSession; delete (globalThis as any).MediaMetadata; });

  it('shows ONE "Final Mode" item with the site logo, the playing music below it, "Rest Time" during pauses and the total time', async () => {
    const session = install();
    const first = withCover('first', '/covers/first.jpg'), second = withCover('second', '/covers/second.jpg');
    await act(async () => { api.setSessionTracks([first, second] as any); api.loadTrack(first, false, true); }); await flush();
    await tick(10);
    expect(session.metadata.title).toBe('Final Mode');
    expect(session.metadata.artist).toBe('first');
    expect(session.metadata.artwork[0].src).toContain('/logo-lockscreen.png');
    expect(session.metadata.artwork.length).toBeGreaterThan(2); // several sizes + app icon
    const last = () => session.setPositionState.mock.calls.at(-1)![0];
    expect(last().duration).toBe(2 * 105 + 15); // whole program, not one track
    await tick(95.5); await flush(); expect(api.isPauseCountdown).toBe(true);
    expect(session.metadata.title).toBe('Final Mode');
    expect(session.metadata.artist).toBe('Rest Time');
    await tick(5); // fixed while resting; not rewritten every second
    expect(session.metadata.artist).toBe('Rest Time');
    await tick(10.5); await flush();
    expect(api.isPauseCountdown).toBe(false);
    expect(session.metadata.title).toBe('Final Mode');
    expect(session.metadata.artist).toBe('second');
    expect(session.metadata.artwork[0].src).toContain('/logo-lockscreen.png');
    expect(last().duration).toBe(2 * 105 + 15);
    expect(last().position).toBeGreaterThanOrEqual(119.5); // second dance starts at 105 + 15
  });

  it('normal listening keeps the song title and its own cover', async () => {
    const session = install();
    const solo = withCover('solo', '/covers/solo.jpg');
    await act(async () => { api.loadTrack(solo, false, false); }); await flush();
    await tick(2);
    expect(session.metadata.title).toBe('solo');
    expect(session.metadata.artwork[0].src).toContain('/cover.png');
  });
});

describe('rendered Finals safety switches', () => {
  it('can be switched off by the rollout switch (default route is then the old one)', async () => {
    rolloutState.defaultOnApple = false;
    const ua = vi.spyOn(navigator, 'userAgent', 'get').mockReturnValue(IPHONE);
    try {
      await renderIosDefault();
      await act(async () => { api.setBpm(95); api.loadTrack(track('safe'), false, true); }); await flush();
      expect(renderState.requests).toHaveLength(0);
      expect(api.isFinalMode).toBe(true); expect(api.error).toBeNull();
    } finally { rolloutState.defaultOnApple = true; ua.mockRestore(); }
  });
  it('never leaves Finals loading forever: a stuck preparation times out and the dance plays on the previous route', async () => {
    rolloutState.defaultOnApple = true;
    const ua = vi.spyOn(navigator, 'userAgent', 'get').mockReturnValue(IPHONE);
    try {
      await renderIosDefault();
      renderState.gate = new Promise<void>(() => { /* never resolves */ });
      await act(async () => { api.setBpm(95); api.loadTrack(track('stuck'), false, true); }); await flush();
      expect(api.isPlaying).toBe(false);
      await tick(26); await flush();
      expect(api.error).toBeNull(); expect(api.isFinalMode).toBe(true); expect(api.isPlaying).toBe(true);
    } finally { rolloutState.defaultOnApple = true; ua.mockRestore(); }
  });
  it('shows the timeout in the explicit test mode instead of hiding it', async () => {
    await enableRenderedFinals();
    renderState.gate = new Promise<void>(() => { /* never resolves */ });
    await act(async () => { api.loadTrack(track('stuck-explicit'), false, true); }); await flush();
    await tick(26); await flush();
    expect(api.error).toBe('Audio preparation timed out'); expect(api.isPlaying).toBe(false);
  });
});
