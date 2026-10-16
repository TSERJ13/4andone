// "Add to an album as if it had been uploaded earlier": a track added to an album that already has music can take the
// album's original upload time and sit next to its tracks, instead of showing up as brand-new music at the top.

import { trackInAlbum } from '@/utils/albumMatch';

interface SlotTrack {
  album?: string;
  artist?: string;
  style?: string;
  tags?: string[];
  createdAt?: string;
  date?: string;
  globalOrder?: number;
}

export interface AlbumSlot {
  createdAt: string; // ISO time of the album's most recent existing track
  date: string;      // YYYY-MM-DD
  order: number;     // highest position number among the album's tracks (new tracks go right after it)
  trackCount: number;
  sameStyle: boolean; // true when the position comes from the album's tracks of the same dance style
}

const stamp = (t: SlotTrack) => {
  const v = t.createdAt || t.date;
  const n = v ? new Date(v).getTime() : NaN;
  return Number.isFinite(n) ? n : 0;
};

/** null when the album has no tracks yet (then a normal upload is the only sensible choice). */
export function albumOriginalSlot(
  tracks: SlotTrack[],
  album: { slug?: string; title: string; artist?: string; tags?: string[] },
  style?: string,
): AlbumSlot | null {
  if (!album.title.trim()) return null;
  // Same rule the album pages use to decide which tracks belong to an album (name, artist or tags)
  const inAlbum = tracks.filter(t => trackInAlbum(t, { slug: album.slug || album.title.trim().toLowerCase(), title: album.title, artist: album.artist, tags: album.tags }));
  if (inAlbum.length === 0) return null;
  // A Cha-cha-cha joins the album's Cha-cha-cha tracks, a Rumba the Rumbas… so the lists don't get mixed up.
  // (An album with none of that style yet falls back to the whole album.)
  const wanted = (style || '').trim().toLowerCase();
  const sameStyle = wanted ? inAlbum.filter(t => (t.style || '').trim().toLowerCase() === wanted) : [];
  const group = sameStyle.length > 0 ? sameStyle : inAlbum;
  const latest = Math.max(...group.map(stamp));
  if (!latest) return null;
  const order = Math.max(...group.map(t => (typeof t.globalOrder === 'number' ? t.globalOrder : 0)));
  const iso = new Date(latest).toISOString();
  return { createdAt: iso, date: iso.slice(0, 10), order, trackCount: group.length, sameStyle: sameStyle.length > 0 };
}

/** The nth track of a batch gets a slightly later time and a slightly later position, so the batch keeps its order. */
export function slotForIndex(slot: AlbumSlot, index: number): { createdAt: string; date: string; globalOrder: number } {
  return {
    createdAt: new Date(new Date(slot.createdAt).getTime() + (index + 1) * 1000).toISOString(),
    date: slot.date,
    globalOrder: slot.order + 1 + index,
  };
}
