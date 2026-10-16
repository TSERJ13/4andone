// "Add to an album as if it had been uploaded earlier": a track added to an album that already has music can take the
// album's original upload time and sit next to its tracks, instead of showing up as brand-new music at the top.

interface SlotTrack {
  album?: string;
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
}

const stamp = (t: SlotTrack) => {
  const v = t.createdAt || t.date;
  const n = v ? new Date(v).getTime() : NaN;
  return Number.isFinite(n) ? n : 0;
};

/** null when the album has no tracks yet (then a normal upload is the only sensible choice). */
export function albumOriginalSlot(tracks: SlotTrack[], album: { title: string }): AlbumSlot | null {
  const title = album.title.trim().toLowerCase();
  if (!title) return null;
  const inAlbum = tracks.filter(t =>
    (t.album || '').trim().toLowerCase() === title || (t.tags || []).some(tag => tag.trim().toLowerCase() === title));
  if (inAlbum.length === 0) return null;
  const latest = Math.max(...inAlbum.map(stamp));
  if (!latest) return null;
  const order = Math.max(...inAlbum.map(t => (typeof t.globalOrder === 'number' ? t.globalOrder : 0)));
  const iso = new Date(latest).toISOString();
  return { createdAt: iso, date: iso.slice(0, 10), order, trackCount: inAlbum.length };
}

/** The nth track of a batch gets a slightly later time and a slightly later position, so the batch keeps its order. */
export function slotForIndex(slot: AlbumSlot, index: number): { createdAt: string; date: string; globalOrder: number } {
  return {
    createdAt: new Date(new Date(slot.createdAt).getTime() + (index + 1) * 1000).toISOString(),
    date: slot.date,
    globalOrder: slot.order + 1 + index,
  };
}
