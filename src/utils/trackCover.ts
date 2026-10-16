import { Track, Album, Style } from '@/components/admin/StudioProvider';
import { DEFAULT_ALBUMS } from '@/types/album';
import { normalizeMediaUrl } from '@/lib/media-key';

const GENERIC_COVERS = [
  '/logo-3d.png',
  '/logo-square.jpg',
  '/logo-square.png',
  '/logo-4andone-3d.png',
  '/logo-4andone-3d.jpg',
  '/4andone-mix.jpg',
];

function isGenericCover(url?: string | null): boolean {
  if (!url) return true;
  const lower = url.toLowerCase().trim();
  return GENERIC_COVERS.some(g => lower.includes(g)) || lower.includes('logo-3d') || lower.includes('logo-square');
}

export function getTrackCover(
  track: Track | any | null,
  albums: Album[] = [],
  styles: Style[] = []
): string {
  if (!track) return '/logo-3d.png';

  const artistLower = (track.artist || '').toLowerCase().trim();
  const albumLower = (track.album || '').toLowerCase().trim();

  // 1. A track's own (non-generic) cover always wins
  if (track.coverUrl && !isGenericCover(track.coverUrl)) {
    return normalizeMediaUrl(track.coverUrl);
  }
  if (track.artworkUrl && !isGenericCover(track.artworkUrl)) {
    return normalizeMediaUrl(track.artworkUrl);
  }

  // 2. Explicit album match (so a track in "Blackpool Live Sounds" by "Empress Orchestra"
  //    gets the Blackpool Live Sounds cover instead of the Empress Orchestra cover)
  const hasBlackpoolLiveTag = Array.isArray(track.tags) && track.tags.some((t: string) => {
    const l = (t || '').toLowerCase().trim();
    return l === 'blackpool-live-sounds' || l === 'blackpool live sounds';
  });
  if (
    albumLower.includes('blackpool live') ||
    albumLower === 'blackpool-live-sounds' ||
    hasBlackpoolLiveTag
  ) {
    return '/blackpool-live-sounds.jpg';
  }

  const effectiveAlbums = (albums && albums.length > 0) ? albums : DEFAULT_ALBUMS;

  if (albumLower) {
    const matchedAlb = effectiveAlbums.find(
      (a) => a.title.toLowerCase().trim() === albumLower ||
             a.id.toLowerCase() === albumLower ||
             a.slug.toLowerCase() === albumLower
    );
    if (matchedAlb?.coverUrl) return normalizeMediaUrl(matchedAlb.coverUrl);
  }

  // 3. Band name checks (for tracks with no cover or a generic logo).
  //    Artist/album only — a song title like "Empress" must not pick a band cover.
  if (
    artistLower.includes('empress') ||
    albumLower.includes('empress')
  ) {
    return '/empress-orchestra.jpg';
  }

  if (
    artistLower.includes('georgie musheev') ||
    artistLower.includes('musheev') ||
    artistLower.includes('7 winds') ||
    artistLower.includes('seven winds') ||
    albumLower.includes('musheev')
  ) {
    return '/georgie-musheev.jpg';
  }

  if (
    artistLower.includes('boris myagkov') ||
    artistLower.includes('myagkov') ||
    albumLower.includes('myagkov')
  ) {
    return '/boris-myagkov-big-band.jpg';
  }

  if (
    (artistLower.includes('rose') && artistLower.includes('band')) ||
    albumLower.includes('roses-band') ||
    albumLower.includes("rose's band") ||
    albumLower.includes('rosesband')
  ) {
    return '/rosesband.jpg';
  }

  if (
    artistLower.includes('dance star') ||
    artistLower.includes('dancestar') ||
    albumLower.includes('dance-star') ||
    albumLower.includes('dancestar')
  ) {
    return '/dancestar.jpg';
  }

  if (
    artistLower.includes('goc') ||
    artistLower.includes('german open') ||
    albumLower.includes('goc')
  ) {
    return '/goc2026.png';
  }

  if (
    artistLower.includes('maksy') ||
    albumLower.includes('maksy')
  ) {
    return '/dj-maksy.jpg';
  }

  if (
    artistLower.includes('midland') ||
    albumLower.includes('midland')
  ) {
    return '/midland-big-band.jpg';
  }

  if (
    artistLower.includes('len phillips') ||
    artistLower.includes('lpbb') ||
    albumLower.includes('len-phillips') ||
    albumLower.includes('len phillips')
  ) {
    return '/len-phillips-big-band.jpg';
  }

  if (
    artistLower.includes('la grande') ||
    artistLower.includes('orchestra italiana') ||
    albumLower.includes('la-grande') ||
    albumLower.includes('la grande')
  ) {
    return '/la-grande-orchestra-italiana.jpg';
  }

  if (artistLower) {
    const matchedArtistAlb = effectiveAlbums.find((a) => {
      if (!a.artist) return false;
      const albArt = a.artist.toLowerCase().trim();
      const albTitle = a.title.toLowerCase().trim();
      // Only match by artist when the album is that artist's own band album
      if (!albTitle.includes(albArt) && !albArt.includes(albTitle)) return false;
      if (albArt === artistLower || artistLower.includes(albArt) || albArt.includes(artistLower)) return true;
      if (a.tags && a.tags.some((t) => {
        const tag = t.toLowerCase().trim();
        return artistLower.includes(tag) || tag.includes(artistLower);
      })) return true;
      return false;
    });
    if (matchedArtistAlb?.coverUrl) return normalizeMediaUrl(matchedArtistAlb.coverUrl);
  }

  // 4. Fallback explicit cover (even if generic) or default logo
  if (track.coverUrl) return normalizeMediaUrl(track.coverUrl);
  if (track.artworkUrl) return normalizeMediaUrl(track.artworkUrl);

  return '/logo-3d.png';
}


