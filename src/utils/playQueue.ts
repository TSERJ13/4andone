import { canonicalStyle } from '@/utils/audio';

type QueueTrack = { id: string; style?: string; tags?: string[]; artist?: string; album?: string };

const norm = (v?: string) => (v || '').toLowerCase().trim();

const isClosed = (t: QueueTrack) =>
  !!t.tags?.some(tag => tag.toLowerCase() === 'closed' || tag === 'დახურული');

/**
 * 4ANDONE Mix / 4andone Music tracks (artist "Samba - 4andone Music",
 * tag "4and.one mix" …) belong only to their own album: they are kept out of
 * the queue of every other band, and only queue with each other.
 */
export const isFourAndOneMix = (t: QueueTrack) => {
  const artist = norm(t.artist);
  const album = norm(t.album);
  return artist.includes('4andone') || artist.includes('4and.one') ||
    album.includes('4andone mix') || album.includes('4and.one mix') ||
    !!t.tags?.some(tag => {
      const l = norm(tag);
      return l === '4and.one mix' || l === '4andone mix';
    });
};

/** The collection a track belongs to: its album, or its band when the album is missing / "Bulk upload". */
const collectionOf = (t: QueueTrack) => {
  const album = norm(t.album);
  return album && album !== 'bulk upload' ? album : norm(t.artist);
};

/**
 * The normal-mode play queue: the other tracks of the SAME dance — first the
 * ones from the current track's album, then the other albums — in library
 * order. "Next" on a Samba plays another Samba, and the full player's UP NEXT
 * shows exactly this list. Closed tracks are skipped; 4ANDONE Mix tracks only
 * queue with 4ANDONE Mix tracks.
 */
export function getStyleQueue<T extends QueueTrack>(tracks: T[], current: T | null | undefined): T[] {
  if (!current) return tracks.filter(t => !isClosed(t) && !isFourAndOneMix(t));
  const style = canonicalStyle(current.style);
  const mix = isFourAndOneMix(current);
  const pool = tracks.filter(t =>
    t.id === current.id ||
    (!isClosed(t) && canonicalStyle(t.style) === style && isFourAndOneMix(t) === mix));
  if (pool.length <= 1) return tracks.filter(t => t.id === current.id || (!isClosed(t) && isFourAndOneMix(t) === mix));
  const home = collectionOf(current);
  const sameAlbum = pool.filter(t => collectionOf(t) === home);
  const otherAlbums = pool.filter(t => collectionOf(t) !== home);
  return [...sameAlbum, ...otherAlbums];
}

/** Up-next order: the tracks after `current` in its queue, wrapping around. */
export function upNextFrom<T extends QueueTrack>(queue: T[], current: T | null | undefined, limit = 35): T[] {
  const idx = current ? queue.findIndex(t => t.id === current.id) : -1;
  if (idx === -1) return queue.slice(0, limit);
  return [...queue.slice(idx + 1), ...queue.slice(0, idx)].slice(0, limit);
}
