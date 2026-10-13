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

export type ClaimResult =
  | { ok: true; inviter: { name: string; username: string | null }; premiumUntil: string | null; inviterRewarded: boolean }
  | { ok: false; reason: 'not_setup' | 'bad_code' | 'own_code' | 'already_used' | 'not_new' | 'failed' };

export async function claimReferral(db: SupabaseClient, inviteeId: number, code: string): Promise<ClaimResult> {
  const { data, error } = await db.rpc('claim_referral_reward', { p_invitee_id: inviteeId, p_code: code });
  if (error) return { ok: false, reason: error.code === 'PGRST202' ? 'not_setup' : 'failed' };
  return data as ClaimResult;
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
