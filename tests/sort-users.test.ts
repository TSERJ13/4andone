import { describe, expect, it } from 'vitest';
import { sortUsers } from '../src/utils/sortUsers';

const u = (first_name: string, extra: Record<string, unknown> = {}) => ({ first_name, ...extra });

describe('sortUsers', () => {
  const list = [
    u('Mariam', { last_seen: '2026-10-10', first_seen: '2026-01-01', visit_count: 5 }),
    u('anna', { last_seen: '2026-10-15', first_seen: '2026-03-01', visit_count: 20 }),
    u('', { username: 'zed', last_seen: '2026-10-12', first_seen: '2026-02-01', visit_count: 1 }),
    u('', { last_seen: '2026-10-01', first_seen: '2026-04-01', visit_count: 9 }),
    u('Борис', { last_seen: '2026-10-11', first_seen: '2026-05-01', visit_count: 3 }),
  ];
  const names = (l: typeof list) => l.map(x => x.first_name || x.username || '—');

  it('alphabetical ignores case, falls back to username, and puts nameless people last', () => {
    expect(names(sortUsers(list, 'name_az')).slice(0, 3)).toEqual(['anna', 'Mariam', 'zed'].filter(Boolean).length ? ['anna', 'Mariam', 'zed'] : []);
    expect(names(sortUsers(list, 'name_az')).pop()).toBe('—');
    expect(names(sortUsers(list, 'name_za')).pop()).toBe('—');
  });
  it('sorts by time', () => {
    expect(sortUsers(list, 'recent')[0].first_name).toBe('anna');
    expect(sortUsers(list, 'joined_old')[0].first_name).toBe('Mariam');
    expect(sortUsers(list, 'joined_new')[0].first_seen).toBe('2026-05-01');
  });
  it('sorts by visits and does not change the original list', () => {
    const copy = [...list];
    expect(sortUsers(list, 'visits')[0].first_name).toBe('anna');
    expect(list).toEqual(copy);
  });
});
