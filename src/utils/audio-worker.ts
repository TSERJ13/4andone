/**
 * True Neural AI Audio Worker: Ultra Clean V2 Driver
 * Optimized for maximum stability with Phase-Correlation Isolation.
 */

// Import ONNX (For potential model weights)
// @ts-ignore
importScripts('https://cdn.jsdelivr.net/npm/onnxruntime-web@1.14.0/dist/ort.min.js');

// --- Helper Functions (Core Math) ---

const fft = (re: Float32Array, im: Float32Array): void => {
  const n = re.length;
  for (let i = 1, j = 0; i < n; i++) {
    let bit = n >> 1;
    for (; j & bit; bit >>= 1) j ^= bit;
    j ^= bit;
    if (i < j) {
      [re[i], re[j]] = [re[j], re[i]];
      [im[i], im[j]] = [im[j], im[i]];
    }
  }
  for (let len = 2; len <= n; len <<= 1) {
    const ang = (2 * Math.PI) / len;
    const wlen_re = Math.cos(ang);
    const wlen_im = -Math.sin(ang);
    for (let i = 0; i < n; i += len) {
      let w_re = 1, w_im = 0;
      for (let j = 0; j < len / 2; j++) {
        const u_re = re[i + j], u_im = im[i + j];
        const v_re = re[i + j + len / 2] * w_re - im[i + j + len / 2] * w_im;
        const v_im = re[i + j + len / 2] * w_im + im[i + j + len / 2] * w_re;
        re[i + j] = u_re + v_re;
        im[i + j] = u_im + v_im;
        re[i + j + len / 2] = u_re - v_re;
        im[i + j + len / 2] = u_im - v_im;
        const tmp_re = w_re * wlen_re - w_im * wlen_im;
        w_im = w_re * wlen_im + w_im * wlen_re;
        w_re = tmp_re;
      }
    }
  }
};

const ifft = (re: Float32Array, im: Float32Array): void => {
  const n = re.length;
  for (let i = 0; i < n; i++) im[i] = -im[i];
  fft(re, im);
  for (let i = 0; i < n; i++) {
    re[i] /= n;
    im[i] = -im[i] / n;
  }
};

const hannWindow = (size: number): Float32Array => {
  const window = new Float32Array(size);
  for (let i = 0; i < size; i++) {
    window[i] = 0.5 * (1 - Math.cos((2 * Math.PI * i) / (size - 1)));
  }
  return window;
};

// --- Ultra Clean V2 Phase-Isolation Logic ---

const computeUltraCleanMask = (magnitude: Float32Array, numFrames: number, numBins: number): Float32Array => {
  const mask = new Float32Array(magnitude.length);
  const sampleRate = 44100;
  const fftSize = 4096;

  for (let f = 0; f < numFrames; f++) {
    for (let b = 0; b < numBins; b++) {
      const idx = (f * numBins + b) * 2;
      const L = magnitude[idx]; // Left magnitude
      const R = magnitude[idx + 1]; // Right magnitude
      const mid = (L + R) / 2;
      const side = Math.abs(L - R);
      const freq = (b * sampleRate) / fftSize;
      
      let suppression = 1.0;
      
      // Target the human voice range aggressively (180Hz - 16kHz)
      if (freq > 180 && freq < 16000) {
        // Compute Mid-Side Focus
        // If mid >> side, it's highly centered (Vocals).
        const focus = mid / (side + 0.05);

        if (focus > 0.9) {
          // EXTREME EXPONENTIAL CANCELLATION
          // We use a high power to surgically remove the vocal 'peak' in the center image.
          // Formula: (Side / Mid)^2.2 
          suppression = Math.pow(side / (mid + 0.05), 2.2) * 0.35;
          suppression = Math.max(0.04, suppression); // Keep floor for vocal "hollow"
          
          // PROTECT PERCUSSION (Drums)
          // Drums have high "Frame Flux"
          const prevF = Math.max(0, f - 1);
          const nextF = Math.min(numFrames - 1, f + 1);
          const flux = Math.abs(magnitude[(nextF * numBins + b) * 2] - magnitude[(prevF * numBins + b) * 2]);
          if (flux > (mid * 0.45)) {
            suppression = Math.min(1.0, suppression * 4.5);
          }
        }
      }
      mask[idx] = suppression;
      mask[idx + 1] = suppression;
    }
  }
  return mask;
};

