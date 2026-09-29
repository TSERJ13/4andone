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
  { name: 'Rumba', minMPM: 24, maxMPM: 27, timeSignature: 4 },
  { name: 'Paso Doble', minMPM: 58, maxMPM: 62, timeSignature: 2 },
  { name: 'Jive', minMPM: 42, maxMPM: 44, timeSignature: 4 },
];

/**
 * Ultra-Robust BPM Detection.
 * Uses a combination of energy peaks and median interval analysis.
 */
export async function detectBPM(file: File): Promise<number> {
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

    // Precision Result analyzed
    
    // CRITICAL: Close context to prevent leaking hundreds of contexts on mobile
    if (tempContext && (tempContext as any).close) {
      await (tempContext as any).close();
    }
    
    return detectedBpm;
  } catch (err) {
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

export function canonicalStyle(styleName?: string): string {
  if (!styleName) return '';
  const s = styleName.toLowerCase().replace(/[\s\-_]+/g, '');
  if (s === 'waltz' || s === 'slowwaltz' || s === 'englishwaltz' || s === 'sw') return 'slowwaltz';
  if (s === 'tango' || s === 'tg') return 'tango';
  if (s === 'viennesewaltz' || s === 'viennese' || s === 'vw' || s === 'vinesewaltz' || s === 'vienesse' || s === 'vienessewaltz' || s === 'vienesewaltz') return 'viennesewaltz';
  if (s === 'slowfoxtrot' || s === 'foxtrot' || s === 'slowfox' || s === 'fox' || s === 'sf') return 'slowfoxtrot';
  if (s === 'quickstep' || s === 'qs') return 'quickstep';
  if (s === 'samba' || s === 'sa') return 'samba';
  if (s === 'chachacha' || s === 'chacha' || s === 'cha' || s === 'cc') return 'chachacha';
  if (s === 'rumba' || s === 'rhumba' || s === 'ru') return 'rumba';
  if (s === 'pasodoble' || s === 'paso' || s === 'pd') return 'pasodoble';
  if (s === 'jive' || s === 'ji') return 'jive';
  if (s === 'fitness') return 'fitness';
  return s;
}

export interface StyleTempo {
  mpm: number; // Bars per minute (Ballroom standard tempo)
  bpm: number; // Beats per minute (mpm * timeSignature)
}

/**
 * Ballroom Competition Standard Tempos:
 * Cha Cha Cha: 31 Bars (124 BPM)
 * Samba: 51 Bars (102 BPM)
 * Rumba: 25 Bars (100 BPM)
 * Paso Doble: 59 Bars (118 BPM)
 * Jive: 43 Bars (172 BPM)
 *
 * Slow Waltz: 29 Bars (87 BPM)
 * Tango: 32 Bars (64 BPM)
 * Viennese Waltz: 59 Bars (177 BPM)
 * Slow Foxtrot: 29 Bars (116 BPM)
 * Quickstep: 50 Bars (200 BPM)
 */
export const STANDARD_STYLE_TEMPOS: Record<string, StyleTempo> = {
  chachacha: { mpm: 31, bpm: 124 },
  samba: { mpm: 51, bpm: 102 },
  rumba: { mpm: 25, bpm: 100 },
  pasodoble: { mpm: 59, bpm: 118 },
  jive: { mpm: 43, bpm: 172 },
  slowwaltz: { mpm: 29, bpm: 87 },
  tango: { mpm: 32, bpm: 64 },
  viennesewaltz: { mpm: 59, bpm: 177 },
  slowfoxtrot: { mpm: 29, bpm: 116 },
  quickstep: { mpm: 50, bpm: 200 },
};

export function getDefaultTempoForStyle(styleName?: string): StyleTempo | null {
  if (!styleName) return null;
  const canon = canonicalStyle(styleName);
  return STANDARD_STYLE_TEMPOS[canon] || null;
}

export function getStyleInfo(styleName: string): DanceStyleInfo | undefined {
  const canon = canonicalStyle(styleName);
  return DANCE_STYLES.find(s => canonicalStyle(s.name) === canon);
}

/**
 * Identifies a dance style specifically from a filename string part.
 * More strict than global keyword searching to avoid false positives.
 */
export function getStyleFromFilenamePart(part: string): string | null {
  const p = part.toLowerCase().trim();
  if (p === 'cha cha' || p === 'chacha' || p === 'cha-cha' || p === 'cha-cha-cha') return 'Cha-Cha-Cha';
  if (p === 'samba') return 'Samba';
  if (p === 'rumba' || p === 'rhumba') return 'Rumba';
  if (p === 'jive') return 'Jive';
  if (p === 'paso' || p === 'paso doble') return 'Paso Doble';
  if (p === 'viennese' || p === 'viennese waltz' || p === 'vienesse' || p === 'vienesse waltz') return 'Viennese Waltz';
  if (p === 'waltz' || p === 'slow waltz') return 'Slow Waltz';
  if (p === 'tango') return 'Tango';
  if (p === 'foxtrot' || p === 'slow foxtrot') return 'Slow Foxtrot';
  if (p === 'quickstep') return 'Quickstep';
  return null;
}

export function getStyleFromText(text: string): string | null {
  if (!text) return null;
  const t = text.toLowerCase();
  if (t.includes('cha cha') || t.includes('chacha') || t.includes('chachacha') || t.includes('cha-cha')) return 'Cha-Cha-Cha';
  if (t.includes('samba')) return 'Samba';
  if (t.includes('rumba') || t.includes('rhumba')) return 'Rumba';
  if (t.includes('paso') || t.includes('pasodoble')) return 'Paso Doble';
  if (t.includes('jive')) return 'Jive';
  if (t.includes('viennese') || t.includes('vienesse')) return 'Viennese Waltz';
  if (t.includes('waltz') || t.includes('walzer')) return 'Slow Waltz';
  if (t.includes('tango')) return 'Tango';
  if (t.includes('foxtrot') || t.includes('slow fox')) return 'Slow Foxtrot';
  if (t.includes('quickstep') || t.includes('quick step')) return 'Quickstep';
  return null;
}

export function getStyleFromBPM(bpm: number, filename?: string): string {
  if (filename) {
    const fromText = getStyleFromText(filename);
    if (fromText) return fromText;
  }
  if (!bpm || bpm === 0) return 'Samba'; 
  const fnLower = filename?.toLowerCase() || '';
  
  // High Priority: Explicit filename keywords
  const parts = fnLower.split(/[\s\-_—]/).map(s => s.trim());
  for (const part of parts) {
    const matched = getStyleFromFilenamePart(part);
    if (matched) return matched;
  }

  // Final Fallback: Rhythmic analysis
  for (const style of DANCE_STYLES) {
    const mpm = bpm / style.timeSignature;
    if (mpm >= style.minMPM - 2 && mpm <= style.maxMPM + 2) {
      return style.name;
    }
  }
  return ''; 
}

export function getMPMFromBPM(bpm: number, styleName: string): number {
  const style = getStyleInfo(styleName);
  if (!style) return 0;
  return Number((bpm / style.timeSignature).toFixed(1));
}

export function getBPMFromMPM(mpm: number, styleName: string): number {
  const style = getStyleInfo(styleName);
  if (!style) return 0;
  return Math.round(mpm * style.timeSignature);
}
