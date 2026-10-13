/** Only media objects may be retrieved with public signing/streaming endpoints.
 * The same bucket also contains private _system OAuth credentials.
 */
export function isPublicMediaKey(key: unknown): key is string {
  if (typeof key !== 'string' || !key || key.length > 1024 || /[\\\x00-\x1f%?#]/.test(key)) return false;
  if (key.split('/').some(part => !part || part.startsWith('.') || part.startsWith('_'))) return false;
  return /\.(mp3|mpa|m4a|aac|wav|flac|ogg|opus|mp4|webm|jpg|jpeg|png|webp|gif|avif)$/i.test(key);
}
