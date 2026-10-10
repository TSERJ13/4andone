type AlbumLike = { slug: string; title: string; artist?: string; tags?: string[]; isPublished?: boolean; orderIndex?: number };
type TrackLike = { album?: string; artist?: string; tags?: string[] };

/** Does a track belong to an album page? (the rule the album pages use) */
export function trackInAlbum(t: TrackLike, album: AlbumLike): boolean {
  const albumSlug = album.slug.toLowerCase();
  const albumTitle = album.title.toLowerCase();
  const albumArtist = (album.artist || '').toLowerCase();
  const albumTags = (album.tags || []).map(x => x.toLowerCase());
  const tAlbum = (t.album || '').toLowerCase();
  const tArtist = (t.artist || '').toLowerCase();
  // Whole-tag matches only: "title contains the tag" let a generic tag like
  // "mix" (200+ tracks) pull every band into "4ANDONE Mix".
  const hasTag = t.tags?.some(tag => {
    const l = tag.toLowerCase().trim();
    return albumTags.includes(l) || l.includes(albumSlug) || l === albumTitle;
  });
  return (
    tAlbum.includes(albumSlug) ||
    tAlbum.includes(albumTitle) ||
    tArtist.includes(albumTitle) ||
    (!!albumArtist && tArtist.includes(albumArtist)) ||
    !!hasTag
  );
}

/** The album page a track is shown on (first published album, in page order). */
export function albumOfTrack<A extends AlbumLike>(t: TrackLike | null | undefined, albums: A[]): A | null {
  if (!t) return null;
  const sorted = [...albums].filter(a => a.isPublished !== false).sort((a, b) => (a.orderIndex ?? 0) - (b.orderIndex ?? 0));
  return sorted.find(a => trackInAlbum(t, a)) ?? null;
}
