"use client";

import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';
import { supabase } from '@/utils/supabase';
import { useAuth } from '@/context/AuthContext';
import { Album, DEFAULT_ALBUMS } from '@/types/album';

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
  updateFolder: (id: string, updates: Partial<Folder>) => void;
  removeFolder: (id: string) => void;
  assignToFolder: (trackId: string, folderId: string | undefined) => void;
  addTrackToFolder: (folderId: string, trackId: string) => Promise<void>;
  removeTrackFromFolder: (folderId: string, trackId: string) => Promise<void>;

  // Taxonomy (Styles & Tags)
  addStyle: (style: Partial<Style>) => void;
  updateStyle: (id: string, updates: Partial<Style>) => void;
  removeStyle: (id: string) => void;
  addTag: (tag: Partial<Tag>) => void;
  updateTag: (id: string, updates: Partial<Tag>) => void;
  removeTag: (id: string) => void;
  
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

export const StudioProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, isAuthenticated } = useAuth();
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
      // 1. Fetch Global Tracks
      const { data: tracksData } = await supabase
        .from('tracks')
        .select('*')
        .order('global_order', { ascending: true })
        .order('created_at', { ascending: false })
        .limit(10000);
      
      // 2. Fetch User Specific Collections
      let foldersData: Folder[] = [];
      let finalFoldersData: FinalFolder[] = [];
      const newFolderTracksMap: Record<string, string[]> = {};

      if (isAuthenticated && user?.id) {
        // Fetch user folders by telegram_id or user_id
        const { data: fData } = await supabase
          .from('folders')
          .select('*')
          .or(`telegram_id.eq.${user.id},user_id.eq.${user.id}`)
          .order('created_at', { ascending: true });
        
        if (fData && fData.length > 0) {
          foldersData = fData.map(f => ({
            id: f.id,
            name: f.name,
            color: f.color
          }));

          const folderIds = fData.map(f => f.id);
          const { data: ftData } = await supabase
            .from('folder_tracks')
            .select('folder_id, track_id')
            .in('folder_id', folderIds);

          if (ftData) {
            ftData.forEach(item => {
              if (!newFolderTracksMap[item.folder_id]) {
                newFolderTracksMap[item.folder_id] = [];
              }
              newFolderTracksMap[item.folder_id].push(item.track_id);
            });
          }
        }

        const { data: ffData } = await supabase.from('final_folders').select('*').eq('user_id', user.id);
        if (ffData) finalFoldersData = ffData;
        
        // Final Tracks Queue
        const { data: ftData } = await supabase.from('final_tracks').select('track_id').eq('user_id', user.id);
        if (ftData) {
           const ftIds = ftData.map(f => f.track_id);
           const ftTracks = tracksData?.filter(t => ftIds.includes(t.id)) || [];
           setFinalTracks(ftTracks);
        }
      }

      setFolderTracksMap(newFolderTracksMap);

      // 3. User Favorites Cloud Sync
      let userLikes: string[] = [];
      try {
        const saved = localStorage.getItem('4andone_liked_tracks');
        if (saved) userLikes = JSON.parse(saved);
      } catch (e) {}

      if (isAuthenticated && user?.id) {
        try {
          const { data: favData } = await supabase
            .from('user_favorites')
            .select('track_id')
            .eq('telegram_id', user.id);

          if (favData && favData.length > 0) {
            const cloudTrackIds = favData.map(f => f.track_id);
            const combined = Array.from(new Set([...cloudTrackIds, ...userLikes]));
            // Sync any local likes not yet in cloud
            const unsynced = userLikes.filter(id => !cloudTrackIds.includes(id));
            if (unsynced.length > 0) {
              supabase.from('user_favorites').insert(
                unsynced.map(track_id => ({ telegram_id: user.id, track_id }))
              ).then(() => {});
            }
            userLikes = combined;
            try {
              localStorage.setItem('4andone_liked_tracks', JSON.stringify(userLikes));
            } catch (e) {}
          } else if (userLikes.length > 0) {
            // First time cloud sync for existing local likes
            supabase.from('user_favorites').insert(
              userLikes.map(track_id => ({ telegram_id: user.id, track_id }))
            ).then(() => {});
          }
        } catch (favErr) {
          console.error('[STUDIO-ERROR] sync user_favorites failed:', favErr);
        }
      }

      if (tracksData) {
        const mapped = tracksData.map(t => ({
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
        setTracks(mapped);
      }

      // Fetch Folders, Styles, Tags
      setFolders(foldersData);
      setFinalFolders(finalFoldersData);

      const { data: stylesData } = await supabase.from('styles').select('*').order('order');
      if (stylesData) setStyles(stylesData);

      const { data: tagsData } = await supabase.from('tags').select('*').order('name');
      if (tagsData) setTags(tagsData);

      // Fetch Albums (Dynamic Album Builder)
      try {
        const aRes = await fetch('/api/albums');
        if (aRes.ok) {
          const aData = await aRes.json();
          if (aData.albums) setAlbums(aData.albums);
        }
      } catch (e) {
        console.warn('Failed to load albums:', e);
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Load from Supabase and Subscribe to Real-Time Updates
  useEffect(() => {
    fetchData();

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
                const saved = localStorage.getItem('4andone_liked_tracks');
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
  }, [isAuthenticated, user]);

  const addTrack = async (trackData: Partial<Track>) => {
    let initialOrder = trackData.globalOrder;
    if (initialOrder === undefined) {
      const minO = tracks.length > 0 ? Math.min(...tracks.map(t => t.globalOrder ?? 10)) : 10;
      initialOrder = minO - 10;
    }

    const { data, error } = await supabase
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
    const { error } = await supabase.from('tracks').delete().eq('id', id);
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

    const { error } = await supabase
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
    const track = tracks.find(t => t.id === id);
    if (!track) return;

    const newVal = !track.isFavorite;
    
    // Update state optimistically
    setTracks(prev => prev.map(t => t.id === id ? { ...t, isFavorite: newVal } : t));

    // Persist to localStorage
    try {
      let userLikes: string[] = [];
      const saved = localStorage.getItem('4andone_liked_tracks');
      if (saved) userLikes = JSON.parse(saved);
      
      if (newVal) {
        if (!userLikes.includes(id)) userLikes.push(id);
      } else {
        userLikes = userLikes.filter(lid => lid !== id);
      }
      localStorage.setItem('4andone_liked_tracks', JSON.stringify(userLikes));
    } catch (e) {
      console.error('[FAVORITES] localStorage save failed:', e);
    }

    // Persist to Supabase cloud
    if (isAuthenticated && user?.id) {
      try {
        if (newVal) {
          await supabase
            .from('user_favorites')
            .upsert({ telegram_id: user.id, track_id: id }, { onConflict: 'telegram_id,track_id' });
        } else {
          await supabase
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

    const { data, error } = await supabase.from('folders').insert([folderObj]).select();
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

  const updateFolder = async (id: string, updates: Partial<Folder>) => {
    await supabase.from('folders').update(updates).eq('id', id);
    setFolders(prev => prev.map(f => f.id === id ? { ...f, ...updates } : f));
  };

  const removeFolder = async (id: string) => {
    try {
      await supabase.from('folder_tracks').delete().eq('folder_id', id);
      await supabase.from('folders').delete().eq('id', id);
    } catch (err) {
      console.error('[STUDIO] removeFolder error:', err);
    }
    setFolders(prev => prev.filter(f => f.id !== id));
    setFolderTracksMap(prev => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
    setTracks(prev => prev.map(t => t.folderId === id ? { ...t, folderId: undefined } : t));
  };

  const assignToFolder = async (trackId: string, folderId: string | undefined) => {
    await supabase.from('tracks').update({ folder_id: folderId }).eq('id', trackId);
    setTracks(prev => prev.map(t => t.id === trackId ? { ...t, folderId } : t));
  };

  const addTrackToFolder = async (folderId: string, trackId: string) => {
    try {
      await supabase
        .from('folder_tracks')
        .upsert({ folder_id: folderId, track_id: trackId }, { onConflict: 'folder_id,track_id' });
    } catch (e) {
      console.error('[STUDIO] addTrackToFolder error:', e);
    }
    setFolderTracksMap(prev => ({
      ...prev,
      [folderId]: prev[folderId] ? (prev[folderId].includes(trackId) ? prev[folderId] : [...prev[folderId], trackId]) : [trackId]
    }));
  };

  const removeTrackFromFolder = async (folderId: string, trackId: string) => {
    try {
      await supabase
        .from('folder_tracks')
        .delete()
        .eq('folder_id', folderId)
        .eq('track_id', trackId);
    } catch (e) {
      console.error('[STUDIO] removeTrackFromFolder error:', e);
    }
    setFolderTracksMap(prev => ({
      ...prev,
      [folderId]: (prev[folderId] || []).filter(tid => tid !== trackId)
    }));
  };

  const addStyle = async (styleData: Partial<Style>) => {
    const { data, error } = await supabase.from('styles').insert([styleData]).select();
    if (error) alert("Error adding style: " + error.message);
    if (data) setStyles(prev => [...prev, data[0]]);
  };

  const updateStyle = async (id: string, updates: Partial<Style>) => {
    const { error } = await supabase.from('styles').update(updates).eq('id', id);
    if (error) alert("Error updating style: " + error.message);
    setStyles(prev => prev.map(s => s.id === id ? { ...s, ...updates } : s));
  };

  const removeStyle = async (id: string) => {
    const { error } = await supabase.from('styles').delete().eq('id', id);
    if (error) alert("Error deleting style: " + error.message);
    setStyles(prev => prev.filter(s => s.id !== id));
  };

  const addTag = async (tagData: Partial<Tag>) => {
    const { data, error } = await supabase.from('tags').insert([tagData]).select();
    if (error) alert("Error adding tag: " + error.message);
    if (data) setTags(prev => [...prev, data[0]]);
  };

  const updateTag = async (id: string, updates: Partial<Tag>) => {
    const { error } = await supabase.from('tags').update(updates).eq('id', id);
    if (error) alert("Error updating tag: " + error.message);
    setTags(prev => prev.map(t => t.id === id ? { ...t, ...updates } : t));
  };

  const removeTag = async (id: string) => {
    const { error } = await supabase.from('tags').delete().eq('id', id);
    if (error) alert("Error deleting tag: " + error.message);
    setTags(prev => prev.filter(t => t.id !== id));
  };

  const addToFinal = async (track: Track) => {
    const { data: { user: authUser } } = await supabase.auth.getUser();
    const userId = authUser?.id || null;

    const { error } = await supabase.from('final_tracks').insert([{ 
      track_id: track.id, 
      user_id: userId
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
    await supabase.from('final_tracks').delete().eq('track_id', id);
    setFinalTracks(prev => prev.filter(t => t.id !== id));
  };

  const reorderFinalTracks = async (startIndex: number, endIndex: number, folderId?: string | null) => {
    if (folderId) {
      setFinalFolderTracksMap(prev => {
        const result = Array.from(prev[folderId] || []);
        const [removed] = result.splice(startIndex, 1);
        result.splice(endIndex, 0, removed);
        return { ...prev, [folderId]: result };
      });
      return;
    }

    setFinalTracks(prev => {
      const result = Array.from(prev);
      const [removed] = result.splice(startIndex, 1);
      result.splice(endIndex, 0, removed);
      return result;
    });
  };

  const addFinalFolder = async (name: string, color: string) => {
    if (!isAuthenticated || !user) {
      alert("Authentication required. Please login with Telegram first.");
      return;
    }

    const { data: { user: authUser } } = await supabase.auth.getUser();
    const userId = authUser?.id;

    if (!userId) {
      console.warn("[STUDIO-WARN] No Supabase session found for addFinalFolder");
      // Fallback to anonymous if RLS allows, but we expect sync to resolve this
    }

    const { data, error } = await supabase
      .from('final_folders')
      .insert([{ name, color, user_id: userId || null }])
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
    await supabase.from('final_folders').delete().eq('id', id);
    setFinalFolders(prev => prev.filter(f => f.id !== id));
  };

  const addTrackToFinalFolder = async (trackId: string, finalFolderId: string, force = false): Promise<{ success: boolean; duplicate?: string }> => {
    const track = tracks.find(t => t.id === trackId);
    if (!track) return { success: false };

    const currentTracks = getTracksForFinalFolder(finalFolderId);
    
    if (!force && currentTracks.some(t => t.style === track.style)) {
      return { success: false, duplicate: track.style };
    }

    await supabase.from('final_folder_tracks').insert([{
      final_folder_id: finalFolderId,
      track_id: trackId,
      order: currentTracks.length
    }]);

    setFinalFolderTracksMap(prev => {
      const newIds = [...(prev[finalFolderId] || []), trackId];
      
      const sortedIds = newIds
        .map(id => tracks.find(t => t.id === id))
        .filter(Boolean)
        .sort((a, b) => {
          const orderA = DANCE_ORDER[a!.style] || 999;
          const orderB = DANCE_ORDER[b!.style] || 999;
          return orderA - orderB;
        })
        .map(t => t!.id);

      return {
        ...prev,
        [finalFolderId]: sortedIds
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

    // 1. Optimistic update in React state
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

    // 2. Persist to Supabase
    try {
      const { error } = await supabase
        .from('tracks')
        .update({ global_order: newOrder })
        .eq('id', movedTrack.id);
      if (error) {
        console.error('[STUDIO-ERROR] Failed to save track global_order:', error);
      }
    } catch (err) {
      console.error('[STUDIO-ERROR] Error persisting track order:', err);
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

  const addAlbum = async (albumData: Partial<Album>) => {
    try {
      const res = await fetch('/api/albums', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(albumData),
      });
      if (res.ok) {
        const json = await res.json();
        if (json.album) {
          setAlbums(prev => {
            const next = [json.album, ...prev.filter(a => a.id !== json.album.id)];
            next.sort((a, b) => (a.orderIndex ?? 0) - (b.orderIndex ?? 0));
            return next;
          });
          try {
            const bc = new BroadcastChannel('4andone_sync');
            bc.postMessage({ type: 'SYNC_ALBUMS' });
            bc.close();
          } catch (e) {}
          return json.album;
        }
      }
    } catch (e) {
      console.error('addAlbum failed:', e);
    }
  };

  const updateAlbum = async (id: string, updates: Partial<Album>) => {
    try {
      const res = await fetch('/api/albums', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, ...updates }),
      });
      if (res.ok) {
        const json = await res.json();
        if (json.album) {
          setAlbums(prev => prev.map(a => a.id === id ? json.album : a));
          try {
            const bc = new BroadcastChannel('4andone_sync');
            bc.postMessage({ type: 'SYNC_ALBUMS' });
            bc.close();
          } catch (e) {}
        }
      }
    } catch (e) {
      console.error('updateAlbum failed:', e);
    }
  };

  const deleteAlbum = async (id: string) => {
    try {
      const res = await fetch(`/api/albums?id=${encodeURIComponent(id)}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        setAlbums(prev => prev.filter(a => a.id !== id));
        try {
          const bc = new BroadcastChannel('4andone_sync');
          bc.postMessage({ type: 'SYNC_ALBUMS' });
          bc.close();
        } catch (e) {}
      }
    } catch (e) {
      console.error('deleteAlbum failed:', e);
    }
  };

  const reorderAlbums = async (albumIds: string[]) => {
    try {
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

      const res = await fetch('/api/albums/reorder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ albumIds }),
      });
      if (res.ok) {
        const json = await res.json();
        if (json.albums) setAlbums(json.albums);
        try {
          const bc = new BroadcastChannel('4andone_sync');
          bc.postMessage({ type: 'SYNC_ALBUMS' });
          bc.close();
        } catch (e) {}
      }
    } catch (e) {
      console.error('reorderAlbums failed:', e);
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
