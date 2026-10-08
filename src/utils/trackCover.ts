import { Track, Album, Style } from '@/components/admin/StudioProvider';

export function getTrackCover(
  track: Track | any | null,
  albums: Album[] = [],
  styles: Style[] = []
): string {
  if (!track) return '/logo-3d.png';

  // 1. Explicit coverUrl or artworkUrl
  if (track.coverUrl) return track.coverUrl;
  if (track.artworkUrl) return track.artworkUrl;

  // 2. Exact match by album name / slug / ID
  if (track.album && albums.length > 0) {
    const trackAlb = track.album.toLowerCase().trim();
    const matchedAlb = albums.find(
      (a) => a.title.toLowerCase().trim() === trackAlb ||
             a.id.toLowerCase() === trackAlb ||
             a.slug.toLowerCase() === trackAlb
    );
    if (matchedAlb?.coverUrl) return matchedAlb.coverUrl;
  }

  // 3. Match by artist name or artist tags / substrings
  if (track.artist) {
    const artistLower = track.artist.toLowerCase().trim();
    if (artistLower.includes('georgie musheev') || artistLower.includes('musheev') || artistLower.includes('7 winds') || artistLower.includes('seven winds')) {
      return '/georgie-musheev.jpg';
    }
    if (artistLower.includes('boris myagkov') || artistLower.includes('myagkov')) {
      return '/boris-myagkov-big-band.jpg';
    }
    if (artistLower.includes('rose') && artistLower.includes('band')) {
      return '/rosesband.jpg';
    }
    if (artistLower.includes('dance star') || artistLower.includes('dancestar')) {
      return '/dancestar.jpg';
    }
    if (artistLower.includes('goc') || artistLower.includes('german open')) {
      return '/goc2026.png';
    }

    if (albums.length > 0) {
      const matchedArtistAlb = albums.find(
        (a) => a.artist && a.artist.toLowerCase().trim() === artistLower
      );
      if (matchedArtistAlb?.coverUrl) return matchedArtistAlb.coverUrl;
    }
  }

  // 4. Default fallback logo - NEVER attribute someone else's cover art!
  return '/logo-3d.png';
}
