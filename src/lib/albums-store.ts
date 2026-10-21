import 'server-only';
import fs from 'fs';
import path from 'path';
import type { SupabaseClient } from '@supabase/supabase-js';
import { Album, DEFAULT_ALBUMS } from '@/types/album';
import { normalizeMediaUrl } from '@/lib/media-key';

// Albums live in the database (table "albums"). Built-in albums (DEFAULT_ALBUMS + src/data/albums.json) ship with
// the code and show until they are saved or deleted in the admin: a saved built-in gets a database row; a deleted
// one gets a hidden marker row (is_published = false). The admin API used to ignore the database's answers and
// write a local file (read-only on the server), so saves could be lost while the page said "saved".

const BUILT_IN_FILE = path.join(process.cwd(), 'src', 'data', 'albums.json');

export const PREMIUM_ALBUM_TAG = '__premium__';
export const NO_FINAL_MODE_ALBUM_TAG = '__no_final__';
export const COMING_SOON_ALBUM_TAG = '__coming_soon__';

export function mapDbToAlbum(row: any): Album {
  const rawTags: string[] = Array.isArray(row.tags) ? row.tags : [];
  const isPremium = row.is_premium === true || rawTags.includes(PREMIUM_ALBUM_TAG);
  const allowFinalMode = row.allow_final_mode !== false && !rawTags.includes(NO_FINAL_MODE_ALBUM_TAG);
  const isComingSoon = row.is_coming_soon === true || rawTags.includes(COMING_SOON_ALBUM_TAG);
  const cleanTags = rawTags.filter(
    (t) => t !== PREMIUM_ALBUM_TAG && t !== NO_FINAL_MODE_ALBUM_TAG && t !== COMING_SOON_ALBUM_TAG
  );
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    artist: row.artist || '',
    subtitle: row.subtitle || '',
    description: row.description || '',
    badge: row.badge || 'LIVE SOUNDS COLLECTION',
    coverUrl: normalizeMediaUrl(row.cover_url),
    themeColor: row.theme_color || '#e11d48',
    secondaryColor: row.secondary_color || '#be123c',
    gradient: row.gradient || `linear-gradient(90deg, ${row.theme_color || '#e11d48'}, ${row.secondary_color || '#be123c'})`,
    program: row.program || 'Both',
    allowedStyles: row.allowed_styles || [],
    tags: cleanTags,
    orderIndex: typeof row.order_index === 'number' ? row.order_index : 0,
    isPublished: row.is_published !== false,
    isPremium,
    allowFinalMode,
    isComingSoon,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function albumToDbRow(a: Album): Record<string, unknown> {
  const baseTags = (a.tags || []).filter(
    (t) => t !== PREMIUM_ALBUM_TAG && t !== NO_FINAL_MODE_ALBUM_TAG && t !== COMING_SOON_ALBUM_TAG
  );
  let tags = a.isPremium ? [...baseTags, PREMIUM_ALBUM_TAG] : baseTags;
  if (a.allowFinalMode === false) {
    tags = [...tags, NO_FINAL_MODE_ALBUM_TAG];
  }
  if (a.isComingSoon) {
    tags = [...tags, COMING_SOON_ALBUM_TAG];
  }
  return {
    slug: a.slug,
    title: a.title,
    artist: a.artist,
    subtitle: a.subtitle,
    description: a.description,
    badge: a.badge,
    cover_url: normalizeMediaUrl(a.coverUrl),
    theme_color: a.themeColor,
    secondary_color: a.secondaryColor,
    gradient: a.gradient,
    program: a.program,
    allowed_styles: a.allowedStyles,
    tags,
    order_index: a.orderIndex,
    is_published: a.isPublished !== false,
  };
}

export function slugify(value: string): string {
  return value.toLowerCase().replace(/&/g, 'and').replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');
}

function readBuiltInFile(): Album[] {
  try {
    if (fs.existsSync(BUILT_IN_FILE)) return JSON.parse(fs.readFileSync(BUILT_IN_FILE, 'utf-8'));
  } catch (e) {
    console.error('Failed to read src/data/albums.json:', e);
  }
  return [];
}

/** Albums shipped with the code (albums.json first, then DEFAULT_ALBUMS for any that are missing). */
export function builtInAlbums(): Album[] {
  const albums = readBuiltInFile();
  for (const d of DEFAULT_ALBUMS) {
    if (!albums.some(a => a.id === d.id || a.slug === d.slug)) albums.push(d);
  }
  return albums;
}

export interface AlbumState {
  /** What listeners see, in carousel order. */
  albums: Album[];
  /** Slugs that have a row in the database (published or not). */
  dbSlugs: Set<string>;
  /** Slugs hidden on purpose (deleted). */
  deletedSlugs: Set<string>;
}

/** Database albums + built-in albums that are not saved or deleted yet. Throws when the database cannot be read. */
export async function loadAlbumState(db: SupabaseClient): Promise<AlbumState> {
  const { data, error } = await db.from('albums').select('*').order('order_index', { ascending: true });
  if (error) throw new Error(error.message);
  const rows = data || [];
  const dbSlugs = new Set<string>(rows.map((r: any) => r.slug));
  const deletedSlugs = new Set<string>(rows.filter((r: any) => r.is_published === false).map((r: any) => r.slug));
  const albums = rows.filter((r: any) => r.is_published !== false).map(mapDbToAlbum);
  for (const b of builtInAlbums()) {
    if (deletedSlugs.has(b.slug)) continue;
    if (!albums.some(a => a.id === b.id || a.slug === b.slug)) albums.push(b);
  }
  albums.sort((a, b) => (a.orderIndex ?? 0) - (b.orderIndex ?? 0));
  return { albums, dbSlugs, deletedSlugs };
}

export const isBuiltIn = (slug: string) => builtInAlbums().some(a => a.slug === slug);
