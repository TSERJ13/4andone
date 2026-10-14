import { describe, it, expect } from 'vitest';
import { FinalsClock, setMusicTempo, playbackRateFor, finalSessionDuration } from '../src/utils/finals';
describe('Finals timing and pitch', () => {
  it.each([0.5, 0.8, 0.95, 1, 1.25, 1.5])('keeps 105 real seconds at %sx, across source loops', rate => {
    const clock = new FinalsClock();
    clock.reset(0, rate);
    for (let elapsed = 1; elapsed <= 105; elapsed++) clock.sample((elapsed * rate) % 76, 76);
    expect(clock.elapsed).toBeCloseTo(105, 5);
  });
  it('accounts for changing tempo halfway through and paused/buffering media', () => {
    const clock = new FinalsClock();
    clock.sample(30, 180);
    clock.changeRate(30, 180, .75);
    clock.sample(30, 180);
    expect(clock.elapsed).toBe(30);
    clock.sample(86.25, 180);
    expect(clock.elapsed).toBe(105);
  });
  it('preserves pitch and default rate across load()', () => {
    const audio = { playbackRate: 1, preservesPitch: false, webkitPreservesPitch: false } as unknown as HTMLMediaElement;
    setMusicTempo(audio, 80);
    expect(audio).toMatchObject({ playbackRate: .8, defaultPlaybackRate: .8, preservesPitch: true, webkitPreservesPitch: true });
  });
  it('clamps invalid speeds and gives no final trailing rest', () => {
    expect(playbackRateFor(NaN)).toBe(1);
    expect(playbackRateFor(0)).toBe(.5);
    expect(playbackRateFor(1000)).toBe(1.5);
    expect(finalSessionDuration(5)).toBe(585);
    expect(finalSessionDuration(10)).toBe(1185);
  });
});
