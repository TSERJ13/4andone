"use client";

import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { getRecentlyPlayedTimes, getRecentlyPlayedTrackIds } from '@/utils/history';
import { sessionFetch } from '@/utils/userSession';

export const HISTORY_CLEARED_KEY = '4andone_history_cleared_at';
const RECENT_EVENT = '4andone_recently_played_updated';
const REFRESH_MS = 30_000; // re-read the account history at most every 30s

type CloudPlay = { trackId: string; playedAt: string };

const readLocal = () => ({ ids: getRecentlyPlayedTrackIds(), times: getRecentlyPlayedTimes() });

/**
 * Recently played track IDs, newest first. Signed in: the account's plays
 * from the database (track_plays) merged with this device's list by time, so
 * Home "Last Played", History and the full player's RECENT are the same on
 * every device that uses the same Telegram account. The server only returns
 * the history of the account proven by the session cookie. "Clear" on the
 * History page hides account plays from before that moment (on this device).
 *
 * The order stays put while the list is on screen: a song tapped in the list
 * doesn't jump to the top under the finger; it moves there the next time the
 * list is opened. Songs that weren't in the list yet appear at the top.
 */
const cacheKey = (uid: number | string) => `4andone_recent_cloud_${uid}`;
const readCache = (uid?: number | string | null): CloudPlay[] | null => {
  if (!uid || typeof window === 'undefined') return null;
  try {
    const v = JSON.parse(localStorage.getItem(cacheKey(uid)) || 'null');
    return Array.isArray(v) ? v : null;
  } catch { return null; }
};
const writeCache = (uid: number | string, list: CloudPlay[]) => {
  try { localStorage.setItem(cacheKey(uid), JSON.stringify(list.slice(0, 100))); } catch { /* full / blocked */ }
};
/** How long a first-time device waits for the account list before showing what it has. */
const FIRST_LOAD_WAIT_MS = 2500;

export function useRecentlyPlayed(limit = 50): string[] {
  return useRecentlyPlayedState(limit).ids;
}

/**
 * Same list plus `ready`: false while a signed-in device that has never seen
 * the account list is still waiting for it (show a placeholder then, so the
 * list doesn't visibly reshuffle when it arrives). The last account list is
 * kept on the device, so later visits draw the right order straight away.
 */
export function useRecentlyPlayedState(limit = 50): { ids: string[]; ready: boolean } {
  const { user, sessionVersion, isLoading } = useAuth();
  const uid = user?.id ?? null;
  const [local, setLocal] = useState(readLocal);
  const [fetched, setFetched] = useState<{ uid: number; list: CloudPlay[] } | null>(null);
  const [baseline, setBaseline] = useState<{ ids: string[]; withCloud: boolean } | null>(null);
  const [waitedFor, setWaitedFor] = useState<number | null>(null);
  const cached = useMemo(() => readCache(uid), [uid]);

  useEffect(() => {
    const refresh = () => setLocal(readLocal());
    window.addEventListener(RECENT_EVENT, refresh);
    window.addEventListener('storage', refresh);
    return () => {
      window.removeEventListener(RECENT_EVENT, refresh);
      window.removeEventListener('storage', refresh);
    };
  }, []);

  useEffect(() => {
    if (!uid) return;
    const timer = setTimeout(() => setWaitedFor(uid), FIRST_LOAD_WAIT_MS);
    return () => clearTimeout(timer);
  }, [uid]);

  useEffect(() => {
    if (!uid) return;
    let cancelled = false;
    let lastFetch = 0;
    const load = (force = false) => {
      if (!force && Date.now() - lastFetch < REFRESH_MS) return;
      lastFetch = Date.now();
      sessionFetch(`/api/user/profile?tid=${uid}&only=recent`, { cache: 'no-store' })
        .then(r => (r.ok ? r.json() : null))
        .then(d => {
          if (cancelled || !Array.isArray(d?.recent)) return;
          writeCache(uid, d.recent);
          setFetched({ uid, list: d.recent });
        })
        .catch(() => { /* offline — the device list still works */ });
    };
    // Back to the app (other phone may have played meanwhile) → fresh list
    const onVisible = () => { if (document.visibilityState === 'visible') load(); };
    load(true);
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      cancelled = true;
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [uid, sessionVersion]);

  const cloud = uid ? ((fetched?.uid === uid ? fetched.list : null) ?? cached) : null; // signed out → device only
  const ready = !isLoading && (!uid || cloud !== null || waitedFor === uid);

  let clearedAt = 0;
  try { clearedAt = Number(localStorage.getItem(HISTORY_CLEARED_KEY) || 0); } catch { /* ignore */ }

  // Newest play time per track from both sources; device plays saved before
  // times were recorded keep their order after the timed ones.
  const playedAt = new Map<string, number>();
  for (const id of local.ids) {
    const t = local.times[id];
    if (t) playedAt.set(id, t);
  }
  for (const p of cloud ?? []) {
    const t = new Date(p.playedAt).getTime();
    if (t > clearedAt && t > (playedAt.get(p.trackId) ?? 0)) playedAt.set(p.trackId, t);
  }
  const timed = [...playedAt.entries()].sort((a, b) => b[1] - a[1]).map(([id]) => id);
  const untimed = local.ids.filter(id => !playedAt.has(id));
  const fresh = [...timed, ...untimed].slice(0, limit);

  if (!ready) return { ids: fresh, ready };
  // Freeze the order once shown; redo it once if it was drawn before the
  // account list existed on this device (slow first load).
  if (baseline === null || (!baseline.withCloud && cloud !== null)) {
    if (fresh.length > 0) setBaseline({ ids: fresh, withCloud: cloud !== null }); // adjust state during render
    return { ids: fresh, ready };
  }
  const inFresh = new Set(fresh);
  const known = new Set(baseline.ids);
  return {
    ids: [...fresh.filter(id => !known.has(id)), ...baseline.ids.filter(id => inFresh.has(id))].slice(0, limit),
    ready,
  };
}
