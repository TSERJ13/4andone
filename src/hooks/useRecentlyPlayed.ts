"use client";

import { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { getRecentlyPlayedTrackIds } from '@/utils/history';

export const HISTORY_CLEARED_KEY = '4andone_history_cleared_at';
const RECENT_EVENT = '4andone_recently_played_updated';
const REFRESH_MS = 30_000; // re-read the account history at most every 30s

type CloudPlay = { trackId: string; playedAt: string };

/**
 * Recently played track IDs, newest first: this device's own list, then the
 * signed-in account's plays from the database (track_plays), so Home "Last
 * Played", History and the full player's RECENT show the same songs on every
 * device that uses the same Telegram account. "Clear" on the History page
 * hides account plays from before that moment (on this device).
 */
export function useRecentlyPlayed(limit = 50): string[] {
  const { user } = useAuth();
  const [localIds, setLocalIds] = useState<string[]>(() => getRecentlyPlayedTrackIds());
  const [cloud, setCloud] = useState<CloudPlay[]>([]);

  useEffect(() => {
    const refresh = () => setLocalIds(getRecentlyPlayedTrackIds());
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
    const load = () => {
      if (Date.now() - lastFetch < REFRESH_MS) return;
      lastFetch = Date.now();
      fetch(`/api/user/profile?tid=${user.id}&only=recent`)
        .then(r => (r.ok ? r.json() : null))
        .then(d => { if (!cancelled && Array.isArray(d?.recent)) setCloud(d.recent); })
        .catch(() => { /* offline — the device list still works */ });
    };
    load();
    window.addEventListener(RECENT_EVENT, load);
    return () => { cancelled = true; window.removeEventListener(RECENT_EVENT, load); };
  }, [user?.id]);

  let clearedAt = 0;
  try { clearedAt = Number(localStorage.getItem(HISTORY_CLEARED_KEY) || 0); } catch { /* ignore */ }
  // Signed out → only this device's list
  const cloudIds = (user?.id ? cloud : []).filter(p => new Date(p.playedAt).getTime() > clearedAt).map(p => p.trackId);
  return [...localIds, ...cloudIds].filter((id, i, arr) => arr.indexOf(id) === i).slice(0, limit);
}
