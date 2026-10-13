"use client";
import { AdminQuery } from '@/lib/admin-db';
import { sessionFetch } from '@/utils/userSession';
// Only the signed server session determines library ownership.
export const userDb = {
  from: <T = Record<string, any>[]>(table: string) => new AdminQuery<T>(table, '/api/user/library', sessionFetch as typeof fetch),
};
