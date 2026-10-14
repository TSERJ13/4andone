// Default-off, device-local test; it never grants login or Premium privileges.
export const RENDERED_FINAL_TEST_KEY = '4andone-rendered-final-test-v1';
let memoryExpiry = 0;
export function isRenderedFinalTestEnabled(): boolean {
  if (typeof window === 'undefined') return false;
  const requested = new URLSearchParams(window.location.search).get('finalsRender');
  let expiry = memoryExpiry;
  try { expiry = Number(localStorage.getItem(RENDERED_FINAL_TEST_KEY)) || 0; } catch { /* blocked storage */ }
  if (requested === '0') expiry = 0;
  else if (requested === '1' && expiry <= Date.now()) expiry = Date.now() + 2 * 60 * 60 * 1000;
  if (!Number.isFinite(expiry) || expiry > Date.now() + 2 * 60 * 60 * 1000) expiry = 0;
  memoryExpiry = expiry;
  try {
    if (expiry > Date.now()) localStorage.setItem(RENDERED_FINAL_TEST_KEY, String(expiry));
    else localStorage.removeItem(RENDERED_FINAL_TEST_KEY);
  } catch { /* same-page memory still works */ }
  return expiry > Date.now();
}
export function disableRenderedFinalTest(): void {
  memoryExpiry = 0;
  try { localStorage.removeItem(RENDERED_FINAL_TEST_KEY); localStorage.removeItem('4andone-ios-final-test-v2'); } catch { /* unavailable */ }
  const url = new URL(window.location.href);
  url.searchParams.set('finalsRender', '0');
  url.searchParams.set('iosFinalNative', '0');
  window.location.assign(url.toString());
}
