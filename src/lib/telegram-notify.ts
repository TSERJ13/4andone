import 'server-only';
import { botTokenEntries } from '@/lib/user-session';

/**
 * Sends one Telegram message from the site's bot(s). Best effort: it NEVER throws and gives up after a few seconds,
 * so a Telegram problem can't break whatever the user was doing (a purchase, for example).
 * A bot can only write to people who pressed Start in it, so each configured bot is tried until one delivers.
 */
export async function notifyTelegramUser(chatId: number, text: string): Promise<boolean> {
  const seen = new Set<string>();
  for (const { token } of botTokenEntries()) {
    if (seen.has(token)) continue;
    seen.add(token);
    try {
      const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ chat_id: chatId, text, parse_mode: 'HTML', disable_web_page_preview: true }),
        signal: AbortSignal.timeout(4000),
      });
      const data = await res.json().catch(() => null);
      if (data?.ok) return true;
    } catch { /* try the next bot */ }
  }
  return false;
}

/** Short thank-you for a new paid Premium subscriber (Georgian + English). */
export const PREMIUM_THANK_YOU =
  '🎉 <b>გმადლობთ, რომ გამოიწერეთ 4and.one Premium!</b>\n' +
  'ახლა გაქვთ რეკლამის გარეშე მოსმენა და Final Mode-ის სრული წვდომა. წარმატებულ ვარჯიშს გისურვებთ! 💃🕺\n\n' +
  '<i>Thank you for subscribing to 4and.one Premium — enjoy ad-free music and full Final Mode. Happy dancing!</i>';
