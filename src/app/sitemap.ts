import { MetadataRoute } from 'next';

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = 'https://4and.one';

  const staticRoutes = [
    '',
    '/search',
    '/library',
    '/library/finals',
    '/library/favorites',
    '/album/goc-2026',
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

  return staticRoutes.map((route) => ({
    url: `${baseUrl}${route}`,
    lastModified: new Date(),
    changeFrequency: route === '' ? 'daily' : 'weekly',
    priority: route === '' ? 1.0 : 0.8,
  }));
}
