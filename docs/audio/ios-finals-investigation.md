# iPhone Finals audio investigation — 2026-10-14

Status: diagnostic hardening and proposed replacement architecture, **not an audio-quality fix**. Base: `d22c6c9` (PR #42). The owner authorized main publication for device testing; this is not acoustic acceptance. Integrated main PR #43 while preserving its idempotent media updates and AUDIO TEST 3 badge.

## Findings from the repository

- Both the native element and the Finals gain element already request standard and WebKit pitch preservation. `setMusicTempo` persists defaultPlaybackRate; the first canplay reapplies the rate after load. There is no intentional pitch-off path in music playback.
- Finals on iOS normally creates a separate `MediaElementAudioSourceNode -> GainNode -> destination` graph. Ordinary playback uses a separate plain element. PR #42's explicit, device-local native test bypasses this graph. Its absence of scratching is a user observation, not proof that the native stretch algorithm is suitable for music.
- iOS native element volume is not writable in the way this fade needs. The native experiment therefore cannot satisfy all production requirements. Do not promote it globally.
- Setting a nonexistent `preservesPitch` property creates a JavaScript expando. Its true readback can falsely look like capability support. This branch only writes exposed APIs and labels readback **PITCH SETTING**, explicitly unmeasured. Older WebKit's prefixed-only API remains supported. This improves diagnostics; it does not establish the cause of the reported pitch drop.
- `scripts/audit/pitch.cjs` and the previous pitch-results JSON used Chromium and a gain-routed sine wave. They do not verify iPhone, native playback, timbre, transient quality, or background operation. The script now includes 95% and loads the extracted helper.
- At 95%, uncorrected 440 Hz becomes 418 Hz (about -88.8 cents). A measured change of that size suggests varispeed; warbling without that shift suggests stretch artefacts. Neither can be inferred from a true property alone.

## WebKit evidence and its limits

[Safari 17.2 added the unprefixed property](https://webkit.org/blog/14787/webkit-features-in-safari-17-2/); older engines used webkitPreservesPitch. API availability does not certify signal quality.

[WebKit 240405](https://bugs.webkit.org/show_bug.cgi?id=240405) covers choppy rate-changed media attached to AudioContext and pitch=false; it was marked fixed in March 2026. More directly, [WebKit commit 310521](https://results.webkit.org/commit?id=310521%40main&repository_id=webkit), dated April 3, 2026, adds pitch=true processing through MediaElementSourceNode. [283034](https://bugs.webkit.org/show_bug.cgi?id=283034) reports another iOS AudioContext/rate defect using a different stream graph. These are evidence of engine-specific behavior, not proof that this device has the same defect. A WebKit main commit is not evidence of the Safari build installed on the phone. Record the exact iOS version; do not promise that an OS update fixes this report.

## Proposed safe production route

Prefer **pre-rendered Finals assets at approved tempos**, played by the plain media element at playbackRate=1. Generate a pitch-preserving stretch of the authorized source, loop short content before rendering, trim to exactly 105 decoded seconds, and apply a linear fade from second 102 to 105. This removes both Safari's variable-rate stretcher and the MediaElementSource graph from Finals. Keep the existing dedicated 15-second rest asset and session ordering. Do not double-apply a runtime fade or divide the rendered asset clock by the requested tempo. Source position and rendered position need separate mappings for seek and resume.

A reproducible prototype filter (not executed in this branch) is:

```sh
ffmpeg -stream_loop -1 -i source.wav -af 'rubberband=tempo=0.95:pitch=1,atrim=duration=105,asetpts=PTS-STARTPTS,afade=t=out:st=102:d=3' -ar 48000 -c:a pcm_s24le finals-95.wav
```

Use a build with librubberband enabled. Verify decoded duration, leading latency, boundary samples, and musical quality; lossy encoding introduces padding considerations. No catalog material was downloaded, processed, or published in this investigation.

Deployment design before enabling: version each rendition by original content hash + tempo + algorithm + fade policy; keep the same private storage and authenticated signed-URL authorization as originals; validate Premium on the existing server path; never use the diagnostic query as entitlement; cache only under the existing authorized offline policy. Preload the next rendition during rest. Keep normal music playback unchanged. Select tempo before each dance; changing tempo mid-dance needs a designed rendered-position transition and prepared assets, not a silent fallback to broken rate processing. Missing variants must surface an explicit unavailable choice, never silently play the wrong tempo.

| Candidate | Benefit | Remaining cost or risk |
| --- | --- | --- |
| Offline Rubber Band | Independent pitch and tempo, offline processing; bake fade into samples | Rendition storage/preparation; verify algorithm latency and licensing; audition transients/stereo |
| Signalsmith Stretch, offline/worker or WASM AudioWorklet | MIT, polyphonic library, web implementation; independent tempo | Memory, startup, latency compensation, seek, underruns, interrupted/background AudioContext on real iPhones |
| SoundTouch / WSOLA | Established tempo processing | LGPL obligations; musical/transient quality at required rates; port/worklet and background validation |
| Native preservesPitch | No new processing dependency | Observed poor quality; property does not guarantee acoustic output; native iOS fade missing |

Primary references: [Rubber Band](https://breakfastquay.com/rubberband/), [integration and latency](https://breakfastquay.com/rubberband/integration.html), [FFmpeg filters](https://ffmpeg.org/ffmpeg-filters.html#rubberband), [Signalsmith](https://github.com/Signalsmith-Audio/signalsmith-stretch), [SoundTouch](https://soundtouch.surina.net/README.html). No new DSP dependency is installed by this branch. Offline rendering is the recommended next experiment, not an already implemented replacement.

## iPhone procedure

1. After the user-authorized deployment completes, use https://www.4and.one; a branch preview is also suitable. Open `/diagnostics/finals-audio.html`. Stop playback in other tabs/PWA. Keep hardware volume moderate and fixed.
2. With the 440 Hz source, compare NATIVE 100% ON, 95% ON, and 95% OFF. Then repeat with GAIN. Each Play builds a fresh element/context so a previously attached source cannot contaminate the native test. Press Stop between comparisons. A separate tuner/recording device should read near 440 Hz with ON and 418 Hz with OFF. Do not attach an analyser to the native element: that changes the experiment.
3. Select a local copy of the problematic music, repeat the same comparisons, and record separately: stable pitch, warble/timbre, scratching, dropout. The local file is not uploaded. A pure tone alone cannot approve music quality. Compare any independently pre-rendered 95% file at **100% playback rate**.
4. Record model, exact iOS version, Safari versus standalone, speaker versus wired/Bluetooth output, and result in the notes; Prepare report gives copyable JSON without media URLs or account tokens. A browser or desktop WebKit smoke check is not a physical iPhone test.
5. In the actual app, sign in with the existing Telegram flow and verify Premium access. Compare default `/?iosFinalNative=0` and opt-in `/?iosFinalNative=1&audioTest=3`, selecting Speed -5% (=95%). The latter remains a deliberately incomplete no-guaranteed-fade diagnostic. Use its off button afterward.
6. On the candidate that will eventually ship, run two full dances: 105 seconds each, audible continuous fade only during 102–105, exactly 15 seconds rest between them, no rest after the last. Repeat pause/resume, seeking, a short looping source, duplicate tracks, tempo changes, stalled network, headphones switching, lock/unlock, and Safari/PWA foreground/background. Record elapsed played time separately from buffering/paused wall time.
7. Preview authentication can be domain-restricted. If Telegram refuses the preview domain, report that constraint; do not change production bot settings or bypass authentication. An existing production-installed PWA still uses production code. A preview standalone test requires an installation whose start URL is the preview origin; verify origin/build and clear stale preview caches as needed.

## Validation

98 Vitest tests pass after integration with PR #43, including exposed/unavailable/prefixed-only/mixed pitch APIs, 95% clock coverage, and a 95% iOS gain-path 105-second dance -> 15-second rest -> next dance regression. Existing auth/security suites pass. `tsc --noEmit -p tsconfig.test.json` and full `tsc --noEmit` pass. A temporary headless Chrome 155 smoke test passed native/gain playback at 95%, pitch-off control, element cleanup and JSON reporting; the 390px layout was visually inspected. This does not measure iPhone acoustics. Audio mocks validate requests, routing and timing, not sound. Physical iPhone Safari/PWA, Telegram preview login and musical listening remain unverified. No database, auth, Premium, deployment configuration or playback-route policy changed.
