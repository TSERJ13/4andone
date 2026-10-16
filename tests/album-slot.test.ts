import { describe, expect, it } from 'vitest';
import { albumOriginalSlot, slotForIndex } from '../src/utils/albumSlot';

const tr = (album: string, createdAt: string, globalOrder: number, tags: string[] = []) => ({ album, createdAt, globalOrder, tags });

describe('albumOriginalSlot', () => {
  const tracks = [
    tr('Rose\'s Band', '2026-03-01T10:00:00Z', -30),
    tr('Rose\'s Band', '2026-03-05T10:00:00Z', -10),
    tr('Other', '2026-09-01T10:00:00Z', -90),
    { album: 'Mixed', tags: ["Rose's Band"], createdAt: '2026-02-01T00:00:00Z', globalOrder: 5 },
  ];
  it('uses the newest existing track of the album (found by album name or tag), ignoring other albums', () => {
    const s = albumOriginalSlot(tracks, { title: "Rose's Band" })!;
    expect(s.createdAt).toBe('2026-03-05T10:00:00.000Z');
    expect(s.date).toBe('2026-03-05');
    expect(s.order).toBe(5);
    expect(s.trackCount).toBe(3);
  });
  it('is null for an album with no tracks or no usable dates', () => {
    expect(albumOriginalSlot(tracks, { title: 'Brand New' })).toBeNull();
    expect(albumOriginalSlot([{ album: 'X' }], { title: 'X' })).toBeNull();
  });
  it('keeps a batch in order, all dated at the album time (never in the future of it by more than seconds)', () => {
    const s = albumOriginalSlot(tracks, { title: "Rose's Band" })!;
    const a = slotForIndex(s, 0), b = slotForIndex(s, 1);
    expect(new Date(b.createdAt).getTime()).toBeGreaterThan(new Date(a.createdAt).getTime());
    expect(b.globalOrder).toBe(a.globalOrder + 1);
    expect(a.date).toBe('2026-03-05');
    expect(new Date(b.createdAt).getTime() - new Date(s.createdAt).getTime()).toBeLessThan(60_000);
  });
});
