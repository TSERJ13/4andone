"use client";

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function AdminPage() {
  const router = useRouter();

  useEffect(() => {
    const auth = localStorage.getItem('studio_auth');
    if (auth) {
      router.push('/admin/dashboard');
    } else {
      router.push('/sa-login');
    }
  }, [router]);

  return (
    <div style={{ 
      background: '#000', 
      height: '100vh', 
      display: 'flex', 
      alignItems: 'center', 
      justifyContent: 'center',
      color: '#71717a',
      fontSize: '14px',
      fontFamily: 'Inter, sans-serif'
    }}>
      Loading Admin Center...
    </div>
  );
}
