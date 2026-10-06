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

export async function POST(req: NextRequest) {
  const denied = await requireAdmin();
  if (denied) return denied;
  try {
    const { albumIds } = await req.json(); // Array of album IDs in desired order
    if (!Array.isArray(albumIds)) {
      return NextResponse.json({ error: 'albumIds array is required' }, { status: 400 });
    }

    const localAlbums = readLocalAlbums();
    const albumMap = new Map(localAlbums.map(a => [a.id, a]));

    const reordered: Album[] = [];
    albumIds.forEach((id, idx) => {
      const album = albumMap.get(id);
      if (album) {
        album.orderIndex = idx;
        reordered.push(album);
        albumMap.delete(id);
      }
    });

    // Append any albums not in albumIds to the end
    albumMap.forEach((album) => {
      album.orderIndex = reordered.length;
      reordered.push(album);
    });

    writeLocalAlbums(reordered);

    // Try updating Supabase
    try {
      for (const a of reordered) {
        await supabase
          .from('albums')
          .update({ order_index: a.orderIndex })
          .eq('slug', a.slug);
      }
    } catch (e) {
      console.warn('Could not reorder supabase albums:', e);
    }

    return NextResponse.json({ albums: reordered, success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
