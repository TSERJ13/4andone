import { canonicalStyle } from '@/utils/audio';

type QueueTrack = { id: string; style?: string; tags?: string[] };

const isClosed = (t: QueueTrack) =>
  !!t.tags?.some(tag => tag.toLowerCase() === 'closed' || tag === 'დახურული');

/**
 * The normal-mode play queue: the other tracks of the SAME dance (all albums),
 * in library order, starting after the current one. "Next" on a Samba plays
 * another Samba — and the full player's UP NEXT list shows exactly this.
 * Closed tracks are skipped; fitness tracks only queue with fitness.
 */
export function getStyleQueue<T extends QueueTrack>(tracks: T[], current: T | null | undefined): T[] {
  if (!current) return tracks.filter(t => !isClosed(t));
  const style = canonicalStyle(current.style);
  const pool = tracks.filter(t => t.id === current.id || (!isClosed(t) && canonicalStyle(t.style) === style));
  return pool.length > 1 ? pool : tracks.filter(t => t.id === current.id || !isClosed(t));
}

/** Up-next order: the tracks after `current` in its queue, wrapping around. */
export function upNextFrom<T extends QueueTrack>(queue: T[], current: T | null | undefined, limit = 35): T[] {
  const idx = current ? queue.findIndex(t => t.id === current.id) : -1;
  if (idx === -1) return queue.slice(0, limit);
  return [...queue.slice(idx + 1), ...queue.slice(0, idx)].slice(0, limit);
}
