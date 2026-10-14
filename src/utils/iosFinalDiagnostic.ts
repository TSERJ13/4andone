// Device-local, explicitly enabled audio-route experiment. Not an entitlement.
export const IOS_FINAL_TEST_KEY = '4andone-ios-final-test-v2';
export const IOS_FINAL_TEST_TTL = 2 * 60 * 60 * 1000;

type Preference = { enabled: true; expiresAt: number };

/** Pure resolver: navigation without the parameter retains a recent opt-in. */
export function resolveNativeFinalTest(search: string, stored: string | null, now: number): Preference | null {
  let previous: Preference | null = null;
  try {
    const value = stored ? JSON.parse(stored) : null;
    if (value?.enabled === true && Number.isFinite(value.expiresAt)
        && value.expiresAt > now && value.expiresAt <= now + IOS_FINAL_TEST_TTL) {
      previous = { enabled: true, expiresAt: value.expiresAt };
    }
  } catch { /* Corrupt preferences must not enable an experiment. */ }
  const requested = new URLSearchParams(search).get('iosFinalNative');
  if (requested === '0') return null;
  if (requested === '1') return previous ?? { enabled: true, expiresAt: now + IOS_FINAL_TEST_TTL };
  return previous;
}

// Used only when storage is unavailable; still survives client-side navigation.
let memoryPreference: string | null = null;

export function isNativeFinalTestEnabled(): boolean {
  if (typeof window === 'undefined') return false;
  let stored = memoryPreference;
  try { stored = window.localStorage.getItem(IOS_FINAL_TEST_KEY); } catch { /* private/blocked storage */ }
  const value = resolveNativeFinalTest(window.location.search, stored, Date.now());
  const next = value ? JSON.stringify(value) : null;
  memoryPreference = next;
  if (next !== stored) {
    try {
      if (next) window.localStorage.setItem(IOS_FINAL_TEST_KEY, next);
      else window.localStorage.removeItem(IOS_FINAL_TEST_KEY);
    } catch { /* Keep this page's in-memory preference instead. */ }
  }
  return value !== null;
}

export function disableNativeFinalTest(): void {
  memoryPreference = null;
  if (typeof window === 'undefined') return;
  try { window.localStorage.removeItem(IOS_FINAL_TEST_KEY); } catch { /* unavailable */ }
  const url = new URL(window.location.href);
  url.searchParams.set('iosFinalNative', '0');
  // A full reload also disposes every media element/context from the test.
  window.location.assign(url.toString());
}
