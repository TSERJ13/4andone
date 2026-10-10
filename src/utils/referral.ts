// Invite links: https://4and.one/?ref=CODE — the code is kept on this device
// until the visitor signs in, then it is sent to /api/referral/claim.

export const REF_PENDING_KEY = '4andone_ref_pending';
export const REF_RESULT_EVENT = '4andone_referral_result';

export const inviteLink = (code: string) =>
  `${typeof window !== 'undefined' ? window.location.origin : 'https://4and.one'}/?ref=${encodeURIComponent(code)}`;

export const getPendingRef = (): string | null => {
  try { return localStorage.getItem(REF_PENDING_KEY); } catch { return null; }
};
export const clearPendingRef = () => {
  try { localStorage.removeItem(REF_PENDING_KEY); } catch { /* ignore */ }
};

/** Reads ?ref= from the address bar, remembers it and removes it from the URL. */
export const captureRefFromUrl = (): string | null => {
  if (typeof window === 'undefined') return null;
  const url = new URL(window.location.href);
  const raw = url.searchParams.get('ref');
  if (!raw || !/^[A-Za-z0-9]{6,12}$/.test(raw)) return null;
  const code = raw.toUpperCase();
  try { localStorage.setItem(REF_PENDING_KEY, code); } catch { /* ignore */ }
  url.searchParams.delete('ref');
  window.history.replaceState(window.history.state, '', url.pathname + url.search + url.hash);
  return code;
};
