import { describe, it, expect } from 'vitest';
import { encodeFinalWav, renderedSourcePosition, renderFinalAudio } from '../src/utils/renderFinalAudio';

describe('rendered audio sample contract', () => {
  it('writes original sample rate, stereo layout, fixed duration and a sample-level fade', async () => {
    const blob = encodeFinalWav([new Float32Array(600).fill(.5), new Float32Array(600).fill(-.25)], 100, 3);
    const view = new DataView(await blob.arrayBuffer());
    expect(blob.type).toBe('audio/wav'); expect(view.getUint32(24, true)).toBe(100);
    expect(view.getUint16(22, true)).toBe(2); expect(view.getUint32(40, true)).toBe(600 * 4);
    expect(view.getInt16(44, true)).toBe(16384); expect(view.getInt16(46, true)).toBe(-8192);
    expect(view.getInt16(44 + 450 * 4, true)).toBeLessThan(8300);
    expect(view.getInt16(blob.size - 2, true)).toBe(0);
  });
  it('does not alter sample values before the fade unless a shared anti-clipping scale is needed', async () => {
    const blob = encodeFinalWav([new Float32Array([.25, -.25])], 44100, 0);
    const data = new DataView(await blob.arrayBuffer());
    expect(data.getInt16(44, true)).toBe(8192); expect(data.getInt16(46, true)).toBe(-8192);
  });
  it('rejects non-finite samples rather than exporting corrupt audio', () => {
    expect(() => encodeFinalWav([new Float32Array([NaN])], 44100)).toThrow('invalid samples');
  });
  it('maps output time to original musical position, including a short-track loop', () => {
    const segment = { percent: 80, sourceStart: 170, sourceDuration: 180, elapsedStart: 0, duration: 105 };
    expect(renderedSourcePosition(segment, 20)).toBeCloseTo(6);
  });
  it('rejects an already cancelled render before decoding or allocating', async () => {
    const controller = new AbortController(); controller.abort();
    await expect(renderFinalAudio({ url: '/unused.mp3', cacheKey: 'unused', percent: 95, signal: controller.signal }))
      .rejects.toMatchObject({ name: 'AbortError' });
  });
});
