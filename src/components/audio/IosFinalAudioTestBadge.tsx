"use client";

import React from 'react';
import { readPitchConfiguration } from '@/utils/mediaPitch';
import { disableNativeFinalTest } from '@/utils/iosFinalDiagnostic';

type Props = {
  audio: HTMLAudioElement | null;
  gainActive: boolean;
  finalMode: boolean;
  rest: boolean;
};

/** Reports the provider's ACTUAL active element, not just the requested flag. */
export default function IosFinalAudioTestBadge({ audio, gainActive, finalMode, rest }: Props) {
  const route = !audio?.getAttribute('src') ? 'IDLE' : gainActive ? 'GAIN' : 'NATIVE';
  const pitch = readPitchConfiguration(audio);
  const percent = Math.round((audio?.playbackRate ?? 1) * 100);
  return (
    <aside data-testid="ios-finals-audio-test" data-audio-route={route}
      style={{ position: 'fixed', top: 'calc(env(safe-area-inset-top, 0px) + 62px)', left: 12, right: 12,
        zIndex: 2147483000, background: '#101810', border: '1px solid #58b96b', borderRadius: 10,
        color: '#fff', padding: '10px 12px', fontSize: 12, lineHeight: 1.4, maxWidth: 430 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
        <strong>AUDIO TEST 3 · {route}</strong>
        <button type="button" onClick={disableNativeFinalTest}
          style={{ color: '#fff', background: '#243024', border: '1px solid #52705a', borderRadius: 6,
            padding: '7px 9px', minHeight: 36, cursor: 'pointer' }}>
          ტესტის გამორთვა
        </button>
      </div>
      <div>{rest ? 'REST' : finalMode ? 'FINALS' : 'NORMAL'} · {percent}% · PITCH SETTING {pitch}</div>
      <div>ტონის პარამეტრი ჩანს — ხმის ხარისხი არ იზომება. iPhone-ზე ფეიდაუთი გარანტირებული არ არის.</div>
    </aside>
  );
}
