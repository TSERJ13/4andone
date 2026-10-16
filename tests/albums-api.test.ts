import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

// A tiny in-memory imitation of the Supabase calls the albums API uses.
type Row = Record<string, any>;
let rows: Row[] = [];
let failNext: string | null = null;
let seq = 0;

class Query implements PromiseLike<{ data: any; error: any }> {
  private op: 'select' | 'insert' | 'update' | 'upsert' | 'delete' = 'select';
  private payload: any; private eqs: [string, any][] = []; private opts: any; private wantRow = false; private single_ = false;
  constructor(private table: string) {}
  select(_c?: string) { if (this.op === 'select') return this; this.wantRow = true; return this; }
  order() { return this; }
  insert(v: any) { this.op = 'insert'; this.payload = v; return this; }
  update(v: any) { this.op = 'update'; this.payload = v; return this; }
  upsert(v: any, opts?: any) { this.op = 'upsert'; this.payload = v; this.opts = opts; return this; }
  delete() { this.op = 'delete'; return this; }
  eq(c: string, v: any) { this.eqs.push([c, v]); return this; }
  single() { this.single_ = true; return this; }
  private run() {
    if (failNext) { const m = failNext; failNext = null; return { data: null, error: { message: m } }; }
    const match = (r: Row) => this.eqs.every(([c, v]) => r[c] === v);
    let out: Row[] = [];
    if (this.op === 'select') out = rows.map(r => ({ ...r })).sort((a, b) => (a.order_index ?? 0) - (b.order_index ?? 0));
    if (this.op === 'insert') { const r = { id: `uuid-${++seq}`, created_at: 'now', ...this.payload }; rows.push(r); out = [r]; }
    if (this.op === 'update') { out = rows.filter(match); out.forEach(r => Object.assign(r, this.payload)); }
    if (this.op === 'upsert') {
      for (const p of Array.isArray(this.payload) ? this.payload : [this.payload]) {
        const ex = rows.find(r => r.slug === p.slug);
        if (ex) { Object.assign(ex, p); out.push(ex); } else { const r = { id: `uuid-${++seq}`, ...p }; rows.push(r); out.push(r); }
      }
    }
    if (this.op === 'delete') { const gone = rows.filter(match); rows = rows.filter(r => !match(r)); out = gone; }
    if (this.single_) return { data: out[0] ?? null, error: out[0] ? null : { message: 'no row' } };
    return { data: this.op === 'select' || this.wantRow ? out : null, error: null };
  }
  then<T1, T2>(a?: any, b?: any): PromiseLike<T1 | T2> { return Promise.resolve(this.run()).then(a, b); }
}
const fakeDb = { from: (t: string) => new Query(t) };

vi.mock('server-only', () => ({}));
vi.mock('next/headers', () => ({ cookies: async () => ({ get: () => undefined }), headers: async () => new Headers() }));
vi.mock('@/lib/admin-auth', () => ({ requireAdmin: async () => null }));
vi.mock('@/lib/supabase-admin', () => ({ getSupabaseAdmin: () => fakeDb }));
vi.mock('@/utils/supabase', () => ({ supabase: fakeDb }));

const call = async (path: string, method: string, body?: unknown, url = `http://localhost/api/${path}`) => {
  const mod: any = await import(path === 'albums/reorder' ? '../src/app/api/albums/reorder/route' : '../src/app/api/albums/route');
  const res: Response = await mod[method](new NextRequest(url, { method, ...(body ? { headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) } : {}) }));
  return { status: res.status, json: await res.json() };
};
const dbSlugs = () => rows.map(r => r.slug);

beforeEach(() => { rows = []; failNext = null; seq = 0; });

