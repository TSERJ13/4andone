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
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<TelegramUser | null>(null);
  const [isPremium, setIsPremium] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isSubscriptionModalOpen, setIsSubscriptionModalOpen] = useState(false);

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

    // Check if user record in DB has is_premium
    try {
      const { data: dbUser } = await supabase
        .from('telegram_users')
        .select('is_premium, subscription_id')
        .eq('telegram_id', userData.id)
        .single();
      if (dbUser?.is_premium) {
        userData.is_premium = true;
        userData.subscription_id = dbUser.subscription_id;
      }
    } catch {}

    setUser(userData);
    setIsPremium(!!userData.is_premium);
    localStorage.setItem('4andone-user', JSON.stringify(userData));
    setIsAuthModalOpen(false);
    await syncWithSupabase(userData);

    // Upsert into telegram_users for analytics tracking
    try {
      const country = await fetch('https://ipapi.co/json/', { signal: AbortSignal.timeout(3000) })
        .then(r => r.json())
        .catch(() => null);

      await supabase.from('telegram_users').upsert({
        telegram_id: userData.id,
        first_name: userData.first_name,
        last_name: userData.last_name ?? null,
        username: userData.username ?? null,
        photo_url: userData.photo_url ?? null,
        last_seen: new Date().toISOString(),
        country_code: country?.country_code ?? null,
        country_name: country?.country_name ?? null,
        is_premium: !!userData.is_premium,
        subscription_id: userData.subscription_id ?? null,
      }, { onConflict: 'telegram_id', ignoreDuplicates: false });

      // Increment visit count via RPC
      try {
        await supabase.rpc('increment_user_visit', { uid: userData.id });
      } catch { /* non-critical */ }
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
      try {
        await supabase.from('telegram_users').update({
          is_premium: true,
          subscription_id: subscriptionId
        }).eq('telegram_id', user.id);
      } catch {}
    } else {
      localStorage.setItem('4andone_guest_premium', subscriptionId);
    }
    setIsSubscriptionModalOpen(false);
  };

  const logout = () => {
    setUser(null);
    setIsPremium(false);
    localStorage.removeItem('4andone-user');
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
      activatePremium
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
