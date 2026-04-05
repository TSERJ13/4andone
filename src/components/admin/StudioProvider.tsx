import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '@/utils/supabase';

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
}

export interface Folder {
  id: string;
  name: string;
  color: string;
}

interface StudioContextType {
  tracks: Track[];
  folders: Folder[];
  addTrack: (track: Partial<Track>) => void;
  removeTrack: (id: string) => void;
  updateTrack: (id: string, updates: Partial<Track>) => void;
  addFolder: (name: string, color: string) => void;
  updateFolder: (id: string, updates: Partial<Folder>) => void;
  removeFolder: (id: string) => void;
  assignToFolder: (trackId: string, folderId: string | undefined) => void;
  finalTracks: Track[];
  addToFinal: (track: Track) => void;
  removeFromFinal: (id: string) => void;
  reorderFinalTracks: (startIndex: number, endIndex: number) => void;
  stats: {
    totalTracks: number;
    storageUsed: string;
    activeUsers: number;
  };
}

const StudioContext = createContext<StudioContextType | undefined>(undefined);

export const StudioProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [tracks, setTracks] = useState<Track[]>([]);
  const [folders, setFolders] = useState<Folder[]>([]);
  const [finalTracks, setFinalTracks] = useState<Track[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  // Load from Supabase
  useEffect(() => {
    const fetchData = async () => {
      // Fetch Tracks
      const { data: tracksData } = await supabase.from('tracks').select('*').order('created_at', { ascending: false });
      if (tracksData) setTracks(tracksData);

      // Fetch Folders
      const { data: foldersData } = await supabase.from('folders').select('*').order('name');
      if (foldersData) setFolders(foldersData);

      // Fetch Finals
      const { data: finalsData } = await supabase.from('final_tracks').select('*, tracks(*)');
      if (finalsData) {
        setFinalTracks(finalsData.map((f: any) => f.tracks));
      }

      setIsLoaded(true);
    };

    fetchData();
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
      }])
      .select();

    if (data) setTracks(prev => [data[0], ...prev]);
  };

  const removeTrack = async (id: string) => {
    await supabase.from('tracks').delete().eq('id', id);
    setTracks(prev => prev.filter(t => t.id !== id));
  };

  const updateTrack = async (id: string, updates: Partial<Track>) => {
    await supabase.from('tracks').update(updates).eq('id', id);
    setTracks(prev => prev.map(t => t.id === id ? { ...t, ...updates } : t));
  };

  const addFolder = async (name: string, color: string) => {
    const { data } = await supabase
      .from('folders')
      .insert([{ name, color }])
      .select();

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

  const addToFinal = async (track: Track) => {
    await supabase.from('final_tracks').insert([{ track_id: track.id }]);
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
    // Logic for persistent reordering would go here
    setFinalTracks(prev => {
      const result = Array.from(prev);
      const [removed] = result.splice(startIndex, 1);
      result.splice(endIndex, 0, removed);
      return result;
    });
  };

  const stats = {
    totalTracks: tracks.length,
    storageUsed: `${(tracks.length * 4.2).toFixed(1)} MB`, 
    activeUsers: 1,
  };

  return (
    <StudioContext.Provider value={{ 
      tracks, 
      folders, 
      addTrack, 
      removeTrack, 
      updateTrack, 
      addFolder, 
      updateFolder,
      removeFolder,
      assignToFolder,
      finalTracks,
      addToFinal,
      removeFromFinal,
      reorderFinalTracks,
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
