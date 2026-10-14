// Exact-anchor source edit, executed and tested only on the isolated branch.
// Removed with its one-shot workflow before release.
const fs = require('node:fs');
const crypto = require('node:crypto');
const path = 'src/components/audio/AudioProvider.tsx';
let source = fs.readFileSync(path, 'utf8');
const bytes = Buffer.from(source);
const sha = crypto.createHash('sha1').update(Buffer.concat([Buffer.from(`blob ${bytes.length}\0`), bytes])).digest('hex');
if (sha !== '15be3d99770d65b95874f285d3c2b41386edf5a0') throw new Error('AudioProvider changed; review rather than applying blindly');
function replaceOnce(before, after) {
  if (source.split(before).length !== 2) throw new Error('Expected exactly one anchor: ' + before.slice(0, 100));
  source = source.replace(before, after);
}
replaceOnce("import { getAudioFile } from '@/utils/storage';", "import { getAudioFile } from '@/utils/storage';\nimport { setElementVolume } from '@/utils/mediaControls';");
replaceOnce('setShowIosAudioTest(isIOS() && isNativeFinalTestEnabled());', 'setShowIosAudioTest(isNativeFinalTestEnabled());');
replaceOnce('      nativePlayerRef.current.volume = Math.max(0, Math.min(1, v));', '      setElementVolume(nativePlayerRef.current, v, isVolumeWritable());');
replaceOnce('                  nativePlayerRef.current.volume = baseVol * ratio;', '                  setElementVolume(nativePlayerRef.current, baseVol * ratio, isVolumeWritable());');
replaceOnce('                audio.volume = Math.max(0, volumeRef.current * ratio);', `                // Native iOS has no app-controlled volume/fade. Do not keep
                // writing this property during pitch-corrected playback.
                setElementVolume(audio, volumeRef.current * ratio, isVolumeWritable());`);
fs.writeFileSync(path, source);

const badgePath = 'src/components/audio/IosFinalAudioTestBadge.tsx';
let badge = fs.readFileSync(badgePath, 'utf8');
if (!badge.includes('AUDIO TEST 2') || !badge.includes('PITCH {')) throw new Error('Badge changed');
badge = badge.replace('AUDIO TEST 2', 'AUDIO TEST 3').replace('PITCH {', 'PITCH SETTING {');
badge = badge.replace('<div>საცდელი რეჟიმი — iPhone-ზე ფეიდაუთი გარანტირებული არ არის.</div>', '<div>ტონის პარამეტრი ჩანს — ხმის ხარისხი არ იზომება. iPhone-ზე ფეიდაუთი გარანტირებული არ არის.</div>');
fs.writeFileSync(badgePath, badge);

const testPath = 'tests/audio-provider.test.tsx';
let tests = fs.readFileSync(testPath, 'utf8');
tests += `

describe('Finals native media-control stability', () => {
  it('never writes native iOS volume through tempo, pause, fade and rest transitions', async () => {
    const ua = vi.spyOn(navigator, 'userAgent', 'get').mockReturnValue('Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X)');
    const createContext = vi.fn();
    vi.stubGlobal('AudioContext', createContext);
    const volumeWrite = vi.fn();
    const plain = elements[0];
    Object.defineProperty(plain, 'volume', { configurable: true, get: () => 1, set: volumeWrite });
    try {
      window.history.replaceState(null, '', '/?iosFinalNative=1');
      await act(async () => { api.setBpm(95); api.setSessionTracks([track('native-a'), track('native-b')] as any); api.loadTrack(track('native-a'), false, true); });
      await flush();
      expect(createContext).not.toHaveBeenCalled();
      expect(active()).toBe(plain);
      await tick(10);
      await act(async () => { api.setVolume(.4); await api.togglePlay(); });
      await tick(5);
      expect(api.isPlaying).toBe(false);
      await act(async () => { await api.togglePlay(); api.setBpm(80); });
      await tick(95);
      expect(api.isPauseCountdown).toBe(true);
      expect(active().playbackRate).toBe(1);
      await tick(15);
      expect(api.isPauseCountdown).toBe(false);
      expect(api.title).toBe('native-b');
      expect(active().playbackRate).toBe(.8);
      expect(active().preservesPitch).toBe(true);
      expect(volumeWrite).not.toHaveBeenCalled();
    } finally {
      window.history.replaceState(null, '', '/');
      localStorage.clear();
      ua.mockRestore();
    }
  });
  it('shows requested test diagnostics on desktop without changing desktop routing', async () => {
    const ua = vi.spyOn(navigator, 'userAgent', 'get').mockReturnValue('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)');
    const createContext = vi.fn();
    vi.stubGlobal('AudioContext', createContext);
    try {
      window.history.replaceState(null, '', '/?iosFinalNative=1');
      await act(async () => { root.render(<AudioProvider key="desktop-native-test"><Probe /></AudioProvider>); });
      await act(async () => { api.setBpm(95); api.loadTrack(track('desktop'), false, true); });
      await flush();
      expect(createContext).not.toHaveBeenCalled();
      const badge = document.querySelector('[data-testid="ios-finals-audio-test"]');
      expect(badge?.textContent).toContain('AUDIO TEST 3');
      expect(badge?.textContent).toContain('PITCH SETTING ON');
      expect(badge?.getAttribute('data-audio-route')).toBe('NATIVE');
      expect(active().playbackRate).toBe(.95);
    } finally {
      window.history.replaceState(null, '', '/');
      localStorage.clear();
      ua.mockRestore();
    }
  });
});
`;
fs.writeFileSync(testPath, tests);
console.log('Patched native volume guards and diagnostic clarity. Timing, authorization and audio routing defaults unchanged.');
