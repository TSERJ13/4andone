/** Respect the platform's volume capability. Native iOS music must not be
 * poked by the Finals monitoring loop to simulate an unsupported fade.
 * On writable platforms, avoid sending an unchanged volume on every tick.
 * This controls volume only; it neither measures nor corrects audio pitch.
 */
export function setElementVolume(audio: HTMLMediaElement, requested: number, writable: boolean): void {
  if (!writable || !Number.isFinite(requested)) return;
  const next = Math.max(0, Math.min(1, requested));
  if (Math.abs(audio.volume - next) > 0.000001) audio.volume = next;
}
