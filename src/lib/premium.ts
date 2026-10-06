import 'server-only';
import type { SupabaseClient } from '@supabase/supabase-js';

export interface PremiumStatus {
  active: boolean;
  subscriptionId: string | null;
  premiumUntil: string | null;
}

/** Subscription status from telegram_users, honouring premium_until. */
export const readPremiumStatus = async (db: SupabaseClient, telegramId: number): Promise<PremiumStatus | null> => {
  const { data, error } = await db
    .from('telegram_users')
    .select('is_premium, subscription_id, premium_until')
    .eq('telegram_id', telegramId)
    .maybeSingle();
  if (error) return null;
  if (!data) return { active: false, subscriptionId: null, premiumUntil: null };
  const until = data.premium_until ? new Date(data.premium_until).getTime() : null;
  const notExpired = until === null || Number.isNaN(until) || until > Date.now();
  return {
    active: !!data.is_premium && notExpired,
    subscriptionId: data.subscription_id ?? null,
    premiumUntil: data.premium_until ?? null,
  };
};

export const parseTelegramId = (value: unknown): number | null => {
  const n = typeof value === 'string' ? Number(value) : value;
  return typeof n === 'number' && Number.isSafeInteger(n) && n > 0 ? n : null;
};
