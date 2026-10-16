/** Only media objects may be retrieved with public signing/streaming endpoints.
 * The same bucket also contains private _system OAuth credentials.
 */
export function isPublicMediaKey(key: unknown): key is string {
  if (typeof key !== 'string' || !key || key.length > 1024 || /[\\\x00-\x1f%?#]/.test(key)) return false;
  if (key.split('/').some(part => !part || part.startsWith('.') || part.startsWith('_'))) return false;
  return /\.(mp3|mpa|m4a|aac|wav|flac|ogg|opus|mp4|webm|jpg|jpeg|png|webp|gif|avif)$/i.test(key);
}

/**
 * Converts direct private R2 bucket URLs (https://pub-...r2.dev/<key>)
 * into the public streaming proxy path (/api/media/<key>) so browser <img> tags can load them.
 */
export function normalizeMediaUrl(url?: string | null): string {
  if (!url) return '';
  const trimmed = url.trim();
  const r2Match = /^https?:\/\/[^/]+\.r2\.dev\/(.+)$/i.exec(trimmed);
  if (r2Match && r2Match[1]) {
    const key = decodeURIComponent(r2Match[1].split('?')[0]);
    if (isPublicMediaKey(key)) {
      return `/api/media/${encodeURIComponent(key)}`;
    }
  }
  return trimmed;
}

