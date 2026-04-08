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
      const email = `tg_${userData.id}@4and.one`;
      const password = `tg_pass_${userData.id}_secure_99`; 
      
      const { data, error } = await supabase.auth.signInWithPassword({
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
    }
    setIsLoading(false);
  }, []);

  const login = async (userData: TelegramUser) => {
    setUser(userData);
    localStorage.setItem('4andone-user', JSON.stringify(userData));
    setIsAuthModalOpen(false);
    await syncWithSupabase(userData);
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
