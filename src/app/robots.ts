import { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/admin/', '/sa-login/'],
    },
    sitemap: 'https://4and.one/sitemap.xml',
  };
}
