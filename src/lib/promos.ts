import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { supabase as fallbackSupabase } from '@/utils/supabase';

export interface PromoCodeItem {
  id: string;
  code: string;
  name: string;
  days: number;
  active: boolean;
  maxUses?: number | null; // null = unlimited
  createdAt: string;
  /** internal: set on a stored row that marks the code as deleted */
  deleted?: boolean;
}

// Built-in presets to guarantee availability out of the box
export const DEFAULT_PROMOS: PromoCodeItem[] = [
  { id: 'def_1', code: 'FREE30', name: '1 Month Free Trial', days: 30, active: true, createdAt: '2026-10-11T00:00:00.000Z' },
  { id: 'def_2', code: 'DANCE2026', name: 'Special Dance Gift 2026', days: 30, active: true, createdAt: '2026-10-11T00:00:00.000Z' },
  { id: 'def_3', code: 'VIPDANCER', name: 'VIP Dancer Pass', days: 60, active: true, createdAt: '2026-10-11T00:00:00.000Z' },
  { id: 'def_4', code: 'CHAMPION', name: 'Competition Special', days: 30, active: true, createdAt: '2026-10-11T00:00:00.000Z' },
  { id: 'def_5', code: 'GOC2026', name: 'German Open Special', days: 30, active: true, createdAt: '2026-10-11T00:00:00.000Z' },
];

/**
 * Helper to fetch all promo codes and usage stats from Supabase.
 */
export async function getStoredPromoCodes(db = getSupabaseAdmin() || fallbackSupabase): Promise<{
  promos: PromoCodeItem[];
  claimsCount: Record<string, number>;
}> {
  // 1. Fetch promo definitions from track_plays
  const { data: defRows, error: definitionsError } = await db
    .from('track_plays')
    .select('id, bpm, style, duration_seconds, session_id, created_at')
    .eq('event_type', 'promo_def')
    .order('created_at', { ascending: false });

  // 2. Fetch promo claims count from track_plays
  const { data: claimRows, error: claimsError } = await db
    .from('track_plays')
    .select('bpm')
    .eq('event_type', 'promo_claimed');
  if (definitionsError || claimsError) throw new Error('Promo lookup failed');

  const claimsCount: Record<string, number> = {};
  (claimRows || []).forEach(r => {
    const c = (r.bpm || '').toUpperCase();
    if (c) claimsCount[c] = (claimsCount[c] || 0) + 1;
  });

  const customPromos: PromoCodeItem[] = (defRows || []).map(r => {
    let extra: { active?: boolean; maxUses?: number | null; deleted?: boolean } = {};
    try {
      if (r.session_id) extra = JSON.parse(r.session_id);
    } catch { /* ignore */ }

    return {
      id: String(r.id),
      code: (r.bpm || '').toUpperCase(),
      name: r.style || 'Custom Promo',
      days: Number(r.duration_seconds) || 30,
      active: extra.active !== false,
      maxUses: extra.maxUses ?? null,
      createdAt: r.created_at,
      deleted: extra.deleted === true,
    };
  });

  // Merge default promos with custom promos (custom override defaults if same code)
  const codeMap = new Map<string, PromoCodeItem>();
  DEFAULT_PROMOS.forEach(p => codeMap.set(p.code, p));
  // Rows are newest-first: apply oldest first so a newer disable wins.
  // A "deleted" row removes the code, built-in ones too (they cannot be erased from the code, so deleting leaves this marker)
  [...customPromos].reverse().forEach(p => {
    if (p.deleted) codeMap.delete(p.code);
    else codeMap.set(p.code, p);
  });

  return {
    promos: Array.from(codeMap.values()),
    claimsCount,
  };
}
