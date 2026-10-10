import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin-auth';
import { getSupabaseAdmin, serviceRoleMissing } from '@/lib/supabase-admin';
import { displayName, usersById } from '@/lib/referrals';

// Admin: every invite — who invited whom, when, and the Premium it gave.
export async function GET() {
  const denied = await requireAdmin();
  if (denied) return denied;
  const db = getSupabaseAdmin();
  if (!db) return serviceRoleMissing();

  const { data, error } = await db.from('referrals')
    .select('id, inviter_id, invitee_id, created_at, inviter_rewarded, inviter_premium_until, invitee_premium_until')
    .order('created_at', { ascending: false })
    .limit(2000);
  if (error) return NextResponse.json({ setup: false, error: error.message }, { status: 503 });

  const users = await usersById(db, (data ?? []).flatMap(r => [Number(r.inviter_id), Number(r.invitee_id)]));
  const person = (id: number) => {
    const u = users.get(id);
    return { id, name: displayName(u), username: u?.username ?? null };
  };
  return NextResponse.json({
    setup: true,
    referrals: (data ?? []).map(r => ({
      id: r.id,
      at: r.created_at,
      inviter: person(Number(r.inviter_id)),
      invitee: person(Number(r.invitee_id)),
      inviterRewarded: r.inviter_rewarded,
      inviterPremiumUntil: r.inviter_premium_until,
      inviteePremiumUntil: r.invitee_premium_until,
    })),
  }, { headers: { 'cache-control': 'no-store' } });
}
