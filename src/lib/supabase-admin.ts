import 'server-only';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Service-role client: bypasses RLS. SERVER ONLY — used by admin API routes
// after requireAdmin(), and by narrowly scoped public routes (premium status,
// user sync) that only write the columns they own.
let client: SupabaseClient | null = null;

export const getSupabaseAdmin = (): SupabaseClient | null => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  if (!client) {
    client = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  }
  return client;
};

export const serviceRoleMissing = () =>
  new Response(JSON.stringify({ error: 'SUPABASE_SERVICE_ROLE_KEY is not configured on the server' }), {
    status: 503,
    headers: { 'content-type': 'application/json' },
  });
