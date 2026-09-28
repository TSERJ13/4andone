import { MetadataRoute } from 'next';
import { fetchAllTracksForSeo } from '@/lib/seo-data';
import { buildTrackSlugMaps, DANCE_CATEGORIES } from '@/utils/seo';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = 'https://4and.one';

  // 1. Core Top-Level Routes
  const entries: MetadataRoute.Sitemap = [
    {
      url: baseUrl,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 1.0,
    },
    {
      url: `${baseUrl}/search`,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 0.7,
    },
    {
      url: `${baseUrl}/library`,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 0.7,
    },
    {
      url: `${baseUrl}/library/finals`,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 0.7,
    },
    // Curated Albums
    {
      url: `${baseUrl}/album/boris-myagkov`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.7,
    },
    {
      url: `${baseUrl}/album/georgie-musheev`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.7,
    },
    {
      url: `${baseUrl}/album/roses-band`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.7,
    },
    {
      url: `${baseUrl}/album/dance-star-band`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.7,
    },
    {
      url: `${baseUrl}/album/goc-2026`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.7,
    },
  ];

  // 2. Primary 10 DanceSport Category Pages
  DANCE_CATEGORIES.forEach((cat) => {
    entries.push({
      url: `${baseUrl}/${cat.slug}`,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 0.9,
    });
  });

  // 3. Dynamic Public Track Pages (/music/[slug])
  try {
    const allTracks = await fetchAllTracksForSeo();
    const { idToSlug } = buildTrackSlugMaps(allTracks);

    allTracks.forEach((track) => {
      const slug = idToSlug.get(track.id) || track.id;
      entries.push({
        url: `${baseUrl}/music/${slug}`,
        lastModified: track.date ? new Date(track.date) : new Date(),
        changeFrequency: 'monthly',
        priority: 0.8,
      });
    });
  } catch (err) {
    console.error('[SITEMAP-ERROR] Failed to generate dynamic tracks in sitemap:', err);
  }

  return entries;
}
