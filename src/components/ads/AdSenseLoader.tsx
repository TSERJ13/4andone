"use client";

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';

const ADSENSE_SRC = 'https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-2697205988789699';

// Pages where Google must never show ads (incl. Auto ads / vignettes).
const NO_ADS_PREFIXES = ['/admin', '/sa-login', '/embed'];

/**
 * Loads the AdSense script only for free users on public pages.
 * It used to sit in <head> on every page, so Google's Auto ads (vignette)
 * also appeared on the admin login and for Premium (ad-free) users.
 */
export default function AdSenseLoader() {
  const pathname = usePathname() || '/';
  const { isPremium, isLoading } = useAuth();
  const excluded = NO_ADS_PREFIXES.some((p) => pathname === p || pathname.startsWith(p + '/'));

  useEffect(() => {
    if (isLoading || isPremium || excluded) return;
    // Already added? (match by src — AdSense rejects unknown attributes on its tag)
    if (document.querySelector('script[src*="adsbygoogle.js"]')) return;
    const s = document.createElement('script');
    s.async = true;
    s.src = ADSENSE_SRC;
    s.crossOrigin = 'anonymous';
    document.head.appendChild(s);
  }, [isLoading, isPremium, excluded]);

  return null;
}
