"use client";

import React, { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';

const KEY = '4andone-addebug';

type SlotInfo = { slot: string; pushed: string; adStatus: string; size: string; iframe: string };

/**
 * Hidden diagnostics: open the site with ?addebug=1 (turn off with ?addebug=0).
 * Shows, live, whether the AdSense script loaded and what Google answered for
 * every ad slot on the page — so we can see facts instead of guessing.
 */
export default function AdDebugPanel() {
  const { isPremium, isLoading } = useAuth();
  const [on, setOn] = useState(false);
  const [info, setInfo] = useState<{ script: string; slots: SlotInfo[]; log: string[] }>({ script: '', slots: [], log: [] });

  useEffect(() => {
    try {
      const q = new URLSearchParams(window.location.search).get('addebug');
      if (q === '1') sessionStorage.setItem(KEY, '1');
      if (q === '0') sessionStorage.removeItem(KEY);
      setOn(sessionStorage.getItem(KEY) === '1');
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    if (!on) return;
    const read = () => {
      const tag = document.querySelector('script[src*="adsbygoogle.js"]');
      const lib = (window as unknown as { adsbygoogle?: { loaded?: boolean } }).adsbygoogle;
      const script = !tag ? 'NOT on page' : lib?.loaded ? 'loaded' : 'on page, not loaded (blocked?)';
      const slots = Array.from(document.querySelectorAll('ins.adsbygoogle')).map((el) => {
        const r = el.getBoundingClientRect();
        const fr = el.querySelector('iframe');
        const fb = fr?.getBoundingClientRect();
        return {
          slot: el.getAttribute('data-ad-slot') || '?',
          pushed: el.getAttribute('data-adsbygoogle-status') || 'no',
          adStatus: el.getAttribute('data-ad-status') || '—',
          size: `${Math.round(r.width)}x${Math.round(r.height)}`,
          iframe: fr && fb ? `${Math.round(fb.width)}x${Math.round(fb.height)}` : 'none',
        };
      });
      const log = (window as unknown as { __adLog?: string[] }).__adLog || [];
      setInfo({ script, slots, log: [...log] });
    };
    read();
    const t = setInterval(read, 1000);
    return () => clearInterval(t);
  }, [on]);

  if (!on) return null;
  return (
    <div
      style={{
        position: 'fixed', left: 8, top: 8, zIndex: 100000, maxWidth: 'calc(100vw - 16px)',
        background: 'rgba(0,0,0,0.88)', color: '#d4d4d8', font: '11px/1.45 ui-monospace, monospace',
        padding: '8px 10px', borderRadius: 10, border: '1px solid #3f3f46', pointerEvents: 'none',
      }}
    >
      <div style={{ color: '#facc15', fontWeight: 700 }}>AD CHECK</div>
      <div>user: {isLoading ? 'loading' : isPremium ? 'PREMIUM (no ads)' : 'free'}</div>
      <div>script: {info.script}</div>
      {info.slots.length === 0 && <div>slots: none on this screen</div>}
      {info.slots.map((s, i) => (
        <div key={i}>
          #{i + 1} {s.slot} · pushed:{s.pushed} · google:{s.adStatus} · box:{s.size} · iframe:{s.iframe}
        </div>
      ))}
      <div style={{ color: '#facc15', marginTop: 4 }}>last events:</div>
      {info.log.length === 0 ? <div>— none yet —</div> : info.log.map((l, i) => <div key={i}>{l}</div>)}
    </div>
  );
}
