import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin-auth';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { supabase as fallbackSupabase } from '@/utils/supabase';
import { getStoredPromoCodes, DEFAULT_PROMOS } from '@/lib/promos';

// GET: Admin list of all promo codes + claim counts
export async function GET() {
  const denied = await requireAdmin();
  if (denied) return denied;

  const db = getSupabaseAdmin() || fallbackSupabase;
  try {
    const { promos, claimsCount } = await getStoredPromoCodes(db);
    return NextResponse.json({
      success: true,
      promos: promos.map(p => ({
        ...p,
        usedCount: claimsCount[p.code] || 0,
      })),
    }, { headers: { 'cache-control': 'no-store' } });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Failed to fetch promo codes' }, { status: 500 });
  }
}

// POST: Admin creates or toggles a promo code
export async function POST(req: NextRequest) {
  const denied = await requireAdmin();
  if (denied) return denied;

  const db = getSupabaseAdmin() || fallbackSupabase;
  try {
    const body = await req.json();
    const rawCode = typeof body.code === 'string' ? body.code.trim().toUpperCase() : '';
    const name = typeof body.name === 'string' ? body.name.trim() : 'Special Promo';
    const days = Math.max(1, Math.min(365, Number(body.days) || 30));
    const active = body.active !== false;
    const maxUses = body.maxUses ? Number(body.maxUses) : null;

    if (!rawCode || rawCode.length < 3) {
      return NextResponse.json({ error: 'Promo code must be at least 3 characters' }, { status: 400 });
    }

    // Check if promo already defined in track_plays
    const { data: existing } = await db
      .from('track_plays')
      .select('id')
      .eq('event_type', 'promo_def')
      .eq('bpm', rawCode)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    const extraJson = JSON.stringify({ active, maxUses });

    if (existing) {
      // Update existing promo definition
      const { error: upErr } = await db
        .from('track_plays')
        .update({
          style: name,
          duration_seconds: days,
          session_id: extraJson,
        })
        .eq('id', existing.id);

      if (upErr) throw upErr;
    } else {
      // Insert new promo definition
      const { error: inErr } = await db
        .from('track_plays')
        .insert({
          event_type: 'promo_def',
          track_id: 'promo_code_config',
          bpm: rawCode,
          style: name,
          duration_seconds: days,
          session_id: extraJson,
          user_ref: 'admin',
        });

      if (inErr) throw inErr;
    }

    return NextResponse.json({ success: true, code: rawCode, days, active });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Failed to save promo code' }, { status: 500 });
  }
}

// DELETE: Admin removes or deactivates a promo code
export async function DELETE(req: NextRequest) {
  const denied = await requireAdmin();
  if (denied) return denied;

  const db = getSupabaseAdmin() || fallbackSupabase;
  try {
    const { searchParams } = new URL(req.url);
    const code = (searchParams.get('code') || '').trim().toUpperCase();
    if (!code) {
      return NextResponse.json({ error: 'Code is required' }, { status: 400 });
    }

    // Delete custom definition if exists
    const { error: delErr } = await db
      .from('track_plays')
      .delete()
      .eq('event_type', 'promo_def')
      .eq('bpm', code);
    if (delErr) throw delErr;

    // Built-in codes live in the code and cannot be erased from it: a small "deleted" row hides them everywhere
    const isDefault = DEFAULT_PROMOS.some(p => p.code === code);
    if (isDefault) {
      const { error: offErr } = await db
        .from('track_plays')
        .insert({
          event_type: 'promo_def',
          track_id: 'promo_code_config',
          bpm: code,
          style: 'Deleted Promo',
          duration_seconds: 0,
          session_id: JSON.stringify({ deleted: true }),
          user_ref: 'admin',
        });
      if (offErr) throw offErr;
    }

    return NextResponse.json({ success: true, code });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Failed to delete promo code' }, { status: 500 });
  }
}