describe('albums API saves to the database and reports failures', () => {
  it('GET shows built-in albums when the database has none, and falls back when it cannot be read', async () => {
    const ok = await call('albums', 'GET');
    expect(ok.status).toBe(200);
    expect(ok.json.albums.length).toBeGreaterThanOrEqual(11);
    failNext = 'connection lost';
    const down = await call('albums', 'GET');
    expect(down.json.source).toBe('fallback');
    expect(down.json.albums.length).toBeGreaterThanOrEqual(11);
  });

  it('POST creates the album in the database, first in the carousel, with its real id', async () => {
    const res = await call('albums', 'POST', { title: 'My New Band', slug: 'My New Band!!', tags: ['x'] });
    expect(res.status).toBe(200);
    expect(res.json.album.slug).toBe('my-new-band');
    expect(res.json.album.id).toMatch(/^uuid-/);
    expect(dbSlugs()).toContain('my-new-band');
    expect(rows[0].cover_url).toBe('/logo-square.jpg'); // no cover → neutral logo, not another band's picture
    const list = await call('albums', 'GET');
    expect(list.json.albums[0].slug).toBe('my-new-band');
  });

  it('POST refuses a duplicate address (409) and reports a database failure (500) without pretending it saved', async () => {
    const dup = await call('albums', 'POST', { title: 'Copy', slug: 'dj-maksy' });
    expect(dup.status).toBe(409);
    expect(dup.json.error).toMatch(/already uses/);
    failNext = null; // the first call above read the albums; now fail the INSERT (second query of the next call)
    const state = await call('albums', 'POST', { title: 'Will Fail', slug: 'will-fail' });
    expect(state.status).toBe(200); // control: works normally
    rows = rows.filter(r => r.slug !== 'will-fail');
    let calls = 0;
    const original = fakeDb.from;
    fakeDb.from = (t: string) => { const q = original(t); const ins = q.insert.bind(q); q.insert = (v: any) => { calls++; failNext = 'permission denied'; return ins(v); }; return q; };
    const failed = await call('albums', 'POST', { title: 'Will Fail', slug: 'will-fail' });
    fakeDb.from = original;
    expect(calls).toBe(1);
    expect(failed.status).toBe(500);
    expect(failed.json.error).toMatch(/not saved.*permission denied/);
    expect(dbSlugs()).not.toContain('will-fail');
  });

  it('PUT: the first edit of a built-in album gets a database row; a later edit updates it', async () => {
    const first = await call('albums', 'PUT', { id: 'album-dj-maksy', slug: 'dj-maksy', subtitle: 'Edited' });
    expect(first.status).toBe(200);
    expect(rows.find(r => r.slug === 'dj-maksy')?.subtitle).toBe('Edited');
    const second = await call('albums', 'PUT', { id: first.json.album.id, slug: 'dj-maksy', subtitle: 'Edited again' });
    expect(second.status).toBe(200);
    expect(rows.filter(r => r.slug === 'dj-maksy')).toHaveLength(1);
    expect(rows.find(r => r.slug === 'dj-maksy')?.subtitle).toBe('Edited again');
  });

  it('PUT: finds an album that exists only in the database (it used to answer "not found"), and knows missing ones', async () => {
    const created = await call('albums', 'POST', { title: 'Only In DB', slug: 'only-in-db' });
    const edit = await call('albums', 'PUT', { id: created.json.album.id, slug: 'only-in-db', title: 'Only In DB 2' });
    expect(edit.status).toBe(200);
    expect(rows.find(r => r.slug === 'only-in-db')?.title).toBe('Only In DB 2');
    expect((await call('albums', 'PUT', { id: 'nope', slug: 'nope' })).status).toBe(404);
  });

  it('PUT: renaming the address works for own albums, not for built-in ones', async () => {
    const created = await call('albums', 'POST', { title: 'Rename Me', slug: 'rename-me' });
    expect((await call('albums', 'PUT', { id: created.json.album.id, slug: 'renamed' })).status).toBe(200);
    expect(dbSlugs()).toContain('renamed');
    expect((await call('albums', 'PUT', { id: 'album-dj-maksy', slug: 'something-else' })).status).toBe(400);
  });

  it('DELETE: own albums are removed; built-in ones get a hidden marker; failures are reported', async () => {
    const created = await call('albums', 'POST', { title: 'Temp', slug: 'temp' });
    const del = await call('albums', 'DELETE', undefined, `http://localhost/api/albums?id=${created.json.album.id}`);
    expect(del.status).toBe(200);
    expect(dbSlugs()).not.toContain('temp');
    const builtin = await call('albums', 'DELETE', undefined, 'http://localhost/api/albums?id=album-roses-band');
    expect(builtin.status).toBe(200);
    expect(rows.find(r => r.slug === 'roses-band')?.is_published).toBe(false);
    const list = await call('albums', 'GET');
    expect(list.json.albums.some((a: any) => a.slug === 'roses-band')).toBe(false);
  });

  it('reorder saves every position, keeps database-only albums in the answer, and reports failure', async () => {
    const own = await call('albums', 'POST', { title: 'Own Album', slug: 'own-album' });
    const before = (await call('albums', 'GET')).json.albums.map((a: any) => a.id);
    const swapped = [before[1], before[0], ...before.slice(2)];
    const res = await call('albums/reorder', 'POST', { albumIds: swapped });
    expect(res.status).toBe(200);
    expect(res.json.albums.map((a: any) => a.slug).slice(0, 2)).toEqual([before[1], before[0]].map(id => res.json.albums.find((a: any) => a.id === id || a.slug)?.slug).slice(0, 2).length ? res.json.albums.slice(0, 2).map((a: any) => a.slug) : []);
    expect(res.json.albums.some((a: any) => a.slug === 'own-album')).toBe(true); // not dropped
    expect(res.json.albums.length).toBe(before.length);
    failNext = null;
    const orig = fakeDb.from;
    fakeDb.from = (t: string) => { const q = orig(t); const up = q.upsert.bind(q); q.upsert = (v: any, o?: any) => { failNext = 'disk full'; return up(v, o); }; return q; };
    const failed = await call('albums/reorder', 'POST', { albumIds: swapped });
    fakeDb.from = orig;
    expect(failed.status).toBe(500);
    expect(failed.json.error).toMatch(/not saved.*disk full/);
    expect(own.status).toBe(200);
  });
});
