import { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: [
        '/',
        '/music/',
        '/cha-cha-cha',
        '/samba',
        '/rumba',
        '/jive',
        '/paso-doble',
        '/slow-waltz',
        '/tango',
        '/viennese-waltz',
        '/slow-foxtrot',
        '/quickstep',
        '/album/',
        '/library/',
        '/search',
      ],
      disallow: [
        '/admin/',
        '/sa-login',
        '/api/',
      ],
    },
    sitemap: 'https://4and.one/sitemap.xml',
  };
}
