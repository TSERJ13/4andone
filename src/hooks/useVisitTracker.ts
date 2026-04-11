"use client";

import { useEffect, useRef } from 'react';
import { supabase } from '@/utils/supabase';

async function getCountry(): Promise<{ code: string; name: string } | null> {
  try {
    const res = await fetch('https://ipapi.co/json/', { signal: AbortSignal.timeout(4000) });
    const data = await res.json();
    if (data?.country_code && data?.country_name) {
      return { code: data.country_code, name: data.country_name };
    }
  } catch {}
  return null;
}

export function useVisitTracker() {
  const visitIdRef = useRef<string | null>(null);
  const startTimeRef = useRef<number>(Date.now());

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const SESSION_KEY = '4andone_visit_id';
    const existingId = sessionStorage.getItem(SESSION_KEY);
    if (existingId) {
      visitIdRef.current = existingId;
      return; // Already tracked this session
    }

    let sessionId = localStorage.getItem('4andone_session_id');
    if (!sessionId) {
      sessionId = crypto.randomUUID();
      localStorage.setItem('4andone_session_id', sessionId);
    }

    const trackVisit = async () => {
      try {
        const userRef = (() => {
          try {
            const u = localStorage.getItem('4andone-user');
            return u ? JSON.parse(u)?.id?.toString() : null;
          } catch { return null; }
        })();

        // Fetch country in parallel with the insert
        const [country] = await Promise.all([getCountry()]);

        const { data } = await supabase
          .from('page_visits')
          .insert({
            session_id: sessionId,
            user_ref: userRef,
            duration_seconds: 0,
            country_code: country?.code ?? null,
            country_name: country?.name ?? null,
          })
          .select('id')
          .single();

        if (data?.id) {
          visitIdRef.current = data.id;
          sessionStorage.setItem(SESSION_KEY, data.id);
        }
      } catch {
        // Silently fail — tracking must never break the app
      }
    };

    trackVisit();

    // Update duration on page close using sendBeacon (reliable on unload)
    const handleUnload = () => {
      if (!visitIdRef.current) return;
      const elapsed = Math.round((Date.now() - startTimeRef.current) / 1000);
      const url = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/page_visits?id=eq.${visitIdRef.current}`;
      const headers = {
        'Content-Type': 'application/json',
        'apikey': process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        'Authorization': `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}`,
        'Prefer': 'return=minimal',
      };
      // sendBeacon can't set headers — use XMLHttpRequest sync as fallback
      try {
        const xhr = new XMLHttpRequest();
        xhr.open('PATCH', url, false); // false = synchronous
        Object.entries(headers).forEach(([k, v]) => xhr.setRequestHeader(k, v));
        xhr.send(JSON.stringify({ duration_seconds: elapsed }));
      } catch {}
    };

    window.addEventListener('beforeunload', handleUnload);
    return () => window.removeEventListener('beforeunload', handleUnload);
  }, []);
}
