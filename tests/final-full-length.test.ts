import { describe, it, expect } from 'vitest';
import { fullLengthForFinal } from '@/utils/finals';

const t = (id: string, duration?: number) => ({ id, duration });

describe('fullLengthForFinal', () => {
  it('drops tracks shorter than a Final dance (1:45)', () => {
    expect(fullLengthForFinal([t('short', 88), t('edge', 105), t('long', 150)]).map(x => x.id)).toEqual(['edge', 'long']);
  });
  it('keeps tracks whose length is unknown', () => {
    expect(fullLengthForFinal([t('a', 0), t('b'), t('short', 90)]).map(x => x.id)).toEqual(['a', 'b']);
  });
  it('never empties a dance: with only short tracks the whole pool stays', () => {
    expect(fullLengthForFinal([t('s1', 80), t('s2', 100)]).map(x => x.id)).toEqual(['s1', 's2']);
  });
});
