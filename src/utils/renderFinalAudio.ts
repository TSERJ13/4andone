import { FINAL_DANCE_SECONDS, FINAL_FADE_SECONDS, playbackRateFor } from './finals';

/** This renderer never uses media-element playbackRate to change musical tempo. */
export type FinalRenderRequest = {
  url: string;
  cacheKey: string;
  percent: number;
  sourceStart?: number;
  elapsedStart?: number;
  signal: AbortSignal;
};
export type RenderedFinalAudio = {
  blob: Blob;
  percent: number;
  sourceStart: number;
  sourceDuration: number;
  elapsedStart: number;
  duration: number;
};
export type FinalRenderPlan = {
  sourceStart: number;
  elapsedStart: number;
  percent: number;
  paused: boolean;
  ready: boolean;
};
const SAMPLE_RATE = 44100;
const MAX_BYTES = 32 * 1024 * 1024;
const MAX_SOURCE_SECONDS = 300;
const PRE_ROLL_SECONDS = 0.5;
let decodedCache: { key: string; audio: AudioBuffer } | null = null;
let queue: Promise<unknown> = Promise.resolve();

export function clearFinalRenderCache(): void { decodedCache = null; }
function checkAbort(signal: AbortSignal): void {
  if (signal.aborted) throw new DOMException('Audio preparation cancelled', 'AbortError');
}
export function renderedSourcePosition(segment: Omit<RenderedFinalAudio, 'blob'>, seconds: number): number {
  const duration = segment.sourceDuration;
  if (!(duration > 0)) return segment.sourceStart;
  return (segment.sourceStart + Math.max(0, seconds) * playbackRateFor(segment.percent)) % duration;
}

export async function readAudio(url: string, signal: AbortSignal): Promise<ArrayBuffer> {
  const controller = new AbortController();
  const cancel = () => controller.abort();
  signal.addEventListener('abort', cancel, { once: true });
  const timeout = setTimeout(cancel, 30000);
  try {
    checkAbort(signal);
    const response = await fetch(url, { signal: controller.signal });
    if (!response.ok) throw new Error(`Audio download failed (${response.status})`);
    if (Number(response.headers.get('content-length')) > MAX_BYTES) throw new Error('Audio file exceeds the 32 MB preparation limit');
    const reader = response.body?.getReader();
    if (!reader) {
      const bytes = await response.arrayBuffer();
      if (bytes.byteLength > MAX_BYTES) throw new Error('Audio file exceeds the preparation limit');
      return bytes;
    }
    const chunks: Uint8Array[] = [];
    let length = 0;
    try {
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        length += value.byteLength;
        if (length > MAX_BYTES) {
          await reader.cancel();
          throw new Error('Audio file exceeds the preparation limit');
        }
        chunks.push(value);
      }
    } finally { reader.releaseLock(); }
    const bytes = new Uint8Array(length);
    let offset = 0;
    for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.length; }
    return bytes.buffer;
  } finally {
    clearTimeout(timeout);
    signal.removeEventListener('abort', cancel);
  }
}

type StretchNode = AudioWorkletNode & {
  addBuffers(channels: Float32Array[]): Promise<number>;
  configure(options: Record<string, unknown>): Promise<unknown>;
  schedule(options: Record<string, unknown>): Promise<unknown>;
};

/** Encodes PCM at the ORIGINAL sample rate, with an actual sample-level fade.
 * A shared peak scale prevents clipping without changing stereo balance.
 */
export function encodeFinalWav(channels: Float32Array[], sampleRate: number, fadeSeconds = FINAL_FADE_SECONDS): Blob {
  const frames = channels[0]?.length ?? 0;
  if (!frames || channels.length > 2 || channels.some(c => c.length !== frames)) throw new Error('Invalid rendered audio');
  let peak = 1;
  for (const channel of channels) for (const value of channel) {
    if (!Number.isFinite(value)) throw new Error('Audio processing returned invalid samples');
    peak = Math.max(peak, Math.abs(value));
  }
  const bytes = new ArrayBuffer(44 + frames * channels.length * 2);
  const view = new DataView(bytes);
  const text = (offset: number, value: string) => { for (let i = 0; i < value.length; i++) view.setUint8(offset + i, value.charCodeAt(i)); };
  text(0, 'RIFF'); view.setUint32(4, bytes.byteLength - 8, true); text(8, 'WAVE');
  text(12, 'fmt '); view.setUint32(16, 16, true); view.setUint16(20, 1, true);
  view.setUint16(22, channels.length, true); view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * channels.length * 2, true); view.setUint16(32, channels.length * 2, true);
  view.setUint16(34, 16, true); text(36, 'data'); view.setUint32(40, bytes.byteLength - 44, true);
  const fadeFrames = Math.max(1, Math.round(fadeSeconds * sampleRate));
  let offset = 44;
  for (let frame = 0; frame < frames; frame++) {
    const envelope = fadeSeconds > 0 ? Math.min(1, (frames - 1 - frame) / fadeFrames) : 1;
    for (const channel of channels) {
      const value = Math.max(-1, Math.min(1, channel[frame] / peak * envelope));
      view.setInt16(offset, Math.round(value * (value < 0 ? 32768 : 32767)), true);
      offset += 2;
    }
  }
  return new Blob([bytes], { type: 'audio/wav' });
}

