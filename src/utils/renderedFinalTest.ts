// Device-local switch; it never grants login or Premium privileges.
import { isNativeFinalTestEnabled } from './iosFinalDiagnostic';
export const RENDERED_FINAL_OPTOUT_KEY = '4andone-rendered-final-optout-v1';
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

function isAppleTouchDevice(): boolean {
  if (typeof navigator === 'undefined') return false;
  return /iPad|iPhone|iPod/.test(navigator.userAgent || '')
    || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
}

/** Rollout switch. On a real iPhone the old route (playbackRate + MediaElementSource/Gain
 * graph) crackled, while both the native element and rendered Finals
 * (?finalsRender=1) played clean — so rendered Finals is the default on
 * iPhone/iPad again. A stuck preparation times out and falls back to the old route.
 */
export const rolloutState = { defaultOnApple: true };

/** Behaviour switch for rendered Finals.
 * Opt-in (?finalsRender=1) unless rolloutState.defaultOnApple is set, in which
 * case iPhone/iPad use it by default. ?finalsRender=0 turns it off on this
 * device; the explicit native-audio diagnostic (?iosFinalNative=1) still wins.
 */
export const LIVE_FINAL_KEY = '4andone-live-final-test-v1';
/** Opt-in live engine for Finals (?finalsLive=1, stays on for 2 hours; ?finalsLive=0 turns it off). */
export function isLiveFinalEnabled(): boolean {
  if (typeof window === 'undefined') return false;
  const requested = new URLSearchParams(window.location.search).get('finalsLive');
  let expiry = 0;
  try { expiry = Number(localStorage.getItem(LIVE_FINAL_KEY)) || 0; } catch { /* blocked storage */ }
  if (requested === '0') expiry = 0;
  else if (requested === '1' && expiry <= Date.now()) expiry = Date.now() + 2 * 60 * 60 * 1000;
  if (!Number.isFinite(expiry) || expiry > Date.now() + 2 * 60 * 60 * 1000) expiry = 0;
  try {
    if (expiry > Date.now()) localStorage.setItem(LIVE_FINAL_KEY, String(expiry));
    else localStorage.removeItem(LIVE_FINAL_KEY);
  } catch { /* unavailable */ }
  return expiry > Date.now();
}

export function isRenderedFinalEnabled(): boolean {
  if (typeof window === 'undefined') return false;
  if (isLiveFinalEnabled()) return true;
  if (isRenderedFinalTestEnabled()) return true; // explicit ?finalsRender=1
  const requested = new URLSearchParams(window.location.search).get('finalsRender');
  let optedOut = false;
  try {
    if (requested === '0') localStorage.setItem(RENDERED_FINAL_OPTOUT_KEY, '1');
    if (requested === '1') localStorage.removeItem(RENDERED_FINAL_OPTOUT_KEY);
    optedOut = localStorage.getItem(RENDERED_FINAL_OPTOUT_KEY) === '1';
  } catch { optedOut = requested === '0'; }
  if (optedOut || requested === '0') return false;
  if (isNativeFinalTestEnabled()) return false;
  return rolloutState.defaultOnApple && isAppleTouchDevice();
}