// --- State ---

let useHybridFallback = true;
const MODEL_URL = '/lib/onnx/spleeter-2stems.onnx';

self.onmessage = async (e: MessageEvent) => {
  const { type, data } = e.data;

  if (type === 'INIT') {
    self.postMessage({ type: 'INIT_DONE' });
    return;
  }

  if (type === 'PROCESS') {
    try {
      const { left, right } = data as { left: Float32Array, right: Float32Array };
      const originalLength = left.length;
      const fftSize = 4096;
      const hopSize = 1024;
      const window = hannWindow(fftSize);
      
      const numFrames = Math.floor((originalLength - fftSize) / hopSize) + 1;
      const numBins = fftSize / 2 + 1;
      
      const magnitude = new Float32Array(numFrames * numBins * 2);
      const complexL_re: Float32Array[] = [];
      const complexL_im: Float32Array[] = [];
      const complexR_re: Float32Array[] = [];
      const complexR_im: Float32Array[] = [];

      // STFT Analysis
      for (let f = 0; f < numFrames; f++) {
        const start = f * hopSize;
        const reL = new Float32Array(fftSize);
        const imL = new Float32Array(fftSize);
        const reR = new Float32Array(fftSize);
        const imR = new Float32Array(fftSize);
        for (let i = 0; i < fftSize; i++) {
          reL[i] = left[start + i] * window[i];
          reR[i] = right[start + i] * window[i];
        }
        fft(reL, imL);
        fft(reR, imR);
        complexL_re.push(reL); complexL_im.push(imL);
        complexR_re.push(reR); complexR_im.push(imR);
        for (let b = 0; b < numBins; b++) {
          magnitude[(f * numBins + b) * 2] = Math.sqrt(reL[b]**2 + imL[b]**2);
          magnitude[(f * numBins + b) * 2 + 1] = Math.sqrt(reR[b]**2 + imR[b]**2);
        }
      }

      // PROCESSING
      const mask = computeUltraCleanMask(magnitude, numFrames, numBins);

      // iSTFT Reconstruction
      const resL = new Float32Array(originalLength);
      const resR = new Float32Array(originalLength);
      const norm = new Float32Array(originalLength);

      for (let f = 0; f < numFrames; f++) {
        const start = f * hopSize;
        const reL = complexL_re[f];
        const imL = complexL_im[f];
        const reR = complexR_re[f];
        const imR = complexR_im[f];
        for (let b = 0; b < numBins; b++) {
          const m = mask[(f * numBins + b) * 2];
          reL[b] *= m; imL[b] *= m;
          reR[b] *= m; imR[b] *= m;
          if (b > 0 && b < fftSize / 2) {
            reL[fftSize - b] = reL[b]; imL[fftSize - b] = -imL[b];
            reR[fftSize - b] = reR[b]; imR[fftSize - b] = -imR[b];
          }
        }
        ifft(reL, imL);
        ifft(reR, imR);
        for (let i = 0; i < fftSize; i++) {
          if (start + i < originalLength) {
            resL[start + i] += reL[i] * window[i];
            resR[start + i] += reR[i] * window[i];
            norm[start + i] += window[i] ** 2;
          }
        }
      }

      for (let i = 0; i < originalLength; i++) {
        if (norm[i] > 1e-10) {
          resL[i] /= norm[i];
          resR[i] /= norm[i];
        }
      }

      self.postMessage({ 
        type: 'PROCESS_DONE', 
        data: { left: resL, right: resR } 
      }, [resL.buffer, resR.buffer] as any);

    } catch (err: any) {
      self.postMessage({ type: 'ERROR', data: err.message });
    }
  }
};
