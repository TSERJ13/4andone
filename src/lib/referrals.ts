import 'server-only';
import crypto from 'crypto';
import type { SupabaseClient } from '@supabase/supabase-js';

// "Invite a friend": the friend (a NEW account) and the inviter each get one
// month of Premium. A person can accept an invite only once; an inviter can
// invite many friends but is rewarded for the first one only.

export const REFERRAL_DAYS = 30;
/** A friend counts as new for this long after their first sign-in. */
export const NEW_ACCOUNT_HOURS = 48;

const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
export const normalizeCode = (v: unknown) =>
  typeof v === 'string' && /^[A-Za-z0-9]{6,12}$/.test(v.trim()) ? v.trim().toUpperCase() : null;

const newCode = () => {
  const bytes = crypto.randomBytes(8);
  return [...bytes].map(b => CODE_ALPHABET[b % CODE_ALPHABET.length]).join('');
};

/** The listener's invite code, created on first use. Null if the table/column isn't set up yet. */
export async function getOrCreateCode(db: SupabaseClient, telegramId: number): Promise<string | null> {
  const { data, error } = await db.from('telegram_users').select('referral_code').eq('telegram_id', telegramId).maybeSingle();
  if (error) return null;
  if (data?.referral_code) return data.referral_code;
  if (!data) await db.from('telegram_users').upsert({ telegram_id: telegramId }, { onConflict: 'telegram_id', ignoreDuplicates: true });
  for (let i = 0; i < 5; i++) {
    const code = newCode();
    const { error: upErr } = await db.from('telegram_users').update({ referral_code: code }).eq('telegram_id', telegramId).is('referral_code', null);
    if (!upErr) {
      const { data: again } = await db.from('telegram_users').select('referral_code').eq('telegram_id', telegramId).maybeSingle();
      if (again?.referral_code) return again.referral_code;
    }
  }
  return null;
}

/**
 * Adds a month of Premium. Returns the new end date, or null when the person
 * already has Premium that a month can't add to (PayPal subscription,
 * lifetime / forever gift) — they keep what they have.
 */
async function grantMonth(db: SupabaseClient, telegramId: number): Promise<string | null> {
  const { data } = await db.from('telegram_users')
    .select('is_premium, subscription_id, premium_until')
    .eq('telegram_id', telegramId)
    .maybeSingle();
  const sub: string = data?.subscription_id || '';
  const until = data?.premium_until ? new Date(data.premium_until).getTime() : null;
  const active = !!data?.is_premium && (until === null || until > Date.now());
  if (active && (until === null || sub.startsWith('I-'))) return null;
  const from = active && until ? until : Date.now();
  const premiumUntil = new Date(from + REFERRAL_DAYS * 86400000).toISOString();
  const patch: Record<string, unknown> = { is_premium: true, premium_until: premiumUntil };
  if (!active) patch.subscription_id = `REFERRAL_${Date.now()}`;
  await db.from('telegram_users').update(patch).eq('telegram_id', telegramId);
  return premiumUntil;
}

export type ClaimResult =
  | { ok: true; inviter: { name: string; username: string | null }; premiumUntil: string | null; inviterRewarded: boolean }
  | { ok: false; reason: 'not_setup' | 'bad_code' | 'own_code' | 'already_used' | 'not_new' | 'failed' };

export async function claimReferral(db: SupabaseClient, inviteeId: number, code: string): Promise<ClaimResult> {
  const { data: inviter, error: inviterErr } = await db.from('telegram_users')
    .select('telegram_id, first_name, last_name, username')
    .eq('referral_code', code)
    .maybeSingle();
  if (inviterErr) return { ok: false, reason: 'not_setup' };
  if (!inviter) return { ok: false, reason: 'bad_code' };
  if (Number(inviter.telegram_id) === inviteeId) return { ok: false, reason: 'own_code' };

  const { data: existing, error: exErr } = await db.from('referrals').select('id').eq('invitee_id', inviteeId).maybeSingle();
  if (exErr) return { ok: false, reason: 'not_setup' };
  if (existing) return { ok: false, reason: 'already_used' };

  // Only NEW listeners can accept an invite (otherwise everyone could just invite each other)
  const { data: me } = await db.from('telegram_users').select('first_seen').eq('telegram_id', inviteeId).maybeSingle();
  if (!me) {
    await db.from('telegram_users').upsert({ telegram_id: inviteeId }, { onConflict: 'telegram_id', ignoreDuplicates: true });
  } else if (me.first_seen && Date.now() - new Date(me.first_seen).getTime() > NEW_ACCOUNT_HOURS * 3600000) {
    return { ok: false, reason: 'not_new' };
  }

  // Record first (the unique keys stop double claims), then give the Premium.
  let inviterRewarded = true;
  let ins = await db.from('referrals').insert({ inviter_id: inviter.telegram_id, invitee_id: inviteeId, inviter_rewarded: true }).select('id').single();
  if (ins.error?.code === '23505' && /one_reward/.test(ins.error.message)) {
    inviterRewarded = false; // inviter already got their month for an earlier friend
    ins = await db.from('referrals').insert({ inviter_id: inviter.telegram_id, invitee_id: inviteeId, inviter_rewarded: false }).select('id').single();
  }
  if (ins.error) return { ok: false, reason: ins.error.code === '23505' ? 'already_used' : 'failed' };

  const inviteeUntil = await grantMonth(db, inviteeId);
  const inviterUntil = inviterRewarded ? await grantMonth(db, Number(inviter.telegram_id)) : null;
  await db.from('referrals').update({ invitee_premium_until: inviteeUntil, inviter_premium_until: inviterUntil }).eq('id', ins.data.id);

  const name = [inviter.first_name, inviter.last_name].filter(Boolean).join(' ') || 'A friend';
  return { ok: true, inviter: { name, username: inviter.username ?? null }, premiumUntil: inviteeUntil, inviterRewarded };
}

type UserRow = { telegram_id: number; first_name: string | null; last_name: string | null; username: string | null };
export const displayName = (u?: UserRow | null) =>
  u ? ([u.first_name, u.last_name].filter(Boolean).join(' ') || (u.username ? `@${u.username}` : `User ${u.telegram_id}`)) : 'Unknown';

/** Names for a set of Telegram IDs. */
export async function usersById(db: SupabaseClient, ids: number[]): Promise<Map<number, UserRow>> {
  const map = new Map<number, UserRow>();
  const unique = [...new Set(ids)];
  for (let i = 0; i < unique.length; i += 200) {
    const { data } = await db.from('telegram_users').select('telegram_id, first_name, last_name, username').in('telegram_id', unique.slice(i, i + 200));
    for (const u of data ?? []) map.set(Number(u.telegram_id), u as UserRow);
  }
  return map;
}
