import { saveAudioFile, getAudioFile, deleteAudioFile } from './storage';

const OFFLINE_KEY = '4andone_offline_tracks';
// Track details (title, artist, style…) of downloaded tracks, so the
// Downloaded page and the player work with no internet (the full track list
// comes from Supabase, which is unreachable offline).
const OFFLINE_META_KEY = '4andone_offline_tracks_meta';

export const getOfflineTrackMeta = (): any[] => {
  if (typeof window === 'undefined') return [];
  try {
    const saved = localStorage.getItem(OFFLINE_META_KEY);
    return saved ? JSON.parse(saved) : [];
  } catch {
    return [];
  }
};

const saveOfflineTrackMeta = (track: any) => {
  try {
    const list = getOfflineTrackMeta().filter((t: any) => t.id !== track.id);
    // keep it small: no audio blobs, just what the lists and player show
    const { id, title, artist, album, style, duration, audioUrl, artworkUrl, coverUrl, tags, bpm } = track;
    list.push({ id, title, artist, album, style, duration, audioUrl, artworkUrl, coverUrl, tags, bpm });
    localStorage.setItem(OFFLINE_META_KEY, JSON.stringify(list));
  } catch { /* ignore */ }
};

const removeOfflineTrackMeta = (trackId: string) => {
  try {
    localStorage.setItem(OFFLINE_META_KEY, JSON.stringify(getOfflineTrackMeta().filter((t: any) => t.id !== trackId)));
  } catch { /* ignore */ }
};

export const getOfflineTrackIds = (): string[] => {
  if (typeof window === 'undefined') return [];
  try {
    const saved = localStorage.getItem(OFFLINE_KEY);
    return saved ? JSON.parse(saved) : [];
  } catch {
    return [];
  }
};

export const getDownloadedTrackIds = getOfflineTrackIds;

export const getFullOfflineTracks = (studioTracks: any[] = []): any[] => {
  const downloadedIds = getDownloadedTrackIds();
  const offlineMeta = getOfflineTrackMeta();
  
  const map = new Map<string, any>();
  
  for (const meta of offlineMeta) {
    if (meta && meta.id && downloadedIds.includes(meta.id)) {
      map.set(meta.id, meta);
    }
  }
  
  for (const track of studioTracks) {
    if (track && track.id && downloadedIds.includes(track.id)) {
      map.set(track.id, { ...map.get(track.id), ...track });
    }
  }

  return Array.from(map.values());
};

export const isTrackDownloaded = (trackId: string): boolean => {
  if (!trackId || typeof window === 'undefined') return false;
  const list = getOfflineTrackIds();
  return list.includes(trackId);
};

export const resolveAudioDownloadUrl = async (audioUrl?: string): Promise<string | null> => {
  if (!audioUrl) return null;
  let finalUrl = audioUrl;
  
  if (finalUrl.startsWith('undefined/')) {
    const R2_FALLBACK = process.env.NEXT_PUBLIC_R2_PUBLIC_URL || 'https://pub-c41b1121b311f676bdc114d143278d18.r2.dev';
    finalUrl = finalUrl.replace('undefined/', `${R2_FALLBACK}/`);
  }

  if (finalUrl.startsWith('http')) {
    try {
      const R2_DOMAIN = process.env.NEXT_PUBLIC_R2_PUBLIC_URL || 'https://pub-c41b1121b311f676bdc114d143278d18.r2.dev';
      const domainNormalized = R2_DOMAIN.replace(/\/$/, '');
      let storageKey = '';
      if (finalUrl.includes(domainNormalized)) {
        storageKey = finalUrl.split(`${domainNormalized}/`)[1];
      } else {
        storageKey = finalUrl.split('/').slice(3).join('/');
      }

      if (storageKey) {
        const signRes = await fetch(`/api/upload?key=${encodeURIComponent(storageKey)}`);
        if (signRes.ok) {
          const { url } = await signRes.json();
          return url || finalUrl;
        }
      }
    } catch (e) {
      console.warn('[OFFLINE] URL resolution fallback to original:', e);
    }
  }

  return finalUrl;
};

export const downloadTrackOffline = async (track: { id: string; audioUrl?: string; [key: string]: any }): Promise<boolean> => {
  if (!track || !track.id) return false;

  try {
    // 1. Check if already stored in IndexedDB
    const existing = await getAudioFile(track.id);
    if (existing && existing.size > 0) {
      saveOfflineTrackMeta(track);
      markTrackDownloaded(track.id);
      return true;
    }

    // 2. Resolve audio source URL
    const sourceUrl = await resolveAudioDownloadUrl(track.audioUrl);
    if (!sourceUrl) throw new Error('No audio URL available');

    // 3. Fetch file as binary blob
    const response = await fetch(sourceUrl);
    if (!response.ok) throw new Error(`Fetch failed with status ${response.status}`);
    const blob = await response.blob();

    // 4. Save into IndexedDB
    await saveAudioFile(track.id, blob);

    // 5. Update offline registry (+ details for offline listing)
    saveOfflineTrackMeta(track);
    markTrackDownloaded(track.id);
    return true;
  } catch (err) {
    console.error('[OFFLINE] Download failed for track:', track.id, err);
    throw err;
  }
};

export const markTrackDownloaded = (trackId: string) => {
  if (typeof window === 'undefined' || !trackId) return;
  try {
    const list = getOfflineTrackIds();
    if (!list.includes(trackId)) {
      list.push(trackId);
      localStorage.setItem(OFFLINE_KEY, JSON.stringify(list));
      window.dispatchEvent(new CustomEvent('4andone_offline_updated', { detail: { trackId, downloaded: true } }));
    }
  } catch {}
};

export const removeOfflineTrack = async (trackId: string): Promise<void> => {
  if (typeof window === 'undefined' || !trackId) return;
  try {
    const list = getOfflineTrackIds().filter(id => id !== trackId);
    localStorage.setItem(OFFLINE_KEY, JSON.stringify(list));
    removeOfflineTrackMeta(trackId);
    await deleteAudioFile(trackId);
    window.dispatchEvent(new CustomEvent('4andone_offline_updated', { detail: { trackId, downloaded: false } }));
  } catch (e) {
    console.error('[OFFLINE] Remove track failed:', e);
  }
};

export const subscribeToOfflineUpdates = (callback: () => void): (() => void) => {
  if (typeof window === 'undefined') return () => {};
  const handler = () => callback();
  window.addEventListener('4andone_offline_updated', handler);
  window.addEventListener('storage', handler);
  return () => {
    window.removeEventListener('4andone_offline_updated', handler);
    window.removeEventListener('storage', handler);
  };
};
