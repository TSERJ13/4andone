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
  
  // Tracks
  addTrack: (track: Partial<Track>) => void;
  removeTrack: (id: string) => void;
  updateTrack: (id: string, updates: Partial<Track>) => void;
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
  reorderFinalTracks: (startIndex: number, endIndex: number) => void;
  setFinalTracks: (tracks: Track[]) => void;
  
  // Advanced Reordering
  reorderGlobalTracks: (startIndex: number, endIndex: number) => Promise<void>;
  addTrackToFinalFolder: (trackId: string, finalFolderId: string, force?: boolean) => Promise<{ success: boolean; duplicate?: string }>;
  getTracksForFinalFolder: (finalFolderId: string) => Track[];
  
  stats: {
    totalTracks: number;
    storageUsed: string;
    activeUsers: number;
  };
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
  const [isLoaded, setIsLoaded] = useState(false);

  // Load from Supabase and Subscribe to Real-Time Updates
  useEffect(() => {
    const fetchData = async () => {
      // 1. Fetch Global Tracks (Shared for now)
      const { data: tracksData } = await supabase.from('tracks').select('*').order('created_at', { ascending: false });
      
      // 2. Fetch User Specific Collections
      let foldersData = [];
      let finalFoldersData = [];
      let favoritesData: string[] = [];

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
        setTracks(tracksData.map(t => ({
          ...t,
          audioUrl: t.audio_url,
          folderId: t.folder_id,
          globalOrder: t.global_order || 0,
          duration: t.duration || 0,
          isFavorite: t.is_favorite || false
        })));
      }

      // Fetch Folders, Styles, Tags (same as before)
      setFolders(foldersData);
      setFinalFolders(finalFoldersData);

      const { data: stylesData } = await supabase.from('styles').select('*').order('order');
      if (stylesData) setStyles(stylesData);

      const { data: tagsData } = await supabase.from('tags').select('*').order('name');
      if (tagsData) setTags(tagsData);

      setIsLoaded(true);
    };

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
            setTracks(prev => [{ ...nt, audioUrl: nt.audio_url, folderId: nt.folder_id }, ...prev]);
          } else if (payload.eventType === 'UPDATE') {
            const ut = payload.new as any;
            setTracks(prev => prev.map(t => t.id === ut.id ? { ...ut, audioUrl: ut.audio_url, folderId: ut.folder_id, isFavorite: ut.is_favorite } : t));
          } else if (payload.eventType === 'DELETE') {
            setTracks(prev => prev.filter(t => t.id !== payload.old.id));
          }
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

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
        folder_id: trackData.folderId,
        tags: trackData.tags || [],
        duration: trackData.duration || 0,
        global_order: trackData.globalOrder || 0,
      }])
      .select();

    if (error) {
      console.error("[SYNC-ERROR] Add failed:", error);
      alert("Failed to save to cloud: " + error.message);
    }
    // State is updated by Real-Time listener or manually here if needed
  };

  const removeTrack = async (id: string) => {
    const { error } = await supabase.from('tracks').delete().eq('id', id);
    if (error) console.error("[SYNC-ERROR] Delete failed:", error);
  };

  const updateTrack = async (id: string, updates: Partial<Track>) => {
    const dbUpdates: any = { 
      title: updates.title,
      artist: updates.artist,
      style: updates.style,
      bpm: updates.bpm,
      album: updates.album,
      tags: updates.tags,
      duration: updates.duration
    };
    
    if (updates.audioUrl !== undefined) dbUpdates.audio_url = updates.audioUrl;
    if (updates.folderId !== undefined) dbUpdates.folder_id = updates.folderId;
    if (updates.globalOrder !== undefined) dbUpdates.global_order = updates.globalOrder;

    // Clean undefined fields
    Object.keys(dbUpdates).forEach(key => dbUpdates[key] === undefined && delete dbUpdates[key]);

    const { error } = await supabase.from('tracks').update(dbUpdates).eq('id', id);
    
    if (error) {
      console.error("[SYNC-ERROR] Update failed:", error);
      alert("Changes were NOT saved to cloud. Refresh and try again.");
    } else {
      console.log(`[SYNC-OK] Track ${id} updated on cloud.`);
    }
  };

  const toggleFavorite = async (id: string) => {
    const track = tracks.find(t => t.id === id);
    if (!track) return;

    const newVal = !track.isFavorite;
    
    // Optimistic update
    setTracks(prev => prev.map(t => t.id === id ? { ...t, isFavorite: newVal } : t));

    const { error } = await supabase.from('tracks').update({ is_favorite: newVal }).eq('id', id);
    if (error) {
      console.error("[SYNC-ERROR] Toggle favorite failed:", error);
      // Rollback on error
      setTracks(prev => prev.map(t => t.id === id ? { ...t, isFavorite: !newVal } : t));
    }
  };

  const addFolder = async (name: string, color: string) => {
    const folderObj = { name, color, user_id: user?.id || null };
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

  // Taxonomy CRUD methods
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
    await supabase.from('final_tracks').insert([{ track_id: track.id, user_id: user?.id || null }]);
    setFinalTracks(prev => {
      if (prev.find(t => t.id === track.id)) return prev;
      return [...prev, track];
    });
  };

  const removeFromFinal = async (id: string) => {
    await supabase.from('final_tracks').delete().eq('track_id', id);
    setFinalTracks(prev => prev.filter(t => t.id !== id));
  };

  const reorderFinalTracks = async (startIndex: number, endIndex: number) => {
    setFinalTracks(prev => {
      const result = Array.from(prev);
      const [removed] = result.splice(startIndex, 1);
      result.splice(endIndex, 0, removed);
      return result;
    });
  };

  const addFinalFolder = async (name: string, color: string) => {
    const { data } = await supabase.from('final_folders').insert([{ name, color, user_id: user?.id || null }]).select();
    if (data) setFinalFolders(prev => [...prev, data[0]]);
  };

  const removeFinalFolder = async (id: string) => {
    await supabase.from('final_folders').delete().eq('id', id);
    setFinalFolders(prev => prev.filter(f => f.id !== id));
  };

  const addTrackToFinalFolder = async (trackId: string, finalFolderId: string, force = false): Promise<{ success: boolean; duplicate?: string }> => {
    const track = tracks.find(t => t.id === trackId);
    if (!track) return { success: false };

    const currentTracks = getTracksForFinalFolder(finalFolderId);
    
    // Check for duplicate style
    if (!force && currentTracks.some(t => t.style === track.style)) {
      return { success: false, duplicate: track.style };
    }

    // Add to DB
    await supabase.from('final_folder_tracks').insert([{
      final_folder_id: finalFolderId,
      track_id: trackId,
      order: currentTracks.length
    }]);

    // Update Local Map
    setFinalFolderTracksMap(prev => {
      const newIds = [...(prev[finalFolderId] || []), trackId];
      
      // AUTO-SORT: Apply competition sequence logic
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
    storageUsed: `${(tracks.length * 4.2).toFixed(1)} MB`, 
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
      stats 
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
