"use client";

import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';
import { supabase } from '@/utils/supabase';
import { useAuth } from '@/context/AuthContext';

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
  
  // Tracks
  addTrack: (track: Partial<Track>) => Promise<Track | undefined>;
  removeTrack: (id: string) => Promise<void>;
  updateTrack: (id: string, updates: Partial<Track>) => Promise<void>;
  toggleFavorite: (id: string) => Promise<void>;
  
  // Folders
  addFolder: (name: string, color: string) => void;
  updateFolder: (id: string, updates: Partial<Folder>) => void;
  removeFolder: (id: string) => void;
  assignToFolder: (trackId: string, folderId: string | undefined) => void;

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
  reorderGlobalTracks: (startIndex: number, endIndex: number) => Promise<void>;
  addTrackToFinalFolder: (trackId: string, finalFolderId: string, force?: boolean) => Promise<{ success: boolean; duplicate?: string }>;
  getTracksForFinalFolder: (finalFolderId: string) => Track[];
  
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
  const [styles, setStyles] = useState<Style[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [finalTracks, setFinalTracks] = useState<Track[]>([]);
  const [finalFolders, setFinalFolders] = useState<FinalFolder[]>([]);
  const [finalFolderTracksMap, setFinalFolderTracksMap] = useState<Record<string, string[]>>({}); // folderId -> [trackIds]
  const [isLoading, setIsLoading] = useState(true);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      // 1. Fetch Global Tracks (Shared for now)
      const { data: tracksData } = await supabase.from('tracks').select('*').order('created_at', { ascending: false });
      
      // 2. Fetch User Specific Collections
      let foldersData = [];
      let finalFoldersData = [];

      if (isAuthenticated && user) {
        const { data: fData } = await supabase.from('folders').select('*').eq('user_id', user.id).order('name');
        if (fData) foldersData = fData;

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

      if (tracksData) {
        // Read user's personal likes from localStorage (not global DB field)
        let userLikes: string[] = [];
        try {
          const saved = localStorage.getItem('4andone_liked_tracks');
          if (saved) userLikes = JSON.parse(saved);
        } catch (e) {}

        setTracks(tracksData.map(t => ({
          ...t,
          audioUrl: t.audio_url,
          artworkUrl: t.artwork_url,
          folderId: t.folder_id,
          globalOrder: t.global_order || 0,
          duration: t.duration || 0,
          isFavorite: userLikes.includes(t.id)
        })));
      }

      // Fetch Folders, Styles, Tags
      setFolders(foldersData);
      setFinalFolders(finalFoldersData);

      const { data: stylesData } = await supabase.from('styles').select('*').order('order');
      if (stylesData) setStyles(stylesData);

      const { data: tagsData } = await supabase.from('tags').select('*').order('name');
      if (tagsData) setTags(tagsData);
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
              return [{ 
                ...nt, 
                audioUrl: nt.audio_url, 
                artworkUrl: nt.artwork_url,
                folderId: nt.folder_id,
                duration: nt.duration || 0,
                isFavorite: isLiked,
                globalOrder: nt.global_order || 0
              }, ...prev];
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
                isFavorite: t.isFavorite, // Keep the user's local like status
                duration: ut.duration || 0,
                globalOrder: ut.global_order || 0
              };
            }));
          } else if (payload.eventType === 'DELETE') {
            setTracks(prev => prev.filter(t => t.id !== payload.old.id));
          }
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [isAuthenticated, user]);

  const addTrack = async (trackData: Partial<Track>) => {
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
        global_order: trackData.globalOrder || 0,
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
          duration: nt.duration || 0,
          isFavorite: false
       };
      
      setTracks(prev => {
        // Prevent duplicate from real-time INSERT if it fired quickly
        if (prev.some(t => t.id === newTrack.id)) return prev;
        return [newTrack, ...prev];
      });
      
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
  };

  const toggleFavorite = async (id: string) => {
    const track = tracks.find(t => t.id === id);
    if (!track) return;

    const newVal = !track.isFavorite;
    
    // Update state
    setTracks(prev => prev.map(t => t.id === id ? { ...t, isFavorite: newVal } : t));

    // Persist to localStorage (per-user, not global DB)
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
  };

  const addFolder = async (name: string, color: string) => {
    // Silent get user for UUID
    const { data: { user: authUser } } = await supabase.auth.getUser();
    const userId = authUser?.id || null;

    const folderObj = { name, color, user_id: userId };
    const { data } = await supabase.from('folders').insert([folderObj]).select();
    if (data) setFolders(prev => [...prev, data[0]]);
  };

  const updateFolder = async (id: string, updates: Partial<Folder>) => {
    await supabase.from('folders').update(updates).eq('id', id);
    setFolders(prev => prev.map(f => f.id === id ? { ...f, ...updates } : f));
  };

  const removeFolder = async (id: string) => {
    await supabase.from('folders').delete().eq('id', id);
    setFolders(prev => prev.filter(f => f.id !== id));
    setTracks(prev => prev.map(t => t.folderId === id ? { ...t, folderId: undefined } : t));
  };

  const assignToFolder = async (trackId: string, folderId: string | undefined) => {
    await supabase.from('tracks').update({ folder_id: folderId }).eq('id', trackId);
    setTracks(prev => prev.map(t => t.id === trackId ? { ...t, folderId } : t));
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

  const reorderGlobalTracks = async (startIndex: number, endIndex: number) => {
    const result = Array.from(tracks);
    const [removed] = result.splice(startIndex, 1);
    result.splice(endIndex, 0, removed);
    
    setTracks(result);

    // Persist sorting logic (using fractional indexing or simple re-map)
    // For now, let's just update the global_order column for the moved item locally
    // in a real app we'd broadcast this or update all orders.
    // Simplifying: we'll just update the affected items.
  };

  const stats = {
    totalTracks: tracks.length,
    totalFolders: folders.length,
    totalPlaylists: finalFolders.length,
    activeUsers: 1,
  };

  return (
    <StudioContext.Provider value={{ 
      tracks, folders, styles, tags,
      addTrack, removeTrack, updateTrack, toggleFavorite,
      addFolder, updateFolder, removeFolder, assignToFolder,
      addStyle, updateStyle, removeStyle,
      addTag, updateTag, removeTag,
      finalTracks, finalFolders, addFinalFolder, removeFinalFolder,
      addToFinal, removeFromFinal, reorderFinalTracks, setFinalTracks,
      reorderGlobalTracks, addTrackToFinalFolder, getTracksForFinalFolder,
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
