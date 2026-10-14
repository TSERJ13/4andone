// Real PCM checks on the bundled renderer in both Chromium and WebKit.
// No catalogue requests, microphone access, payments, or private account data.
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const assert = require('node:assert/strict');
const { build } = require('esbuild');
const { chromium, webkit } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
(async () => {
  const directory = '/tmp/4andone-render-audit'; fs.mkdirSync(directory, { recursive: true });
  await build({ entryPoints: ['src/utils/renderFinalAudio.ts'], bundle: true, format: 'esm', platform: 'browser', outfile: directory + '/render.mjs' });
  const server = http.createServer((req, res) => {
    const url = new URL(req.url, 'http://localhost');
    const file = url.pathname === '/render.mjs' ? directory + '/render.mjs' : path.join(process.cwd(), 'public', url.pathname);
    if (url.pathname === '/') { res.setHeader('Content-Type', 'text/html'); res.end('<!doctype html><title>Rendered pitch audit</title>'); return; }
    if (url.pathname.includes('..') || !fs.existsSync(file)) { res.writeHead(404); res.end(); return; }
    res.setHeader('Content-Type', file.endsWith('.mjs') ? 'text/javascript' : 'application/octet-stream');
    res.end(fs.readFileSync(file));
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const results = [];
  try {
    for (const [name, engine] of [['chromium', chromium], ['webkit', webkit]]) {
      const browser = await engine.launch({ headless: true });
      try {
        const page = await browser.newPage();
        page.setDefaultTimeout(90000);
        await page.goto('http://127.0.0.1:' + server.address().port);
        const measured = await page.evaluate(async () => {
          const { renderFinalAudio, encodeFinalWav, clearFinalRenderCache } = await import('/render.mjs');
          const sr = 44100, length = sr * 8;
          const left = new Float32Array(length), right = new Float32Array(length);
          for (let i = 0; i < length; i++) {
            left[i] = 0.18 * Math.sin(2 * Math.PI * 440 * i / sr) + 0.1 * Math.sin(2 * Math.PI * 660 * i / sr);
            right[i] = 0.18 * Math.sin(2 * Math.PI * 880 * i / sr);
          }
          const url = URL.createObjectURL(encodeFinalWav([left, right], sr, 0));
          const rows = [];
          // Six remaining seconds also exercises short-recording looping at 150%.
          for (const percent of [100, 95, 80, 50, 120, 150]) {
            const started = performance.now();
            const result = await renderFinalAudio({ url, cacheKey: 'synthetic-stereo', percent, elapsedStart: 99, signal: new AbortController().signal });
            const decoded = await new OfflineAudioContext(2, 1, sr).decodeAudioData(await result.blob.arrayBuffer());
            const a = decoded.getChannelData(0), b = decoded.getChannelData(1);
            const magnitude = (samples, hz) => {
              let re = 0, im = 0;
              const start = sr, count = sr;
              for (let i = 0; i < count; i++) {
                const window = 0.5 - 0.5 * Math.cos(2 * Math.PI * i / (count - 1));
                const value = samples[start + i] * window;
                re += value * Math.cos(2 * Math.PI * hz * i / sr);
                im -= value * Math.sin(2 * Math.PI * hz * i / sr);
              }
              return Math.hypot(re, im) / count;
            };
            const peak = (samples, target) => {
              let best = -1, frequency = 0;
              for (let hz = target - 8; hz <= target + 8; hz += 0.5) {
                const value = magnitude(samples, hz); if (value > best) { best = value; frequency = hz; }
              }
              return { frequency, amplitude: best };
            };
            const rms = (samples, begin, seconds) => {
              let sum = 0, count = Math.floor(seconds * sr);
              for (let i = 0; i < count; i++) sum += samples[Math.floor(begin * sr) + i] ** 2;
              return Math.sqrt(sum / count);
            };
            rows.push({ percent, duration: decoded.duration, channels: decoded.numberOfChannels,
              notes: [peak(a, 440), peak(a, 660), peak(b, 880)],
              fadeRatio: rms(b, 5.9, 0.08) / rms(b, 2, 0.08),
              lastSample: b[b.length - 1], renderMs: performance.now() - started });
          }
          URL.revokeObjectURL(url); clearFinalRenderCache(); return rows;
        });
        for (const row of measured) {
          assert.ok(Math.abs(row.duration - 6) < 1 / 44100, JSON.stringify(row));
          assert.equal(row.channels, 2);
          row.notes.forEach((note, i) => {
            assert.ok(Math.abs(note.frequency - [440, 660, 880][i]) <= 2, JSON.stringify(row));
            assert.ok(note.amplitude > 0.005, 'Silent or missing note: ' + JSON.stringify(row));
          });
          assert.ok(row.fadeRatio < 0.1, 'Missing fade: ' + JSON.stringify(row));
          assert.equal(row.lastSample, 0);
        }
        results.push({ engine: name, rows: measured });
      } finally { await browser.close(); }
    }
    fs.mkdirSync('docs/audits', { recursive: true });
    fs.writeFileSync('docs/audits/2026-10-14-rendered-pitch.json', JSON.stringify(results, null, 2) + '\n');
    console.log(JSON.stringify(results, null, 2));
  } finally { server.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
