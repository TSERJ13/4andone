import type { NextConfig } from "next";
// @ts-ignore
import withPWAInit from 'next-pwa';

// @ts-ignore
const defaultCache = require('next-pwa/cache');

const withPWA = withPWAInit({
  dest: 'public',
  disable: process.env.NODE_ENV === 'development',
  register: true,
  skipWaiting: true,
  buildExcludes: [/.*\.css$/],
  publicExcludes: ['!**/*'],
  fallbacks: {
    document: '/_offline',
  },
  runtimeCaching: [
    {
      urlPattern: ({ request }: { request: Request }) => request.mode === 'navigate',
      handler: 'NetworkFirst',
      options: {
        cacheName: 'start-url',
        plugins: [
          {
            handlerDidError: async () => {
              return (await caches.match('/_offline')) || (await caches.match('/')) || Response.error();
            },
          },
        ],
      },
    },
    ...defaultCache.filter(
      (entry: { options?: { cacheName?: string } }) =>
        !['static-style-assets', 'cross-origin', 'apis', 'start-url'].includes(entry.options?.cacheName ?? '')
    ),
  ],
});

const nextConfig: NextConfig = {
  /* config options here */
};

export default withPWA(nextConfig);
