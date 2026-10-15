import { FINAL_FADE_SECONDS, playbackRateFor } from './finals';
import { readAudio } from './renderFinalAudio';

/**
 * Live Finals engine: the dance is stretched while it plays (Signalsmith Stretch in an
 * AudioWorklet, the same processor the prepared files use). A tempo change is a parameter
 * change on the running processor, so the music never stops or reloads. The fade is a gain
 * ramp, which also works on iPhone where an <audio> element's volume cannot be set.
 */
type StretchNode = AudioWorkletNode & {
  addBuffers(channels: Float32Array[]): Promise<number>;
  dropBuffers(toSeconds?: number): Promise<unknown>;
  configure(options: Record<string, unknown>): Promise<unknown>;
  schedule(options: Record<string, unknown>): Promise<unknown>;
  setUpdateInterval?(seconds: number, callback?: (inputTime: number) => void): void;
};

const MODULE_URL = '/vendor/signalsmith-stretch-1.3.2/SignalsmithStretch.mjs';
export const LIVE_START_LEAD = 0.35; // lets the processor compensate its own latency

export class FinalsLiveEngine {
  readonly ctx: BaseAudioContext;
  private stretch: StretchNode | null = null;
  private readonly gate: GainNode; // muted while paused (the processor holds its position by running at rate 0)
  private readonly fade: GainNode;
  private readonly master: GainNode;
  private readonly meter: AnalyserNode; // measures what actually comes out, so a silent engine can be detected
  private meterData: Float32Array<ArrayBuffer>;
  private loadedKey = '';
  private duration = 0;
  private lastInput = 0;
  private running = false;
  private rate = 1;
  private pendingStart: { sourceStart: number; slotSeconds: number; at: number } | null = null;

  constructor(ctx: BaseAudioContext) {
    this.ctx = ctx;
    this.gate = ctx.createGain();
    this.fade = ctx.createGain();
    this.master = ctx.createGain();
    this.gate.connect(this.fade);
    this.fade.connect(this.master);
    this.master.connect(ctx.destination);
    this.meter = ctx.createAnalyser();
    this.meter.fftSize = 1024;
    this.meterData = new Float32Array(this.meter.fftSize);
    this.master.connect(this.meter);
  }

  /** Loudest recent sample leaving the engine (0 = silence). */
  peak(): number {
    this.meter.getFloatTimeDomainData(this.meterData);
    let loudest = 0;
    for (const value of this.meterData) loudest = Math.max(loudest, Math.abs(value));
    return loudest;
  }

  // The processor keeps one pending change at a time: a new request discards every change scheduled at or
  // after "now", so requests are always made when they are due (never far ahead).
  private schedule(change: { output: number } & Record<string, unknown>): Promise<unknown> {
    return this.stretch!.schedule(change);
  }

  get ready(): boolean { return !!this.stretch; }
  get sourceDuration(): number { return this.duration; }
  get isRunning(): boolean { return this.running; }
  get sourceKey(): string { return this.loadedKey; }

  async init(): Promise<void> {
    if (this.stretch) return;
    if (!this.ctx.audioWorklet) throw new Error('Live audio processing is unavailable in this browser');
    const library = await import(/* webpackIgnore: true */ MODULE_URL);
    const create = library.default ?? library.SignalsmithStretch;
    if (typeof create !== 'function') throw new Error('Audio processor could not be loaded');
    // One (unconnected) input is required: the processor reads its length on every block and crashes without it,
    // which leaves the engine silent while the clock keeps running.
    const node: StretchNode = await create(this.ctx, { numberOfInputs: 1, numberOfOutputs: 1, outputChannelCount: [2] });
    // 80/16: sharper drum attacks than 120/30 in an offline transient test, about the same real-time load.
    await node.configure({ blockMs: 80, intervalMs: 16, splitComputation: true });
    node.setUpdateInterval?.(0.1, (t: number) => { this.lastInput = t; });
    node.connect(this.gate);
    this.stretch = node;
  }

  /** Replace the audio the processor plays (no-op when the same recording is already loaded). */
  async load(key: string, channels: Float32Array[], duration: number): Promise<void> {
    await this.init();
    if (this.loadedKey === key && this.duration === duration) return;
    const stereo = channels.length === 1 ? [channels[0], channels[0]] : channels;
    await this.stretch!.dropBuffers();
    await this.stretch!.addBuffers(stereo.map(channel => channel.slice()));
    this.loadedKey = key;
    this.duration = duration;
  }

  async decodeAndLoad(url: string, key: string, signal: AbortSignal): Promise<void> {
    await this.init();
    if (this.loadedKey === key) return;
    const bytes = await readAudio(url, signal);
    if (signal.aborted) throw new DOMException('Audio preparation cancelled', 'AbortError');
    const decoded = await this.ctx.decodeAudioData(bytes); // resampled to the context's rate
    if (signal.aborted) throw new DOMException('Audio preparation cancelled', 'AbortError');
    if (!(decoded.duration > 0) || decoded.duration > 300 || decoded.numberOfChannels > 2) {
      throw new Error('Live Finals currently supports mono/stereo recordings up to five minutes');
    }
    const channels = Array.from({ length: decoded.numberOfChannels }, (_, c) => decoded.getChannelData(c));
    await this.load(key, channels, decoded.duration);
  }

