/**
 * Ultra-Robust Audio Utility for BPM Detection and Dance Style Mapping
 * Optimized specifically for Ballroom music with strong rhythmic components.
 */

export interface DanceStyleInfo {
  name: string;
  minMPM: number;
  maxMPM: number;
  timeSignature: number; 
}

export const DANCE_STYLES: DanceStyleInfo[] = [
  { name: 'Slow Waltz', minMPM: 28, maxMPM: 30, timeSignature: 3 },
  { name: 'Tango', minMPM: 31, maxMPM: 33, timeSignature: 2 }, 
  { name: 'Viennese Waltz', minMPM: 58, maxMPM: 60, timeSignature: 3 },
  { name: 'Slow Foxtrot', minMPM: 28, maxMPM: 30, timeSignature: 4 },
  { name: 'Quickstep', minMPM: 50, maxMPM: 52, timeSignature: 4 },
  { name: 'Cha-Cha-Cha', minMPM: 30, maxMPM: 32, timeSignature: 4 },
  { name: 'Samba', minMPM: 50, maxMPM: 52, timeSignature: 2 },
  { name: 'Rumba', minMPM: 25, maxMPM: 27, timeSignature: 4 },
  { name: 'Paso Doble', minMPM: 60, maxMPM: 62, timeSignature: 2 },
  { name: 'Jive', minMPM: 42, maxMPM: 44, timeSignature: 4 },
];

/**
 * Ultra-Robust BPM Detection.
 * Uses a combination of energy peaks and median interval analysis.
 */
export async function detectBPM(file: File): Promise<number> {
  console.log(`[AudioEngine] Starting precision analysis for: ${file.name}`);
  try {
    const arrayBuffer = await file.arrayBuffer();
    const tempContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    const audioBuffer = await tempContext.decodeAudioData(arrayBuffer);
    const duration = audioBuffer.duration;
    
    // Analyze up to 90 seconds (more representative than 45s)
    const analysisWindow = Math.min(duration, 90);
    const context = new (window.OfflineAudioContext || (window as any).webkitOfflineAudioContext)(
      1,
      Math.floor(44100 * analysisWindow),
      44100
    );

    const source = context.createBufferSource();
    source.buffer = audioBuffer;

    const lowpass = context.createBiquadFilter();
    lowpass.type = 'lowpass';
    lowpass.frequency.value = 140; // Slightly lower for cleaner kick detection

    source.connect(lowpass);
    lowpass.connect(context.destination);

    source.start(0);
    const renderedBuffer = await context.startRendering();
    const data = renderedBuffer.getChannelData(0);

    // 1. Detect Onsets with skip-intro logic
    const onsets: number[] = [];
    let lastPeak = 0;
    const minInterval = 44100 * 0.25; // 250ms (max 240 BPM)
    const skipSamples = 44100 * 2.0; // Skip first 2 seconds (intros, silence, counts)
    
    let avgEnergy = 0;
    for (let i = skipSamples; i < data.length; i += 441) {
      const val = Math.abs(data[i]);
      avgEnergy = avgEnergy * 0.96 + val * 0.04;
      
      if (val > avgEnergy * 2.8 && val > 0.025 && (i - lastPeak) > minInterval) {
        onsets.push(i);
        lastPeak = i;
      }
    }

    if (onsets.length < 5) {
      console.warn(`[AudioEngine] Not enough onsets found (${onsets.length}). Fallback to 120 (standard fallback).`);
      return 120;
    }

    // 2. Interval Analysis (Clustering for Stability)
    const intervals: number[] = [];
    for (let i = 1; i < onsets.length; i++) {
      intervals.push(onsets[i] - onsets[i-1]);
    }

    // Sort and prune extreme 5% outliers to stabilize the median
    intervals.sort((a, b) => a - b);
    const startIdx = Math.floor(intervals.length * 0.05);
    const endIdx = Math.floor(intervals.length * 0.95);
    const prunedIntervals = intervals.slice(startIdx, endIdx);
    
    if (prunedIntervals.length === 0) return 0;
    
    const medianInterval = prunedIntervals[Math.floor(prunedIntervals.length / 2)];
    let detectedBpm = Math.round(60 / (medianInterval / 44100));

    // 4. Normalize to Ballroom Range (Allow Tango 2/4 which is ~64 BPM)
    // Floor is now 60 instead of 80
    while (detectedBpm < 60) detectedBpm *= 2;
    while (detectedBpm > 220) detectedBpm /= 2;

    console.log(`[AudioEngine] Precision Result: ${detectedBpm} BPM analyzed over ${analysisWindow.toFixed(1)}s.`);
    return detectedBpm;
  } catch (err) {
    console.error("[AudioEngine] Analysis failure:", err);
    return 0;
  }
}

function detectBPMSimple(data: Float32Array): number {
  // Fallback: simple global peak counting
  let count = 0;
  let threshold = 0.3;
  for (let i = 0; i < data.length; i++) {
    if (data[i] > threshold) {
      count++;
      i += 44100 * 0.3; // 300ms gap
    }
  }
  let bpm = Math.round((count / (data.length / 44100)) * 60);
  while (bpm < 80) bpm *= 2;
  while (bpm > 200) bpm /= 2;
  return bpm;
}

export function getStyleFromBPM(bpm: number, filename?: string): string {
  if (!bpm || bpm === 0) return 'Samba'; 
  const fnLower = filename?.toLowerCase() || '';
  
  if (fnLower.includes('cha cha') || fnLower.includes('chacha')) return 'Cha-Cha-Cha';
  if (fnLower.includes('samba')) return 'Samba';
  if (fnLower.includes('rumba')) return 'Rumba';
  if (fnLower.includes('jive')) return 'Jive';
  if (fnLower.includes('paso')) return 'Paso Doble';
  if (fnLower.includes('viennese')) return 'Viennese Waltz';
  if (fnLower.includes('waltz') && !fnLower.includes('viennese')) return 'Slow Waltz';
  if (fnLower.includes('tango')) return 'Tango';
  if (fnLower.includes('foxtrot')) return 'Slow Foxtrot';
  if (fnLower.includes('quickstep')) return 'Quickstep';

  for (const style of DANCE_STYLES) {
    const mpm = bpm / style.timeSignature;
    if (mpm >= style.minMPM - 2 && mpm <= style.maxMPM + 2) {
      return style.name;
    }
  }
  return 'Samba'; 
}

export function getMPMFromBPM(bpm: number, styleName: string): number {
  const style = DANCE_STYLES.find(s => s.name === styleName);
  if (!style) return 0;
  return Number((bpm / style.timeSignature).toFixed(1));
}

export function getBPMFromMPM(mpm: number, styleName: string): number {
  const style = DANCE_STYLES.find(s => s.name === styleName);
  if (!style) return 0;
  return Math.round(mpm * style.timeSignature);
}
