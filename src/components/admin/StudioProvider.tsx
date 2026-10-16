"use client";

import { userDb } from '@/lib/user-db';
import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';
import { supabase } from '@/utils/supabase';
import { adminDb } from '@/lib/admin-db';
import { useAuth } from '@/context/AuthContext';
import { Album, DEFAULT_ALBUMS } from '@/types/album';
import { getOfflineTrackMeta } from '@/utils/offline';

export type { Album } from '@/types/album';
export { DEFAULT_ALBUMS } from '@/types/album';

export interface Style {
  id: string;
  title: string;
  color: string;
  program: string;
  order: number;
}

export interface Tag {
  id: string;
  name: string;
  color: string;
}

export interface Track {
  id: string;
  title: string;
  artist: string;
  album?: string;
  style: string;
  bpm?: string;
  date: string;
  createdAt?: string;
  folderId?: string;
  audioUrl?: string;
  artworkUrl?: string; // artwork_url in DB
  tags?: string[];
  duration?: number;
  globalOrder?: number;
  isFavorite?: boolean;
}

export interface Folder {
  id: string;
  name: string;
  color: string;
}

export interface FinalFolder {
  id: string;
  name: string;
  color: string;
}

export interface FinalFolderTrack extends Track {
  folderOrderId: number;
}

interface StudioContextType {
  tracks: Track[];
  folders: Folder[];
  styles: Style[];
  tags: Tag[];
  isLoading: boolean;

  folderTracksMap: Record<string, string[]>;

  // Tracks
  addTrack: (track: Partial<Track>) => Promise<Track | undefined>;
  removeTrack: (id: string) => Promise<void>;
  updateTrack: (id: string, updates: Partial<Track>) => Promise<void>;
  toggleFavorite: (id: string) => Promise<void>;

  // Folders
  addFolder: (name: string, color: string) => Promise<Folder | undefined>;
  updateFolder: (id: string, updates: Partial<Folder>) => Promise<void>;
  removeFolder: (id: string) => Promise<void>;
  assignToFolder: (trackId: string, folderId: string | undefined) => Promise<void>;
  addTrackToFolder: (folderId: string, trackId: string) => Promise<void>;
  removeTrackFromFolder: (folderId: string, trackId: string) => Promise<void>;

  // Taxonomy (Styles & Tags)
  addStyle: (style: Partial<Style>) => Promise<void>;
  updateStyle: (id: string, updates: Partial<Style>) => Promise<void>;
  removeStyle: (id: string) => Promise<void>;
  addTag: (tag: Partial<Tag>) => Promise<void>;
  updateTag: (id: string, updates: Partial<Tag>) => Promise<void>;
  removeTag: (id: string) => Promise<void>;

  // Finals
  finalTracks: Track[];
  finalFolders: FinalFolder[];
  addFinalFolder: (name: string, color: string) => Promise<void>;
  removeFinalFolder: (id: string) => Promise<void>;
  addToFinal: (track: Track) => void;
  removeFromFinal: (id: string) => void;
  reorderFinalTracks: (startIndex: number, endIndex: number, folderId?: string | null) => void;
  setFinalTracks: (tracks: Track[]) => void;

  // Advanced Reordering
  reorderGlobalTracks: (startIndex: number, endIndex: number, visibleList?: Track[]) => Promise<void>;
  reorderTracks: (draggedTrackId: string, dropTrackId: string, visibleList?: Track[]) => Promise<void>;
  moveTrack: (trackId: string, direction: 'up' | 'down', visibleList?: Track[]) => Promise<void>;
  addTrackToFinalFolder: (trackId: string, finalFolderId: string, force?: boolean) => Promise<{ success: boolean; duplicate?: string }>;
  getTracksForFinalFolder: (finalFolderId: string) => Track[];
  // Albums (Dynamic Album Builder)
  albums: Album[];
  refreshAlbums: () => Promise<void>;
  addAlbum: (album: Partial<Album>) => Promise<Album | undefined>;
  updateAlbum: (id: string, updates: Partial<Album>) => Promise<void>;
  deleteAlbum: (id: string) => Promise<void>;
  reorderAlbums: (albumIds: string[]) => Promise<void>;

  stats: {
    totalTracks: number;
    totalFolders: number;
    totalPlaylists: number;
    activeUsers: number;
  };
  refreshData: () => Promise<void>;
}

const DANCE_ORDER: Record<string, number> = {
  // Standard (European)
  'Slow Waltz': 1,
  'Tango': 2,
  'Viennese Waltz': 3,
  'Slow Foxtrot': 4,
  'Quickstep': 5,
  // Latin
  'Samba': 6,
  'Cha-Cha-Cha': 7,
  'Cha-cha-cha': 7,
  'Rumba': 8,
  'Paso Doble': 9,
  'Jive': 10
};

const StudioContext = createContext<StudioContextType | undefined>(undefined);

// Supabase returns at most 1000 rows per request (PostgREST max-rows), so the
// old `.limit(10000)` silently cut the library at 1000 tracks. Page through it.
const TRACKS_PAGE_SIZE = 1000;
const fetchAllTracks = async () => {
  const all: any[] = [];
  for (let from = 0; ; from += TRACKS_PAGE_SIZE) {
    const { data, error } = await supabase
      .from('tracks')
      .select('*')
      .order('global_order', { ascending: true })
      .order('created_at', { ascending: false })
      .order('id', { ascending: true })
      .range(from, from + TRACKS_PAGE_SIZE - 1);
    if (error) {
      console.error('[STUDIO-ERROR] tracks fetch failed:', error.message);
      return all.length > 0 ? all : null; // null → keep what is already on screen
    }
    if (!data || data.length === 0) break;
    all.push(...data);
    if (data.length < TRACKS_PAGE_SIZE) break;
  }
  return all;
};

