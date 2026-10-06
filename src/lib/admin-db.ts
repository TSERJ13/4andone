"use client";

// Browser-side helper for admin writes. Mirrors the small part of the
// supabase-js query builder the admin panel uses, but sends the query to
// /api/admin/db, where the admin session is checked and the query runs with
// the service-role key. Usage stays the same:
//   const { data, error } = await adminDb.from('tracks').update(v).eq('id', id);

type Filter = ['eq' | 'neq' | 'in' | 'gt' | 'gte' | 'lt' | 'lte', string, unknown];
export interface AdminDbResult<T = any> {
  data: T | null;
  error: { message: string; code?: string } | null;
  count: number | null;
}

class AdminQuery<T = any> implements PromiseLike<AdminDbResult<T>> {
  private body: Record<string, unknown> & { filters: Filter[]; order: { column: string; ascending?: boolean }[] };

  constructor(table: string) {
    this.body = { table, op: 'select', filters: [], order: [] };
  }

  select(columns = '*', opts?: { count?: 'exact'; head?: boolean }) {
    this.body.select = columns;
    if (opts?.count) this.body.count = opts.count;
    if (opts?.head) this.body.head = true;
    return this;
  }
  insert(values: unknown) { this.body.op = 'insert'; this.body.values = values; return this; }
  update(values: unknown) { this.body.op = 'update'; this.body.values = values; return this; }
  upsert(values: unknown, opts?: { onConflict?: string }) {
    this.body.op = 'upsert';
    this.body.values = values;
    if (opts?.onConflict) this.body.onConflict = opts.onConflict;
    return this;
  }
  delete() { this.body.op = 'delete'; return this; }
  eq(column: string, value: unknown) { this.body.filters.push(['eq', column, value]); return this; }
  neq(column: string, value: unknown) { this.body.filters.push(['neq', column, value]); return this; }
  in(column: string, values: unknown[]) { this.body.filters.push(['in', column, values]); return this; }
  gt(column: string, value: unknown) { this.body.filters.push(['gt', column, value]); return this; }
  gte(column: string, value: unknown) { this.body.filters.push(['gte', column, value]); return this; }
  lt(column: string, value: unknown) { this.body.filters.push(['lt', column, value]); return this; }
  lte(column: string, value: unknown) { this.body.filters.push(['lte', column, value]); return this; }
  order(column: string, opts?: { ascending?: boolean }) {
    this.body.order.push({ column, ascending: opts?.ascending });
    return this;
  }
  limit(n: number) { this.body.limit = n; return this; }
  range(from: number, to: number) { this.body.range = [from, to]; return this; }
  single() { this.body.single = 'single'; return this; }
  maybeSingle() { this.body.single = 'maybeSingle'; return this; }

  private async run(): Promise<AdminDbResult<T>> {
    try {
      const res = await fetch('/api/admin/db', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify(this.body),
      });
      const json = await res.json().catch(() => null);
      if (!json) return { data: null, error: { message: `Admin request failed (${res.status})` }, count: null };
      return json as AdminDbResult<T>;
    } catch (e) {
      return { data: null, error: { message: e instanceof Error ? e.message : 'Network error' }, count: null };
    }
  }

  then<R1 = AdminDbResult<T>, R2 = never>(
    onfulfilled?: ((value: AdminDbResult<T>) => R1 | PromiseLike<R1>) | null,
    onrejected?: ((reason: unknown) => R2 | PromiseLike<R2>) | null
  ): PromiseLike<R1 | R2> {
    return this.run().then(onfulfilled, onrejected);
  }
}

const runRpc = async <T = any>(fn: string, args?: Record<string, unknown>): Promise<AdminDbResult<T>> => {
  try {
    const res = await fetch('/api/admin/db', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      credentials: 'same-origin',
      body: JSON.stringify({ op: 'rpc', fn, args: args ?? {} }),
    });
    const json = await res.json().catch(() => null);
    return json ?? { data: null, error: { message: `Admin request failed (${res.status})` }, count: null };
  } catch (e) {
    return { data: null, error: { message: e instanceof Error ? e.message : 'Network error' }, count: null };
  }
};

export const adminDb = {
  from: <T = any>(table: string) => new AdminQuery<T>(table),
  rpc: runRpc,
};
