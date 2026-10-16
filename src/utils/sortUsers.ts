// Sorting for the admin user lists: by time (last active / joined) or alphabetically by name (first letter first).
export type UserSortKey = 'visits' | 'recent' | 'joined_new' | 'joined_old' | 'name_az' | 'name_za';

export const USER_SORT_OPTIONS: { key: UserSortKey; label: string }[] = [
  { key: 'visits', label: 'Most visits' },
  { key: 'recent', label: 'Recently active' },
  { key: 'joined_new', label: 'Newest joined' },
  { key: 'joined_old', label: 'Oldest joined' },
  { key: 'name_az', label: 'Name A → Z' },
  { key: 'name_za', label: 'Name Z → A' },
];

interface SortableUser {
  first_name?: string | null;
  last_name?: string | null;
  username?: string | null;
  first_seen?: string | null;
  last_seen?: string | null;
  visit_count?: number | null;
}

const time = (v?: string | null) => (v ? new Date(v).getTime() || 0 : 0);
const displayName = (u: SortableUser) => `${u.first_name || ''} ${u.last_name || ''}`.trim() || u.username || '';

/** Returns a sorted COPY. People without a name always go to the end of an alphabetical list. */
export function sortUsers<T extends SortableUser>(list: T[], key: UserSortKey): T[] {
  const byName = (a: T, b: T, dir: 1 | -1) => {
    const an = displayName(a), bn = displayName(b);
    if (!an && !bn) return 0;
    if (!an) return 1;
    if (!bn) return -1;
    return dir * an.localeCompare(bn, undefined, { sensitivity: 'base', numeric: true });
  };
  const out = [...list];
  switch (key) {
    case 'recent': return out.sort((a, b) => time(b.last_seen) - time(a.last_seen));
    case 'joined_new': return out.sort((a, b) => time(b.first_seen) - time(a.first_seen));
    case 'joined_old': return out.sort((a, b) => time(a.first_seen) - time(b.first_seen));
    case 'name_az': return out.sort((a, b) => byName(a, b, 1));
    case 'name_za': return out.sort((a, b) => byName(a, b, -1));
    default: return out.sort((a, b) => (b.visit_count || 0) - (a.visit_count || 0));
  }
}
