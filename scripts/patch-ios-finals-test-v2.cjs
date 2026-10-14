// One-shot, exact-anchor patch on the isolated development branch.
// This script and its execution workflow are removed before release.
const fs = require('node:fs');
const crypto = require('node:crypto');
const path = 'src/components/audio/AudioProvider.tsx';
let source = fs.readFileSync(path, 'utf8');
const blob = Buffer.from(source);
const sha = crypto.createHash('sha1').update(Buffer.concat([Buffer.from(`blob ${blob.length}\0`), blob])).digest('hex');
if (sha !== 'da5a279f38fab9d1ff193b75c841135111a82119') throw new Error('AudioProvider changed; inspect and rebase rather than applying blindly');
function replaceOnce(before, after) {
  if (source.split(before).length !== 2) throw new Error('Expected one anchor: ' + before.slice(0, 100));
  source = source.replace(before, after);
}
replaceOnce("import { getAudioFile } from '@/utils/storage';", "import { getAudioFile } from '@/utils/storage';\nimport { isNativeFinalTestEnabled } from '@/utils/iosFinalDiagnostic';\nimport IosFinalAudioTestBadge from './IosFinalAudioTestBadge';");
replaceOnce('  const [isFinalMode, setIsFinalMode] = useState(false); // Default to Normal Mode', `  const [isFinalMode, setIsFinalMode] = useState(false); // Default to Normal Mode
  const [showIosAudioTest, setShowIosAudioTest] = useState(false);
  useEffect(() => {
    // Capture the entry URL before login/navigation drops its query parameters.
    setShowIosAudioTest(isIOS() && isNativeFinalTestEnabled());
  }, []);`);
replaceOnce(`  // Can this browser change HTMLMediaElement.volume? (false on iPhone/iPad,
  // where volume is read-only). Only those devices need the WebAudio gain
  // chain for the Final-Mode fade; everyone else fades the plain element.
  // Diagnostic only: compare iOS native playback against the Final WebAudio
  // gain route without changing the default experience. Native iOS playback
  // does not support the app-controlled 3-second fade; NEVER enable globally.
  // Use ?iosFinalNative=1 on a test installation to isolate Safari's crackle.
  const useNativeFinalDiagnostic = () =>
    isIOS() && typeof window !== 'undefined' &&
    new URLSearchParams(window.location.search).get('iosFinalNative') === '1';

  const isVolumeWritable = () => {
    if (useNativeFinalDiagnostic()) return true;
    if (isIOS()) return false;
    return true;
  };`, `  // Device capability and diagnostic routing are separate: opting into native
  // playback does NOT make element.volume writable on iOS or implement a fade.
  const isVolumeWritable = () => !isIOS();
  const useNativeFinalDiagnostic = () => isIOS() && isNativeFinalTestEnabled();`);
replaceOnce('      const needsGainElement = isFinalModeRef.current && !isVolumeWritable();', '      const needsGainElement = isFinalModeRef.current && !isVolumeWritable() && !useNativeFinalDiagnostic();');
replaceOnce('      const wantGain = nextVal && !isVolumeWritable();', '      const wantGain = nextVal && !isVolumeWritable() && !useNativeFinalDiagnostic();');
replaceOnce(`          audio.onplaying = () => {
            if (currentToken !== loadingTokenRef.current || isPauseCountdownRef.current) return;
            monitorPlaybackRef.current?.();
          };`, `          audio.onplaying = () => {
            if (currentToken !== loadingTokenRef.current || isPauseCountdownRef.current) return;
            // loadTrack/autoadvance can call play() without playAudio(). Apply the
            // same cleanup there: the song now owns the audio session, so the
            // sub-millisecond silent looping heartbeat must not keep rendering.
            heartbeatRef.current?.pause();
            monitorPlaybackRef.current?.();
          };`);
replaceOnce(`      <PlayerTimeContext.Provider value={timeValue}>
        {children}
      </PlayerTimeContext.Provider>`, `      <PlayerTimeContext.Provider value={timeValue}>
        {children}
        {showIosAudioTest && <IosFinalAudioTestBadge audio={nativePlayerRef.current}
          gainActive={isGainActive()} finalMode={isFinalMode} rest={isPauseCountdown} />}
      </PlayerTimeContext.Provider>`);
fs.writeFileSync(path, source);

const testPath = 'tests/audio-provider.test.tsx';
let tests = fs.readFileSync(testPath, 'utf8');
tests += `

describe('iOS native Finals test entry and media cleanup', () => {
  it('retains native routing after navigation and displays the actual audio route', async () => {
    const ua = vi.spyOn(navigator, 'userAgent', 'get').mockReturnValue('Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X)');
    const createContext = vi.fn();
    vi.stubGlobal('AudioContext', createContext);
    try {
      window.history.replaceState(null, '', '/?iosFinalNative=1');
      await act(async () => { root.render(<AudioProvider key="ios-native-test"><Probe /></AudioProvider>); });
      window.history.pushState(null, '', '/library/finals');
      await act(async () => { api.setBpm(95); api.setSessionTracks([track('native')] as any); api.loadTrack(track('native'), false, true); });
      await flush();
      expect(createContext).not.toHaveBeenCalled();
      expect(active().playbackRate).toBe(.95);
      expect(active().preservesPitch).toBe(true);
      const badge = document.querySelector('[data-testid="ios-finals-audio-test"]');
      expect(badge?.getAttribute('data-audio-route')).toBe('NATIVE');
      expect(badge?.textContent).toContain('FINALS');
      expect(badge?.textContent).toContain('95%');
    } finally {
      window.history.replaceState(null, '', '/');
      ua.mockRestore();
    }
  });
  it('stops the heartbeat when a track is automatically started', async () => {
    await act(async () => { document.dispatchEvent(new Event('mousedown')); });
    const heartbeat = elements.find(e => e.src.startsWith('data:audio/wav'))!;
    expect(heartbeat.paused).toBe(false);
    await act(async () => { api.loadTrack(track('auto'), false, true); });
    await flush();
    expect(active().paused).toBe(false);
    expect(heartbeat.paused).toBe(true);
  });
});
`;
fs.writeFileSync(testPath, tests);
console.log('Applied exact-match iOS Finals diagnostic/heartbeat patch. No authentication, billing, or timer logic changed.');