  private armFade(at: number, slotSeconds: number): void {
    const gain = this.fade.gain;
    gain.cancelScheduledValues(0);
    if (slotSeconds === Infinity) { // ordinary listening: no fade-out, only a 20 ms fade-in so a start/seek never clicks
      gain.setValueAtTime(0, at);
      gain.linearRampToValueAtTime(1, at + 0.02);
      return;
    }
    if (!(slotSeconds > 0)) { gain.setValueAtTime(0, at); return; }
    const fadeStart = at + slotSeconds - FINAL_FADE_SECONDS;
    if (fadeStart > at) {
      gain.setValueAtTime(1, at);
      gain.setValueAtTime(1, fadeStart);
    } else {
      gain.setValueAtTime(Math.min(1, slotSeconds / FINAL_FADE_SECONDS), at);
    }
    gain.linearRampToValueAtTime(0, at + slotSeconds);
  }

  setVolume(volume: number): void {
    const v = Number.isFinite(volume) ? Math.max(0, Math.min(1, volume)) : 1;
    this.master.gain.setTargetAtTime(v, this.ctx.currentTime, 0.02);
  }

  /** Start playing from a source position. `slotSeconds` is how much of the dance slot is left (the fade ends there). */
  async start(options: { sourceStart: number; percent: number; slotSeconds: number; volume?: number; when?: number }): Promise<number> {
    if (!this.stretch) throw new Error('Live engine is not loaded');
    const at = options.when ?? this.ctx.currentTime + LIVE_START_LEAD;
    const rate = playbackRateFor(options.percent);
    this.rate = rate;
    if (options.volume !== undefined) this.master.gain.value = options.volume;
    this.armFade(at, options.slotSeconds);
    this.gate.gain.cancelScheduledValues(0);
    this.gate.gain.setValueAtTime(1, Math.max(0, this.ctx.currentTime));
    const input = this.duration > 0 ? options.sourceStart % this.duration : 0;
    this.lastInput = input;
    this.running = true;
    this.pendingStart = { sourceStart: input, slotSeconds: options.slotSeconds, at };
    await this.schedule({ output: at, input, active: true, rate, semitones: 0, loopStart: 0, loopEnd: this.duration });
    return at;
  }

  /** Change the tempo of the running music. Takes effect immediately and keeps the position. */
  setRate(percent: number, when?: number): Promise<unknown> {
    if (!this.stretch) return Promise.resolve();
    this.rate = playbackRateFor(percent);
    if (!this.running) return Promise.resolve(); // paused: resume() picks the new tempo up
    const pending = this.pendingStart;
    if (pending && this.ctx.currentTime < pending.at && when === undefined) {
      // Still in the start lead-in: restart with the new tempo instead of discarding the start.
      return this.start({ sourceStart: pending.sourceStart, percent, slotSeconds: pending.slotSeconds, when: pending.at });
    }
    return this.schedule({ output: when ?? this.ctx.currentTime + 0.03, active: true, rate: this.rate });
  }

  /** Freeze the music where it is. The processor keeps running (at rate 0, muted) so the audio session stays alive. */
  pause(when?: number): Promise<unknown> {
    if (!this.stretch || !this.running) return Promise.resolve();
    const at = when ?? this.ctx.currentTime;
    this.running = false;
    this.fade.gain.cancelScheduledValues(0);
    this.gate.gain.cancelScheduledValues(0);
    this.gate.gain.setTargetAtTime(0, at, 0.008);
    return this.schedule({ output: at + 0.03, rate: 0 });
  }

  /** Continue from where it froze. `slotSeconds` re-arms the fade for what is left of the slot. */
  resume(slotSeconds: number, when?: number): Promise<unknown> {
    if (!this.stretch || this.running) return Promise.resolve();
    const at = when ?? this.ctx.currentTime + 0.03;
    this.running = true;
    this.armFade(at, slotSeconds);
    this.gate.gain.cancelScheduledValues(0);
    this.gate.gain.setValueAtTime(0, at);
    this.gate.gain.linearRampToValueAtTime(1, at + 0.03);
    return this.schedule({ output: at, active: true, rate: this.rate });
  }

  /** The recording position (seconds) the music is at, wrapped to the recording's length. */
  position(): number { return this.duration > 0 ? this.lastInput % this.duration : this.lastInput; }

  stop(): void {
    if (!this.stretch) return;
    this.running = false;
    try {
      // Fade out over ~60 ms instead of cutting the level to zero in one sample (that was an audible click when
      // skipping to the next track); the processor stops once the level is gone. A following start() replaces this.
      const now = this.ctx.currentTime;
      this.fade.gain.cancelScheduledValues(0);
      this.fade.gain.setTargetAtTime(0, now, 0.012);
      void this.schedule({ output: now + 0.08, rate: 0 });
    } catch { /* context already closed */ }
  }

  dispose(): void {
    this.stop();
    try { this.stretch?.disconnect(); this.fade.disconnect(); this.master.disconnect(); } catch { /* ignore */ }
    this.stretch = null;
  }
}

/** A silent mono 8-bit WAV of the given length. It is the dance's timeline element: the live engine makes the sound. */
export function silentWav(seconds: number, sampleRate = 8000): Blob {
  const frames = Math.max(1, Math.round(seconds * sampleRate));
  const bytes = new ArrayBuffer(44 + frames);
  const view = new DataView(bytes);
  const text = (offset: number, value: string) => { for (let i = 0; i < value.length; i++) view.setUint8(offset + i, value.charCodeAt(i)); };
  text(0, 'RIFF'); view.setUint32(4, bytes.byteLength - 8, true); text(8, 'WAVE');
  text(12, 'fmt '); view.setUint32(16, 16, true); view.setUint16(20, 1, true);
  view.setUint16(22, 1, true); view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate, true); view.setUint16(32, 1, true);
  view.setUint16(34, 8, true); text(36, 'data'); view.setUint32(40, frames, true);
  new Uint8Array(bytes, 44).fill(128); // 8-bit silence
  return new Blob([bytes], { type: 'audio/wav' });
}