/** Covers that also exist as 128 px thumbnails in /public/thumbs (a few KB instead of ~300 KB / 4 MB decoded). */
const THUMBNAILED = new Set<string>(['/4andone-mix.jpg', '/blackpool-live-sounds.jpg', '/boris-myagkov-big-band.jpg', '/dancestar.jpg', '/dj-maksy.jpg', '/empress-orchestra.jpg', '/georgie-musheev.jpg', '/goc2026.png', '/la-grande-orchestra-italiana.jpg', '/len-phillips-big-band.jpg', '/logo-3d.png', '/logo-4andone-3d.jpg', '/logo-4andone-3d.png', '/logo-square.jpg', '/logo-square.png', '/midland-big-band.jpg', '/rosesband.jpg']);

/** The cover for a small picture (list rows): the thumbnail when there is one, else the cover itself. */
export function getTrackThumb(track: Track | any | null, albums: Album[] = [], styles: Style[] = []): string {
  const cover = getTrackCover(track, albums, styles);
  return THUMBNAILED.has(cover) ? `/thumbs${cover}` : cover;
}

/** Covers that also exist as 480 px cards in /public/cards (about 20-60 KB instead of 100-420 KB). */
const CARDED = new Set<string>(['/4andone-mix', '/blackpool-live-sounds', '/boris-myagkov-big-band', '/dancestar', '/dj-maksy', '/empress-orchestra', '/georgie-musheev', '/goc2026', '/la-grande-orchestra-italiana', '/len-phillips-big-band', '/logo-3d', '/logo-4andone-3d', '/logo-square', '/midland-big-band', '/rosesband']);

/**
 * A smaller copy of a picture for cards and shelves: the 480 px card of a known
 * cover, or the 640 px copy of a dance-style photo. Anything else (uploaded
 * covers) is returned unchanged.
 */
export function smallImage(url?: string | null): string {
  if (!url) return '/cards/logo-square.jpg';
  const normalized = normalizeMediaUrl(url);
  const style = /^\/styles\/([a-z0-9-]+)\.jpg$/.exec(normalized);
  if (style) return `/styles/sm/${style[1]}.jpg`;
  const base = normalized.replace(/\.(jpg|jpeg|png)$/i, '');
  return CARDED.has(base) ? `/cards${base}.jpg` : normalized;
}
