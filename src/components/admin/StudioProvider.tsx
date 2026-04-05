"use client";

import React, { createContext, useContext, useState, useEffect } from 'react';

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
  addTrack: (track: Omit<Track, 'id' | 'date'>) => void;
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

const DEFAULT_TRACKS: Track[] = [
  { id: '1', title: 'Samba Fever', artist: 'Rio Ensemble', album: 'Dancesport Classics', style: 'Samba', bpm: '52', date: '2026-04-01' },
  { id: '2', title: 'Midnight Waltz', artist: 'Ballroom Orchestra', album: 'Slow Waltz Vol. 1', style: 'Slow Waltz', bpm: '29', date: '2026-03-25' },
  { id: '3', title: 'Cha Cha Heat', artist: 'Latin Grooves', album: 'Summer Latin', style: 'Cha-cha-cha', bpm: '31', date: '2026-04-04' },
];

const DEFAULT_FOLDERS: Folder[] = [
  { id: 'std-latin', name: 'Standard Latin', color: '#1db954' },
  { id: 'mod-std', name: 'Modern Standard', color: '#2563eb' },
];

export const StudioProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [tracks, setTracks] = useState<Track[]>([]);
  const [folders, setFolders] = useState<Folder[]>([]);
  const [finalTracks, setFinalTracks] = useState<Track[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  // Load from localStorage
  useEffect(() => {
    const savedTracks = localStorage.getItem('studio_tracks');
    const savedFolders = localStorage.getItem('studio_folders');
    const savedFinals = localStorage.getItem('studio_finals');

    if (savedTracks) setTracks(JSON.parse(savedTracks));
    else setTracks(DEFAULT_TRACKS);

    if (savedFolders) setFolders(JSON.parse(savedFolders));
    else setFolders(DEFAULT_FOLDERS);

    if (savedFinals) setFinalTracks(JSON.parse(savedFinals));

    setIsLoaded(true);
  }, []);

  // Save to localStorage
  useEffect(() => {
    if (isLoaded) {
      localStorage.setItem('studio_tracks', JSON.stringify(tracks));
      localStorage.setItem('studio_folders', JSON.stringify(folders));
      localStorage.setItem('studio_finals', JSON.stringify(finalTracks));
    }
  }, [tracks, folders, isLoaded]);

  const addTrack = (trackData: Partial<Track>) => {
    const newTrack: Track = {
      title: trackData.title || 'Unknown',
      artist: trackData.artist || 'Unknown',
      style: trackData.style || 'Samba',
      album: trackData.album,
      bpm: trackData.bpm,
      audioUrl: trackData.audioUrl,
      folderId: trackData.folderId,
      id: trackData.id || Math.random().toString(36).substring(7),
      date: trackData.date || new Date().toISOString().split('T')[0],
    };
    setTracks(prev => [newTrack, ...prev]);
  };

  const removeTrack = (id: string) => {
    setTracks(prev => prev.filter(t => t.id !== id));
  };

  const updateTrack = (id: string, updates: Partial<Track>) => {
    setTracks(prev => prev.map(t => t.id === id ? { ...t, ...updates } : t));
  };

  const addFolder = (name: string, color: string) => {
    const newFolder: Folder = {
      id: name.toLowerCase().replace(/\s+/g, '-'),
      name,
      color,
    };
    setFolders(prev => [...prev, newFolder]);
  };

  const updateFolder = (id: string, updates: Partial<Folder>) => {
    setFolders(prev => prev.map(f => f.id === id ? { ...f, ...updates } : f));
  };

  const removeFolder = (id: string) => {
    setFolders(prev => prev.filter(f => f.id !== id));
    // Clear associations
    setTracks(prev => prev.map(t => t.folderId === id ? { ...t, folderId: undefined } : t));
  };

  const assignToFolder = (trackId: string, folderId: string | undefined) => {
    setTracks(prev => prev.map(t => t.id === trackId ? { ...t, folderId } : t));
  };

  const addToFinal = (track: Track) => {
    setFinalTracks(prev => {
      if (prev.find(t => t.id === track.id)) return prev;
      return [...prev, track];
    });
  };

  const removeFromFinal = (id: string) => {
    setFinalTracks(prev => prev.filter(t => t.id !== id));
  };

  const reorderFinalTracks = (startIndex: number, endIndex: number) => {
    setFinalTracks(prev => {
      const result = Array.from(prev);
      const [removed] = result.splice(startIndex, 1);
      result.splice(endIndex, 0, removed);
      return result;
    });
  };

  const stats = {
    totalTracks: tracks.length,
    storageUsed: `${(tracks.length * 4.2).toFixed(1)} GB`, // Mock calculation
    activeUsers: 42,
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
