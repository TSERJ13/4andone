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
  runtimeCaching: defaultCache.filter(
    (entry: { options?: { cacheName?: string } }) =>
      entry.options?.cacheName !== 'static-style-assets'
  ),
});

const nextConfig: NextConfig = {
  /* config options here */
};

export default withPWA(nextConfig);
