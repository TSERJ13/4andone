import { supabase } from './supabase';

export type KofiClickSource = 'pill' | 'sidebar' | 'compact' | 'modal_external' | 'modal_amount';

/**
 * Tracks a click event when a user clicks the Buy Me Coffee button or selects an amount.
 * Records the source variant, chosen donation amount, country code, session ID, and user ref.
 */
export async function trackKofiClick(source: KofiClickSource = 'pill', amount: number = 3) {
  try {
    const sessionId = typeof window !== 'undefined' 
      ? sessionStorage.getItem('4andone_session_id') 
      : null;
    
    let countryCode = typeof window !== 'undefined' 
      ? sessionStorage.getItem('4andone_country_code') || '' 
      : '';

    // Cache last selected amount in session
    if (typeof window !== 'undefined' && amount > 0) {
      sessionStorage.setItem('4andone_last_kofi_amount', amount.toString());
    }

    // Check if Telegram user is present
    let userRef: string | null = null;
    try {
      const tg = (window as Window & { Telegram?: { WebApp?: { initDataUnsafe?: { user?: { id: number } } } } }).Telegram?.WebApp?.initDataUnsafe?.user;
      if (tg?.id) {
        userRef = tg.id.toString();
      }
    } catch {
      // ignore
    }

    // Insert into track_plays table with:
    // duration_seconds = dollar amount (e.g. 3, 5, 10, 25)
    // style = source with amount tag ('pill:3', 'modal_amount:5', etc.)
    // bpm = 2-letter country code ('GE', 'US', etc.)
    const styleTag = amount > 0 ? `${source}:${amount}` : source;

    await supabase.from('track_plays').insert({
      track_id: 'kofi_button',
      user_ref: userRef,
      session_id: sessionId,
      style: styleTag,
      bpm: countryCode || 'Unknown',
      duration_seconds: Math.max(0, Math.round(amount)),
      event_type: 'kofi_click',
    });
  } catch (err) {
    console.warn('[TRACKING] Error logging Kofi click:', err);
  }
}
