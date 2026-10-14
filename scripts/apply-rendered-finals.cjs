// One-shot integration on the candidate branch. Fail closed on changed anchors.
const fs = require('node:fs');
const crypto = require('node:crypto');
const filename = 'src/components/audio/AudioProvider.tsx';
let source = fs.readFileSync(filename, 'utf8');
const replace = (before, after, count = 1) => {
  if (source.split(before).length - 1 !== count) throw new Error('Unexpected anchor count: ' + before.slice(0, 110));
  source = source.split(before).join(after);
};
if (!source.includes('const renderedFinalRef = useRef')) {
  const bytes = Buffer.from(source);
  const sha = crypto.createHash('sha1').update(Buffer.concat([Buffer.from(`blob ${bytes.length}\0`), bytes])).digest('hex');
  if (sha !== '15be3d99770d65b95874f285d3c2b41386edf5a0') throw new Error('Inspect/rebase AudioProvider before applying this integration');
  replace("import { isNativeFinalTestEnabled } from '@/utils/iosFinalDiagnostic';", `import { isNativeFinalTestEnabled } from '@/utils/iosFinalDiagnostic';
import { isRenderedFinalTestEnabled } from '@/utils/renderedFinalTest';
import { renderFinalAudio, renderedSourcePosition, clearFinalRenderCache, type RenderedFinalAudio, type FinalRenderPlan } from '@/utils/renderFinalAudio';
import RenderedFinalAudioBadge from './RenderedFinalAudioBadge';`);
  replace('  const [showIosAudioTest, setShowIosAudioTest] = useState(false);', `  const [showIosAudioTest, setShowIosAudioTest] = useState(false);
  const [showRenderedFinalTest, setShowRenderedFinalTest] = useState(false);
  const renderedFinalRef = useRef<RenderedFinalAudio | null>(null);
  const renderPlanRef = useRef<FinalRenderPlan | null>(null);
  const renderAbortRef = useRef<AbortController | null>(null);`);
  replace('    setShowIosAudioTest(isIOS() && isNativeFinalTestEnabled());', `    setShowIosAudioTest(isIOS() && isNativeFinalTestEnabled());
    setShowRenderedFinalTest(isRenderedFinalTestEnabled());`);
  replace('loadingTokenRef.current += 1;', `renderAbortRef.current?.abort();
    renderedFinalRef.current = null;
    renderPlanRef.current = null;
    clearFinalRenderCache();
    loadingTokenRef.current += 1;`, 2);
  replace('  type LoadOptions = { startAt?: number; paused?: boolean; fromRest?: boolean };', '  type LoadOptions = { startAt?: number; paused?: boolean; fromRest?: boolean; finalElapsed?: number; renderFinal?: boolean };');
  replace('    const startAt = opts?.startAt && opts.startAt > 0 ? opts.startAt : 0;', `    const sourceStartAt = opts?.startAt && opts.startAt > 0 ? opts.startAt : 0;
    let startAt = sourceStartAt;`);
  replace('    if (track?.id) recordTrackPlayed(track.id);', '    if (track?.id && opts?.finalElapsed === undefined) recordTrackPlayed(track.id);');
  replace('    cancelLoadRef.current?.();\n    const currentToken = ++loadingTokenRef.current;', '    cancelLoadRef.current?.();\n    renderAbortRef.current?.abort();\n    const currentToken = ++loadingTokenRef.current;');
  replace('      // Use native pitch-corrected playback. iOS alone needs a gain path for fades.', `      // Opt-in rendered Finals: time-stretch samples ahead of playback, then
      // play the prepared file at 1x. Normal playback/authorization is unchanged.
      const renderThisFinal = isFinalModeRef.current && !isFitnessRef.current
        && (opts?.renderFinal === true || isRenderedFinalTestEnabled());
      const initialElapsed = Number.isFinite(opts?.finalElapsed)
        ? Math.min(FINAL_DANCE_SECONDS, Math.max(0, opts!.finalElapsed!))
        : startAt ? Math.min(FINAL_DANCE_SECONDS - FINAL_FADE_SECONDS, startAt / playbackRateFor(bpmRef.current)) : 0;
      const renderPlan: FinalRenderPlan | null = renderThisFinal
        ? { sourceStart: sourceStartAt, elapsedStart: initialElapsed, percent: bpmRef.current, paused: !!opts?.paused, ready: false }
        : null;
      renderPlanRef.current = renderPlan;
      renderedFinalRef.current = null;
      // Only the legacy iOS route needs a live gain graph for the fade.`);
  replace('      const needsGainElement = isFinalModeRef.current && !isVolumeWritable() && !useNativeFinalDiagnostic();', '      const needsGainElement = isFinalModeRef.current && !isVolumeWritable() && !useNativeFinalDiagnostic() && !renderThisFinal;');
  replace(`        finalsClockRef.current.reset(startAt, playbackRateFor(bpmRef.current),
          startAt ? Math.min(FINAL_DANCE_SECONDS - FINAL_FADE_SECONDS, startAt / playbackRateFor(bpmRef.current)) : 0);`, '        finalsClockRef.current.reset(startAt, playbackRateFor(bpmRef.current), initialElapsed);');
  replace('      const continuesFinalSession = isFinalModeRef.current', '      const continuesFinalSession = (renderPlan !== null && initialElapsed > 0) || isFinalModeRef.current');
  replace('      const setupPlayer = (url: string) => {', `      if (renderPlan) {
        const controller = new AbortController();
        renderAbortRef.current = controller;
        const prepared = await renderFinalAudio({ url: finalUrl,
          cacheKey: String(track.id) + '|' + String(track.audioUrl), percent: renderPlan.percent,
          sourceStart: renderPlan.sourceStart, elapsedStart: renderPlan.elapsedStart, signal: controller.signal });
        if (currentToken !== loadingTokenRef.current || controller.signal.aborted) return;
        // The input blob, when offline, is no longer needed after decoding.
        if (activeBlobUrlRef.current) URL.revokeObjectURL(activeBlobUrlRef.current);
        finalUrl = URL.createObjectURL(prepared.blob);
        activeBlobUrlRef.current = finalUrl;
        renderedFinalRef.current = prepared;
        startAt = 0;
        finalsClockRef.current.reset(0, 1, prepared.elapsedStart);
      }

      const setupPlayer = (url: string) => {`);
  replace('            const desiredRate = playbackRateFor(bpmRef.current);', '            const desiredRate = renderPlan ? 1 : playbackRateFor(bpmRef.current);');
  replace('setMusicTempo(audio, bpmRef.current);', 'setMusicTempo(audio, renderPlan ? 100 : bpmRef.current);', 2);
  replace('          audio.loop = (isFinalModeRef.current && !isFitnessRef.current) || (!isFinalModeRef.current && isRepeatRef.current);', '          audio.loop = !renderPlan && ((isFinalModeRef.current && !isFitnessRef.current) || (!isFinalModeRef.current && isRepeatRef.current));');
  replace(`        const audio = await setupPlayer(finalUrl);
        if (currentToken !== loadingTokenRef.current) return;
        if (startAt > 0) {`, `        const audio = await setupPlayer(finalUrl);
        if (currentToken !== loadingTokenRef.current) return;
        if (renderPlan) renderPlan.ready = true;
        if (startAt > 0) {`);
  replace('        if (opts?.paused) {', '        if (opts?.paused || renderPlan?.paused) {');
  replace('              if (!isFitnessRef.current && finalsClockRef.current.sample(audio.currentTime, audio.duration) < FINAL_DANCE_SECONDS) {', `              if (renderPlan) finalsClockRef.current.sample(audio.currentTime, audio.duration);
              if (!isFitnessRef.current && !renderPlan && finalsClockRef.current.sample(audio.currentTime, audio.duration) < FINAL_DANCE_SECONDS) {`);
  replace('              const ratio = Math.min(1, remaining / FINAL_FADE_SECONDS);', `              // Rendered samples already contain the fade; do not fade twice.
              if (renderPlan) return;
              const ratio = Math.min(1, remaining / FINAL_FADE_SECONDS);`);
  replace('                  finalsClockRef.current.reset(0, playbackRateFor(bpmRef.current));', '                  finalsClockRef.current.reset(0, renderPlan ? 1 : playbackRateFor(bpmRef.current));');
  replace(`                // Single-track Final: same as the 1:45 stop — rewind and wait
                audio.pause();
                setIsPlaying(false);
                isPlayingRef.current = false;
                audio.currentTime = 0;
                setCurrentTime(0);`, `                // Single-track Final: same as the 1:45 stop — rewind and wait
                audio.pause();
                setIsPlaying(false);
                isPlayingRef.current = false;
                audio.currentTime = 0;
                if (renderPlan) finalsClockRef.current.reset(0, 1);
                setCurrentTime(0);`);
  replace('    // Standard Final Mode: start the 15s rest countdown before the next track.', `    // Standard Final Mode: start the 15s rest countdown before the next track.
    renderedFinalRef.current = null;
    renderPlanRef.current = null;`);
  replace('      if (!startAt) try {', '      if (!sourceStartAt && opts?.finalElapsed === undefined) try {');
  replace('              const safeRate = Number.isFinite(bpmRef.current) && bpmRef.current > 0 ? bpmRef.current / 100 : 1.0;', '              const actualRate = nativePlayerRef.current.playbackRate;\n              const safeRate = Number.isFinite(actualRate) && actualRate > 0 ? actualRate : 1;');
  const start = source.indexOf('  const playAudio = React.useCallback(async () => {');
  const end = source.indexOf('  const pauseAudio = React.useCallback', start);
  if (start < 0 || end < 0) throw new Error('playAudio boundary missing');
  let play = source.slice(start, end);
  const playAnchor = '    const audio = nativePlayerRef.current;\n    if (!audio) return;\n    try {';
  if (!play.includes(playAnchor)) throw new Error('playAudio guard missing');
  play = play.replace(playAnchor, `    const audio = nativePlayerRef.current;
    if (!audio) return;
    if (renderPlanRef.current && !renderPlanRef.current.ready) return;
    // Replaying a completed partial render needs a fresh full-length slot.
    if (isFinalModeRef.current && renderedFinalRef.current?.elapsedStart
        && finalsClockRef.current.elapsed === 0 && audio.currentTime === 0) {
      loadTrackRef.current(playingTrackRef.current, true, true, { startAt: 0, finalElapsed: 0, renderFinal: true });
      return;
    }
    try {`);
  source = source.slice(0, start) + play + source.slice(end);
  const bpmStart = source.indexOf('  const setBpm = React.useCallback(');
  const bpmEnd = source.indexOf('  const seek = React.useCallback', bpmStart);
  if (bpmStart < 0 || bpmEnd < 0) throw new Error('setBpm boundary missing');
  source = source.slice(0, bpmStart) + `  const setBpm = React.useCallback((newBpm: number, persistent = true) => {
    const rate = playbackRateFor(newBpm);
    const audio = nativePlayerRef.current;
    const renderedMode = isFinalModeRef.current && !isFitnessRef.current
      && (isRenderedFinalTestEnabled() || !!renderedFinalRef.current || !!renderPlanRef.current);
    if (renderedMode) {
      // While dragging, update only the selector. Preparing intermediate speeds
      // wastes memory and repeatedly interrupts the music. Commit on release.
      if (!persistent || Math.abs(bpmRef.current - rate * 100) < 0.001) return;
      bpmRef.current = rate * 100;
      setBpmState(rate * 100);
      try { localStorage.setItem('4andone-bpm', String(rate * 100)); } catch {}
      if (isPauseCountdownRef.current) return; // Rest is never time-stretched.
      const track = playingTrackRef.current;
      if (!track) return;
      const plan = renderPlanRef.current;
      const prepared = renderedFinalRef.current;
      let position = plan?.sourceStart ?? audio?.currentTime ?? 0;
      let elapsed = plan?.elapsedStart ?? finalsClockRef.current.elapsed;
      let paused = plan?.paused ?? audio?.paused ?? false;
      if (prepared && plan?.ready && audio) {
        elapsed = finalsClockRef.current.sample(audio.currentTime, audio.duration);
        position = renderedSourcePosition(prepared, audio.currentTime);
        paused = audio.paused;
      }
      if (elapsed >= FINAL_DANCE_SECONDS) return;
      loadTrackRef.current(track, true, true, { startAt: position, finalElapsed: elapsed, paused, renderFinal: true });
      return;
    }
    if (audio && !isPauseCountdownRef.current) {
      finalsClockRef.current.changeRate(audio.currentTime, audio.duration, rate);
      setMusicTempo(audio, rate * 100);
    }
    bpmRef.current = rate * 100;
    if (persistent) {
      setBpmState(rate * 100);
      try { localStorage.setItem('4andone-bpm', String(rate * 100)); } catch {}
    }
  }, []);

` + source.slice(bpmEnd);
  replace(`      const wantGain = nextVal && !isVolumeWritable() && !useNativeFinalDiagnostic();
      const onGain = audio === finalPlayerRef.current;
      if (wantGain !== onGain) {
        loadTrackRef.current(track, true, nextVal, { startAt: audio.currentTime || 0, paused: audio.paused });
      }`, `      const prepared = renderedFinalRef.current;
      const plan = renderPlanRef.current;
      const sourcePosition = prepared && plan?.ready ? renderedSourcePosition(prepared, audio.currentTime)
        : (plan?.sourceStart ?? audio.currentTime) || 0;
      const wantRender = nextVal && !isFitnessRef.current && isRenderedFinalTestEnabled();
      const wantGain = nextVal && !isVolumeWritable() && !useNativeFinalDiagnostic() && !wantRender;
      const onGain = audio === finalPlayerRef.current;
      if (wantGain !== onGain || prepared || plan || wantRender) {
        loadTrackRef.current(track, true, nextVal, { startAt: sourcePosition,
          paused: plan && !plan.ready ? plan.paused : audio.paused, renderFinal: wantRender });
      }`);
  replace(`        {showIosAudioTest && <IosFinalAudioTestBadge audio={nativePlayerRef.current}
          gainActive={isGainActive()} finalMode={isFinalMode} rest={isPauseCountdown} />}`, `        {showIosAudioTest && !showRenderedFinalTest && <IosFinalAudioTestBadge audio={nativePlayerRef.current}
          gainActive={isGainActive()} finalMode={isFinalMode} rest={isPauseCountdown} />}
        {showRenderedFinalTest && <RenderedFinalAudioBadge percent={bpm}
          ready={!!renderedFinalRef.current && !!renderPlanRef.current?.ready}
          loading={isLoading} error={error} rest={isPauseCountdown} />}`);
  fs.writeFileSync(filename, source);
}

