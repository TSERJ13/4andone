// Tiny on-screen event log for the explicit test mode (?finalsRender=1). Never used otherwise.
const lines: string[] = [];
const listeners = new Set<() => void>();
const t0 = typeof performance !== 'undefined' ? performance.now() : 0;
export function finalsDiag(message: string): void {
  const at = ((typeof performance !== 'undefined' ? performance.now() : 0) - t0) / 1000;
  lines.push(`${at.toFixed(1)}s ${message}`);
  if (lines.length > 40) lines.shift();
  listeners.forEach(l => l());
}
export function finalsDiagLines(): string[] { return lines.slice(-9); }
export function subscribeFinalsDiag(listener: () => void): () => void {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}