async function renderOnce(request: FinalRenderRequest): Promise<RenderedFinalAudio> {
  checkAbort(request.signal);
  if (typeof OfflineAudioContext === 'undefined') throw new Error('This browser cannot prepare Finals audio');
  const rate = playbackRateFor(request.percent);
  const elapsedStart = Math.min(FINAL_DANCE_SECONDS, Math.max(0, request.elapsedStart ?? 0));
  const seconds = FINAL_DANCE_SECONDS - elapsedStart;
  if (!(seconds > 0) || !Number.isFinite(seconds)) throw new Error('This dance has already finished');
  if (!decodedCache || decodedCache.key !== request.cacheKey) {
    const bytes = await readAudio(request.url, request.signal);
    checkAbort(request.signal);
    const decoder = new OfflineAudioContext(2, 1, SAMPLE_RATE);
    const audio = await decoder.decodeAudioData(bytes);
    checkAbort(request.signal);
    if (!(audio.duration > 0) || audio.duration > MAX_SOURCE_SECONDS || audio.numberOfChannels > 2) {
      throw new Error('Rendered Finals currently supports mono/stereo recordings up to five minutes');
    }
    decodedCache = { key: request.cacheKey, audio };
  }
  const input = decodedCache.audio;
  const sourceStart = Math.max(0, request.sourceStart ?? 0) % input.duration;
  if (!Number.isFinite(sourceStart)) throw new Error('Invalid audio position');
  const frames = Math.ceil(seconds * SAMPLE_RATE);
  let channels: Float32Array[];
  if (rate === 1) {
    // At original speed, do not pass music through a stretch algorithm at all.
    const startFrame = Math.round(sourceStart * SAMPLE_RATE);
    channels = Array.from({ length: input.numberOfChannels }, (_, channel) => {
      const source = input.getChannelData(channel);
      const output = new Float32Array(frames);
      for (let i = 0; i < frames; i++) output[i] = source[(startFrame + i) % source.length];
      return output;
    });
  } else {
    const preRollFrames = Math.round(PRE_ROLL_SECONDS * SAMPLE_RATE);
    const context = new OfflineAudioContext(input.numberOfChannels, frames + preRollFrames, SAMPLE_RATE);
    if (!context.audioWorklet) throw new Error('Offline audio processing is unavailable in this browser');
    // Fixed, same-origin, MIT-licensed release. No third-party runtime request.
    const moduleUrl = '/vendor/signalsmith-stretch-1.3.2/SignalsmithStretch.mjs';
    const library = await import(/* webpackIgnore: true */ moduleUrl);
    checkAbort(request.signal);
    const createStretch = library.default ?? library.SignalsmithStretch;
    if (typeof createStretch !== 'function') throw new Error('Audio processor could not be loaded');
    const stretch: StretchNode = await createStretch(context, {
      numberOfInputs: 0, numberOfOutputs: 1, outputChannelCount: [input.numberOfChannels],
    });
    try {
      await stretch.configure({ blockMs: 120, intervalMs: 15 }); // denser overlap: closer to the ideal slowed sound in a synthetic spectral test (about 1.5x the render time)
      await stretch.addBuffers(Array.from({ length: input.numberOfChannels }, (_, channel) => input.getChannelData(channel).slice()));
      // Tempo and pitch are INDEPENDENT here. A half-second lead lets the
      // processor compensate its latency before the first retained sample.
      await stretch.schedule({ output: PRE_ROLL_SECONDS, input: sourceStart,
        active: true, rate, semitones: 0, loopStart: 0, loopEnd: input.duration });
      stretch.connect(context.destination);
      checkAbort(request.signal);
      const output = await context.startRendering();
      checkAbort(request.signal);
      channels = Array.from({ length: input.numberOfChannels }, (_, channel) => output.getChannelData(channel).slice(preRollFrames, preRollFrames + frames));
    } finally {
      stretch.disconnect();
      stretch.port.close();
    }
  }
  checkAbort(request.signal);
  return { blob: encodeFinalWav(channels, SAMPLE_RATE), percent: rate * 100, sourceStart,
    sourceDuration: input.duration, elapsedStart, duration: frames / SAMPLE_RATE };
}

/** Serialize large renders. Cancelled queued requests never decode or allocate. */
export function renderFinalAudio(request: FinalRenderRequest): Promise<RenderedFinalAudio> {
  const task = queue.catch(() => {}).then(() => renderOnce(request));
  queue = task.then(() => undefined, () => undefined);
  return task;
}
