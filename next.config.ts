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
  // Removed from the default runtime caching:
  //  * 'cross-origin' — routed EVERY cross-origin request through the service
  //    worker with NetworkFirst + a 10s timeout: the R2 audio streams (range
  //    requests → stutter / failed playback on Safari), AdSense requests and
  //    Supabase API calls. The browser now handles them natively.
  //  * 'apis' — cached /api/* for 24h, so on a slow network the player could
  //    get an old, expired signed audio URL from the cache → track won't play.
  //  * 'static-style-assets' — see buildExcludes.
  runtimeCaching: defaultCache.filter(
    (entry: { options?: { cacheName?: string } }) =>
      !['static-style-assets', 'cross-origin', 'apis'].includes(entry.options?.cacheName ?? '')
  ),
});

const nextConfig: NextConfig = {
  /* config options here */
};

export default withPWA(nextConfig);
