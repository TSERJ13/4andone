"use client";

import { supabase } from '@/utils/supabase';

export type AdPlacement = 'list' | 'strip';
export type AdEvent = 'requested' | 'filled' | 'unfilled' | 'no_answer' | 'promo_click' | 'click';

/**
 * Saves one ad step to the database (table ad_events) for the admin
 * "Ads" report: requested → filled / unfilled / no_answer, Premium-card clicks.
 * Fire-and-forget: a failed write never affects the page.
 */
export function recordAdEvent(placement: AdPlacement, event: AdEvent) {
  if (typeof window === 'undefined') return;
  let sessionId: string | null = null;
  let countryCode: string | null = null;
  try {
    sessionId = sessionStorage.getItem('4andone_session_id');
    countryCode = sessionStorage.getItem('4andone_country_code');
  } catch { /* ignore */ }
  supabase
    .from('ad_events')
    .insert({
      session_id: sessionId,
      country_code: countryCode && countryCode !== 'Unknown' ? countryCode : null,
      placement,
      event,
    })
    .then(({ error }) => {
      if (error) console.warn('[4and.one ads] could not save ad event:', error.message);
    });
}