// The last track list is kept on the device, so the app opens with the library already on screen
// (stale-while-revalidate): the fresh list from the server replaces it a moment later.
const TRACKS_CACHE_KEY = '4andone_tracks_cache_v1';
const TRACKS_CACHE_MAX_CHARS = 3_000_000; // stay well inside the ~5M character storage quota
const readTracksCache = (): any[] | null => {
  if (typeof window === 'undefined') return null;
  try {
    const rows = JSON.parse(localStorage.getItem(TRACKS_CACHE_KEY) || 'null');
    return Array.isArray(rows) && rows.length > 0 ? rows : null;
  } catch { return null; }
};
const writeTracksCache = (rows: any[]) => {
  // Saved a moment later, when the phone is idle: converting and writing a few MB would otherwise block the
  // very frame in which the fresh list is drawn.
  const save = () => {
    try {
      const text = JSON.stringify(rows);
      if (text.length <= TRACKS_CACHE_MAX_CHARS) localStorage.setItem(TRACKS_CACHE_KEY, text);
      else localStorage.removeItem(TRACKS_CACHE_KEY);
    } catch { /* full or blocked: the app just loads from the network as before */ }
  };
  if (typeof window === 'undefined') return;
  const idle = (window as any).requestIdleCallback as ((cb: () => void, o?: { timeout: number }) => void) | undefined;
  if (idle) idle(save, { timeout: 4000 }); else setTimeout(save, 2000);
};
const mapTrackRows = (rows: any[], userLikes: string[]) => {
  const mapped = rows.map(t => ({
    ...t,
    audioUrl: t.audio_url,
    artworkUrl: t.artwork_url,
    folderId: t.folder_id,
    createdAt: t.created_at || t.date,
    globalOrder: typeof t.global_order === 'number' ? t.global_order : (Number(t.global_order) || 0),
    duration: t.duration || 0,
    isFavorite: userLikes.includes(t.id)
  }));
  mapped.sort((a, b) => {
    if ((a.globalOrder ?? 0) !== (b.globalOrder ?? 0)) {
      return (a.globalOrder ?? 0) - (b.globalOrder ?? 0);
    }
    return new Date(b.createdAt || b.date || 0).getTime() - new Date(a.createdAt || a.date || 0).getTime();
  });
  return mapped;
};

