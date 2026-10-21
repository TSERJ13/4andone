type AlbumLike = { slug: string; title: string; artist?: string; tags?: string[]; isPublished?: boolean; orderIndex?: number };
type TrackLike = { album?: string; artist?: string; tags?: string[] };

/** Does a track belong to an album page? (the rule the album pages use) */
export function trackInAlbum(t: TrackLike, album: AlbumLike): boolean {
  const albumSlug = album.slug.toLowerCase().trim();
  const albumTitle = album.title.toLowerCase().trim();
  const albumArtist = (album.artist || '').toLowerCase().trim();
  const albumTags = (album.tags || []).map(x => x.toLowerCase().trim()).filter(x => Boolean(x) && x !== '__premium__' && x !== '__no_final__');
  const tAlbum = (t.album || '').toLowerCase().trim();
  const tArtist = (t.artist || '').toLowerCase().trim();
  // Whole-tag matches only: "title contains the tag" let a generic tag like
  // "mix" (200+ tracks) pull every band into "4ANDONE Mix".
  const hasTag = t.tags?.some(tag => {
    const l = tag.toLowerCase().trim();
    return albumTags.includes(l) || l.includes(albumSlug) || l === albumTitle;
  });

  // 1. Explicit album name or album tag match on the track
  if (
    (!!tAlbum && (tAlbum.includes(albumSlug) || tAlbum.includes(albumTitle))) ||
    !!hasTag
  ) {
    return true;
  }

  // 2. If the track explicitly belongs to a different album, do not pull it in by artist
  if (tAlbum && tAlbum !== 'standard library' && tAlbum !== 'unknown') {
    return false;
  }

  // 3. Artist match applies only to self-titled band albums (where album title & artist match),
  //    so a special collection like "Blackpool Live Sounds" (artist "Empress Orchestra")
  //    does not pull in all existing "Empress Orchestra" tracks.
  const isBandAlbum = !albumArtist || albumTitle.includes(albumArtist) || albumArtist.includes(albumTitle);
  if (!isBandAlbum) return false;

  return (
    (!!albumTitle && tArtist.includes(albumTitle)) ||
    (!!albumArtist && tArtist.includes(albumArtist))
  );
}

/** The album page a track is shown on (first published album, in page order). */
export function albumOfTrack<A extends AlbumLike>(t: TrackLike | null | undefined, albums: A[]): A | null {
  if (!t) return null;
  const sorted = [...albums].filter(a => a.isPublished !== false).sort((a, b) => (a.orderIndex ?? 0) - (b.orderIndex ?? 0));
  return sorted.find(a => trackInAlbum(t, a)) ?? null;
}

/** Check if a track is permitted to play in Final Mode based on its album settings. */
export function isTrackAllowedInFinals<A extends AlbumLike & { allowFinalMode?: boolean }>(
  t: TrackLike | null | undefined,
  albums: A[]
): boolean {
  if (!t) return false;
  const album = albumOfTrack(t, albums);
  if (album && album.allowFinalMode === false) return false;
  return true;
}

