import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin-auth';
import { getSupabaseAdmin, serviceRoleMissing } from '@/lib/supabase-admin';

export async function POST(req: NextRequest) {
  const denied = await requireAdmin();
  if (denied) return denied;

  const db = getSupabaseAdmin();
  if (!db) return serviceRoleMissing();

  try {
    const { telegramId, days = 30 } = await req.json();
    const tid = Number(telegramId);
    if (!tid) {
      return NextResponse.json({ error: 'Valid telegramId is required' }, { status: 400 });
    }

    const { data: user, error: uErr } = await db
      .from('telegram_users')
      .select('telegram_id, is_premium, premium_until, subscription_id')
      .eq('telegram_id', tid)
      .maybeSingle();

    if (uErr) return NextResponse.json({ error: uErr.message }, { status: 500 });

    const until = user?.premium_until ? new Date(user.premium_until).getTime() : null;
    const active = !!user?.is_premium && (until === null || until > Date.now());
    const from = active && until ? until : Date.now();
    const newPremiumUntil = new Date(from + Number(days) * 86400000).toISOString();

    const patch: Record<string, unknown> = {
      is_premium: true,
      premium_until: newPremiumUntil,
    };
    if (!active) {
      patch.subscription_id = `MANUAL_GRANT_${Date.now()}`;
    }

    const { error: upErr } = await db
      .from('telegram_users')
      .update(patch)
      .eq('telegram_id', tid);

    if (upErr) return NextResponse.json({ error: upErr.message }, { status: 500 });

    return NextResponse.json({
      success: true,
      telegramId: tid,
      premiumUntil: newPremiumUntil,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Server error' }, { status: 500 });
  }
}
