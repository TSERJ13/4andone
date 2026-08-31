import { MetadataRoute } from 'next';
import { supabase } from '@/utils/supabase';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = 'https://4and.one';

  const staticRoutes = [
    '',
    '/search',
    '/library',
    '/library/finals',
    '/library/favorites',
    '/album/goc-2026',
    '/album/dance-star-band',
    '/style/samba',
    '/style/cha-cha-cha',
    '/style/rumba',
    '/style/paso-doble',
    '/style/jive',
    '/style/waltz',
    '/style/tango',
    '/style/viennese-waltz',
    '/style/slow-foxtrot',
    '/style/quickstep',
  ];

  const entries: MetadataRoute.Sitemap = staticRoutes.map((route) => ({
    url: `${baseUrl}${route}`,
    lastModified: new Date(),
    changeFrequency: route === '' ? 'daily' : 'weekly',
    priority: route === '' ? 1.0 : 0.8,
  }));

  try {
    const { data: tracks } = await supabase
      .from('tracks')
      .select('id, date')
      .not('is_closed', 'eq', true);

    if (tracks && tracks.length > 0) {
      tracks.forEach((track) => {
        entries.push({
          url: `${baseUrl}/track/${track.id}`,
          lastModified: track.date ? new Date(track.date) : new Date(),
          changeFrequency: 'monthly',
          priority: 0.7,
        });
      });
    }
  } catch (e) {
    console.error('[SITEMAP-ERROR] Failed to fetch dynamic tracks for sitemap:', e);
  }

  return entries;
}
