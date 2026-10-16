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
    const s = albumOriginalSlot(tracks, { slug: 'roses-band', title: "Rose's Band" })!;
    expect(s.createdAt).toBe('2026-03-05T10:00:00.000Z');
    expect(s.date).toBe('2026-03-05');
    expect(s.order).toBe(5);
    expect(s.trackCount).toBe(3);
  });
  it('finds an album\'s tracks the way the album page does: by artist or by the album\'s own tags', () => {
    const empress = { slug: 'empress-orchestra', title: 'Empress Orchestra', artist: 'Empress Orchestra', tags: ['empress orchestra big band'] };
    const list = [
      { artist: 'The Empress Orchestra Big Band', album: '', tags: [], createdAt: '2026-05-01T00:00:00Z', globalOrder: 7 },
      { artist: 'Someone', album: '', tags: ['Empress Orchestra Big Band'], createdAt: '2026-06-01T00:00:00Z', globalOrder: 9 },
      { artist: 'Unrelated', album: 'Other', tags: [], createdAt: '2026-08-01T00:00:00Z', globalOrder: 1 },
    ];
    const s = albumOriginalSlot(list, empress)!;
    expect(s.trackCount).toBe(2);
    expect(s.date).toBe('2026-06-01');
    expect(s.order).toBe(9);
  });
  it('a new track joins the list of its own dance style inside the album', () => {
    const rose = { slug: 'roses-band', title: "Rose's Band" };
    const list = [
      { album: "Rose's Band", style: 'Cha-Cha-Cha', createdAt: '2026-03-01T00:00:00Z', globalOrder: 10 },
      { album: "Rose's Band", style: 'Cha-Cha-Cha', createdAt: '2026-03-02T00:00:00Z', globalOrder: 20 },
      { album: "Rose's Band", style: 'Rumba', createdAt: '2026-04-01T00:00:00Z', globalOrder: 90 },
    ];
    const cha = albumOriginalSlot(list, rose, 'cha-cha-cha')!;
    expect(cha.date).toBe('2026-03-02');
    expect(cha.order).toBe(20);
    expect(cha.trackCount).toBe(2);
    expect(cha.sameStyle).toBe(true);
    const jive = albumOriginalSlot(list, rose, 'Jive')!; // no Jive yet: falls back to the whole album
    expect(jive.sameStyle).toBe(false);
    expect(jive.order).toBe(90);
  });
  it('is null for an album with no tracks or no usable dates', () => {
    expect(albumOriginalSlot(tracks, { slug: 'brand-new', title: 'Brand New' })).toBeNull();
    expect(albumOriginalSlot([{ album: 'X' }], { slug: 'x', title: 'X' })).toBeNull();
  });
  it('keeps a batch in order, all dated at the album time (never in the future of it by more than seconds)', () => {
    const s = albumOriginalSlot(tracks, { slug: 'roses-band', title: "Rose's Band" })!;
    const a = slotForIndex(s, 0), b = slotForIndex(s, 1);
    expect(new Date(b.createdAt).getTime()).toBeGreaterThan(new Date(a.createdAt).getTime());
    expect(b.globalOrder).toBe(a.globalOrder + 1);
    expect(a.date).toBe('2026-03-05');
    expect(new Date(b.createdAt).getTime() - new Date(s.createdAt).getTime()).toBeLessThan(60_000);
  });
});
