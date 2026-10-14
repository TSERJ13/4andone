import { describe, expect, it, vi } from 'vitest';
import { setElementVolume } from '../src/utils/mediaControls';
import { setMusicTempo } from '../src/utils/finals';

function media(initial: Record<string, number | boolean> = {}) {
  const values: Record<string, number | boolean> = {
    volume: 1, playbackRate: 1, defaultPlaybackRate: 1,
    preservesPitch: true, webkitPreservesPitch: true, ...initial,
  };
  const writes: Record<string, ReturnType<typeof vi.fn>> = {};
  const element = {} as HTMLMediaElement;
  for (const key of Object.keys(values)) {
    writes[key] = vi.fn((value: number | boolean) => { values[key] = value; });
    Object.defineProperty(element, key, { get: () => values[key], set: writes[key] });
  }
  return { element, writes, values };
}

describe('native volume updates', () => {
  it('does not even read or write an unsupported volume property', () => {
    const element = {} as HTMLMediaElement;
    Object.defineProperty(element, 'volume', {
      get: () => { throw new Error('unsupported volume read'); },
      set: () => { throw new Error('unsupported volume write'); },
    });
    expect(() => setElementVolume(element, .5, false)).not.toThrow();
  });
  it('leaves unchanged volume alone over the full 105-second monitoring slot', () => {
    const { element, writes } = media();
    for (let i = 0; i < 1050; i++) setElementVolume(element, 1, true);
    expect(writes.volume).not.toHaveBeenCalled();
  });
  it('applies a real volume change once, not on every following tick', () => {
    const { element, writes } = media();
    for (let i = 0; i < 30; i++) setElementVolume(element, .5, true);
    expect(writes.volume).toHaveBeenCalledTimes(1);
    expect(element.volume).toBe(.5);
  });
  it('still supports a writable-platform fade all the way to zero', () => {
    const { element, writes } = media();
    setElementVolume(element, .5, true);
    setElementVolume(element, 0, true);
    expect(element.volume).toBe(0);
    expect(writes.volume).toHaveBeenCalledTimes(2);
  });
  it.each([NaN, Infinity, -Infinity])('ignores non-finite volume %s', value => {
    const { element, writes } = media();
    setElementVolume(element, value, true);
    expect(writes.volume).not.toHaveBeenCalled();
  });
  it('clamps finite volume without sending out-of-range values', () => {
    const { element } = media();
    setElementVolume(element, -2, true); expect(element.volume).toBe(0);
    setElementVolume(element, 3, true); expect(element.volume).toBe(1);
  });
});

describe('idempotent pitch-preserving tempo requests', () => {
  it('does not rewrite pitch or rates when the chosen tempo is already applied', () => {
    const { element, writes } = media({ playbackRate: .95, defaultPlaybackRate: .95 });
    for (let i = 0; i < 20; i++) setMusicTempo(element, 95);
    for (const setter of Object.values(writes)) expect(setter).not.toHaveBeenCalled();
  });
  it('changes tempo without toggling already-enabled pitch flags', () => {
    const { element, writes } = media();
    setMusicTempo(element, 95); setMusicTempo(element, 80);
    expect(element.playbackRate).toBe(.8);
    expect(writes.playbackRate.mock.calls).toEqual([[.95], [.8]]);
    expect(writes.defaultPlaybackRate.mock.calls).toEqual([[.95], [.8]]);
    expect(writes.preservesPitch).not.toHaveBeenCalled();
    expect(writes.webkitPreservesPitch).not.toHaveBeenCalled();
  });
  it('repairs disabled pitch flags before requesting the slower rate', () => {
    const { element, writes } = media({ preservesPitch: false, webkitPreservesPitch: false });
    setMusicTempo(element, 95);
    expect(element.preservesPitch).toBe(true);
    expect(writes.preservesPitch).toHaveBeenCalledWith(true);
    expect(writes.webkitPreservesPitch).toHaveBeenCalledWith(true);
    expect(writes.preservesPitch.mock.invocationCallOrder[0]).toBeLessThan(writes.playbackRate.mock.invocationCallOrder[0]);
  });
  it('restores a playback rate reset by loading without rewriting its saved default', () => {
    const { element, writes } = media({ playbackRate: 1, defaultPlaybackRate: .95 });
    setMusicTempo(element, 95);
    expect(element.playbackRate).toBe(.95);
    expect(writes.defaultPlaybackRate).not.toHaveBeenCalled();
  });
  it('restores normal-speed silence without disabling pitch preservation', () => {
    const { element } = media({ playbackRate: .8, defaultPlaybackRate: .8 });
    setMusicTempo(element, 100);
    expect(element.playbackRate).toBe(1);
    expect(element.preservesPitch).toBe(true);
  });
});
