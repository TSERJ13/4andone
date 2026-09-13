import { supabase } from './supabase';

export type KofiClickSource = 'pill' | 'sidebar' | 'compact' | 'modal_external';

/**
 * Tracks a click event when a user clicks the Buy Me Coffee button.
 * Records the source variant, country code, session ID, and user ref (if logged in).
 */
export async function trackKofiClick(source: KofiClickSource = 'pill') {
  try {
    const sessionId = typeof window !== 'undefined' 
      ? sessionStorage.getItem('4andone_session_id') 
      : null;
    
    let countryCode = typeof window !== 'undefined' 
      ? sessionStorage.getItem('4andone_country_code') || '' 
      : '';

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

    // Insert into track_plays table with event_type = 'kofi_click'
    // style stores the button source ('pill', 'sidebar', 'modal_external')
    // bpm stores the 2-letter country code ('GE', 'US', etc.)
    await supabase.from('track_plays').insert({
      track_id: 'kofi_button',
      user_ref: userRef,
      session_id: sessionId,
      style: source,
      bpm: countryCode,
      duration_seconds: 0,
      event_type: 'kofi_click',
    });
  } catch (err) {
    console.warn('[TRACKING] Error logging Kofi click:', err);
  }
}
