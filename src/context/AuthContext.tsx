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
}

interface AuthContextType {
  user: TelegramUser | null;
  isAuthenticated: boolean;
  login: (user: TelegramUser) => void;
  logout: () => void;
  isLoading: boolean;
  isAuthModalOpen: boolean;
  setIsAuthModalOpen: (open: boolean) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<TelegramUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);

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

  useEffect(() => {
    const savedUser = localStorage.getItem('4andone-user');
    if (savedUser) {
      const parsedUser = JSON.parse(savedUser);
      setUser(parsedUser);
      syncWithSupabase(parsedUser);
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
          hash: 'telegram_webapp_auto'
        };
        login(autoUser);
      }
    }
    setIsLoading(false);
  }, []);

  const login = async (userData: TelegramUser) => {
    setUser(userData);
    localStorage.setItem('4andone-user', JSON.stringify(userData));
    setIsAuthModalOpen(false);
    await syncWithSupabase(userData);

    // Upsert into telegram_users for analytics tracking
    try {
      // Get country from cached visit data if available
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
      }, { onConflict: 'telegram_id', ignoreDuplicates: false });

      // Increment visit count via RPC
      try {
        await supabase.rpc('increment_user_visit', { uid: userData.id });
      } catch { /* non-critical */ }
    } catch {
      // Non-critical — don't block login
    }
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('4andone-user');
  };

  return (
    <AuthContext.Provider value={{
      user,
      isAuthenticated: !!user,
      login,
      logout,
      isLoading,
      isAuthModalOpen,
      setIsAuthModalOpen
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
