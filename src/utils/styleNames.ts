// Short display names for dance styles (cards, badges). Data/URLs keep the full name.
const SHORT_NAMES: Record<string, string> = {
  'cha-cha-cha': 'Cha-Cha-Cha',
  'cha cha cha': 'Cha-Cha-Cha',
  'chacha': 'Cha-Cha-Cha',
  'viennese waltz': 'V. Waltz',
  'slow foxtrot': 'S. Foxtrot',
  'slow waltz': 'S. Waltz',
};

export const displayStyleName = (name?: string | null): string => {
  if (!name) return '';
  return SHORT_NAMES[name.trim().toLowerCase()] || name;
};
