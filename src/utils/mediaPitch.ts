type PitchMedia = HTMLMediaElement & { webkitPreservesPitch?: boolean };

/** Request pitch preservation only through APIs the engine actually exposes.
 * Assigning a missing property creates an expando that misleadingly reads true.
 * Readback is configuration evidence, never a measurement of rendered audio.
 */
export function requestPitchPreservation(audio: HTMLMediaElement): void {
  const media = audio as PitchMedia;
  if ('preservesPitch' in media) media.preservesPitch = true;
  if ('webkitPreservesPitch' in media) media.webkitPreservesPitch = true;
}

export function readPitchConfiguration(audio: HTMLMediaElement | null): 'ON' | 'OFF' | 'UNKNOWN' | 'MIXED' {
  if (!audio) return 'UNKNOWN';
  const media = audio as PitchMedia;
  const values = [media.preservesPitch, media.webkitPreservesPitch].filter(v => typeof v === 'boolean');
  if (!values.length) return 'UNKNOWN';
  if (values.every(v => v === true)) return 'ON';
  if (values.every(v => v === false)) return 'OFF';
  return 'MIXED';
}
