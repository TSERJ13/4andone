"use client";

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';

export default function UpgradePage() {
  const router = useRouter();
  const { setIsSubscriptionModalOpen } = useAuth();

  useEffect(() => {
    setIsSubscriptionModalOpen(true);
    router.replace('/library');
  }, [router, setIsSubscriptionModalOpen]);

  return <div style={{ background: '#030303', minHeight: '100vh' }} />;
}
