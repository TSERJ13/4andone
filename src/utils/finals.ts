import { requestPitchPreservation } from './mediaPitch';

export const FINAL_DANCE_SECONDS = 105;
export const FINAL_REST_SECONDS = 15;
export const FINAL_FADE_SECONDS = 3;
export const FINAL_REST_URL = '/audio/rest-15s.mp3';

export function playbackRateFor(percent: number): number {
  return Number.isFinite(percent) ? Math.min(150, Math.max(50, percent)) / 100 : 1;
}

/** Tempo changes must never transpose the recording, including the gain path. */
export function setMusicTempo(audio: HTMLMediaElement, percent: number): void {
  const rate = playbackRateFor(percent);
  requestPitchPreservation(audio);
  audio.defaultPlaybackRate = rate;
  if (Math.abs(audio.playbackRate - rate) > 0.0001) audio.playbackRate = rate;
}

/** Played seconds, independent of tempo. No progress while paused/buffering.
 * Sample BEFORE changing rate. A negative delta is a native audio loop; manual
 * seeks must reset the anchor explicitly. Short recordings loop to fill 1:45.
 */
export class FinalsClock {
  elapsed = 0;
  private position = 0;
  private rate = 1;

  reset(position = 0, rate = 1, elapsed = 0): void {
    this.position = position;
    this.rate = rate;
    this.elapsed = elapsed;
  }

  sample(position: number, duration: number): number {
    if (!Number.isFinite(position)) return this.elapsed;
    let delta = position - this.position;
    if (delta < 0 && Number.isFinite(duration) && duration > 0) delta += duration;
    this.elapsed += Math.max(0, delta) / this.rate;
    this.position = position;
    // Avoid a 100ms late transition from floating point accumulation.
    this.elapsed = Math.round(this.elapsed * 1e9) / 1e9;
    return this.elapsed;
  }

  changeRate(position: number, duration: number, rate: number): void {
    this.sample(position, duration);
    this.rate = rate;
  }
}

export function finalSessionDuration(count: number): number {
  return count > 0 ? count * FINAL_DANCE_SECONDS + (count - 1) * FINAL_REST_SECONDS : 0;
}
