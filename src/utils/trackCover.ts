import { Track, Album, Style } from '@/components/admin/StudioProvider';
import { DEFAULT_ALBUMS } from '@/types/album';

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
    return track.coverUrl;
  }
  if (track.artworkUrl && !isGenericCover(track.artworkUrl)) {
    return track.artworkUrl;
  }

  // 2. Band name checks (for tracks with no cover or a generic logo).
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

  // 3. Dynamic album matching against passed albums or DEFAULT_ALBUMS
  const effectiveAlbums = (albums && albums.length > 0) ? albums : DEFAULT_ALBUMS;

  if (albumLower) {
    const matchedAlb = effectiveAlbums.find(
      (a) => a.title.toLowerCase().trim() === albumLower ||
             a.id.toLowerCase() === albumLower ||
             a.slug.toLowerCase() === albumLower
    );
    if (matchedAlb?.coverUrl) return matchedAlb.coverUrl;
  }

  if (artistLower) {
    const matchedArtistAlb = effectiveAlbums.find((a) => {
      if (!a.artist) return false;
      const albArt = a.artist.toLowerCase().trim();
      if (albArt === artistLower || artistLower.includes(albArt) || albArt.includes(artistLower)) return true;
      if (a.tags && a.tags.some((t) => {
        const tag = t.toLowerCase().trim();
        return artistLower.includes(tag) || tag.includes(artistLower);
      })) return true;
      return false;
    });
    if (matchedArtistAlb?.coverUrl) return matchedArtistAlb.coverUrl;
  }

  // 4. Fallback explicit cover (even if generic) or default logo
  if (track.coverUrl) return track.coverUrl;
  if (track.artworkUrl) return track.artworkUrl;

  return '/logo-3d.png';
}
