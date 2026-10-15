"use client";

import { useCallback, useEffect, useState } from 'react';
import { adminDb } from '@/lib/admin-db';
import { INQUIRIES_SEEN_KEY, INQUIRIES_SEEN_EVENT } from '@/utils/adminInquiries';

/** How many contact messages arrived since the admin last opened the Inquiries tab (not counting deleted ones). */
export function useNewInquiries(pollMs = 60000): number {
  const [count, setCount] = useState(0);
  const load = useCallback(async () => {
    if (typeof document !== 'undefined' && document.visibilityState === 'hidden') return;
    try {
      let seen = '1970-01-01T00:00:00.000Z';
      try { seen = localStorage.getItem(INQUIRIES_SEEN_KEY) || seen; } catch { /* ignore */ }
      const [{ data: fresh }, { data: deleted }] = await Promise.all([
        adminDb.from('track_plays').select('id').eq('event_type', 'contact_message').gt('created_at', seen),
        adminDb.from('folders').select('color').eq('name', '__deleted_msg__'),
      ]);
      const deletedIds = new Set((deleted || []).map((r: { color: string }) => r.color));
      setCount((fresh || []).filter((m: { id: string }) => !deletedIds.has(m.id)).length);
    } catch (err) {
      console.error('Failed to fetch new inquiries count:', err);
    }
  }, []);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- initial load (state is set after the request)
    load();
    const interval = setInterval(load, pollMs);
    window.addEventListener(INQUIRIES_SEEN_EVENT, load);
    document.addEventListener('visibilitychange', load);
    return () => {
      clearInterval(interval);
      window.removeEventListener(INQUIRIES_SEEN_EVENT, load);
      document.removeEventListener('visibilitychange', load);
    };
  }, [load, pollMs]);
  return count;
}
