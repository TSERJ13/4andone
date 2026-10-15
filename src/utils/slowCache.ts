/**
 * Slowed tracks are never stored: every stretch is made on the spot and thrown away afterwards. Earlier versions
 * kept prepared copies in the browser's Cache Storage (and a small index in localStorage); this removes them once.
 */
const CACHE_NAME = '4andone-slow-v1';
const INDEX_KEY = '4andone-slow-index-v1';

export async function purgeSlowCache(): Promise<void> {
  try { localStorage.removeItem(INDEX_KEY); } catch { /* storage blocked */ }
  try { if (typeof caches !== 'undefined') await caches.delete(CACHE_NAME); } catch { /* nothing to delete */ }
}