export const StudioProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, isAuthenticated, setIsAuthModalOpen, sessionVersion } = useAuth();
  const [tracks, setTracks] = useState<Track[]>([]);
  const [folders, setFolders] = useState<Folder[]>([]);
  const [folderTracksMap, setFolderTracksMap] = useState<Record<string, string[]>>({});
  const [styles, setStyles] = useState<Style[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [finalTracks, setFinalTracks] = useState<Track[]>([]);
  const [finalFolders, setFinalFolders] = useState<FinalFolder[]>([]);
  const [finalFolderTracksMap, setFinalFolderTracksMap] = useState<Record<string, string[]>>({}); // folderId -> [trackIds]
  const [albums, setAlbums] = useState<Album[]>(DEFAULT_ALBUMS);
  const [isLoading, setIsLoading] = useState(true);

  const fetchData = async (silent = false) => {
    if (!silent && tracks.length === 0) {
      setIsLoading(true);
    }
    try {
      // 1. Global tracks — in parallel with the shared lists that don't depend on them
      // (styles, tags, albums), so the first screen doesn't wait for them one after another.
      const sharedPromise = Promise.all([
        supabase.from('styles').select('*').order('order'),
        supabase.from('tags').select('*').order('name'),
        fetch('/api/albums')
          .then(r => (r.ok ? r.json() : null))
          .catch((e) => { console.warn('Failed to load albums:', e); return null; }),
      ]);
      const tracksData = await fetchAllTracks();
      const signedIn = !!(isAuthenticated && user?.id && sessionVersion > 0);

      // Likes known on this device. The library is drawn with them AT ONCE; the account's cloud list
      // (loaded below, in parallel) only refines them. Personal data used to be fetched one request
      // after another BEFORE any track was shown, so signed-in listeners waited several round trips.
      const userKey = signedIn ? `4andone_liked_tracks_${user!.id}` : '';
      let userLikes: string[] = [];
      if (signedIn) {
        try {
          const saved = localStorage.getItem(userKey) || localStorage.getItem('4andone_liked_tracks');
          if (saved) userLikes = JSON.parse(saved);
        } catch (e) {}
      } else {
        // Unauthenticated / Logged Out: 0 liked songs!
        try { localStorage.removeItem('4andone_liked_tracks'); } catch (e) {}
      }

      // No internet (or Supabase unreachable): show the downloaded tracks so
      // they can still be played offline.
      if ((!tracksData || tracksData.length === 0) && typeof navigator !== 'undefined' && !navigator.onLine) {
        const offlineTracks = getOfflineTrackMeta().map((t: any) => ({ ...t, isFavorite: userLikes.includes(t.id) }));
        if (offlineTracks.length > 0) setTracks(prev => (prev.length > 0 ? prev : offlineTracks));
      }

      if (tracksData && tracksData.length > 0) {
        setTracks(mapTrackRows(tracksData, userLikes) as any);
        writeTracksCache(tracksData);
      }

      const [{ data: stylesData }, { data: tagsData }, aData] = await sharedPromise;
      if (stylesData) setStyles(stylesData);
      if (tagsData) setTags(tagsData);
      // Albums (Dynamic Album Builder)
      if (aData?.albums && Array.isArray(aData.albums)) {
        // /api/albums already adds the built-in albums (minus deleted ones);
        // merging DEFAULT_ALBUMS again here brought deleted albums back.
        const merged = [...aData.albums];
        merged.sort((a, b) => (a.orderIndex ?? 0) - (b.orderIndex ?? 0));
        setAlbums(merged);
      }
      // Library, dance styles and albums are on screen — pages may render now; personal data follows.
      setIsLoading(false);

      if (!signedIn) {
        setFolders([]);
        setFolderTracksMap({});
        setFinalFolders([]);
        setFinalFolderTracksMap({});
        setFinalTracks([]);
        return;
      }

      // 2. Personal data: four independent groups, requested at the same time
      const uid = user!.id;
      const [foldersBundle, finalBundle, finalQueue, favRows] = await Promise.all([
        (async () => {
          const { data: fData } = await userDb.from('folders').select('*').eq('telegram_id', uid).order('created_at', { ascending: true });
          const map: Record<string, string[]> = {};
          if (!fData || fData.length === 0) return { list: [] as Folder[], map };
          const { data: ftData } = await userDb.from('folder_tracks').select('folder_id, track_id').in('folder_id', fData.map((f: any) => f.id));
          (ftData || []).forEach((item: any) => { (map[item.folder_id] ||= []).push(item.track_id); });
          return { list: fData.map((f: any) => ({ id: f.id, name: f.name, color: f.color })) as Folder[], map };
        })().catch(() => null),
        (async () => {
          const { data: ffData } = await userDb.from<FinalFolder[]>('final_folders').select('*').eq('telegram_id', uid);
          if (!ffData) return null;
          const { data: children } = await userDb.from('final_folder_tracks')
            .select('final_folder_id, track_id').in('final_folder_id', ffData.map((f: any) => f.id)).order('order');
          const map: Record<string, string[]> = {};
          for (const child of children || []) (map[child.final_folder_id] ||= []).push(child.track_id);
          return { list: ffData, map };
        })().catch(() => null),
        Promise.resolve(userDb.from('final_tracks').select('track_id').eq('telegram_id', uid).order('order').then(r => r.data)).catch(() => null),
        Promise.resolve(userDb.from('user_favorites').select('track_id').eq('telegram_id', uid).then(r => r.data)).catch(() => null),
      ]);

      if (foldersBundle) { setFolders(foldersBundle.list); setFolderTracksMap(foldersBundle.map); }
      if (finalBundle) { setFinalFolders(finalBundle.list); setFinalFolderTracksMap(finalBundle.map); }
      if (finalQueue) {
        const ftTracks = finalQueue.map((f: any) => tracksData?.find(t => t.id === f.track_id)).filter(Boolean)
          .map((t: any) => ({ ...t, audioUrl: t.audio_url, artworkUrl: t.artwork_url }));
        setFinalTracks(ftTracks);
      }

      // 3. Likes: cloud list merged with this device's list
      try {
        if (favRows && favRows.length > 0) {
          const cloudTrackIds = favRows.map((f: any) => f.track_id);
          const combined = Array.from(new Set([...cloudTrackIds, ...userLikes]));
          // Sync any local likes not yet in cloud
          const unsynced = userLikes.filter(id => !cloudTrackIds.includes(id));
          if (unsynced.length > 0) {
            userDb.from('user_favorites').insert(unsynced.map(track_id => ({ telegram_id: uid, track_id }))).then(() => {});
          }
          try {
            localStorage.setItem(userKey, JSON.stringify(combined));
            localStorage.removeItem('4andone_liked_tracks');
          } catch (e) {}
          if (combined.length !== userLikes.length && tracksData && tracksData.length > 0) {
            setTracks(mapTrackRows(tracksData, combined) as any);
          }
        } else if (favRows && userLikes.length > 0) {
          // First time cloud sync for existing local likes
          userDb.from('user_favorites').insert(userLikes.map(track_id => ({ telegram_id: uid, track_id }))).then(() => {});
        }
      } catch (favErr) {
        console.error('[STUDIO-ERROR] sync user_favorites failed:', favErr);
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Load from Supabase and Subscribe to Real-Time Updates
  useEffect(() => {
    const cachedRows = readTracksCache();
    if (cachedRows) {
      setTracks(prev => (prev.length > 0 ? prev : (mapTrackRows(cachedRows, []) as any)));
      // isLoading stays true until the fresh data (albums, styles) arrives, so pages never judge an album "missing" too early
    }
    fetchData(!!cachedRows);

    // Enable Real-Time Subscription
    const channel = supabase
      .channel('schema-db-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'tracks' },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            const nt = payload.new as any;
            setTracks(prev => {
              if (prev.some(t => t.id === nt.id)) return prev;
              // Check localStorage for this user's like status
              let isLiked = false;
              try {
                const saved = user?.id ? localStorage.getItem(`4andone_liked_tracks_${user.id}`) : null;
                if (saved) isLiked = JSON.parse(saved).includes(nt.id);
              } catch (e) {}
              const newTrackItem = {
                ...nt,
                audioUrl: nt.audio_url,
                artworkUrl: nt.artwork_url,
                folderId: nt.folder_id,
                createdAt: nt.created_at || nt.date,
                duration: nt.duration || 0,
                isFavorite: isLiked,
                globalOrder: typeof nt.global_order === 'number' ? nt.global_order : (Number(nt.global_order) || 0)
              };
              return [...prev, newTrackItem].sort((a, b) => {
                if ((a.globalOrder ?? 0) !== (b.globalOrder ?? 0)) {
                  return (a.globalOrder ?? 0) - (b.globalOrder ?? 0);
                }
                return new Date(b.createdAt || b.date || 0).getTime() - new Date(a.createdAt || a.date || 0).getTime();
              });
            });
          } else if (payload.eventType === 'UPDATE') {
            const ut = payload.new as any;
            setTracks(prev => prev.map(t => {
              if (t.id !== ut.id) return t;
              return {
                ...ut,
                audioUrl: ut.audio_url,
                artworkUrl: ut.artwork_url,
                folderId: ut.folder_id,
                createdAt: ut.created_at || ut.date || t.createdAt,
                isFavorite: t.isFavorite, // Keep the user's local like status
                duration: ut.duration || 0,
                globalOrder: typeof ut.global_order === 'number' ? ut.global_order : (Number(ut.global_order) || 0)
              };
            }).sort((a, b) => {
              if ((a.globalOrder ?? 0) !== (b.globalOrder ?? 0)) {
                return (a.globalOrder ?? 0) - (b.globalOrder ?? 0);
              }
              return new Date(b.createdAt || b.date || 0).getTime() - new Date(a.createdAt || a.date || 0).getTime();
            }));
          } else if (payload.eventType === 'DELETE') {
            setTracks(prev => prev.filter(t => t.id !== payload.old.id));
          }
        }
      )
      .subscribe();

    // Cross-tab synchronization via BroadcastChannel
    const syncChannel = typeof window !== 'undefined' && 'BroadcastChannel' in window ? new BroadcastChannel('4andone_sync') : null;
    if (syncChannel) {
      syncChannel.onmessage = () => {
        fetchData(true);
      };
    }

    // Storage event listener (fallback cross-tab sync)
    const handleStorage = (e: StorageEvent) => {
      if (e.key === '4andone_track_sync') {
        fetchData(true);
      }
    };
    if (typeof window !== 'undefined') {
      window.addEventListener('storage', handleStorage);
    }

    // Tab focus & visibility change (throttled auto-update: max once every 60s)
    let lastFetchTime = Date.now();
    const throttledFetch = () => {
      const now = Date.now();
      if (now - lastFetchTime > 60000) {
        lastFetchTime = now;
        fetchData(true);
      }
    };

    const handleFocus = () => throttledFetch();
    const handleVisibility = () => {
      if (typeof document !== 'undefined' && document.visibilityState === 'visible') {
        throttledFetch();
      }
    };
    if (typeof window !== 'undefined') {
      window.addEventListener('focus', handleFocus);
      document.addEventListener('visibilitychange', handleVisibility);
    }

    // Background sync fallback (every 3 minutes instead of 15 seconds)
    // Supabase Realtime already delivers instant live sync for tracks!
    const pollInterval = setInterval(() => {
      if (typeof document !== 'undefined' && document.visibilityState === 'visible') {
        fetchData(true);
      }
    }, 180000);

    return () => {
      supabase.removeChannel(channel);
      syncChannel?.close();
      clearInterval(pollInterval);
      if (typeof window !== 'undefined') {
        window.removeEventListener('storage', handleStorage);
        window.removeEventListener('focus', handleFocus);
        document.removeEventListener('visibilitychange', handleVisibility);
      }
    };
  }, [isAuthenticated, user, sessionVersion]);

  const addTrack = async (trackData: Partial<Track>) => {
    let initialOrder = trackData.globalOrder;
    if (initialOrder === undefined) {
      const minO = tracks.length > 0 ? Math.min(...tracks.map(t => t.globalOrder ?? 10)) : 10;
      initialOrder = minO - 10;
    }

    const { data, error } = await adminDb
      .from('tracks')
      .insert([{
        title: trackData.title || 'Unknown',
        artist: trackData.artist || 'Unknown',
        style: trackData.style || 'Samba',
        album: trackData.album,
        bpm: trackData.bpm,
        audio_url: trackData.audioUrl,
        artwork_url: trackData.artworkUrl,
        folder_id: trackData.folderId,
        tags: trackData.tags || [],
        duration: trackData.duration || 0,
        global_order: initialOrder,
        date: trackData.date || new Date().toISOString().split('T')[0]
      }])
      .select();

    if (error) {
      if (error.code === 'PGRST204') {
        console.error("[STUDIO-ERROR] Schema mismatch! artwork_url column might be missing from 'tracks' table.");
      }
      console.error("[STUDIO-ERROR] addTrack failed:", JSON.stringify(error, null, 2));
      throw error;
    }

    if (data && data.length > 0) {
      const nt = data[0];
      const newTrack: Track = {
        ...nt,
        audioUrl: nt.audio_url,
        artworkUrl: nt.artwork_url,
        folderId: nt.folder_id,
        createdAt: nt.created_at || nt.date,
        globalOrder: typeof nt.global_order === 'number' ? nt.global_order : (Number(nt.global_order) || initialOrder),
        duration: nt.duration || 0,
        isFavorite: false
      };

      setTracks(prev => {
        // Prevent duplicate from real-time INSERT if it fired quickly
        if (prev.some(t => t.id === newTrack.id)) return prev;
        const updated = [newTrack, ...prev];
        return updated.sort((a, b) => {
          if ((a.globalOrder ?? 0) !== (b.globalOrder ?? 0)) {
            return (a.globalOrder ?? 0) - (b.globalOrder ?? 0);
          }
          return new Date(b.createdAt || b.date || 0).getTime() - new Date(a.createdAt || a.date || 0).getTime();
        });
      });

      // Broadcast to other tabs & windows
      try {
        if (typeof window !== 'undefined') {
          if ('BroadcastChannel' in window) {
            const bc = new BroadcastChannel('4andone_sync');
            bc.postMessage({ type: 'TRACK_ADDED', id: newTrack.id });
            bc.close();
          }
          localStorage.setItem('4andone_track_sync', Date.now().toString());
        }
      } catch (e) {}

      return newTrack;
    }
  };

  const removeTrack = async (id: string) => {
    const { error } = await adminDb.from('tracks').delete().eq('id', id);
    if (error) {
      console.error("[STUDIO-ERROR] removeTrack failed:", JSON.stringify(error, null, 2));
      throw error;
    }
    setTracks(prev => prev.filter(t => t.id !== id));
    try {
      if (typeof window !== 'undefined') {
        if ('BroadcastChannel' in window) {
          const bc = new BroadcastChannel('4andone_sync');
          bc.postMessage({ type: 'TRACK_REMOVED', id });
          bc.close();
        }
        localStorage.setItem('4andone_track_sync', Date.now().toString());
      }
    } catch (e) {}
  };

  const updateTrack = async (id: string, updates: Partial<Track>) => {
    // PARTIAL-UPDATE SAFETY: only include fields that were actually passed in.
    // Previously every column was sent unconditionally, so a partial update like
    // { tags: [...] } would write `title: undefined` etc. and WIPE those columns.
    // This maps Track fields → DB columns and skips anything that is undefined.
    const fieldMap: Record<string, any> = {
      title: updates.title,
      artist: updates.artist,
      style: updates.style,
      album: updates.album,
      bpm: updates.bpm,
      audio_url: updates.audioUrl,
      artwork_url: updates.artworkUrl,
      folder_id: updates.folderId,
      tags: updates.tags,
      duration: updates.duration,
      global_order: updates.globalOrder,
      is_favorite: updates.isFavorite,
      date: updates.date,
    };
    const payload: Record<string, any> = {};
    Object.entries(fieldMap).forEach(([col, val]) => {
      if (val !== undefined) payload[col] = val;
    });

    if (Object.keys(payload).length === 0) return; // nothing to update

    const { error } = await adminDb
      .from('tracks')
      .update(payload)
      .eq('id', id);

    if (error) {
      console.error("[STUDIO-ERROR] updateTrack failed:", JSON.stringify(error, null, 2));
      throw error;
    }
    setTracks(prev => prev.map(t => t.id === id ? { ...t, ...updates } : t));
    try {
      if (typeof window !== 'undefined') {
        if ('BroadcastChannel' in window) {
          const bc = new BroadcastChannel('4andone_sync');
          bc.postMessage({ type: 'TRACK_UPDATED', id });
          bc.close();
        }
        localStorage.setItem('4andone_track_sync', Date.now().toString());
      }
    } catch (e) {}
  };

  const toggleFavorite = async (id: string) => {
    // Likes belong to an account: guests are asked to sign in (the heart used
    // to fill for a moment and then vanish on reload).
    if (!isAuthenticated || !user?.id) {
      setIsAuthModalOpen(true);
      return;
    }
    const track = tracks.find(t => t.id === id);
    if (!track) return;

    const newVal = !track.isFavorite;

    // Update state optimistically
    setTracks(prev => prev.map(t => t.id === id ? { ...t, isFavorite: newVal } : t));

    // Persist to this user's local cache — the same per-user key fetchData
    // reads. (It wrote the old global key, so an unliked song came back from
    // the stale per-user cache on reload and was re-uploaded to the cloud.)
    // Guests keep no likes.
    if (isAuthenticated && user?.id && sessionVersion > 0) {
      try {
        const key = `4andone_liked_tracks_${user.id}`;
        let userLikes: string[] = [];
        const saved = localStorage.getItem(key);
        if (saved) userLikes = JSON.parse(saved);

        if (newVal) {
          if (!userLikes.includes(id)) userLikes.push(id);
        } else {
          userLikes = userLikes.filter(lid => lid !== id);
        }
        localStorage.setItem(key, JSON.stringify(userLikes));
      } catch (e) {
        console.error('[FAVORITES] localStorage save failed:', e);
      }
    }

    // Persist to Supabase cloud
    if (isAuthenticated && user?.id && sessionVersion > 0) {
      try {
        if (newVal) {
          await userDb
            .from('user_favorites')
            .upsert({ telegram_id: user.id, track_id: id }, { onConflict: 'telegram_id,track_id' });
        } else {
          await userDb
            .from('user_favorites')
            .delete()
            .eq('telegram_id', user.id)
            .eq('track_id', id);
        }
      } catch (err) {
        console.error('[FAVORITES] Cloud sync failed:', err);
      }
    }
  };

  const addFolder = async (name: string, color: string): Promise<Folder | undefined> => {
    const userId = user?.id ? String(user.id) : null;
    const telegramId = user?.id ? user.id : null;

    const folderObj = {
      name,
      color,
      user_id: userId,
      telegram_id: telegramId
    };

    const { data, error } = await userDb.from('folders').insert([folderObj]).select();
    if (error) {
      console.error('[STUDIO-ERROR] addFolder failed:', error);
      throw error;
    }
    if (data && data[0]) {
      const created: Folder = {
        id: data[0].id,
        name: data[0].name,
        color: data[0].color
      };
      setFolders(prev => [...prev, created]);
      return created;
    }
    return undefined;
  };

  // Failed saves THROW and leave the screen untouched: these used to ignore the server's answer and show the change
  // as done, so it was gone after a reload. Callers show the message.
  const must = (error: { message?: string } | null | undefined, what: string) => {
    if (error) throw new Error(`${what}: ${error.message || 'the server refused'}`);
  };

  const updateFolder = async (id: string, updates: Partial<Folder>) => {
    const { error } = await userDb.from('folders').update(updates).eq('id', id);
    must(error, 'Could not save the playlist');
    setFolders(prev => prev.map(f => f.id === id ? { ...f, ...updates } : f));
  };

  const removeFolder = async (id: string) => {
    const { error: tracksError } = await userDb.from('folder_tracks').delete().eq('folder_id', id);
    must(tracksError, 'Could not delete the playlist');
    const { error } = await userDb.from('folders').delete().eq('id', id);
    must(error, 'Could not delete the playlist');
    setFolders(prev => prev.filter(f => f.id !== id));
    setFolderTracksMap(prev => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
    setTracks(prev => prev.map(t => t.folderId === id ? { ...t, folderId: undefined } : t));
  };

  const assignToFolder = async (trackId: string, folderId: string | undefined) => {
    const { error } = await adminDb.from('tracks').update({ folder_id: folderId }).eq('id', trackId);
    must(error, 'Could not move the track');
    setTracks(prev => prev.map(t => t.id === trackId ? { ...t, folderId } : t));
  };

  const addTrackToFolder = async (folderId: string, trackId: string) => {
    const { error } = await userDb
      .from('folder_tracks')
      .upsert({ folder_id: folderId, track_id: trackId }, { onConflict: 'folder_id,track_id' });
    must(error, 'Could not add the track to the playlist');
    setFolderTracksMap(prev => ({
      ...prev,
      [folderId]: prev[folderId] ? (prev[folderId].includes(trackId) ? prev[folderId] : [...prev[folderId], trackId]) : [trackId]
    }));
  };

  const removeTrackFromFolder = async (folderId: string, trackId: string) => {
    const { error } = await userDb
      .from('folder_tracks')
      .delete()
      .eq('folder_id', folderId)
      .eq('track_id', trackId);
    must(error, 'Could not remove the track from the playlist');
    setFolderTracksMap(prev => ({
      ...prev,
      [folderId]: (prev[folderId] || []).filter(tid => tid !== trackId)
    }));
  };

  const addStyle = async (styleData: Partial<Style>) => {
    const { data, error } = await adminDb.from('styles').insert([styleData]).select();
    must(error, 'Could not add the dance style');
    if (data?.[0]) setStyles(prev => [...prev, data[0]]);
  };

  const updateStyle = async (id: string, updates: Partial<Style>) => {
    const { error } = await adminDb.from('styles').update(updates).eq('id', id);
    must(error, 'Could not save the dance style');
    setStyles(prev => prev.map(s => s.id === id ? { ...s, ...updates } : s));
  };

  const removeStyle = async (id: string) => {
    const { error } = await adminDb.from('styles').delete().eq('id', id);
    must(error, 'Could not delete the dance style');
    setStyles(prev => prev.filter(s => s.id !== id));
  };

  const addTag = async (tagData: Partial<Tag>) => {
    const { data, error } = await adminDb.from('tags').insert([tagData]).select();
    must(error, 'Could not add the tag');
    if (data?.[0]) setTags(prev => [...prev, data[0]]);
  };

  const updateTag = async (id: string, updates: Partial<Tag>) => {
    const { error } = await adminDb.from('tags').update(updates).eq('id', id);
    must(error, 'Could not save the tag');
    setTags(prev => prev.map(t => t.id === id ? { ...t, ...updates } : t));
  };

  const removeTag = async (id: string) => {
    const { error } = await adminDb.from('tags').delete().eq('id', id);
    must(error, 'Could not delete the tag');
    setTags(prev => prev.filter(t => t.id !== id));
  };

  const addToFinal = async (track: Track) => {
    if (!user?.id) { setIsAuthModalOpen(true); return; }
    if (finalTracks.some(t => t.id === track.id)) return;

    const { error } = await userDb.from('final_tracks').insert([{
      track_id: track.id,
      telegram_id: user.id,
      order: finalTracks.length
    }]);

    if (error) {
      console.error("[STUDIO-ERROR] Add to final failed:", error);
      return;
    }

    setFinalTracks(prev => {
      if (prev.find(t => t.id === track.id)) return prev;
      return [...prev, track];
    });
  };

  const removeFromFinal = async (id: string) => {
    const { error } = await userDb.from('final_tracks').delete().eq('track_id', id);
    if (error) { alert('Could not remove track: ' + error.message); return; }
    setFinalTracks(prev => prev.filter(t => t.id !== id));
  };

  const reorderFinalTracks = async (startIndex: number, endIndex: number, folderId?: string | null) => {
    const ids = folderId ? [...(finalFolderTracksMap[folderId] || [])] : finalTracks.map(t => t.id);
    if (startIndex < 0 || endIndex < 0 || startIndex >= ids.length || endIndex >= ids.length || startIndex === endIndex) return;
    const [moved] = ids.splice(startIndex, 1);
    ids.splice(endIndex, 0, moved);
    const results = await Promise.all(ids.map((id, order) => {
      const query = userDb.from(folderId ? 'final_folder_tracks' : 'final_tracks')
        .update({ order }).eq('track_id', id);
      return folderId ? query.eq('final_folder_id', folderId) : query;
    }));
    if (results.some(result => result.error)) {
      alert('Could not save the complete order. Reloading the saved list.');
      await fetchData(true);
      return;
    }
    if (folderId) {
      setFinalFolderTracksMap(prev => ({ ...prev, [folderId]: ids }));
      return;
    }
    setFinalTracks(prev => ids.map(id => prev.find(t => t.id === id)).filter((t): t is Track => !!t));
  };

  const addFinalFolder = async (name: string, color: string) => {
    if (!isAuthenticated || !user) {
      alert("Authentication required. Please login with Telegram first.");
      return;
    }

    const { data, error } = await userDb
      .from<FinalFolder[]>('final_folders')
      .insert([{ name, color, telegram_id: user.id }])
      .select();

    if (error) {
       console.error("[STUDIO-ERROR] addFinalFolder failed:", error);
       alert(`Failed to create folder: ${error.message}`);
       return;
    }

    if (data && data.length > 0) {
      setFinalFolders(prev => [...prev, data[0]]);
    }
  };

  const removeFinalFolder = async (id: string) => {
    const { error } = await userDb.from<FinalFolder[]>('final_folders').delete().eq('id', id);
    if (error) { alert('Could not delete folder: ' + error.message); return; }
    setFinalFolders(prev => prev.filter(f => f.id !== id));
  };

  const addTrackToFinalFolder = async (trackId: string, finalFolderId: string, force = false): Promise<{ success: boolean; duplicate?: string }> => {
    const track = tracks.find(t => t.id === trackId);
    if (!track) return { success: false };

    const currentTracks = getTracksForFinalFolder(finalFolderId);

    if (!force && currentTracks.some(t => t.style === track.style)) {
      return { success: false, duplicate: track.style };
    }

    if (currentTracks.some(t => t.id === trackId)) return { success: true };
    const { error } = await userDb.from('final_folder_tracks').insert([{
      final_folder_id: finalFolderId,
      track_id: trackId,
      order: currentTracks.length
    }]);
    if (error) { alert('Could not add track: ' + error.message); return { success: false }; }

    setFinalFolderTracksMap(prev => {
      const newIds = [...(prev[finalFolderId] || []), trackId];

      return {
        ...prev,
        [finalFolderId]: newIds
      };
    });

    return { success: true };
  };

  const getTracksForFinalFolder = (finalFolderId: string) => {
    const ids = finalFolderTracksMap[finalFolderId] || [];
    return ids.map(id => tracks.find(t => t.id === id)).filter(Boolean) as Track[];
  };

  const reorderTracks = async (draggedTrackId: string, dropTrackId: string, visibleList?: Track[]) => {
    const list = visibleList && visibleList.length > 0 ? visibleList : tracks;
    const dragIdx = list.findIndex(t => t.id === draggedTrackId);
    const dropIdx = list.findIndex(t => t.id === dropTrackId);
    if (dragIdx === -1 || dropIdx === -1 || dragIdx === dropIdx) return;

    const reorderedList = Array.from(list);
    const [movedTrack] = reorderedList.splice(dragIdx, 1);
    reorderedList.splice(dropIdx, 0, movedTrack);

    const prevInScoped = dropIdx > 0 ? reorderedList[dropIdx - 1] : null;
    const nextInScoped = dropIdx < reorderedList.length - 1 ? reorderedList[dropIdx + 1] : null;

    let newOrder: number;

    if (!prevInScoped && nextInScoped) {
      const nO = nextInScoped.globalOrder ?? 10;
      const globalNextIdx = tracks.findIndex(t => t.id === nextInScoped.id);
      const globalPrev = globalNextIdx > 0 ? tracks[globalNextIdx - 1] : null;
      if (globalPrev && globalPrev.id !== movedTrack.id) {
        const pO = globalPrev.globalOrder ?? (nO - 10);
        newOrder = nO > pO ? (pO + nO) / 2 : nO - 1;
      } else {
        newOrder = nO - 10;
      }
    } else if (prevInScoped && !nextInScoped) {
      const pO = prevInScoped.globalOrder ?? 10;
      const globalPrevIdx = tracks.findIndex(t => t.id === prevInScoped.id);
      const globalNext = globalPrevIdx < tracks.length - 1 ? tracks[globalPrevIdx + 1] : null;
      if (globalNext && globalNext.id !== movedTrack.id) {
        const nO = globalNext.globalOrder ?? (pO + 10);
        newOrder = nO > pO ? (pO + nO) / 2 : pO + 1;
      } else {
        newOrder = pO + 10;
      }
    } else if (prevInScoped && nextInScoped) {
      const pO = prevInScoped.globalOrder ?? 10;
      const nO = nextInScoped.globalOrder ?? 20;
      newOrder = nO > pO ? (pO + nO) / 2 : pO + 1;
    } else {
      newOrder = movedTrack.globalOrder ?? 10;
    }

    // 1. Optimistic update in React state (undone below if the server refuses)
    const previousOrder = movedTrack.globalOrder;
    setTracks(prev => {
      const updated = prev.map(t => {
        if (t.id === movedTrack.id) {
          return { ...t, globalOrder: newOrder };
        }
        return t;
      });
      return updated.sort((a, b) => {
        if ((a.globalOrder ?? 0) !== (b.globalOrder ?? 0)) {
          return (a.globalOrder ?? 0) - (b.globalOrder ?? 0);
        }
        return new Date(b.createdAt || b.date || 0).getTime() - new Date(a.createdAt || a.date || 0).getTime();
      });
    });

    // 2. Persist to Supabase. The screen used to keep the new order (and the page said "Saved") even when the
    //    save failed, so the order jumped back after a reload.
    let failure: string | null = null;
    try {
      const { error } = await adminDb
        .from('tracks')
        .update({ global_order: newOrder })
        .eq('id', movedTrack.id);
      if (error) failure = error.message || 'the server refused';
    } catch (err) {
      failure = (err as Error)?.message || 'network error';
    }
    if (failure) {
      console.error('[STUDIO-ERROR] Failed to save track global_order:', failure);
      setTracks(prev => prev.map(t => (t.id === movedTrack.id ? { ...t, globalOrder: previousOrder } : t)).sort((a, b) => {
        if ((a.globalOrder ?? 0) !== (b.globalOrder ?? 0)) return (a.globalOrder ?? 0) - (b.globalOrder ?? 0);
        return new Date(b.createdAt || b.date || 0).getTime() - new Date(a.createdAt || a.date || 0).getTime();
      }));
      throw new Error(`Could not save the new position: ${failure}`);
    }
  };

  const moveTrack = async (trackId: string, direction: 'up' | 'down', visibleList?: Track[]) => {
    const list = visibleList && visibleList.length > 0 ? visibleList : tracks;
    const idx = list.findIndex(t => t.id === trackId);
    if (idx === -1) return;
    const targetIdx = direction === 'up' ? idx - 1 : idx + 1;
    if (targetIdx < 0 || targetIdx >= list.length) return;
    await reorderTracks(trackId, list[targetIdx].id, list);
  };

  const reorderGlobalTracks = async (startIndex: number, endIndex: number, visibleList?: Track[]) => {
    const list = visibleList && visibleList.length > 0 ? visibleList : tracks;
    if (startIndex >= 0 && startIndex < list.length && endIndex >= 0 && endIndex < list.length) {
      await reorderTracks(list[startIndex].id, list[endIndex].id, list);
    }
  };

  // Dynamic Album Builder Methods
  const refreshAlbums = async () => {
    try {
      const res = await fetch('/api/albums');
      if (res.ok) {
        const data = await res.json();
        if (data.albums) setAlbums(data.albums);
      }
    } catch (e) {
      console.error('refreshAlbums failed:', e);
    }
  };

  // Album saves report what the server said instead of silently doing nothing (the admin page used to close
  // the editor and drop what was typed even when the save had failed).
  const albumRequest = async (url: string, init: RequestInit): Promise<any> => {
    let res: Response;
    try {
      res = await fetch(url, init);
    } catch {
      throw new Error('No connection to the server. Check the internet and try again.');
    }
    const json = await res.json().catch(() => null);
    if (!res.ok) throw new Error(json?.error || `The server refused the request (${res.status}).`);
    return json;
  };
  const syncAlbumsToOtherTabs = () => {
    try {
      const bc = new BroadcastChannel('4andone_sync');
      bc.postMessage({ type: 'SYNC_ALBUMS' });
      bc.close();
    } catch (e) {}
  };

  const addAlbum = async (albumData: Partial<Album>) => {
    const json = await albumRequest('/api/albums', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(albumData),
    });
    if (!json?.album) throw new Error('The album was not saved.');
    setAlbums(prev => {
      const next = [json.album, ...prev.filter(a => a.id !== json.album.id)];
      next.sort((a, b) => (a.orderIndex ?? 0) - (b.orderIndex ?? 0));
      return next;
    });
    syncAlbumsToOtherTabs();
    return json.album as Album;
  };

  const updateAlbum = async (id: string, updates: Partial<Album>) => {
    const json = await albumRequest('/api/albums', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, ...updates }),
    });
    if (json?.album) setAlbums(prev => prev.map(a => a.id === id ? json.album : a));
    syncAlbumsToOtherTabs();
  };

  const deleteAlbum = async (id: string) => {
    await albumRequest(`/api/albums?id=${encodeURIComponent(id)}`, { method: 'DELETE' });
    setAlbums(prev => prev.filter(a => a.id !== id));
    syncAlbumsToOtherTabs();
  };

  const reorderAlbums = async (albumIds: string[]) => {
    const before = albums;
    setAlbums(prev => {
      const map = new Map(prev.map(a => [a.id, a]));
      const next: Album[] = [];
      albumIds.forEach((id, idx) => {
        const album = map.get(id);
        if (album) {
          next.push({ ...album, orderIndex: idx });
          map.delete(id);
        }
      });
      map.forEach(a => next.push({ ...a, orderIndex: next.length }));
      return next;
    });
    try {
      const json = await albumRequest('/api/albums/reorder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ albumIds }),
      });
      if (json?.albums) setAlbums(json.albums);
      syncAlbumsToOtherTabs();
    } catch (e) {
      setAlbums(before); // the new order was not saved: put the old one back
      throw e;
    }
  };

  const stats = {
    totalTracks: tracks.length,
    totalFolders: folders.length,
    totalPlaylists: finalFolders.length,
    activeUsers: 1,
  };

  return (
    <StudioContext.Provider value={{
      tracks, folders, folderTracksMap, styles, tags,
      addTrack, removeTrack, updateTrack, toggleFavorite,
      addFolder, updateFolder, removeFolder, assignToFolder,
      addTrackToFolder, removeTrackFromFolder,
      addStyle, updateStyle, removeStyle,
      addTag, updateTag, removeTag,
      finalTracks, finalFolders, addFinalFolder, removeFinalFolder,
      addToFinal, removeFromFinal, reorderFinalTracks, setFinalTracks,
      reorderGlobalTracks, reorderTracks, moveTrack, addTrackToFinalFolder, getTracksForFinalFolder,
      albums, refreshAlbums, addAlbum, updateAlbum, deleteAlbum, reorderAlbums,
      stats,
      isLoading,
      refreshData: fetchData
    }}>
      {children}
    </StudioContext.Provider>
  );
};

export const useStudio = () => {
  const context = useContext(StudioContext);
  if (context === undefined) {
    throw new Error('useStudio must be used within a StudioProvider');
  }
  return context;
};
