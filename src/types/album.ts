export interface Album {
  id: string;
  slug: string;
  title: string;
  artist: string;
  subtitle: string;
  description?: string;
  badge: string;
  coverUrl: string;
  themeColor: string;
  secondaryColor?: string;
  gradient?: string;
  program: 'Latin' | 'Standard' | 'Both';
  allowedStyles: string[];
  tags: string[];
  orderIndex: number;
  isPublished?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export const DEFAULT_ALBUMS: Album[] = [
  {
    id: 'album-georgie-musheev',
    slug: 'georgie-musheev',
    title: 'Georgie Musheev & 7 Winds',
    artist: 'Georgie Musheev & 7 Winds',
    subtitle: 'Exclusive Live Latin Dance Music. Dedicated Latin Final Mode practice with live band sounds.',
    description: 'Exclusive Live Latin Dance Music. Dedicated Latin Final Mode practice with live band sounds.',
    badge: 'LIVE SOUNDS COLLECTION',
    coverUrl: '/georgie-musheev.jpg',
    themeColor: '#e11d48',
    secondaryColor: '#be123c',
    gradient: 'linear-gradient(90deg, #e11d48, #be123c)',
    program: 'Latin',
    allowedStyles: ['Samba', 'Cha-Cha-Cha', 'Rumba', 'Paso Doble', 'Jive'],
    tags: ['musheev', '7 winds', 'seven winds', 'georgie musheev'],
    orderIndex: 0,
    isPublished: true,
  },
  {
    id: 'album-boris-myagkov',
    slug: 'boris-myagkov',
    title: 'Boris Myagkov Big Band',
    artist: 'Boris Myagkov Big Band',
    subtitle: 'Legendary Big Band Dance Music. Isolated collection with dedicated Latin & Standard Final Mode practice.',
    description: 'Legendary Big Band Dance Music. Isolated collection with dedicated Latin & Standard Final Mode practice.',
    badge: 'LIVE SOUNDS COLLECTION',
    coverUrl: '/boris-myagkov-big-band.jpg',
    themeColor: '#f59e0b',
    secondaryColor: '#d97706',
    gradient: 'linear-gradient(90deg, #f59e0b, #d97706)',
    program: 'Both',
    allowedStyles: ['Samba', 'Cha-Cha-Cha', 'Rumba', 'Paso Doble', 'Jive', 'Slow Waltz', 'Tango', 'Viennese Waltz', 'Slow Foxtrot', 'Quickstep'],
    tags: ['boris myagkov', 'myagkov'],
    orderIndex: 1,
    isPublished: true,
  },
  {
    id: 'album-roses-band',
    slug: 'roses-band',
    title: "Rose's Band",
    artist: "Rose's Band",
    subtitle: 'Exclusive Live Dance Band Sounds. Isolated collection with dedicated Latin & Standard Final Mode practice.',
    description: 'Exclusive Live Dance Band Sounds. Isolated collection with dedicated Latin & Standard Final Mode practice.',
    badge: 'LIVE SOUNDS COLLECTION',
    coverUrl: '/rosesband.jpg',
    themeColor: '#22c55e',
    secondaryColor: '#10b981',
    gradient: 'linear-gradient(90deg, #22c55e, #10b981)',
    program: 'Both',
    allowedStyles: ['Samba', 'Cha-Cha-Cha', 'Rumba', 'Paso Doble', 'Jive', 'Slow Waltz', 'Tango', 'Viennese Waltz', 'Slow Foxtrot', 'Quickstep'],
    tags: ["rose's band", 'roses band', 'rosesband'],
    orderIndex: 2,
    isPublished: true,
  },
  {
    id: 'album-dance-star-band',
    slug: 'dance-star-band',
    title: 'Dance Star Band',
    artist: 'Dance Star Band',
    subtitle: 'Exclusive Live Dance Band Sounds. Isolated collection with dedicated Latin & Standard Final Mode practice.',
    description: 'Exclusive Live Dance Band Sounds. Isolated collection with dedicated Latin & Standard Final Mode practice.',
    badge: 'LIVE SOUNDS COLLECTION',
    coverUrl: '/dancestar.jpg',
    themeColor: '#d946ef',
    secondaryColor: '#8b5cf6',
    gradient: 'linear-gradient(90deg, #d946ef, #8b5cf6)',
    program: 'Both',
    allowedStyles: ['Samba', 'Cha-Cha-Cha', 'Rumba', 'Paso Doble', 'Jive', 'Slow Waltz', 'Tango', 'Viennese Waltz', 'Slow Foxtrot', 'Quickstep'],
    tags: ['dance star band', 'dance star', 'dancestar'],
    orderIndex: 3,
    isPublished: true,
  },
  {
    id: 'album-goc-2026',
    slug: 'goc-2026',
    title: 'GOC Final 2026 Music',
    artist: 'German Open Championship',
    subtitle: 'Exclusive German Open Championship finals music. Isolated collection with dedicated Latin & Standard Final Mode practice.',
    description: 'Exclusive German Open Championship finals music. Isolated collection with dedicated Latin & Standard Final Mode practice.',
    badge: 'SPECIAL COLLECTION',
    coverUrl: '/goc2026.png',
    themeColor: '#eab308',
    secondaryColor: '#ca8a04',
    gradient: 'linear-gradient(90deg, #eab308, #ca8a04)',
    program: 'Both',
    allowedStyles: ['Samba', 'Cha-Cha-Cha', 'Rumba', 'Paso Doble', 'Jive', 'Slow Waltz', 'Tango', 'Viennese Waltz', 'Slow Foxtrot', 'Quickstep'],
    tags: ['goc 2026', 'goc', 'stuttgart'],
    orderIndex: 4,
    isPublished: true,
  },
];

