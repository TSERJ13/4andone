"use client";

import React, { useState } from 'react';
import { useStudio } from '@/components/admin/StudioProvider';
import { useAudioControls } from '@/components/audio/AudioProvider';
import YtFilterChips from './YtFilterChips';
import YtQuickPicks from './YtQuickPicks';
import YtShelf, { YtShelfItem } from './YtShelf';

const CATEGORIES = [
  { id: 'all', name: 'All' },
  { id: 'samba', name: 'Samba' },
  { id: 'cha-cha-cha', name: 'Cha-Cha-Cha' },
  { id: 'rumba', name: 'Rumba' },
  { id: 'paso-doble', name: 'Paso Doble' },
  { id: 'jive', name: 'Jive' },
  { id: 'slow-waltz', name: 'Slow Waltz' },
  { id: 'tango', name: 'Tango' },
  { id: 'viennese-waltz', name: 'Viennese Waltz' },
  { id: 'quickstep', name: 'Quickstep' },
  { id: 'finals', name: 'Finals' },
];

export default function YtHomePageContent() {
  const { tracks, albums, styles } = useStudio();
  const { loadTrack } = useAudioControls();

  const [activeCategory, setActiveCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Filter tracks by category or search query
  const filteredTracks = tracks.filter((t) => {
    const matchesSearch =
      !searchQuery ||
      t.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (t.artist || '').toLowerCase().includes(searchQuery.toLowerCase());

    const matchesCategory =
      activeCategory === 'all' ||
      (t.style || '').toLowerCase().replace(/\s+/g, '-') === activeCategory;

    return matchesSearch && matchesCategory;
  });

  // Prepare Album Shelf Items
  const albumShelfItems: YtShelfItem[] = albums.map((alb) => ({
    id: alb.id,
    title: alb.title,
    subtitle: `Album • ${alb.artist || '4ANDONE'}`,
    imageUrl: alb.coverUrl || '/logo-square.jpg',
    href: `/album/${alb.slug}`,
  }));

  const getStyleCover = (st: any): string => {
    if (st.imageUrl && st.imageUrl !== '/logo-square.jpg') return st.imageUrl;
    const title = (st.title || '').toLowerCase().trim();
    if (title.includes('cha')) return '/styles/cha-cha-cha.jpg';
    if (title.includes('samba')) return '/styles/samba.jpg';
    if (title.includes('rumba')) return '/styles/rumba.jpg';
    if (title.includes('paso')) return '/styles/paso-doble.jpg';
    if (title.includes('jive')) return '/styles/jive.jpg';
    if (title.includes('v') && title.includes('waltz')) return '/styles/viennese-waltz.jpg';
    if (title.includes('viennese')) return '/styles/viennese-waltz.jpg';
    if (title.includes('slow') && title.includes('waltz')) return '/styles/slow-waltz.jpg';
    if (title.includes('waltz')) return '/styles/slow-waltz.jpg';
    if (title.includes('foxtrot') || title.includes('fox')) return '/styles/slow-foxtrot.jpg';
    if (title.includes('quick')) return '/styles/quickstep.jpg';
    if (title.includes('tango')) return '/styles/tango.jpg';
    if (title.includes('fitness')) return '/styles/fitness.jpg';
    return '/logo-square.jpg';
  };

  // Prepare Styles Shelf Items
  const styleShelfItems: YtShelfItem[] = styles.map((st) => ({
    id: st.id,
    title: st.title,
    subtitle: `Playlist • 4ANDONE`,
    imageUrl: getStyleCover(st),
    href: `/style/${(st as any).slug || st.title.toLowerCase().replace(/[\s\-_]+/g, '-')}`,
  }));

  const handlePlayAll = () => {
    if (filteredTracks.length > 0) {
      loadTrack(filteredTracks[0]);
    }
  };

  return (
    <div className="yt-home-content-wrap">
      {/* Top Category Filter Chips */}
      <YtFilterChips
        categories={CATEGORIES}
        activeCategory={activeCategory}
        onSelectCategory={setActiveCategory}
      />

      {/* Quick Picks Section (Mobile 3x3 Grid / Desktop 3-column rows) */}
      <YtQuickPicks tracks={filteredTracks} onPlayAll={handlePlayAll} />

      {/* Albums Shelf */}
      {albumShelfItems.length > 0 && (
        <YtShelf
          title="Albums for you"
          subtitle="Popular albums and collections"
          items={albumShelfItems}
          aspectRatio="square"
        />
      )}

      {/* Dance Styles Shelf */}
      {styleShelfItems.length > 0 && (
        <YtShelf
          title="Dance Categories"
          subtitle="Latin & Standard playlists for dancers"
          items={styleShelfItems}
          aspectRatio="wide"
        />
      )}
    </div>
  );
}