const testFile = 'tests/audio-provider.test.tsx';
let tests = fs.readFileSync(testFile, 'utf8');
if (!tests.includes("describe('rendered Finals integration'")) {
  const tr = (before, after) => { if (!tests.includes(before)) throw new Error('Test anchor missing: ' + before); tests = tests.replace(before, after); };
  tr("vi.mock('@/utils/storage'", `const renderState = vi.hoisted(() => ({ duration: 105, fail: false, requests: [] as any[], gate: null as Promise<void> | null }));
vi.mock('@/utils/renderFinalAudio', async (original) => {
  const actual = await original<typeof import('../src/utils/renderFinalAudio')>();
  return { ...actual, renderFinalAudio: vi.fn(async (request) => {
    renderState.requests.push(request);
    if (renderState.gate) await renderState.gate;
    if (renderState.fail) throw new Error('Test rendering failure');
    renderState.duration = 105 - (request.elapsedStart ?? 0);
    return { blob: new Blob(['test'], { type: 'audio/wav' }), percent: request.percent,
      sourceStart: request.sourceStart ?? 0, sourceDuration: 180,
      elapsedStart: request.elapsedStart ?? 0, duration: renderState.duration };
  }) };
});
vi.mock('@/utils/storage'`);
  tr("e.src.endsWith('/audio/rest-15s.mp3')", "e.src.endsWith('/audio/rest-15s.mp3') || e.src === 'blob:rendered-final'");
  tr('  vi.useFakeTimers(); elements = []; states = new Map(); localStorage.clear();', `  vi.useFakeTimers(); elements = []; states = new Map(); localStorage.clear();
  window.history.replaceState(null, '', '/');
  renderState.duration = 105; renderState.fail = false; renderState.requests = []; renderState.gate = null;`);
  tr("URL.createObjectURL = vi.fn(() => 'blob:test');", "URL.createObjectURL = vi.fn((blob: Blob) => blob.type === 'audio/wav' ? 'blob:rendered-final' : 'blob:test');");
  tr("duration: { get: () => audio.src.includes('rest-15s') ? 15 : 180 },", "duration: { get: () => audio.src.includes('rest-15s') ? 15 : audio.src === 'blob:rendered-final' ? renderState.duration : 180 },");
  tests += `

async function enableRenderedFinals() {
  window.history.replaceState(null, '', '/?finalsRender=1');
  await act(async () => { root.render(<AudioProvider key="rendered-mode"><Probe /></AudioProvider>); });
}
describe('rendered Finals integration', () => {
  it('plays prepared audio at 1x for a 105/15/105 program while retaining the requested tempo', async () => {
    await enableRenderedFinals(); const song = track('rendered');
    await act(async () => { api.setBpm(95); api.setSessionTracks([song, song] as any); api.loadTrack(song, false, true); }); await flush();
    expect(api.bpm).toBe(95); expect(active().playbackRate).toBe(1); expect(active().defaultPlaybackRate).toBe(1); expect(active().loop).toBe(false);
    expect(document.querySelector('[data-testid="rendered-finals-test"]')?.getAttribute('data-rendered-ready')).toBe('true');
    await tick(103.5); expect(active().volume).toBe(1); // Fade is in the samples, not doubled in the element.
    await tick(1.5); expect(api.isPauseCountdown).toBe(true); expect(active().src).toContain('rest-15s');
    await tick(15); expect(api.isPauseCountdown).toBe(false); expect(active().playbackRate).toBe(1);
    await tick(105); expect(api.isPlaying).toBe(false); expect(api.isFinalMode).toBe(false);
  });
  it('reprepares from the same musical position without resetting the 105-second clock', async () => {
    await enableRenderedFinals(); const song = track('tempo');
    await act(async () => { api.setBpm(95); api.setSessionTracks([song, track('next')] as any); api.loadTrack(song, false, true); }); await flush();
    await tick(10);
    await act(async () => { api.setBpm(80, false); }); expect(renderState.requests).toHaveLength(1);
    await act(async () => { api.setBpm(80); }); await flush();
    const request = renderState.requests.at(-1);
    expect(request.sourceStart).toBeCloseTo(9.5); expect(request.elapsedStart).toBeCloseTo(10);
    expect(api.bpm).toBe(80); expect(active().playbackRate).toBe(1); expect(api.currentTime).toBeCloseTo(10);
    await tick(95); expect(api.isPauseCountdown).toBe(true);
  });
  it('keeps a paused dance paused when preparing a different tempo', async () => {
    await enableRenderedFinals();
    await act(async () => { api.setBpm(95); api.loadTrack(track('paused'), false, true); }); await flush(); await tick(5);
    await act(async () => { await api.togglePlay(); api.setBpm(80); }); await flush();
    expect(api.isPlaying).toBe(false); expect(active().paused).toBe(true); expect(active().playbackRate).toBe(1);
  });
  it('returns to the original file and source position when Finals is disabled', async () => {
    await enableRenderedFinals();
    await act(async () => { api.setBpm(95); api.loadTrack(track('return'), false, true); }); await flush(); await tick(10);
    await act(async () => { api.toggleFinalMode(); }); await flush();
    expect(api.isFinalMode).toBe(false); expect(active().src).toContain('test.mp3');
    expect(active().currentTime).toBeCloseTo(9.5); expect(active().playbackRate).toBe(.95);
  });
  it('reports preparation failure instead of silently playing a detuned fallback', async () => {
    await enableRenderedFinals(); renderState.fail = true;
    await act(async () => { api.loadTrack(track('error'), false, true); }); await flush();
    expect(api.error).toBe('Test rendering failure'); expect(api.isPlaying).toBe(false); expect(api.isLoaded).toBe(false);
  });
  it('cancels preparation on Stop and never adopts a late result', async () => {
    await enableRenderedFinals(); let finish!: () => void;
    renderState.gate = new Promise<void>(resolve => { finish = resolve; });
    await act(async () => { api.loadTrack(track('cancel'), false, true); }); await flush();
    const request = renderState.requests[0]; expect(request).toBeDefined();
    await act(async () => { api.stop(); }); expect(request.signal.aborted).toBe(true);
    await act(async () => { finish(); }); await flush();
    expect(api.isPlaying).toBe(false); expect(api.title).toBe('No Track Selected'); expect(active()).toBeUndefined();
  });
});
`;
  fs.writeFileSync(testFile, tests);
}
console.log('Integrated rendered Finals behind an explicit default-off flag; original account checks are untouched.');
