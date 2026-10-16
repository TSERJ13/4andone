// Admin → "Telegram Bot → Inquiries": which contact messages are new on this device.
export const INQUIRIES_SEEN_KEY = '4andone_admin_inquiries_seen_at';
export const INQUIRIES_SEEN_EVENT = '4andone_admin_inquiries_seen';

/** The admin looked at the inquiries: everything up to now is "seen". */
export const markInquiriesSeen = (at: string = new Date().toISOString()) => {
  try { localStorage.setItem(INQUIRIES_SEEN_KEY, at); } catch { /* ignore */ }
  try { window.dispatchEvent(new Event(INQUIRIES_SEEN_EVENT)); } catch { /* ignore */ }
};
