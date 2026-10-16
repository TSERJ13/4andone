import { describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));
vi.mock('@/lib/supabase-admin', () => ({ getSupabaseAdmin: () => null }));
vi.mock('@/utils/supabase', () => ({ supabase: null }));

import { getStoredPromoCodes, DEFAULT_PROMOS } from '../src/lib/promos';

// A tiny stand-in for the two track_plays queries getStoredPromoCodes runs
const dbWith = (defs: any[], claims: any[] = []) => ({
  from: () => {
    let which = '';
    const q: any = {
      select: () => q, order: () => q,
      eq: (_c: string, v: string) => { which = v; return q; },
      then: (a: any) => Promise.resolve({ data: which === 'promo_def' ? defs : claims, error: null }).then(a),
    };
    return q;
  },
});
const row = (code: string, extra: object, at: string) => ({ id: code + at, bpm: code, style: 'x', duration_seconds: 30, session_id: JSON.stringify(extra), created_at: at });

describe('promo codes: deleting', () => {
  it('a "deleted" row removes a built-in code from the list', async () => {
    const { promos } = await getStoredPromoCodes(dbWith([row('FREE30', { deleted: true }, '2026-10-16')]) as any);
    expect(promos.some(p => p.code === 'FREE30')).toBe(false);
    expect(promos.length).toBe(DEFAULT_PROMOS.length - 1);
  });
  it('a code created again after being deleted is back (the newest row wins)', async () => {
    const rows = [row('FREE30', { active: true, maxUses: null }, '2026-10-17'), row('FREE30', { deleted: true }, '2026-10-16')];
    const { promos } = await getStoredPromoCodes(dbWith(rows) as any);
    expect(promos.find(p => p.code === 'FREE30')?.active).toBe(true);
  });
  it('a custom code is listed, and a deleted custom code is gone', async () => {
    const live = await getStoredPromoCodes(dbWith([row('SUMMER', { active: true }, '2026-10-16')]) as any);
    expect(live.promos.some(p => p.code === 'SUMMER')).toBe(true);
    const gone = await getStoredPromoCodes(dbWith([row('SUMMER', { deleted: true }, '2026-10-16')]) as any);
    expect(gone.promos.some(p => p.code === 'SUMMER')).toBe(false);
  });
});
