import { Track, Album, Style, DEFAULT_ALBUMS } from '@/components/admin/StudioProvider';

export function getTrackCover(
  track: Track | any | null,
  albums: Album[] = [],
  styles: Style[] = []
): string {
  if (!track) return '/logo-square.jpg';

  // 1. Explicit coverUrl or artworkUrl
  if (track.coverUrl) return track.coverUrl;
  if (track.artworkUrl) return track.artworkUrl;

  // 2. Match by album name
  if (track.album && albums.length > 0) {
    const matchedAlb = albums.find(
      (a) => a.title.toLowerCase().trim() === track.album.toLowerCase().trim() ||
             a.id.toLowerCase() === track.album.toLowerCase()
    );
    if (matchedAlb?.coverUrl) return matchedAlb.coverUrl;
  }

  // 3. Fallback to default albums if matches album name or artist
  if (track.album || track.artist) {
    const target = (track.album || track.artist || '').toLowerCase();
    const matchedDef = DEFAULT_ALBUMS.find(
      (a) => target.includes(a.title.toLowerCase()) || target.includes(a.artist.toLowerCase())
    );
    if (matchedDef?.coverUrl) return matchedDef.coverUrl;
  }

  // 4. Default album artwork by index or fallback
  return DEFAULT_ALBUMS[0]?.coverUrl || '/logo-square.jpg';
}
