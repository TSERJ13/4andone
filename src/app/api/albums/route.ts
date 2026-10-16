import { NextRequest, NextResponse } from 'next/server';
import { supabase as publicClient } from '@/utils/supabase';
import { requireAdmin } from '@/lib/admin-auth';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { Album } from '@/types/album';
import { albumToDbRow, builtInAlbums, isBuiltIn, loadAlbumState, mapDbToAlbum, slugify } from '@/lib/albums-store';

// Album writes need the service role (the albums table is read-only for the public key).
const db = () => getSupabaseAdmin() ?? publicClient;

const fail = (message: string, status = 500) => NextResponse.json({ error: message }, { status });
const dbMessage = (e: { message?: string } | null | undefined, what: string) => `${what}: ${e?.message || 'the database refused it'}`;

export async function GET() {
  try {
    // The database is the source of truth. A row with is_published = false is a deleted album: it is hidden and
    // also stops the built-in copy of the same album from coming back.
    const { albums } = await loadAlbumState(db());
    return NextResponse.json({ albums, source: 'supabase+builtin' });
  } catch (err: any) {
    // The public site must keep working when the database is unreachable: show the built-in albums
    const fallback = builtInAlbums().sort((a, b) => (a.orderIndex ?? 0) - (b.orderIndex ?? 0));
    return NextResponse.json({ albums: fallback, error: err.message, source: 'fallback' });
  }
}

export async function POST(req: NextRequest) {
  const denied = await requireAdmin();
  if (denied) return denied;
  try {
    const body = await req.json();
    const title = typeof body.title === 'string' ? body.title.trim() : '';
    if (!title) return fail('Title is required', 400);
    const slug = slugify(typeof body.slug === 'string' && body.slug.trim() ? body.slug : title);
    if (!slug) return fail('The URL slug needs letters or numbers', 400);

    const state = await loadAlbumState(db()).catch((e: Error) => { throw new Error(dbMessage(e, 'Could not read the albums')); });
    if (state.albums.some(a => a.slug === slug) || state.dbSlugs.has(slug)) {
      return fail(`Another album already uses the address "${slug}". Choose a different slug.`, 409);
    }

    // New albums go first in the carousel
    const first = state.albums.length ? Math.min(...state.albums.map(a => a.orderIndex ?? 0)) : 0;
    const themeColor = body.themeColor || '#e11d48';
    const secondaryColor = body.secondaryColor || '#be123c';
    const album: Album = {
      id: '',
      slug,
      title,
      artist: (body.artist || title).trim(),
      subtitle: (body.subtitle || '').trim(),
      description: (body.description || body.subtitle || '').trim(),
      badge: (body.badge || 'LIVE SOUNDS COLLECTION').trim(),
      coverUrl: body.coverUrl || '/logo-square.jpg',
      themeColor,
      secondaryColor,
      gradient: `linear-gradient(90deg, ${themeColor}, ${secondaryColor})`,
      program: body.program || 'Both',
      allowedStyles: Array.isArray(body.allowedStyles) ? body.allowedStyles : [],
      tags: Array.isArray(body.tags) ? body.tags : [title.toLowerCase()],
      orderIndex: typeof body.orderIndex === 'number' && body.orderIndex !== 0 ? body.orderIndex : first - 1,
      isPublished: true,
    };

    const { data, error } = await db().from('albums').insert(albumToDbRow(album)).select('*').single();
    if (error || !data) return fail(dbMessage(error, 'The album was not saved'));
    return NextResponse.json({ album: mapDbToAlbum(data), success: true });
  } catch (err: any) {
    return fail(err.message);
  }
}

export async function PUT(req: NextRequest) {
  const denied = await requireAdmin();
  if (denied) return denied;
  try {
    const body = await req.json();
    const { id, slug: requestedSlug, ...updates } = body;
    if (!id && !requestedSlug) return fail('id or slug is required', 400);

    const state = await loadAlbumState(db()).catch((e: Error) => { throw new Error(dbMessage(e, 'Could not read the albums')); });
    const existing = state.albums.find(a => (id && a.id === id) || (!id && a.slug === requestedSlug)) || state.albums.find(a => a.slug === requestedSlug);
    if (!existing) return fail('Album not found. Reload the page and try again.', 404);

    // The address can be changed for your own albums; built-in ones keep theirs (their link is in the code)
    let slug = existing.slug;
    if (typeof requestedSlug === 'string' && requestedSlug.trim() && slugify(requestedSlug) !== existing.slug) {
      if (isBuiltIn(existing.slug)) return fail('The address of a built-in album cannot be changed.', 400);
      slug = slugify(requestedSlug);
      if (state.albums.some(a => a.slug === slug) || state.dbSlugs.has(slug)) return fail(`Another album already uses the address "${slug}".`, 409);
    }

    const themeColor = updates.themeColor || existing.themeColor;
    const secondaryColor = updates.secondaryColor || existing.secondaryColor || '#be123c';
    const merged: Album = {
      ...existing,
      ...updates,
      slug,
      gradient: updates.gradient || `linear-gradient(90deg, ${themeColor}, ${secondaryColor})`,
      isPublished: true,
    };
    const row = { ...albumToDbRow(merged), updated_at: new Date().toISOString() };

    // Own albums already have a row; a built-in album gets its first row when it is first saved
    const query = state.dbSlugs.has(existing.slug)
      ? db().from('albums').update(row).eq('slug', existing.slug)
      : db().from('albums').upsert(row, { onConflict: 'slug' });
    const { data, error } = await query.select('*').single();
    if (error || !data) return fail(dbMessage(error, 'The changes were not saved'));
    return NextResponse.json({ album: mapDbToAlbum(data), success: true });
  } catch (err: any) {
    return fail(err.message);
  }
}

export async function DELETE(req: NextRequest) {
  const denied = await requireAdmin();
  if (denied) return denied;
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    const slug = searchParams.get('slug');
    if (!id && !slug) return fail('id or slug is required', 400);

    const state = await loadAlbumState(db()).catch((e: Error) => { throw new Error(dbMessage(e, 'Could not read the albums')); });
    const target = state.albums.find(a => (id && a.id === id) || (slug && a.slug === slug));
    if (!target) return NextResponse.json({ success: true }); // already gone

    if (isBuiltIn(target.slug)) {
      // A built-in album lives in the code: keep a hidden marker row so it stays deleted
      const { error } = await db().from('albums').upsert({ slug: target.slug, title: target.title, is_published: false }, { onConflict: 'slug' });
      if (error) return fail(dbMessage(error, 'Could not delete the album'));
    } else {
      const { error } = await db().from('albums').delete().eq('slug', target.slug);
      if (error) return fail(dbMessage(error, 'Could not delete the album'));
    }
    return NextResponse.json({ success: true });
  } catch (err: any) {
    return fail(err.message);
  }
}
