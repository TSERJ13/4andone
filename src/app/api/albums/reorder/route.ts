import { NextRequest, NextResponse } from 'next/server';
import { supabase as publicClient } from '@/utils/supabase';
import { requireAdmin } from '@/lib/admin-auth';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { albumToDbRow, loadAlbumState } from '@/lib/albums-store';

const db = () => getSupabaseAdmin() ?? publicClient;

// Saves the carousel order. One request writes every album's position (a built-in album gets its first database
// row here), and the answer is the saved list — the old version replaced the admin's list with the local file's list,
// so albums that only exist in the database disappeared from the screen after a reorder.
export async function POST(req: NextRequest) {
  const denied = await requireAdmin();
  if (denied) return denied;
  try {
    const { albumIds } = await req.json();
    if (!Array.isArray(albumIds)) return NextResponse.json({ error: 'albumIds array is required' }, { status: 400 });

    const state = await loadAlbumState(db());
    const byId = new Map(state.albums.map(a => [a.id, a]));
    const ordered = [];
    for (const id of albumIds) {
      const album = byId.get(id);
      if (album) { ordered.push(album); byId.delete(id); }
    }
    byId.forEach(a => ordered.push(a)); // anything not mentioned keeps its place at the end
    const rows = ordered.map((a, i) => albumToDbRow({ ...a, orderIndex: i }));

    const { error } = await db().from('albums').upsert(rows, { onConflict: 'slug' });
    if (error) return NextResponse.json({ error: `The new order was not saved: ${error.message}` }, { status: 500 });

    const fresh = await loadAlbumState(db());
    return NextResponse.json({ albums: fresh.albums, success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
