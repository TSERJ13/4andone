// The listener's server session (signed by /api/user/session), kept on this
// device and sent as a header. The httpOnly cookie alone was not enough:
// Telegram's in-app views and iframes often don't send cookies, so the
// account history came back empty there.

const KEY = '4andone_session_token';
export const SESSION_HEADER = 'x-4a-session';

export const saveSessionToken = (token: string | null | undefined) => {
  try {
    if (token) localStorage.setItem(KEY, token);
    else localStorage.removeItem(KEY);
  } catch { /* ignore */ }
};

const readSessionToken = () => {
  try { return localStorage.getItem(KEY); } catch { return null; }
};

/** fetch() with the session header (and the cookie, same-origin). */
export const sessionFetch = (input: string, init: RequestInit = {}) => {
  const token = readSessionToken();
  const headers = new Headers(init.headers);
  if (token) headers.set(SESSION_HEADER, token);
  return fetch(input, { ...init, headers, credentials: 'same-origin' });
};
