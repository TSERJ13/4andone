import { describe, it, expect } from 'vitest';
import { queueFromContext, orderByStyles } from '@/utils/playQueue';

const t = (id: string, style: string) => ({ id, style });
const library = [t('s1', 'Samba'), t('s2', 'Samba'), t('r1', 'Rumba'), t('j1', 'Jive')];

describe('queueFromContext', () => {
  it('follows the list the song was started from', () => {
    const list = [library[2], library[0], library[3]];
    expect(queueFromContext(list, library, library[0], null).map(x => x.id)).toEqual(['r1', 's1', 'j1']);
  });
  it('falls back to the dance when there is no list or the song is not in it', () => {
    expect(queueFromContext(null, library, library[0], null).every(x => x.style === 'Samba')).toBe(true);
    expect(queueFromContext([library[2], library[3]], library, library[0], null).every(x => x.style === 'Samba')).toBe(true);
  });
  it('keeps the same songs under shuffle', () => {
    const out = queueFromContext(library, library, library[0], 7);
    expect(out.map(x => x.id).sort()).toEqual(['j1', 'r1', 's1', 's2']);
  });
});

describe('orderByStyles', () => {
  it('orders an album by its dances', () => {
    expect(orderByStyles(library, ['Jive', 'Samba']).map(x => x.id)).toEqual(['j1', 's1', 's2']);
  });
});
