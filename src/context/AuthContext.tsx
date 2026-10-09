"use client";

import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '@/utils/supabase';

export interface TelegramUser {
  id: number;
  first_name: string;
  last_name?: string;
  username?: string;
  photo_url?: string;
  auth_date: number;
  hash: string;
  is_premium?: boolean;
  subscription_id?: string | null;
}

interface AuthContextType {
  user: TelegramUser | null;
  isAuthenticated: boolean;
  isPremium: boolean;
  login: (user: TelegramUser) => void;
  logout: () => void;
  isLoading: boolean;
  isAuthModalOpen: boolean;
  setIsAuthModalOpen: (open: boolean) => void;
  isSubscriptionModalOpen: boolean;
  setIsSubscriptionModalOpen: (open: boolean) => void;
  activatePremium: (subscriptionId: string) => Promise<void>;
  /** Changes each time the server session (httpOnly cookie) is (re)established. */
  sessionVersion: number;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<TelegramUser | null>(null);
  const [isPremium, setIsPremium] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isSubscriptionModalOpen, setIsSubscriptionModalOpen] = useState(false);
  const [sessionVersion, setSessionVersion] = useState(0);

  // Prove the Telegram login to the server (it checks Telegram's signature
  // with the bot token) and get the httpOnly session cookie that unlocks this
  // account's own data — listening history, profile — on any device.
  const establishServerSession = async (userData: TelegramUser) => {
    try {
      const initData = (window as unknown as { Telegram?: { WebApp?: { initData?: string } } }).Telegram?.WebApp?.initData;
      const body = typeof initData === 'string' && initData.includes('hash=')
        ? { initData }
        : userData;
      const res = await fetch('/api/user/session', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (res.ok || res.status === 503) setSessionVersion(v => v + 1); // 503 = not configured yet
    } catch {
      // offline — the next visit tries again
    }
  };

  const syncWithSupabase = async (userData: TelegramUser) => {
    try {
      // 1. Check if we already have a valid session to avoid redundant password sign-ins
      const { data: { session } } = await supabase.auth.getSession();
      
      if (session && session.user.email === `tg_${userData.id}@4and.one`) {
        return; // Session already active and matches
      }

      const email = `tg_${userData.id}@4and.one`;
      const password = `tg_pass_${userData.id}_secure_99`; 
      
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error && error.message.includes('Invalid login credentials')) {
        await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { telegram_id: userData.id, first_name: userData.first_name }
          }
        });
      }
    } catch (err) {
      console.error("[AUTH-SYNC-ERROR]", err);
    }
  };

  // Subscription status from the server (expiry-aware, auto-renews verified
  // PayPal subscriptions). Returns null when it could not be read (offline,
  // server not configured) — callers then keep what they have.
  const fetchPremiumStatus = async (telegramId: number): Promise<{ active: boolean; subscriptionId: string | null } | null> => {
    try {
      const res = await fetch(`/api/user/premium?tid=${encodeURIComponent(String(telegramId))}`, { cache: 'no-store' });
      if (!res.ok) return null;
      const data = await res.json();
      return { active: !!data.active, subscriptionId: data.subscriptionId ?? null };
    } catch {
      return null;
    }
  };

  // Server-side, PayPal-verified activation. 'unavailable' = the server can't
  // verify right now (not configured / offline) → keep the local premium.
  const activateOnServer = async (telegramId: number, subscriptionId: string): Promise<'active' | 'rejected' | 'unavailable'> => {
    try {
      const res = await fetch('/api/subscription/activate', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ telegramId, subscriptionId }),
      });
      if (res.ok) return 'active';
      if (res.status === 402 || res.status === 400) return 'rejected';
      return 'unavailable';
    } catch {
      return 'unavailable';
    }
  };

  const isOwnerOrAdmin = (u: TelegramUser | null) => {
    if (!u) return false;
    const handle = (u.username || '').toLowerCase();
    return handle === 'stdancestudio' || handle === 'tserj13' || handle === 'sergitsivtsivadze';
  };

  useEffect(() => {
    const savedUser = localStorage.getItem('4andone-user');
    if (savedUser) {
      try {
        const parsedUser = JSON.parse(savedUser);
        const hasLifetime = isOwnerOrAdmin(parsedUser);
        if (hasLifetime) parsedUser.is_premium = true;
        setUser(parsedUser);
        setIsPremium(hasLifetime || !!parsedUser.is_premium);
        syncWithSupabase(parsedUser);
        establishServerSession(parsedUser);
        // The saved copy can be stale (subscription expired, or granted from the
        // admin panel on another device) — re-check the real status quietly.
        if (!hasLifetime && parsedUser.id) {
          fetchPremiumStatus(parsedUser.id).then(async (status) => {
            if (!status) return; // offline: keep the saved value
            // Paid in this browser but not recorded on the server yet (e.g. the
            // server could not verify at purchase time) → try to record it now.
            if (!status.active && parsedUser.is_premium && typeof parsedUser.subscription_id === 'string'
                && parsedUser.subscription_id.startsWith('I-')) {
              const result = await activateOnServer(parsedUser.id, parsedUser.subscription_id);
              if (result !== 'rejected') return; // active now, or can't tell → keep premium
            }
            const refreshed = { ...parsedUser, is_premium: status.active, subscription_id: status.subscriptionId ?? undefined };
            setUser(refreshed);
            setIsPremium(status.active);
            try { localStorage.setItem('4andone-user', JSON.stringify(refreshed)); } catch { /* ignore */ }
          });
        }
      } catch {}
    } else if (typeof window !== 'undefined' && (window as any).Telegram?.WebApp?.initDataUnsafe?.user) {
      // Auto-detect & auto-login Telegram WebApp user seamlessly with zero clicks!
      const tgUser = (window as any).Telegram.WebApp.initDataUnsafe.user;
      if (tgUser && tgUser.id) {
        const autoUser: TelegramUser = {
          id: tgUser.id,
          first_name: tgUser.first_name || 'Dancer',
          last_name: tgUser.last_name || '',
          username: tgUser.username || '',
          photo_url: tgUser.photo_url || '',
          auth_date: Math.floor(Date.now() / 1000),
          hash: 'telegram_webapp_auto',
          is_premium: false
        };
        login(autoUser);
      }
    }
    setIsLoading(false);
  }, []);

  const login = async (userData: TelegramUser) => {
    const hasLifetime = isOwnerOrAdmin(userData);
    if (hasLifetime) {
      userData.is_premium = true;
      userData.subscription_id = 'LIFETIME_OWNER';
    }

    // Subscription status from the server (expiry-aware)
    if (!hasLifetime) {
      const status = await fetchPremiumStatus(userData.id);
      userData.is_premium = !!status?.active;
      if (status?.subscriptionId) userData.subscription_id = status.subscriptionId;
    }

    setUser(userData);
    setIsPremium(!!userData.is_premium);
    localStorage.setItem('4andone-user', JSON.stringify(userData));
    setIsAuthModalOpen(false);
    await establishServerSession(userData);
    await syncWithSupabase(userData);

    // Record the profile/visit (server-side; premium columns are not writable here)
    try {
      const country = await fetch('https://ipapi.co/json/', { signal: AbortSignal.timeout(3000) })
        .then(r => r.json())
        .catch(() => null);

      await fetch('/api/user/sync', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          telegram_id: userData.id,
          first_name: userData.first_name,
          last_name: userData.last_name ?? null,
          username: userData.username ?? null,
          photo_url: userData.photo_url ?? null,
          country_code: country?.country_code ?? null,
          country_name: country?.country_name ?? null,
        }),
      });
    } catch {
      // Non-critical — don't block login
    }
  };

  const activatePremium = async (subscriptionId: string) => {
    setIsPremium(true);
    if (user) {
      const updatedUser = { ...user, is_premium: true, subscription_id: subscriptionId };
      setUser(updatedUser);
      localStorage.setItem('4andone-user', JSON.stringify(updatedUser));
      // Verified with PayPal and saved on the server, so Premium follows the
      // account to every device.
      const result = await activateOnServer(user.id, subscriptionId);
      if (result === 'rejected') {
        console.warn('[PREMIUM] PayPal did not confirm the subscription yet; will retry on next visit.');
      }
    } else {
      localStorage.setItem('4andone_guest_premium', subscriptionId);
    }
    setIsSubscriptionModalOpen(false);
  };

  const logout = () => {
    setUser(null);
    setIsPremium(false);
    localStorage.removeItem('4andone-user');
    fetch('/api/user/session', { method: 'DELETE' }).catch(() => {});
    try {
      localStorage.removeItem('4andone_liked_tracks');
      // Also clear user-scoped keys
      Object.keys(localStorage).forEach(key => {
        if (key.startsWith('4andone_liked_tracks')) {
          localStorage.removeItem(key);
        }
      });
    } catch (e) {}
  };

  return (
    <AuthContext.Provider value={{
      user,
      isAuthenticated: !!user,
      isPremium,
      login,
      logout,
      isLoading,
      isAuthModalOpen,
      setIsAuthModalOpen,
      isSubscriptionModalOpen,
      setIsSubscriptionModalOpen,
      activatePremium,
      sessionVersion
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
