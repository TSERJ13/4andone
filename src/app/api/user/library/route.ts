import { NextRequest, NextResponse } from 'next/server';
import { resolveReadableTelegramId } from '@/lib/user-session';
import { getSupabaseAdmin, serviceRoleMissing } from '@/lib/supabase-admin';

const writable: Record<string, string[]> = {
  folders: ['name', 'color'], final_folders: ['name', 'color'],
  final_tracks: ['track_id', 'order'], user_favorites: ['track_id'],
  folder_tracks: ['folder_id', 'track_id', 'order'],
  final_folder_tracks: ['final_folder_id', 'track_id', 'order'],
};
const conflicts: Record<string, string> = {
  user_favorites: 'telegram_id,track_id', folder_tracks: 'folder_id,track_id',
};
const allowedColumns = new Set(['id', 'name', 'color', 'telegram_id', 'track_id', 'order', 'folder_id', 'final_folder_id', 'created_at']);
const fail = (message: string, status = 400) => NextResponse.json({ data: null, error: { message } }, { status });

/** A narrow library gateway. Client filters can narrow ownership, never replace it. */
export async function POST(request: NextRequest) {
  const who = await resolveReadableTelegramId(null);
  if ('status' in who) return fail('Sign in again', who.status);
  const db = getSupabaseAdmin();
  if (!db) return serviceRoleMissing();
  let body;
  try { body = await request.json(); } catch { return fail('Invalid JSON'); }
  if (!body || typeof body !== 'object' || Array.isArray(body)) return fail('Invalid request');
  const { table, op } = body;
  if (!Object.hasOwn(writable, table) || !['select', 'insert', 'update', 'upsert', 'delete'].includes(op)) return fail('Operation not allowed');
  const filters = body.filters || [];
  if (!Array.isArray(filters) || filters.length > 20 || filters.some(f => !Array.isArray(f) || f.length !== 3 ||
      !['eq', 'in'].includes(f[0]) || !allowedColumns.has(f[1]) || (f[0] === 'in' && (!Array.isArray(f[2]) || f[2].length > 1000)))) return fail('Invalid filters');
  if (['update', 'delete'].includes(op) && filters.length === 0) return fail('A filter is required');
  const columns = typeof body.select === 'string' ? body.select : '*';
  if (columns !== '*' && columns.split(',').some((c: string) => !allowedColumns.has(c.trim()))) return fail('Invalid columns');
  const orders = body.order || [];
  if (!Array.isArray(orders) || orders.some(o => !o || !allowedColumns.has(o.column))) return fail('Invalid ordering');

  const parentTable = table === 'folder_tracks' ? 'folders' : table === 'final_folder_tracks' ? 'final_folders' : null;
  const parentColumn = table === 'folder_tracks' ? 'folder_id' : 'final_folder_id';
  let ownedIds: string[] = [];
  if (parentTable) {
    const parents = await db.from(parentTable).select('id').eq('telegram_id', who.telegramId);
    if (parents.error) return fail('Ownership lookup failed', 502);
    ownedIds = (parents.data || []).map(p => p.id);
  }

  let values: Record<string, unknown>[] = [];
  if (['insert', 'upsert', 'update'].includes(op)) {
    const raw: Record<string, unknown>[] = Array.isArray(body.values) ? body.values : [body.values];
    if (!raw.length || raw.length > 500 || raw.some(v => !v || typeof v !== 'object' || Array.isArray(v))) return fail('Invalid values');
    values = raw.map(v => Object.fromEntries(writable[table].filter(k => Object.hasOwn(v, k)).map(k => [k, v[k]])));
    if (values.some(v => !Object.keys(v).length)) return fail('No writable values');
    // Updates cannot move a child to another folder, even an owned one.
    if (op === 'update' && parentTable && values.some(v => parentColumn in v)) return fail('Cannot change folder ownership');
    if (parentTable && op !== 'update' && values.some(v => typeof v[parentColumn] !== 'string' || !ownedIds.includes(v[parentColumn] as string))) return fail('Folder not owned by this account', 403);
    if (!parentTable && op !== 'update') values = values.map(v => ({ ...v, telegram_id: who.telegramId }));
  }
  if (op === 'upsert' && !conflicts[table]) return fail('Upsert not supported');
  if (op === 'update' && values.length !== 1) return fail('One update object required');
  const base = db.from(table);
  // PostgREST operations share this filtered builder; table/columns are allowlisted above.
  let q: any;
  if (op === 'select') q = base.select(columns);
  else if (op === 'insert') q = base.insert(values);
  else if (op === 'upsert') q = base.upsert(values, { onConflict: conflicts[table] });
  else if (op === 'update') q = base.update(values[0]);
  else q = base.delete();
  if (['select', 'update', 'delete'].includes(op)) {
    q = parentTable ? q.in(parentColumn, ownedIds) : q.eq('telegram_id', who.telegramId);
  }
  for (const [kind, column, value] of filters) q = q[kind](column, value);
  if (op !== 'select' && body.select) q = q.select(columns);
  for (const order of orders) q = q.order(order.column, { ascending: order.ascending !== false });
  if (body.single === 'single') q = q.single();
  else if (body.single === 'maybeSingle') q = q.maybeSingle();
  const { data, error } = await q;
  return NextResponse.json({ data: data ?? null, error: error ? { message: error.message } : null, count: null },
    { status: error ? 400 : 200, headers: { 'cache-control': 'no-store' } });
}
