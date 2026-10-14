"use client";
import React from 'react';
import { disableRenderedFinalTest } from '@/utils/renderedFinalTest';
export default function RenderedFinalAudioBadge({ percent, ready, loading, error, rest }: {
  percent: number; ready: boolean; loading: boolean; error: string | null; rest: boolean;
}) {
  return <aside data-testid="rendered-finals-test" data-rendered-ready={ready && !loading && !error}
    style={{ position: 'fixed', top: 'calc(env(safe-area-inset-top, 0px) + 62px)', left: 12, right: 12,
      maxWidth: 440, zIndex: 2147483000, color: '#fff', background: '#101810', border: '1px solid #58b96b',
      borderRadius: 10, padding: 10, fontSize: 12, lineHeight: 1.4 }}>
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
      <strong>AUDIO TEST 3 · {error ? 'ERROR' : loading ? 'PREPARING' : rest ? 'REST' : ready ? 'RENDERED' : 'READY'}</strong>
      <button type="button" onClick={disableRenderedFinalTest} style={{ minHeight: 40, padding: 6, color: '#fff', background: '#243024', borderRadius: 6 }}>ტესტის გამორთვა</button>
    </div>
    <div>TEMPO {Math.round(percent)}% · {ready && !rest ? 'FILE PLAYBACK 100% · PITCH SHIFT 0' : 'ჩართე Finals Mode'}</div>
    <div>{error || (loading ? 'მუსიკა მზადდება — დაელოდე.' : 'ტემპის შეცვლისას საჭიროა ხელახალი მომზადება.')}</div>
  </aside>;
}
