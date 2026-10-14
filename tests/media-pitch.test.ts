import { describe, expect, it } from 'vitest';
import { readPitchConfiguration, requestPitchPreservation } from '../src/utils/mediaPitch';
import { setMusicTempo } from '../src/utils/finals';

describe('pitch capability reporting (not acoustic verification)', () => {
  it.each([
    { preservesPitch: false },
    { webkitPreservesPitch: false },
    { preservesPitch: false, webkitPreservesPitch: false },
  ])('sets only exposed APIs: %j', properties => {
    const media = { ...properties, playbackRate: 1 } as HTMLMediaElement;
    setMusicTempo(media, 95);
    expect(media.playbackRate).toBe(.95);
    expect(readPitchConfiguration(media)).toBe('ON');
    expect('preservesPitch' in media).toBe('preservesPitch' in properties);
    expect('webkitPreservesPitch' in media).toBe('webkitPreservesPitch' in properties);
  });
  it('does not invent support on an engine without either API', () => {
    const media = {} as HTMLMediaElement;
    requestPitchPreservation(media);
    expect(Object.keys(media)).toEqual([]);
    expect(readPitchConfiguration(media)).toBe('UNKNOWN');
    expect(readPitchConfiguration(null)).toBe('UNKNOWN');
  });
  it('reports false and conflicting readback honestly', () => {
    expect(readPitchConfiguration({ preservesPitch: false } as HTMLMediaElement)).toBe('OFF');
    expect(readPitchConfiguration({ preservesPitch: true, webkitPreservesPitch: false } as unknown as HTMLMediaElement)).toBe('MIXED');
  });
  it('supports inherited WebKit accessors without shadowing them', () => {
    let value = false;
    const media = Object.create({ get webkitPreservesPitch() { return value; }, set webkitPreservesPitch(v) { value = v; } });
    requestPitchPreservation(media);
    expect(value).toBe(true);
    expect(Object.hasOwn(media, 'preservesPitch')).toBe(false);
    expect(readPitchConfiguration(media)).toBe('ON');
  });
});
