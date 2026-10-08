export interface RecentAlbumItem {
  id: string;
  slug: string;
  title: string;
  artist: string;
  coverUrl: string;
  badge?: string;
  playedAt: number;
}

const RECENT_TRACKS_KEY = '4andone_recently_played';
const RECENT_ALBUMS_KEY = '4andone_recently_played_albums';

export const getRecentlyPlayedTrackIds = (): string[] => {
  if (typeof window === 'undefined') return [];
  try {
    const saved = localStorage.getItem(RECENT_TRACKS_KEY);
    return saved ? JSON.parse(saved) : [];
  } catch {
    return [];
  }
};

export const recordTrackPlayed = (trackId: string) => {
  if (typeof window === 'undefined' || !trackId) return;
  try {
    const list = getRecentlyPlayedTrackIds();
    const filtered = [trackId, ...list.filter(id => id !== trackId)].slice(0, 50);
    localStorage.setItem(RECENT_TRACKS_KEY, JSON.stringify(filtered));
    window.dispatchEvent(new Event('4andone_recently_played_updated'));
  } catch {}
};

export const getRecentlyPlayedAlbums = (): RecentAlbumItem[] => {
  if (typeof window === 'undefined') return [];
  try {
    const saved = localStorage.getItem(RECENT_ALBUMS_KEY);
    return saved ? JSON.parse(saved) : [];
  } catch {
    return [];
  }
};

export const recordAlbumPlayed = (album: { id: string; slug: string; title: string; artist: string; coverUrl: string; badge?: string }) => {
  if (typeof window === 'undefined' || !album || !album.slug) return;
  try {
    const list = getRecentlyPlayedAlbums();
    const newItem: RecentAlbumItem = {
      id: album.id || album.slug,
      slug: album.slug,
      title: album.title,
      artist: album.artist,
      coverUrl: album.coverUrl,
      badge: album.badge,
      playedAt: Date.now()
    };
    const filtered = [newItem, ...list.filter(item => item.slug !== album.slug)].slice(0, 20);
    localStorage.setItem(RECENT_ALBUMS_KEY, JSON.stringify(filtered));
    window.dispatchEvent(new Event('4andone_recently_played_updated'));
  } catch {}
};

export const clearListeningHistory = () => {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(RECENT_TRACKS_KEY);
    localStorage.removeItem(RECENT_ALBUMS_KEY);
    window.dispatchEvent(new Event('4andone_recently_played_updated'));
  } catch {}
};
