import { supabase } from '@/utils/supabase';
import { 
  buildTrackSlugMaps, 
  getDanceCategory, 
  normalizeDanceSlug, 
  DANCE_CATEGORIES,
  SeoDanceCategory,
  TrackMinimal 
} from '@/utils/seo';

export interface SeoTrack extends TrackMinimal {
  id: string;
  title: string;
  artist: string;
  album?: string;
  style: string;
  bpm?: string;
  duration?: number;
  artworkUrl?: string;
  audioUrl?: string;
  date?: string;
  createdAt?: string;
  globalOrder?: number;
  isFavorite?: boolean;
}

// In-memory cache for fast SSR lookups within server lifecycle
let cachedTracks: SeoTrack[] | null = null;
let lastCacheTime = 0;
const CACHE_TTL_MS = 60 * 1000; // 1 minute

export async function fetchAllTracksForSeo(): Promise<SeoTrack[]> {
  const now = Date.now();
  if (cachedTracks && (now - lastCacheTime < CACHE_TTL_MS)) {
    return cachedTracks;
  }

  try {
    const { data, error } = await supabase
      .from('tracks')
      .select('id, title, artist, album, style, bpm, duration, artwork_url, audio_url, date, created_at, global_order')
      .order('global_order', { ascending: true })
      .order('created_at', { ascending: false })
      .limit(5000);

    if (error || !data) {
      console.error('[SEO-ERROR] Failed to fetch tracks:', error);
      return cachedTracks || [];
    }

    const mapped: SeoTrack[] = data.map((t) => ({
      id: t.id,
      title: t.title || 'Untitled Track',
      artist: t.artist || '4and.one Music',
      album: t.album || undefined,
      style: t.style || 'Cha-Cha-Cha',
      bpm: t.bpm ? String(t.bpm) : undefined,
      duration: t.duration || 0,
      artworkUrl: t.artwork_url || '',
      audioUrl: t.audio_url || '',
      date: t.date || t.created_at || '',
      createdAt: t.created_at || '',
      globalOrder: typeof t.global_order === 'number' ? t.global_order : 0,
    }));

    cachedTracks = mapped;
    lastCacheTime = now;
    return mapped;
  } catch (err) {
    console.error('[SEO-ERROR] Exception in fetchAllTracksForSeo:', err);
    return cachedTracks || [];
  }
}

export async function getTrackBySlugOrId(slugOrId: string): Promise<{
  track: SeoTrack | null;
  slug: string;
  category: SeoDanceCategory | undefined;
  relatedTracks: { track: SeoTrack; slug: string }[];
}> {
  const allTracks = await fetchAllTracksForSeo();
  const { slugToTrack, idToSlug } = buildTrackSlugMaps(allTracks);

  let track: SeoTrack | null = null;
  let canonicalSlug = '';

  // 1. Direct slug match
  if (slugToTrack.has(slugOrId)) {
    track = slugToTrack.get(slugOrId)!;
    canonicalSlug = slugOrId;
  } 
  // 2. Direct ID match (e.g. UUID)
  else if (idToSlug.has(slugOrId)) {
    canonicalSlug = idToSlug.get(slugOrId)!;
    track = slugToTrack.get(canonicalSlug) || null;
  }
  // 3. Fallback partial matching
  else {
    const foundById = allTracks.find((t) => t.id === slugOrId);
    if (foundById) {
      track = foundById;
      canonicalSlug = idToSlug.get(foundById.id) || slugOrId;
    }
  }

  if (!track) {
    return { track: null, slug: '', category: undefined, relatedTracks: [] };
  }

  const category = getDanceCategory(track.style);
  const trackDanceSlug = normalizeDanceSlug(track.style);

  // Get 6-10 related tracks of the same dance style
  const relatedTracks = allTracks
    .filter((t) => t.id !== track!.id && normalizeDanceSlug(t.style) === trackDanceSlug)
    .slice(0, 8)
    .map((t) => ({
      track: t,
      slug: idToSlug.get(t.id) || t.id,
    }));

  return {
    track,
    slug: canonicalSlug,
    category,
    relatedTracks,
  };
}

export async function getCategoryData(slug: string): Promise<{
  category: SeoDanceCategory | undefined;
  tracks: { track: SeoTrack; slug: string }[];
}> {
  const category = getDanceCategory(slug);
  if (!category) {
    return { category: undefined, tracks: [] };
  }

  const allTracks = await fetchAllTracksForSeo();
  const { idToSlug } = buildTrackSlugMaps(allTracks);

  const matched = allTracks
    .filter((t) => normalizeDanceSlug(t.style) === category.slug)
    .map((t) => ({
      track: t,
      slug: idToSlug.get(t.id) || t.id,
    }));

  return {
    category,
    tracks: matched,
  };
}
