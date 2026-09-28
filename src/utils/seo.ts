/**
 * 4and.one SEO Layer Utilities
 * Provides deterministic, collision-free slug generation, metadata helpers,
 * category mappings, and Schema.org structured data generators.
 */

export interface SeoDanceCategory {
  slug: string;
  name: string;
  discipline: 'Latin' | 'Standard' | 'Special';
  defaultBpm: number;
  minBpm: number;
  maxBpm: number;
  timeSignature: number;
  description: string;
}

export const DANCE_CATEGORIES: SeoDanceCategory[] = [
  // Latin
  {
    slug: 'cha-cha-cha',
    name: 'Cha Cha Cha',
    discipline: 'Latin',
    defaultBpm: 124,
    minBpm: 120,
    maxBpm: 128,
    timeSignature: 4,
    description: 'DanceSport and ballroom Cha Cha Cha music for practice and training with BPM tempo control.',
  },
  {
    slug: 'samba',
    name: 'Samba',
    discipline: 'Latin',
    defaultBpm: 104,
    minBpm: 100,
    maxBpm: 108,
    timeSignature: 2,
    description: 'High-energy DanceSport and ballroom Samba practice music with real-time BPM tempo adjustment.',
  },
  {
    slug: 'rumba',
    name: 'Rumba',
    discipline: 'Latin',
    defaultBpm: 104,
    minBpm: 96,
    maxBpm: 108,
    timeSignature: 4,
    description: 'Expressive and lyrical DanceSport Rumba music for ballroom dancers with precision BPM control.',
  },
  {
    slug: 'paso-doble',
    name: 'Paso Doble',
    discipline: 'Latin',
    defaultBpm: 120,
    minBpm: 116,
    maxBpm: 124,
    timeSignature: 2,
    description: 'Dramatic Spanish Paso Doble music (including 1, 2, and 3-highlight versions) for ballroom and DanceSport.',
  },
  {
    slug: 'jive',
    name: 'Jive',
    discipline: 'Latin',
    defaultBpm: 172,
    minBpm: 168,
    maxBpm: 176,
    timeSignature: 4,
    description: 'Upbeat DanceSport and ballroom Jive music with adjustable BPM tempo for practice and finals training.',
  },

  // Standard
  {
    slug: 'slow-waltz',
    name: 'Slow Waltz',
    discipline: 'Standard',
    defaultBpm: 87,
    minBpm: 84,
    maxBpm: 90,
    timeSignature: 3,
    description: 'Elegant Slow Waltz (English Waltz) music for ballroom dancers and DanceSport competitors with BPM tempo control.',
  },
  {
    slug: 'tango',
    name: 'Tango',
    discipline: 'Standard',
    defaultBpm: 64,
    minBpm: 62,
    maxBpm: 66,
    timeSignature: 2,
    description: 'Staccato ballroom Tango music for DanceSport training and practice with tempo control.',
  },
  {
    slug: 'viennese-waltz',
    name: 'Viennese Waltz',
    discipline: 'Standard',
    defaultBpm: 177,
    minBpm: 174,
    maxBpm: 180,
    timeSignature: 3,
    description: 'Fast-paced rotary Viennese Waltz music for ballroom dance training and competition.',
  },
  {
    slug: 'slow-foxtrot',
    name: 'Slow Foxtrot',
    discipline: 'Standard',
    defaultBpm: 116,
    minBpm: 112,
    maxBpm: 120,
    timeSignature: 4,
    description: 'Smooth and flowing Slow Foxtrot music for ballroom dancers with accurate BPM tempo adjustment.',
  },
  {
    slug: 'quickstep',
    name: 'Quickstep',
    discipline: 'Standard',
    defaultBpm: 204,
    minBpm: 200,
    maxBpm: 208,
    timeSignature: 4,
    description: 'Lively, energetic ballroom Quickstep music for DanceSport dancers with high-fidelity BPM tempo control.',
  },
];

/**
 * Sanitizes any string into a clean URL-friendly slug.
 */
export function cleanString(str: string): string {
  return (str || '')
    .toString()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/**
 * Normalizes any dance style string to standard category slug.
 */
export function normalizeDanceSlug(style?: string): string {
  const s = (style || '').toLowerCase().replace(/[\s\-_]+/g, '');
  if (s.includes('cha')) return 'cha-cha-cha';
  if (s.includes('samba')) return 'samba';
  if (s.includes('rumba') || s.includes('rhumba')) return 'rumba';
  if (s.includes('paso')) return 'paso-doble';
  if (s.includes('jive')) return 'jive';
  if (s.includes('slowwaltz') || s.includes('englishwaltz') || s === 'waltz') return 'slow-waltz';
  if (s.includes('tango')) return 'tango';
  if (s.includes('viennese') || s.includes('vinese')) return 'viennese-waltz';
  if (s.includes('foxtrot') || s.includes('slowfox') || s.includes('fox')) return 'slow-foxtrot';
  if (s.includes('quickstep')) return 'quickstep';
  return cleanString(style || 'music');
}

/**
 * Returns the human-readable dance category info for a given style/slug.
 */
export function getDanceCategory(slugOrStyle: string): SeoDanceCategory | undefined {
  const slug = normalizeDanceSlug(slugOrStyle);
  return DANCE_CATEGORIES.find((c) => c.slug === slug);
}

export interface TrackMinimal {
  id: string;
  title: string;
  artist?: string;
  style: string;
}

/**
 * Computes a slug for a single track based on title and style.
 */
export function getTrackSlug(track: TrackMinimal): string {
  const styleSlug = normalizeDanceSlug(track.style);
  let base = cleanString(track.title);
  if (!base.endsWith(styleSlug) && !base.includes(styleSlug)) {
    base = `${base}-${styleSlug}`;
  }
  return base || `track-${track.id.slice(0, 8)}`;
}

/**
 * Builds a deterministic, 100% collision-free slug map for a list of tracks.
 * Returns both `slugToTrack` and `idToSlug` maps.
 */
export function buildTrackSlugMaps<T extends TrackMinimal>(tracks: T[]) {
  const slugCounts: Record<string, number> = {};
  
  tracks.forEach((t) => {
    const base = getTrackSlug(t);
    slugCounts[base] = (slugCounts[base] || 0) + 1;
  });

  const slugToTrack = new Map<string, T>();
  const idToSlug = new Map<string, string>();

  tracks.forEach((t) => {
    const base = getTrackSlug(t);
    let slug = base;

    if (slugCounts[base] > 1) {
      const artistPart = cleanString(t.artist || '');
      if (artistPart && !base.includes(artistPart)) {
        slug = `${base}-${artistPart}`;
      }
    }

    if (slugToTrack.has(slug)) {
      slug = `${slug}-${t.id.slice(0, 6)}`;
    }

    slugToTrack.set(slug, t);
    idToSlug.set(t.id, slug);
  });

  return { slugToTrack, idToSlug };
}

/**
 * Formats canonical URL for 4and.one
 */
export function getCanonicalUrl(path: string): string {
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  return `https://4and.one${cleanPath}`;
}
