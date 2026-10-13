export const escapeHtml = (text: string): string => text.replace(/[&<>"']/g, ch => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
}[ch]!));

/** Escape first, then restore only a tiny, attribute-free formatting allowlist.
 * User names and arbitrary HTML can never create scriptable preview elements.
 */
export function telegramPreviewHtml(message: string): string {
  return escapeHtml(message)
    .replace(/&lt;(\/?)(b|strong|i|em|u|s|code|pre|tg-spoiler)&gt;/gi, (_, slash, tag: string) =>
      `<${slash}${tag.toLowerCase() === 'tg-spoiler' ? 'span' : tag.toLowerCase()}>`)
    .replace(/\n/g, '<br/>');
}
