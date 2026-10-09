"use client";

import { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { getRecentlyPlayedTimes, getRecentlyPlayedTrackIds } from '@/utils/history';

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
 */
export function useRecentlyPlayed(limit = 50): string[] {
  const { user, sessionVersion } = useAuth();
  const [local, setLocal] = useState(readLocal);
  const [cloud, setCloud] = useState<CloudPlay[]>([]);

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
    if (!user?.id) return;
    let cancelled = false;
    let lastFetch = 0;
    const load = (force = false) => {
      if (!force && Date.now() - lastFetch < REFRESH_MS) return;
      lastFetch = Date.now();
      fetch(`/api/user/profile?tid=${user.id}&only=recent`, { cache: 'no-store' })
        .then(r => (r.ok ? r.json() : null))
        .then(d => { if (!cancelled && Array.isArray(d?.recent)) setCloud(d.recent); })
        .catch(() => { /* offline — the device list still works */ });
    };
    const onPlayed = () => load();
    // Back to the app (other phone may have played meanwhile) → fresh list
    const onVisible = () => { if (document.visibilityState === 'visible') load(); };
    load(true);
    window.addEventListener(RECENT_EVENT, onPlayed);
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      cancelled = true;
      window.removeEventListener(RECENT_EVENT, onPlayed);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [user?.id, sessionVersion]);

  let clearedAt = 0;
  try { clearedAt = Number(localStorage.getItem(HISTORY_CLEARED_KEY) || 0); } catch { /* ignore */ }

  // Newest play time per track from both sources; device plays saved before
  // times were recorded keep their order after the timed ones.
  const playedAt = new Map<string, number>();
  for (const id of local.ids) {
    const t = local.times[id];
    if (t) playedAt.set(id, t);
  }
  for (const p of user?.id ? cloud : []) { // signed out → only this device's list
    const t = new Date(p.playedAt).getTime();
    if (t > clearedAt && t > (playedAt.get(p.trackId) ?? 0)) playedAt.set(p.trackId, t);
  }
  const timed = [...playedAt.entries()].sort((a, b) => b[1] - a[1]).map(([id]) => id);
  const untimed = local.ids.filter(id => !playedAt.has(id));
  return [...timed, ...untimed].slice(0, limit);
}
