import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin-auth';
import { getSupabaseAdmin, serviceRoleMissing } from '@/lib/supabase-admin';

// Admin-only database gateway. The browser can no longer write to the shared
// catalogue tables with the public key (RLS blocks it); the admin panel sends
// its writes here, they are checked against the admin session cookie and run
// with the service-role key.

const TABLES = new Set([
  'tracks', 'styles', 'tags', 'albums', 'telegram_users',
  'track_plays', 'page_visits', 'folders', 'folder_tracks', 'user_favorites',
  'final_tracks', 'final_folders', 'final_folder_tracks',
]);
const OPS = new Set(['select', 'insert', 'update', 'upsert', 'delete', 'rpc']);
// Analytics functions are no longer executable with the public key.
const RPC_FUNCTIONS = new Set([
  'get_platform_metrics', 'get_country_stats', 'get_recent_activity', 'get_top_tracks_with_events',
  'get_style_chart_30d', 'get_referrer_stats', 'get_traffic_buckets', 'get_ad_stats',
]);
const IDENT = /^[a-z_][a-z0-9_]*$/i;
const SELECT_COLS = /^[a-z0-9_,*\s()!:.-]*$/i;

type Filter = ['eq' | 'neq' | 'in' | 'gt' | 'gte' | 'lt' | 'lte', string, unknown];

interface AdminDbRequest {
  fn?: string;
  args?: unknown;
  table: string;
  op: string;
  values?: unknown;
  onConflict?: string;
  select?: string | null;
  count?: 'exact' | null;
  head?: boolean;
  filters?: Filter[];
  order?: { column: string; ascending?: boolean }[];
  limit?: number;
  range?: [number, number];
  single?: 'single' | 'maybeSingle' | null;
}

export async function POST(request: NextRequest) {
  const denied = await requireAdmin();
  if (denied) return denied;

  const db = getSupabaseAdmin();
  if (!db) return serviceRoleMissing();

  let body: AdminDbRequest;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ data: null, error: { message: 'Invalid JSON' } }, { status: 400 });
  }

  if (body.op === 'rpc') {
    const fn = String(body.fn || '');
    if (!RPC_FUNCTIONS.has(fn)) {
      return NextResponse.json({ data: null, error: { message: 'Function not allowed' } }, { status: 400 });
    }
    const { data, error } = await db.rpc(fn, (body.args as object) ?? {});
    return NextResponse.json({ data: data ?? null, error: error ? { message: error.message, code: error.code } : null, count: null });
  }

  const { table, op } = body;
  if (!TABLES.has(table) || !OPS.has(op)) {
    return NextResponse.json({ data: null, error: { message: 'Table or operation not allowed' } }, { status: 400 });
  }
  const filters = Array.isArray(body.filters) ? body.filters : [];
  for (const [kind, column] of filters) {
    if (!['eq', 'neq', 'in', 'gt', 'gte', 'lt', 'lte'].includes(kind) || !IDENT.test(column)) {
      return NextResponse.json({ data: null, error: { message: 'Invalid filter' } }, { status: 400 });
    }
  }
  if ((op === 'update' || op === 'delete') && filters.length === 0) {
    return NextResponse.json({ data: null, error: { message: 'Refusing to update/delete without a filter' } }, { status: 400 });
  }
  if (body.select && !SELECT_COLS.test(body.select)) {
    return NextResponse.json({ data: null, error: { message: 'Invalid select' } }, { status: 400 });
  }

  const base = db.from(table);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let q: any;
  switch (op) {
    case 'select':
      q = base.select(body.select || '*', { count: body.count ?? undefined, head: !!body.head });
      break;
    case 'insert':
      q = base.insert(body.values as object);
      break;
    case 'update':
      q = base.update(body.values as object);
      break;
    case 'upsert':
      q = base.upsert(body.values as object, body.onConflict ? { onConflict: body.onConflict } : undefined);
      break;
    case 'delete':
      q = base.delete();
      break;
  }
  if (op !== 'select' && body.select) q = q.select(body.select);

  for (const [kind, column, value] of filters) q = q[kind](column, value);
  for (const o of body.order ?? []) {
    if (IDENT.test(o.column)) q = q.order(o.column, { ascending: o.ascending !== false });
  }
  if (Array.isArray(body.range)) q = q.range(Number(body.range[0]), Number(body.range[1]));
  else if (typeof body.limit === 'number') q = q.limit(body.limit);
  if (body.single === 'single') q = q.single();
  if (body.single === 'maybeSingle') q = q.maybeSingle();

  const { data, error, count } = await q;
  return NextResponse.json({ data: data ?? null, error: error ? { message: error.message, code: error.code } : null, count: count ?? null });
}
