import { NextRequest, NextResponse } from 'next/server';
import { supabase as publicClient } from '@/utils/supabase';
import { requireAdmin } from '@/lib/admin-auth';
import { getSupabaseAdmin } from '@/lib/supabase-admin';

// Album writes need the service role (the albums table is read-only for the public key).
const supabase = getSupabaseAdmin() ?? publicClient;
import { Album } from '@/types/album';
import fs from 'fs';
import path from 'path';

const ALBUMS_FILE_PATH = path.join(process.cwd(), 'src', 'data', 'albums.json');

function readLocalAlbums(): Album[] {
  try {
    if (fs.existsSync(ALBUMS_FILE_PATH)) {
      const content = fs.readFileSync(ALBUMS_FILE_PATH, 'utf-8');
      return JSON.parse(content);
    }
  } catch (e) {
    console.error('Failed to read local albums.json:', e);
  }
  return [];
}

function writeLocalAlbums(albums: Album[]) {
  try {
    const dir = path.dirname(ALBUMS_FILE_PATH);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(ALBUMS_FILE_PATH, JSON.stringify(albums, null, 2), 'utf-8');
  } catch (e) {
    console.error('Failed to write local albums.json:', e);
  }
}

function mapDbToAlbum(row: any): Album {
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    artist: row.artist || '',
    subtitle: row.subtitle || '',
    description: row.description || '',
    badge: row.badge || 'LIVE SOUNDS COLLECTION',
    coverUrl: row.cover_url || '',
    themeColor: row.theme_color || '#e11d48',
    secondaryColor: row.secondary_color || '#be123c',
    gradient: row.gradient || `linear-gradient(90deg, ${row.theme_color || '#e11d48'}, ${row.secondary_color || '#be123c'})`,
    program: row.program || 'Both',
    allowedStyles: row.allowed_styles || [],
    tags: row.tags || [],
    orderIndex: typeof row.order_index === 'number' ? row.order_index : 0,
    isPublished: row.is_published !== false,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function GET() {
  try {
    // 1. Try Supabase first
    const { data: dbData, error } = await supabase
      .from('albums')
      .select('*')
      .order('order_index', { ascending: true });

    if (!error && dbData && dbData.length > 0) {
      const albums = dbData.map(mapDbToAlbum);
      return NextResponse.json({ albums, source: 'supabase' });
    }

    // 2. Fallback to local JSON file
    const localAlbums = readLocalAlbums();
    localAlbums.sort((a, b) => (a.orderIndex ?? 0) - (b.orderIndex ?? 0));
    return NextResponse.json({ albums: localAlbums, source: 'local' });
  } catch (err: any) {
    const localAlbums = readLocalAlbums();
    return NextResponse.json({ albums: localAlbums, error: err.message, source: 'fallback' });
  }
}

export async function POST(req: NextRequest) {
  const denied = await requireAdmin();
  if (denied) return denied;
  try {
    const body = await req.json();
    const {
      title,
      artist,
      subtitle,
      description,
      badge,
      coverUrl,
      themeColor,
      secondaryColor,
      program,
      allowedStyles,
      tags,
      orderIndex,
    } = body;

    if (!title) {
      return NextResponse.json({ error: 'Title is required' }, { status: 400 });
    }

    // Generate slug from title if not explicitly provided
    let slug = body.slug?.trim() || '';
    if (!slug) {
      slug = title
        .toLowerCase()
        .replace(/&/g, 'and')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)+/g, '');
    }

    const localAlbums = readLocalAlbums();
    const existingIndex = localAlbums.findIndex(a => a.slug === slug);
    const newOrderIndex = typeof orderIndex === 'number' ? orderIndex : 0;

    const newAlbum: Album = {
      id: body.id || `album-${Date.now()}`,
      slug,
      title: title.trim(),
      artist: (artist || title).trim(),
      subtitle: (subtitle || '').trim(),
      description: (description || subtitle || '').trim(),
      badge: (badge || 'LIVE SOUNDS COLLECTION').trim(),
      coverUrl: coverUrl || '/georgie-musheev.jpg',
      themeColor: themeColor || '#e11d48',
      secondaryColor: secondaryColor || '#be123c',
      gradient: `linear-gradient(90deg, ${themeColor || '#e11d48'}, ${secondaryColor || '#be123c'})`,
      program: program || 'Both',
      allowedStyles: Array.isArray(allowedStyles) ? allowedStyles : [],
      tags: Array.isArray(tags) ? tags : [title.toLowerCase()],
      orderIndex: newOrderIndex,
      isPublished: true,
      createdAt: new Date().toISOString(),
    };

    // Try Supabase insert
    try {
      await supabase.from('albums').upsert({
        slug: newAlbum.slug,
        title: newAlbum.title,
        artist: newAlbum.artist,
        subtitle: newAlbum.subtitle,
        description: newAlbum.description,
        badge: newAlbum.badge,
        cover_url: newAlbum.coverUrl,
        theme_color: newAlbum.themeColor,
        secondary_color: newAlbum.secondaryColor,
        gradient: newAlbum.gradient,
        program: newAlbum.program,
        allowed_styles: newAlbum.allowedStyles,
        tags: newAlbum.tags,
        order_index: newAlbum.orderIndex,
        is_published: true,
      }, { onConflict: 'slug' });
    } catch (e) {
      console.warn('Could not insert to supabase albums table (table might not exist yet):', e);
    }

    // Always update local JSON file
    if (existingIndex >= 0) {
      localAlbums[existingIndex] = newAlbum;
    } else {
      // Put at start if orderIndex is 0
      if (newOrderIndex === 0) {
        localAlbums.forEach(a => { a.orderIndex = (a.orderIndex ?? 0) + 1; });
        localAlbums.unshift(newAlbum);
      } else {
        localAlbums.push(newAlbum);
      }
    }
    localAlbums.sort((a, b) => (a.orderIndex ?? 0) - (b.orderIndex ?? 0));
    writeLocalAlbums(localAlbums);

    return NextResponse.json({ album: newAlbum, success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  const denied = await requireAdmin();
  if (denied) return denied;
  try {
    const body = await req.json();
    const { id, slug, ...updates } = body;

    if (!id && !slug) {
      return NextResponse.json({ error: 'id or slug is required' }, { status: 400 });
    }

    const localAlbums = readLocalAlbums();
    const targetIdx = localAlbums.findIndex(a => a.id === id || a.slug === slug);
    if (targetIdx === -1) {
      return NextResponse.json({ error: 'Album not found' }, { status: 404 });
    }

    const existing = localAlbums[targetIdx];
    const themeColor = updates.themeColor || existing.themeColor;
    const secondaryColor = updates.secondaryColor || existing.secondaryColor || '#be123c';

    const updatedAlbum: Album = {
      ...existing,
      ...updates,
      gradient: updates.gradient || `linear-gradient(90deg, ${themeColor}, ${secondaryColor})`,
      updatedAt: new Date().toISOString(),
    };

    localAlbums[targetIdx] = updatedAlbum;
    localAlbums.sort((a, b) => (a.orderIndex ?? 0) - (b.orderIndex ?? 0));
    writeLocalAlbums(localAlbums);

    // Try Supabase update
    try {
      await supabase.from('albums').update({
        title: updatedAlbum.title,
        artist: updatedAlbum.artist,
        subtitle: updatedAlbum.subtitle,
        description: updatedAlbum.description,
        badge: updatedAlbum.badge,
        cover_url: updatedAlbum.coverUrl,
        theme_color: updatedAlbum.themeColor,
        secondary_color: updatedAlbum.secondaryColor,
        gradient: updatedAlbum.gradient,
        program: updatedAlbum.program,
        allowed_styles: updatedAlbum.allowedStyles,
        tags: updatedAlbum.tags,
        order_index: updatedAlbum.orderIndex,
        is_published: updatedAlbum.isPublished,
        updated_at: new Date().toISOString(),
      }).eq('slug', existing.slug);
    } catch (e) {
      console.warn('Could not update supabase albums:', e);
    }

    return NextResponse.json({ album: updatedAlbum, success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const denied = await requireAdmin();
  if (denied) return denied;
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    const slug = searchParams.get('slug');

    if (!id && !slug) {
      return NextResponse.json({ error: 'id or slug is required' }, { status: 400 });
    }

    const localAlbums = readLocalAlbums();
    const filtered = localAlbums.filter(a => a.id !== id && a.slug !== slug);
    writeLocalAlbums(filtered);

    try {
      if (slug) {
        await supabase.from('albums').delete().eq('slug', slug);
      } else if (id) {
        await supabase.from('albums').delete().eq('id', id);
      }
    } catch (e) {
      console.warn('Could not delete from supabase albums:', e);
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
