import type { RenderedFinalAudio } from './renderFinalAudio';

/**
 * Prepared slowed tracks (ordinary listening on iPhone/iPad). A track that was already prepared at a speed starts
 * immediately next time: kept in memory (last 3) and in the browser's Cache Storage (last 6, oldest dropped first).
 */
const CACHE_NAME = '4andone-slow-v1';
const INDEX_KEY = '4andone-slow-index-v1';
const MAX_DISK = 6;
const MAX_MEMORY = 3;
const memory = new Map<string, RenderedFinalAudio>();

export function slowKey(trackId: unknown, audioUrl: unknown, percent: number): string {
  const path = String(audioUrl ?? '').split('?')[0]; // signed URLs change; the file does not
  return `${String(trackId)}|${path}|${Math.round(percent * 10)}`;
}

function request(key: string): Request {
  return new Request(`${location.origin}/__slow-cache/${encodeURIComponent(key)}`);
}
function readIndex(): string[] {
  try { const v = JSON.parse(localStorage.getItem(INDEX_KEY) || '[]'); return Array.isArray(v) ? v : []; } catch { return []; }
}
function writeIndex(keys: string[]): void { try { localStorage.setItem(INDEX_KEY, JSON.stringify(keys)); } catch { /* storage blocked */ } }
function remember(key: string, prepared: RenderedFinalAudio): void {
  memory.delete(key);
  memory.set(key, prepared);
  while (memory.size > MAX_MEMORY) memory.delete(memory.keys().next().value as string);
}

export async function getSlow(key: string): Promise<RenderedFinalAudio | null> {
  const hit = memory.get(key);
  if (hit) { remember(key, hit); return hit; }
  try {
    if (typeof caches === 'undefined') return null;
    const cache = await caches.open(CACHE_NAME);
    const response = await cache.match(request(key));
    if (!response) return null;
    const meta = JSON.parse(response.headers.get('x-slow-meta') || 'null');
    const blob = await response.blob();
    if (!meta || !(blob.size > 44)) return null;
    const prepared: RenderedFinalAudio = { ...meta, blob };
    remember(key, prepared);
    writeIndex([...readIndex().filter(k => k !== key), key]); // most recently used last
    return prepared;
  } catch { return null; }
}

export async function putSlow(key: string, prepared: RenderedFinalAudio): Promise<void> {
  remember(key, prepared);
  try {
    if (typeof caches === 'undefined') return;
    const cache = await caches.open(CACHE_NAME);
    const { blob, ...meta } = prepared;
    await cache.put(request(key), new Response(blob, { headers: { 'content-type': 'audio/wav', 'x-slow-meta': JSON.stringify(meta) } }));
    const keys = [...readIndex().filter(k => k !== key), key];
    while (keys.length > MAX_DISK) { const old = keys.shift()!; await cache.delete(request(old)); }
    writeIndex(keys);
  } catch { /* quota / private mode: memory cache still works */ }
}
